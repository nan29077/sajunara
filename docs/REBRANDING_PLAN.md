# 셀러브릭스 → 점사브릭스 리브랜딩 계획 보고서

작성일: 2026-08-12
대상: `E:\프로젝트\사주메이트` (실제 코드베이스명 `sellerbricks`)
※ 본 문서는 분석 결과이며, 코드 수정은 일절 수행하지 않았습니다.

---

## ⚠️ 사전 전제 확인 (가장 중요)

**현재 코드베이스에 사주/점사/운세/타로/상담사 관련 코드는 단 한 줄도 존재하지 않습니다.**
(`grep -ri "사주|점사|운세|타로|상담사" src` → 0건)

즉 이 작업은 "리브랜딩(브랜드명 교체)"이 아니라 **라이브커머스 마켓플레이스 → 점사 예약 플랫폼으로의 도메인 전환(pivot)** 입니다.
폴더명만 `사주메이트`이고 내용물은 100% 셀러브릭스입니다. 이 인식 차이가 일정 산정에 결정적이므로 Phase 계획도 이 전제로 작성했습니다.

---

# A. 현재 구조 요약

## A-1. 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 14.2 (App Router, Server Components), React 18.3 |
| 언어 | TypeScript 5.9 |
| DB | MySQL + Prisma 5.22 ORM (**DATABASE_URL이 운영 RDS 직결**) |
| 인증 | NextAuth.js v5 beta (JWT, credentials 방식) + `@auth/prisma-adapter` |
| 스타일 | Tailwind CSS 3.4 (`brand.*` 노랑 팔레트 = 꿀벌 컨셉), darkMode: class |
| 아이콘 | **2종 병행** — ① `lucide-react` 0.577 (203개 파일에서 import) ② 자체 `<Icon name>` PNG 시스템 (`public/icons/` 505개 파일) |
| 폼 | react-hook-form 7.72 + zod 4.3 + @hookform/resolvers |
| 파일 저장 | `@aws-sdk/client-s3` (S3), `public/uploads/` |
| 기타 | qrcode(QR 생성), xlsx / xlsx-js-style(엑셀), puppeteer(PDF), date-fns |
| PG 연동 | **3종** — SeedPay, SmartroPay, Ongi(온기) |
| 알림 | Aligo 알림톡 (`ALIGO_*` 5종 env), 자체 Notification 테이블 |
| 외부 연동 | YouTube Data API OAuth (라이브 채팅 수집·전송), Google/Kakao/Naver OAuth env |
| 개발 포트 | 3002 (`next dev -p 3002`) |

**규모 지표**

| 지표 | 수치 |
|------|------|
| `.tsx` 파일 | 369개 |
| `.ts` 파일 (generated 제외) | 258개 |
| API route.ts | **202개** (CLAUDE.md에는 52개로 기재 — 문서가 낡음) |
| 페이지 라우트 (`page.tsx`) | **약 115개** |
| Prisma 모델 | **69개** |
| Prisma enum | 13개 |
| 공유 컴포넌트 (`components/shared/`) | 약 150개 |
| schema.prisma | 1,885줄 |

## A-2. 권한 체계 (6개 역할 — CLAUDE.md의 "4 roles"는 낡은 정보)

```
SUPER_ADMIN  최고관리자 — 전체 관리
NODE         노드 — 상품 마진 최종 승인, 하위 중간관리자/브랜드 관리, 별도 정산
MIDDLE_ADMIN 중간관리자 — 브랜드/셀러 모집, 마진 설정, 별도 정산
BRAND_ADMIN  브랜드 — 상품 등록, 셀러 승인
SELLER       라이브 셀러 — 샵/상품/라이브/공동구매/게임/콘텐츠/팬
BUYER        구매자
```

→ 4단계 마진 체인(브랜드 → 노드 → 중간관리자 → 셀러)과 각 단계별 정산 테이블이 존재합니다. **이 구조가 이 프로젝트에서 가장 복잡하고 리스크가 큰 영역입니다.**

## A-3. 디렉토리 구조 (depth 3~4)

```
사주메이트/
├─ CLAUDE.md / AGENTS.md / README.md
├─ docs/                          # BUSINESS_LOGIC, DESIGN, OPERATIONS, SETTLEMENT_ISSUES, YOUTUBE_SETUP
├─ *.bat / *.ps1 / *.vbs (60여개)  # git·복사·시드 등 임시 스크립트 (정리 대상)
└─ app/                            # Next.js 루트 (모든 명령은 여기서)
   ├─ prisma/
   │  ├─ schema.prisma (1,885줄, 69 model)
   │  ├─ schema-gen.prisma (1,193줄, 구버전 잔재)
   │  └─ seed*.ts / *.mjs / *.sql
   ├─ public/
   │  ├─ icons/ (505개 PNG)   ├─ avatars/  ├─ banners/  ├─ bees/
   │  ├─ logo.png / logo.svg / logo-white.png / favicon.* / icon-192,512
   │  └─ uploads/  static/
   └─ src/
      ├─ app/
      │  ├─ layout.tsx              # 전역 metadata (브랜드명 5회)
      │  ├─ opengraph-image.tsx     # OG 이미지 (브랜드명)
      │  ├─ globals.css
      │  ├─ (public)/               # 구매자·비회원, 모바일 퍼스트 max-w 480px
      │  │   page.tsx(779줄, 홈), products/[id], campaigns/[id], packages/[id],
      │  │   content/[id], shop/[slug], sellers, search, cart, checkout(+complete),
      │  │   my/(orders·addresses·points·reviews·wishlist·notifications·
      │  │        game-coupons·seller·settings), live, become-seller,
      │  │   seller-apply, support/[slug], docs
      │  ├─ (dashboard)/
      │  │   layout.tsx(289줄)      # ★ 6역할 사이드바 메뉴 전체 정의 지점
      │  │   admin/  (33개 페이지)  brand/ (13)  seller/ (17)
      │  │   middle/ (9)            node/  (8)
      │  ├─ (live-viewer)/live/[code]/          # 라이브 뷰어 (1,306줄) + /watch
      │  ├─ auth/login · register · reset-password
      │  ├─ game/[id](+/join) · live-code/[code] · impersonate · payment-test
      │  └─ api/  (202 routes)
      │      admin/(40+)  seller/(35+)  auth/(12)  payments/(3사)  orders/
      │      products/  live/  games/  brand/  middle/  node/  my/  package-*/ …
      ├─ components/
      │  ├─ layout/    Header, Footer, MobileNav
      │  ├─ shared/    약 150개 (Product*, Seller*, Shop*, Order*, Game*, Home* …)
      │  ├─ admin/ (32)  seller/ (5)  middle/ (8)  node/ (6)  brand/ (1)
      │  ├─ live/      PCDirectorSuiteComponent(738), MobileImmersive(394), WatchMyPageSheet
      │  └─ settlement/ SupplierSettlementTable
      ├─ lib/ (50개)   auth, prisma, settlement, margin, revenue, payout, tax,
      │                seedpay/smartropay/ongi/cooconpg, aligo·alimtalk*(4),
      │                youtubeOAuth·youtubeChatForward, referral, mentorReferral,
      │                featureFlags, siteContent, defaults, shipping, businessDays,
      │                koreanHolidays, gameCoupon·gameSettings·gameTypes …
      ├─ generated/prisma/          # Prisma Client 출력물 (수정 대상 아님)
      └─ types/next-auth.d.ts
```

## A-4. 주요 페이지 라우트 (요약)

**(public) — 구매자**
`/` · `/products/[id]` · `/campaigns` `/campaigns/[id]` · `/packages` `/packages/[id]` · `/sellers` · `/shop/[slug]` · `/search` · `/live` · `/content` `/content/[id]` · `/cart` · `/checkout` `/checkout/complete` · `/my` + 9개 하위 · `/become-seller` · `/seller-apply` · `/support/[slug]` · `/docs`

**(dashboard) — 역할별**

| 역할 | 페이지 |
|------|--------|
| admin (33) | users, sellers, brands, middle-admins, nodes, products, package-products, package-purchase-orders, categories, orders, campaigns, settlements, middle-settlements, brand-settlements, node-settlements, deposit-transfer, manual-settlement, tax, revenue, banners, contents, games, live-products, alimtalk, inquiries, support/chatbot, contact-settings, channel-verifications, seller-rates, settings, site/footer |
| seller (17) | shop, products(+[id]/edit), contents(+edit/[id]), live, campaigns, games(+[id]), orders, package-purchase-orders, settlements, alimtalk, fans, channel-verifications, mentees, settings |
| brand (13) | products(+edit/[id]), sellers, orders, package-purchase-orders, settlements, stats, campaigns, contents(+[id]), live-products, settings |
| middle (9) | sellers, brands, products, package-products, orders, settlements, brand-settlements, settings |
| node (8) | products, members, sellers, brands, orders, settlements, settings |

**(live-viewer)** `/live/[code]`, `/live/[code]/watch`
**기타** `/auth/login|register|reset-password`, `/game/[id]`, `/game/[id]/join`, `/live-code/[code]`, `/impersonate`, `/payment-test`

## A-5. DB 모델 목록 (69개)

**계정·프로필 (8)**
`User` `BuyerProfile` `SellerProfile` `BrandProfile` `MiddleAdminProfile` `Account` `Session` `VerificationToken`

**상품 (10)**
`Product` `ProductVariant` `ProductImage` `Category` `SellerShopProduct` `DirectProduct` `ShopDirectProductExposure` `Wishlist` `ProductChat` `PackageProduct`(+`PackageItem`)

**주문·결제 (8)**
`Order` `OrderItem` `CartItem` `Address` `PaymentLog` `SocialOrder` `PackageOrderItem` `PackagePurchaseOrder`

**정산 (11)**
`Settlement` `BrandSettlement` `MiddleAdminSettlement` `MiddleAdminCommission` `MiddleManagerSettlement` `NodeSettlement` `ManualSettlement` `MentorCommission` `ReferralCommission` `PayoutRequest` `PayoutRequestOrder` `DepositTransfer` `PlatformFeeSettings`

**라이브 (7)**
`LiveStream` `LiveStreamProduct` `LiveChatMessage` `LiveChannelNotice` `ChatBotConfig` `LiveCoupon` `UserCoupon`

**게임 (4)** `Game` `GameCoupon` `UserGameCoupon` `GameParticipant`

**콘텐츠·소셜 (6)** `ContentPost` `ShoppingTag` `ContentLike` `ContentComment` `SellerFollower` `Review`

**캠페인 (1)** `GroupBuyCampaign`

**알림톡 (5)** `AlimtalkAccount` `AlimtalkCharge` `AlimtalkLog` `AlimtalkTemplateSetting` `AligoSendLog`

**시스템 (6)** `Setting` `SystemConfig` `Banner` `FooterContent` `Notification` `ChannelVerification`

### 핵심 모델 필드 (발췌)

**`User`** — id, email(unique), name, password, role(Role), avatar, gender, phone, birthday, zipCode/address1/address2, isActive, mustResetPassword, bankName/bankAccount/bankHolder, sellerReferralCode(unique), referredBySellerCode, mentorId, managedByMiddleAdminId, emailVerified, createdAt/updatedAt + 25개 관계

**`Product`** — name, slug(unique), description, detailContent, basePrice, comparePrice, supplyPrice, middleAdminMargin, adminMargin, **priceModel(SUPPLY|COMMISSION)**, commissionRate, sellerCommissionAmount, categoryId, brandId, middleAdminId, nodeMargin/nodeMarginType/nodeApprovedAt/nodeId, sellerId, isActive, isApproved, allowGroupBuy, allowLiveCommerce, badges, **shippingFee/freeShipping/freeShippingThreshold/remoteAreaFee**, totalStock, soldCount, thumbnail, optionGroups(JSON), coupangLowestPrice, naverLowestPrice

**`Order`** — orderNumber(unique), userId, sellerId, campaignId, status(OrderStatus 8종), paymentStatus, totalAmount, shippingFee, discountAmount, discountType, cartDiscountAmount, finalAmount, **shippingName/Phone/Address/Memo**, snsAccounts, paymentMethod, pgProvider/pgTid/pgAuthData, paidAt/shippedAt/deliveredAt/cancelledAt/refundedAt, **deliveryStatus/deliveryTracking/deliveryCourier/deliveryUpdatedAt/By**, cancelRequested~cancelFromSettlement(9필드), sellerFeeRateSnap

**`OrderItem`** — orderId, itemType(PRODUCT|DIRECT), productId(FK 아님), variantId, productName, price, quantity, totalPrice + **정산 스냅샷 9필드**(supplyPriceSnap, priceModelSnap, productCommissionRateSnap, sellerFeeRateSnap, supplierFeeRateSnap, isSellerProductSnap, recipientRole, recipientId)

**`LiveStream`** — sellerId, title, description, thumbnailImage, status(SCHEDULED|LIVE|ENDED|CANCELLED), scheduledAt/startedAt/endedAt, vodUrl, rtmpUrl, streamKey, platform, externalUrl, **shareCode(unique)**, viewerCount, peakViewerCount, likeCount, isVodSaved, kakaoNotified, showPastInShop, offThumbnailUrl/offLinkUrl/offLinkText, **ytLiveChatId/ytNextPageToken/ytSyncedAt/ytChatForward**

**`GroupBuyCampaign`** — title, sellerId, productId, status(9종), campaignPrice, originalPrice, **startDate/endDate**, goalQuantity, minOrderQuantity, maxOrderQuantity, limitPerPerson, currentQuantity, participantCount, bannerImage, estimatedDelivery, commissionRate, totalRevenue
→ **예약 시스템의 시간 기반 로직을 참고할 수 있는 유일한 기존 모델**

**`SellerProfile`** — slug(unique), shopName, shopDescription, shopBanner, shopLogo, category, mood, shopThemeColor, SNS 5종 URL, youtubeChannelId + OAuth 토큰 4종, isManualLive/livePlatform/liveLink, isApproved, isRecommended, commissionRate, totalFans, totalSales, middleAdminId/marginRate, 사업자정보 7필드, referralCode/커미션·할인율 4종, feature 플래그 5종(featureGroupBuy/featureContent/featureLiveCommerce/shopDirectExpose/shopNumbering), cartDiscount 3필드, liveSiteSettings(JSON)

## A-6. 현재 브랜딩 텍스트 분포

| 토큰 | 파일 수 | 총 발생 |
|------|--------|--------|
| `셀러브릭스` (한글) | **55개 파일** | **141회** (src+prisma+docs) |
| `sellerbricks` / `SellerBricks` / `SELLERBRICKS` | **18개 src 파일** | 24회 (+ generated 2개) |

**한글 브랜드명 상위 파일**

| 파일 | 횟수 |
|------|------|
| `src/app/(public)/page.tsx` | 13 |
| `src/app/(dashboard)/seller/live/page.tsx` | 9 |
| `src/lib/youtubeChatForward.ts` | 5 |
| `src/components/admin/HomeContentManager.tsx` | 5 |
| `src/app/layout.tsx` | 5 |
| `src/app/(public)/become-seller/page.tsx` | 5 |
| `SellerShopFooter.tsx` / `ChatBotManager.tsx` / `live/[code]/page.tsx` | 각 4 |
| `lib/siteContent.ts` · `ShopLiveSettings` · `HomeFaq` · `FloatingButtons` · `BulkProductRegister` · `auth/login` | 각 3 |
| 나머지 40여 파일 | 각 1~2 |

**브랜드명이 박힌 기타 위치**
- `app/.env` → `NEXT_PUBLIC_APP_NAME="셀러브릭스"`, `NEXT_PUBLIC_APP_URL="https://sellerbricks.co.kr"`
- `app/package.json` → `"name": "sellerbricks"`
- `src/app/layout.tsx` → title/description/keywords/openGraph/twitter (metadataBase 도메인 포함)
- `src/app/opengraph-image.tsx` → OG 이미지 렌더링 텍스트
- `public/` → `logo.png/svg`, `logo-white.png`, `favicon.*`, `icon-192/512.png`, `apple-touch-icon.png`, `sellergames-logo.png`, 꿀벌 에셋 다수(`bee-*.png`, `PD꿀벌.png`, `bees/`)
- `tailwind.config.js` → `// 꿀벌 컨셉` 노랑 팔레트 (`#f5a700`), 폰트 Baloo 2 / Jua
- 루트 `셀러브릭스_개인정보처리방침.docx`, `셀러브릭스_이용약관.docx`, `docs/셀러브릭스_운영프로세스_v2.pdf/xlsx`, `app/셀러브릭스_소개서_2026_v3.pdf`
- DB `Setting` / `FooterContent` / `Banner` 테이블 내 저장된 문구 (**코드 아님 — DB 데이터**)

**도메인 용어 확산도 (파일 수 기준, generated 제외)**

| 용어 | 파일 수 |
|------|--------|
| 셀러 | 310 |
| 라이브 | 205 |
| 상품 | 200 |
| 브랜드 | 155 |
| 주문 | 128 |
| 배송 | 70 |
| 공동구매 | 43 |
| 장바구니 | 31 |

**Prisma 모델 코드 참조 밀도** (변경 시 파급 범위 지표)

| 모델 | 참조 파일 수 |
|------|-----------|
| `prisma.product.*` | 53 |
| `prisma.order.*` | 43 |
| `prisma.sellerShopProduct` | 23 |
| `prisma.groupBuyCampaign` | 20 |
| `prisma.liveStream` | 18 |
| `prisma.game.*` | 13 |
| `prisma.orderItem` / `prisma.directProduct` | 각 10 |
| `prisma.packageProduct` | 8 |

---

# B. 리브랜딩 범위 분류

## B-1. 텍스트/브랜드명 교체 (난이도 낮음, 물량형)

| 항목 | 영향 범위 | 비고 |
|------|----------|------|
| `셀러브릭스` → `점사브릭스` | **55개 파일 / 141회** | 단순 문자열 치환 |
| `sellerbricks` → 신규 영문명 | **18개 파일 / 24회** | 도메인 URL·이메일·package.json name 포함 |
| `.env` `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL` | 2줄 | **운영 도메인 확정 후** 변경 |
| metadata (title/desc/keywords/OG/twitter) | `layout.tsx` + `opengraph-image.tsx` | SEO 영향 |
| 로고·파비콘·OG 이미지 | `public/` 10여 개 파일 | 디자인 산출물 필요 |
| 꿀벌 캐릭터 에셋 | `bee-*.png`, `bees/`, `PD꿀벌.png`, `BeeLoader.tsx`, `BeeDecorations.tsx` | 점사 테마와 충돌 → 전면 교체 대상 |
| Tailwind 컬러/폰트 | `tailwind.config.js` | 노랑(꿀벌) → 점사 테마 색 |
| 약관·개인정보처리방침 docx/pdf | 5개 문서 | **법무 검토 필요, 코드 아님** |
| DB에 저장된 문구 | `Setting`, `FooterContent`, `Banner` | **운영 DB UPDATE 필요** |

> ⚠️ 주의: 무분별한 전체 치환은 위험합니다. `SellerProfile`, `sellerId`, `seller_profiles` 등 **식별자에 포함된 "seller"는 절대 치환 금지**입니다. 한글 텍스트와 영문 식별자를 분리해 처리해야 합니다.

**예상 작업량: 1~2일** (에셋 디자인 제외)

## B-2. 기능 변경 (난이도 중~상)

| 변경 | 영향 모델 | 영향 API | 영향 페이지 |
|------|----------|---------|-----------|
| 상품 → 점사상품 | `Product`(53파일), `ProductVariant`, `ProductImage`, `SellerShopProduct`(23), `DirectProduct`(10), `Category` | `api/products/*`(8), `api/seller/products`, `api/seller/direct-products`, `api/admin/products`, `api/middle/products`, `api/node/products` | admin/brand/seller/middle/node `products` 전부(약 12개) + `(public)/products/[id]` |
| 주문 → 예약 | `Order`(43), `OrderItem`(10), `CartItem` | `api/orders/*`(10), `api/admin/orders`, `api/seller/*`, `api/my/*` | 5개 역할 `orders` + `my/orders`, `cart`, `checkout` |
| 판매자(셀러) → 상담사 | `SellerProfile`, `SellerFollower`, `SellerShopProduct` (310파일에 "셀러" 문자열) | `api/seller*/`(35+), `api/sellers/*` | seller 대시보드 17개 + `(public)/sellers`, `shop/[slug]`, `become-seller`, `seller-apply` |
| 배송 → 상담 방식(대면/전화/영상) | `Order.shipping*`·`delivery*`(14필드), `Address`, `Product.shippingFee`·`freeShipping`·`remoteAreaFee` | `api/orders/[id]/delivery`, `api/addresses`, `lib/shipping.ts` | checkout, my/orders, my/addresses, 전 역할 orders |
| 재고 → 예약 슬롯 | `Product.totalStock`, `ProductVariant.stock`, `GroupBuyCampaign.currentQuantity` | 상품/주문 API 다수 | 상품 등록·수정 폼 전부 |
| 공동구매 캠페인 → (폐지 or 이벤트 상담) | `GroupBuyCampaign`(20) | `api/campaigns`, `api/seller/campaigns`, `api/brand/campaigns` | admin/seller/brand campaigns + `(public)/campaigns` |
| 브랜드 → (제휴처 or 폐지) | `BrandProfile`, `BrandSettlement` | `api/brand/*`, `api/admin/brands`, `api/middle/brands`, `api/node/brands` | brand 대시보드 13개 |

**주의**: 4단계 마진 체인(브랜드→노드→중간관리자→셀러)과 정산 스냅샷 로직(`OrderItem`의 9개 `*Snap` 필드, `lib/settlement.ts`, `lib/margin.ts`, `lib/revenue.ts`, `lib/payout.ts`, `lib/tax.ts`)은 점사 도메인에서 **상담사 수수료 정산**으로 의미가 바뀝니다. 필드는 재사용 가능하나 **용어·비율·주체 정의를 새로 확정**해야 합니다.

**예상 작업량: 3~5주**

## B-3. 신규 개발 필요 (난이도 상 — 전체 프로젝트의 핵심)

기존 코드에 **대응물이 전혀 없는** 항목들입니다.

| 기능 | 신규 필요 요소 |
|------|--------------|
| **예약 시간 슬롯 시스템** | `ConsultantSchedule`(요일별 영업시간), `TimeSlot`(날짜×시각×정원), `SlotException`(휴무/특별영업) 모델 3종 신설. 슬롯 생성 배치, 잔여 슬롯 조회 API, 동시 예약 경합 처리(트랜잭션 락) |
| **예약(Reservation) 도메인** | 예약 상태 머신(요청→확정→진행중→완료→취소/노쇼), 예약 변경·연기, 취소 정책(N시간 전 무료/수수료), 노쇼 처리 |
| **예약 캘린더 UI** | 월/주/일 뷰, 슬롯 선택 위젯, 상담사 스케줄 편집기 (현재 `ScheduledTimePicker.tsx` 1개만 존재 — 라이브 예약용, 재사용 제한적) |
| **상담사 CRM** | 고객 카드(생년월일·성별·상담 이력·메모·태그), 재방문 관리, 상담 기록 저장, 후속 알림 |
| **사주 데이터 입력** | 생년월일시·양력/음력·윤달·출생지 등 (현재 `User.birthday` 문자열 1개뿐) |
| **상담 진행 채널** | 전화/영상(Zoom·Google Meet 등) 연동 또는 대면 매장 안내 |
| **OBS 오버레이** | 현재 `GameOverlayClient.tsx`(1,481줄)가 게임 오버레이로 존재 → **구조 참고 가능하나 점사용은 신규 개발** |
| **실시간 예약 슬롯 감소** | 현재 폴링 기반(`LiveStatusPoller.tsx`). WebSocket/SSE 미도입 → 신규 |
| **QR** | `qrcode` 패키지 + `ShopQRSection.tsx`(148줄) 이미 존재 → **경량 확장으로 가능** |

**예상 작업량: 6~10주**

## B-4. 유지 항목 (그대로 재사용)

| 영역 | 대상 | 재사용 가능성 |
|------|------|-------------|
| 인증 | NextAuth v5 설정, `lib/auth.ts`, 로그인/회원가입/비밀번호 재설정, 역할 가드, `impersonate` | 그대로 |
| 라이브커머스 | `LiveStream` 7모델, `/live/[code]`(1,306줄), PC 디렉터 스위트, 모바일 몰입 뷰, YouTube OAuth·채팅 수집/전송 | **그대로** (상담사 라이브 방송으로 의미만 전환) |
| 결제 | SeedPay/SmartroPay/Ongi 3종 PG, `PaymentLog`, 결제 콜백 | 그대로 (상품→예약 결제) |
| 알림톡 | Aligo 5모델 + `lib/alimtalk*`(4파일) | **그대로 — 예약 확정/리마인드에 최적** |
| 정산 인프라 | `Settlement` 계열 11모델, 스냅샷 패턴, 출금 요청, 세무 | 로직 골격 유지, 용어·주체만 변경 |
| 콘텐츠·소셜 | `ContentPost`, 댓글/좋아요, 팔로우, 리뷰 | 그대로 (상담 후기로 전환) |
| 공통 UI | `components/shared/` 약 150개 중 Product/Order 비의존 컴포넌트(Pagination, ImageUploader, AppDialog, SafeImage, SearchBar, NotificationBell, MobileSidebar 등) | 대부분 그대로 |
| 관리자 인프라 | 사이트 관리, 배너, 푸터, 카테고리, 챗봇, 문의, 권한 설정 | 그대로 |
| 아이콘 시스템 | `<Icon name>` PNG 505개 + lucide-react | 시스템 유지, 점사용 아이콘 추가 |
| 인프라 | Prisma 패턴, S3 업로드, 엑셀 내보내기, PDF 생성, 한국 공휴일·영업일 계산 | 그대로 |

---

# C. 단계별 개발 계획

> 인원 가정: **풀스택 1~2명**. 병렬 인원이 늘면 Phase 3·5는 분리 가능합니다.

## Phase 1 — 브랜딩/텍스트 교체 + 불필요 메뉴 제거 (2~3일)

| 작업 | 범위 |
|------|------|
| 한글 브랜드명 치환 | 55개 파일 141회 (`셀러브릭스` → `점사브릭스`) |
| 영문 토큰 치환 | 18개 파일 24회 + `package.json` name |
| 환경변수 | `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `metadataBase` |
| 메타데이터/OG | `layout.tsx`, `opengraph-image.tsx` |
| 로고·파비콘·에셋 | `public/` 10여 파일 교체, 꿀벌 에셋 제거(`BeeLoader`, `BeeDecorations`, `bees/`) |
| Tailwind 테마 | `brand.*` 팔레트·폰트를 점사 톤으로 |
| 메뉴 정리 | `(dashboard)/layout.tsx` 82개 nav 항목 중 미사용 항목 숨김 처리 (**삭제 아닌 주석/플래그 처리 권장**) |
| DB 문구 | `Setting`/`FooterContent`/`Banner` 내 브랜드 문구 UPDATE (⚠️ 운영 DB — SELECT 확인 후 수동 UPDATE) |

**산출물**: 겉보기 브랜드가 완전히 바뀐 상태. 기능은 기존 그대로.
**리스크**: 낮음. 단 식별자 오치환 주의(`seller`, `SellerProfile`, `seller_profiles`).

## Phase 2 — DB 스키마 변경 (1~2주)

**⚠️ 이 Phase가 전체에서 가장 위험합니다.** `DATABASE_URL`이 운영 RDS 직결이고, 2026-07-07 전체 초기화 사고 전력이 있습니다.

| 작업 | 상세 |
|------|------|
| 스테이징 DB 구축 | **선행 필수.** 운영 스냅샷 복제 → 로컬 `.env` 분리 |
| 모델 리네임 전략 결정 | ① `@@map` 유지 + Prisma 모델명만 변경(테이블 무손실, 권장) ② 테이블까지 리네임(위험) |
| `Product` → `ConsultingProduct` | 53개 파일 참조 수정 |
| `Order` → `Reservation` | 43개 파일 + `OrderItem` → `ReservationItem` 10개 |
| `SellerProfile` → `ConsultantProfile` | 310개 파일의 문자열 중 식별자 부분 |
| 신규 필드 추가 | `duration`(상담 시간), `consultType`(대면/전화/영상), `capacity`(동시 정원) |
| 사용 중지 필드 | 배송 관련 14필드 — **삭제하지 말고 nullable 유지** (기존 데이터 보존) |
| 마이그레이션 | `prisma migrate diff` 필수 선행 → 데이터 손실 경고 시 즉시 중단 |

**예상 파일 수정: 130~150개**
**리스크**: **최상**. 운영 데이터 손실 가능. 반드시 스테이징 → 백업 → PITR 확인 순으로.

## Phase 3 — 핵심 예약 시스템 구현 (3~4주)

| 작업 | 상세 |
|------|------|
| 신규 모델 | `ConsultantSchedule`(요일별 영업시간), `TimeSlot`(날짜×시각×정원×잔여), `SlotException`(휴무/특별영업), `Reservation` 확장 |
| 예약 상품 등록 | 상담 유형·소요시간·가격·정원 입력 폼 (기존 `ProductRegisterForm.tsx` 개편) |
| 슬롯 생성 엔진 | 스케줄 → 슬롯 자동 생성 배치. `lib/businessDays.ts` + `koreanHolidays.ts` 재사용 |
| 예약 페이지 | 날짜 선택 → 잔여 슬롯 표시 → 선택 → 결제 (기존 checkout 흐름 개조) |
| 동시성 처리 | 슬롯 정원 차감 시 트랜잭션 + 낙관적 락. **`GroupBuyCampaign.currentQuantity` 패턴 참고** |
| 예약 상태 머신 | 요청→확정→진행→완료 / 취소·노쇼. `OrderStatus` enum 개편 |
| 취소·변경 정책 | N시간 전 무료 취소, 이후 수수료. 기존 `cancelRequest~` 9필드 재활용 |
| 결제 연동 | 기존 3종 PG 그대로, 상품 → 슬롯 단위로 |
| 알림톡 | 예약 확정/전일 리마인드/당일 리마인드 템플릿 (Aligo 기존 인프라 활용) |

**예상 작업량: 3~4주** (전체 프로젝트의 핵심)

## Phase 4 — 상담사 대시보드 개편 (2~3주)

| 작업 | 상세 |
|------|------|
| 예약 관리 | 캘린더 뷰(월/주/일), 리스트 뷰, 상태 변경, 상담 기록 입력 |
| 스케줄 편집 | 요일별 영업시간, 휴무일, 임시 휴무, 슬롯 정원 |
| CRM | 고객 카드(생년월일시·성별·연락처·태그·메모), 상담 이력 타임라인, 재방문 관리 |
| 사주 데이터 입력 | 양력/음력·윤달·출생시각·출생지 필드 (`User`/`BuyerProfile` 확장) |
| 정산 개편 | 상담사 수수료 정산으로 용어·계산 주체 재정의 (`lib/settlement.ts` 개편) |
| 기존 메뉴 정리 | 팬 관리·SNS구독 승인·멘티 관리 → 유지/변경/제거 결정 |

**예상 작업량: 2~3주**

## Phase 5 — 메인페이지 + 랜딩페이지 리뉴얼 (1.5~2주)

| 작업 | 상세 |
|------|------|
| `(public)/page.tsx` 재작성 | 현재 779줄, 17개 섹션 — 점사 테마로 전면 개편 |
| 홈 콘텐츠 기본값 | `lib/siteContent.ts`(통계·성공스토리·혜택) 문구 전면 교체 |
| 상담사 찾기 | 분야별(사주/타로/신점/작명 등) 필터, 상담사 카드 재설계 |
| 상담사 상세/샵 | `shop/[slug]` 점사 테마 개편 |
| 상담사 모집 랜딩 | `become-seller` → `become-consultant` 재작성 |
| 디자인 시스템 | 컬러·타이포·아이콘 세트 점사 테마 확립 |
| FAQ·지원 | `HomeFaq`, `support/[slug]` 문구 개편 |

**예상 작업량: 1.5~2주** (디자인 시안 확보 시점에 따라 변동)

## Phase 6 — 추가 기능 (2~3주)

| 작업 | 상세 | 기존 자산 |
|------|------|----------|
| QR 예약 | 상담사별 예약 QR, 매장 배치용 인쇄 | `qrcode` + `ShopQRSection.tsx` **재사용 가능** |
| OBS 오버레이 | 라이브 방송 중 예약 현황·잔여 슬롯 표시 | `GameOverlayClient.tsx`(1,481줄) 구조 참고 |
| 실시간 슬롯 감소 | SSE 또는 폴링 최적화 | `LiveStatusPoller.tsx` 패턴 확장 |
| 라이브 중 즉시 예약 | 라이브 뷰어에서 슬롯 선택→결제 | `(live-viewer)/live/[code]` 확장 |
| 리뷰·후기 | 상담 후기 (사진·평점) | `Review` 모델 그대로 |

**예상 작업량: 2~3주**

## 전체 일정 요약

| Phase | 내용 | 기간 | 누적 |
|-------|------|------|------|
| 1 | 브랜딩/텍스트 | 2~3일 | ~0.5주 |
| 2 | DB 스키마 | 1~2주 | ~2.5주 |
| 3 | 예약 시스템 | 3~4주 | ~6.5주 |
| 4 | 상담사 대시보드 | 2~3주 | ~9.5주 |
| 5 | 메인/랜딩 | 1.5~2주 | ~11.5주 |
| 6 | 추가 기능 | 2~3주 | **~14.5주 (약 3.5개월)** |

병렬 진행(Phase 5를 3·4와 겹침) 시 **약 11~12주**로 단축 가능합니다.

---

# D. 주의사항 및 리스크

## D-1. 운영 DB 리스크 — 최우선

- `app/.env`의 `DATABASE_URL`은 **운영 RDS 직결**입니다. 로컬 Prisma 명령이 즉시 운영에 반영됩니다.
- **2026-07-07 운영 DB 전체 초기화 사고 전력** (PITR로 복원, 현 인스턴스 `reset.czuyyqg40lmv...`).
- **필수 선행 조치**:
  1. 스테이징 DB 신설 + `.env.staging` 분리 (Phase 2 착수 전 무조건)
  2. 모든 스키마 변경 전 `prisma migrate diff`로 변경 내용 확인
  3. RDS 스냅샷 수동 생성 + PITR 활성화 확인
  4. `migrate reset` / `db push --force-reset` / `--accept-data-loss` 절대 금지
  5. `npm run db:seed` 운영 실행 금지 (기존 데이터 덮어쓰기 가능)

## D-2. 데이터 마이그레이션 필요 여부

| 케이스 | 판단 |
|--------|------|
| **운영 데이터가 실제 있는 경우** | 기존 커머스 주문·정산 데이터를 예약 도메인으로 옮기는 건 **의미가 없습니다**. 아카이브 후 신규 시작을 권장 |
| **User 계정** | 유지 필수. `Role` enum 변경 시 기존 레코드 일괄 UPDATE 필요 |
| **정산 이력** | 회계·세무 근거 자료 → **절대 삭제 금지**, 읽기 전용 아카이브 |
| **Product/Order 테이블** | 리네임보다 **`@@map` 유지 + Prisma 모델명만 변경**이 안전 (테이블 무손실) |
| **배송 필드** | 삭제 금지, nullable 유지 |

→ **권장**: 신규 DB로 클린 시작 + 기존 운영 DB는 읽기 전용 보존. 실 데이터 볼륨을 먼저 확인해야 최종 결정 가능합니다.

## D-3. 라이브커머스 유지 시 충돌 지점

| 충돌 | 내용 | 대응 |
|------|------|------|
| `LiveStreamProduct` → `Product` FK | 라이브에 상품을 연결. 예약 상품은 재고가 아닌 **슬롯**이라 "라이브 중 판매" 개념이 성립하지 않음 | 라이브 중 "예약 접수"로 재정의. `livePrice` → 라이브 특가 예약비 |
| 게임 시스템 | `Game`/`GameCoupon` 4모델 + `GameOverlayClient`(1,481줄) — 라이브 참여 이벤트. 점사 도메인과 톤 충돌 가능 | 유지/제거를 사업 판단으로 조기 확정. 제거 시 Phase 1에서 메뉴 숨김 |
| 공동구매 캠페인 | 시간·수량 제한 할인. 점사에 "N명 모이면 할인" 개념이 필요한지 불명확 | **폐지 권장**. 단 `startDate/endDate/currentQuantity` 패턴은 슬롯 로직에 참고 |
| 4단계 마진 체인 | 브랜드→노드→중간관리자→셀러. 점사에 브랜드·노드가 존재하는지 불명확 | **사업 구조 확정이 최우선**. 미확정 시 Phase 2가 통째로 흔들림 |
| YouTube OAuth | 셀러 계정 명의 채팅 전송. 상담사에게도 유효 | 그대로 유지 |
| 패키지 상품 | `PackageProduct`/`PackageItem`/`PackagePurchaseOrder` — 여러 상품 묶음 발주 | 점사에서는 "상담 패키지(3회권 등)"로 **재해석 가능** — 오히려 유용 |

## D-4. 기술적 리스크

| 리스크 | 내용 | 대응 |
|--------|------|------|
| **예약 동시성** | 같은 슬롯에 동시 결제 → 초과 예약. 커머스 재고보다 훨씬 치명적 | DB 트랜잭션 + 유니크 제약 + 낙관적 락. **부하 테스트 필수** |
| **정산 스냅샷 로직** | `OrderItem`의 9개 `*Snap` 필드는 요율 변경 소급 사고(2026-07-12, 136,507원 이동) 대응으로 도입됨 | 예약 도메인에서도 **동일 패턴 유지 필수**. 제거 금지 |
| **`OrderItem.productId`가 FK 아님** | `itemType`(PRODUCT/DIRECT)에 따라 참조 테이블이 다름 | 예약 아이템 재설계 시 이 암묵적 다형성을 반드시 고려 |
| **아이콘 2중 시스템** | lucide-react(203파일) + PNG 505개 병행 | 리브랜딩 시 **한쪽으로 통일 권장**. 미통일 시 톤 불일치 |
| **`schema-gen.prisma` 잔재** | 1,193줄 구버전 스키마 파일 존재 | 혼동 유발 — 정리 필요 |
| **문서 노후화** | `CLAUDE.md`가 "4 roles", "API 52개"로 기재 (실제 6 roles, 202개) | Phase 1에서 함께 갱신 |
| **거대 파일** | `seller/live/page.tsx` 3,245줄, `live/[code]/page.tsx` 1,306줄, `GameOverlayClient` 1,481줄 | 수정 시 회귀 위험 큼. 테스트 부재 상태 |
| **테스트 없음** | 테스트 프레임워크·테스트 파일 미발견 | 130개+ 파일 수정하는 Phase 2가 특히 위험. **최소한의 스모크 테스트 도입 권장** |
| **루트 스크립트 난립** | `.bat`/`.ps1`/`.vbs` 60여 개, `_trash_temp/`, `tmp/`, `output/` | Phase 1에서 정리 권장 |

## D-5. 사업/법무 리스크

- **약관·개인정보처리방침 전면 재작성 필요** — 점사·상담 서비스는 커머스와 다른 고지 의무가 있습니다. 생년월일시 등 민감정보 수집 시 별도 동의 필요.
- **통신판매업 신고 내용 변경** 검토 필요 (`SellerProfile.telecomSalesLicenseNo` 필드 존재).
- **PG사 업종 코드 변경** 필요 가능성 — 3개 PG사(SeedPay/SmartroPay/Ongi) 모두 상품 판매 기준으로 계약되어 있을 것이므로, 상담 서비스로의 업종 변경 승인 절차를 사전 확인해야 합니다. **미확인 시 Phase 3 완료 후 결제가 막히는 최악의 시나리오가 발생합니다.**

## D-6. 착수 전 확정이 필요한 사업 결정 (블로커)

아래가 미확정이면 Phase 2 이후 설계가 성립하지 않습니다.

1. **역할 구조** — 브랜드·노드·중간관리자 4단계를 유지할 것인가? (점사는 상담사-고객 2자 구조가 자연스러움)
2. **기존 운영 데이터** — 실제 거래 데이터가 있는가? 이관 대상인가?
3. **라이브커머스 존치** — 상담사 라이브 방송을 계속 운영하는가?
4. **게임/공동구매/패키지** — 각각 유지·폐지 판단
5. **결제 시점** — 예약 시 선결제 vs 상담 후 결제 vs 예약금
6. **상담 진행 채널** — 대면 / 전화 / 영상 중 무엇을 지원하는가?
7. **신규 도메인** — `sellerbricks.co.kr` 대체 도메인 확보 여부

---

## 요약

- 이 작업은 **리브랜딩이 아니라 도메인 전환**입니다. Phase 1(브랜딩)은 2~3일이면 끝나지만, 실제 점사 플랫폼이 되려면 **약 3.5개월**이 필요합니다.
- 재사용 가치가 가장 높은 자산: **인증·결제(PG 3종)·알림톡·라이브커머스·정산 인프라·공통 UI 150개**.
- 가장 큰 리스크: **운영 DB 직결 환경에서의 스키마 변경**(Phase 2)과 **예약 슬롯 동시성**(Phase 3).
- 착수 전 **D-6의 7개 사업 결정**을 먼저 확정하시길 강력히 권합니다.
