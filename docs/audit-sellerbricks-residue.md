# 사주메이트 — 셀러브릭스 잔재 감사 보고서

> **작성일**: 2026-08-13  
> **감사 대상**: `app/src` 전체  
> **방침**: 조사 및 보고 전용 — 이 문서는 수정 없이 작성됨

---

## 요약 스코어카드

| 심각도 | 건수 | 영역 |
|--------|------|------|
| **높음** | 5건 | 공개 UI에 실물 배송비·배송지 문구 노출, 회원가입 "인플루언서 추천인코드" 노출, 관리자 "공급자(브랜드·중간관리자) 수수료 수익" 노출 |
| **중간** | 11건 | 재고 UI, 채널인증 관리자 설정, sellerbricks 변수명, referral API 활성 상태, 단체 상담(공동구매) 메뉴, 인플루언서 용어 |
| **낮음** | 20+건 | 주석, 레거시 enum, 경로 패턴 잔재, DB 모델명, 빈 배열 변수 등 |

**총 수정 규모 예상**: 파일 약 30~35개, 수정 라인 수 약 120~160줄.  
높음·중간 항목 위주로 우선순위 처리 권장. 낮음(주석·enum) 항목은 별도 클린업 스프린트 처리 가능.

---

## 1. 셀러브릭스 잔재 — 텍스트/변수명/주석

### 1-1. `sellerbricks` 변수명/prop (심각도: **중간**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `app/(dashboard)/admin/settlements/page.tsx` | L50, L84 | `const sellerbricksRevenue = revenue.netRevenue` — 변수명 및 prop 전달 |
| `components/admin/AdminPayoutSettlement.tsx` | L37, L104 | `sellerbricksRevenue: number` 타입 정의, prop 수신 (UI label은 "사주메이트 수익"으로 이미 교체됨) |

**수정 방향**: 변수명/prop명을 `saju_revenue` 또는 `platformRevenue`로 리네임.

---

### 1-2. `셀러브릭스` 주석 잔재 (심각도: **낮음**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `components/shared/BookingContactForm.tsx` | L6 | "셀러브릭스 시절의 배송지 입력... 대체한다" |
| `components/shared/PickSellerButton.tsx` | L11 | "셀러브릭스 시절의 SNS 채널 구독 인증... 제거" |
| `generated/prisma/schema.prisma` | L21 | "레거시 값(SELLER/BUYER...)은 셀러브릭스 시절 데이터" |
| `lib/defaults.ts` | L42, L123 | "(셀러브릭스 시절 꿀벌 캐릭터...)" |
| `lib/roles.ts` | L10 | 셀러브릭스 시절 역할 주석 |
| `lib/siteContent.ts` | L8, L47 | 주석 |

**수정 방향**: 주석 삭제 또는 "레거시" 표현으로 중립화.

---

### 1-3. 역할 enum 레거시 값 (심각도: **낮음**, 하위호환 목적 잔존)

| 파일 | 위치 | 내용 |
|------|------|------|
| `generated/prisma/schema.prisma` | L28–35 | enum Role에 `CONSULTANT`, `CUSTOMER`, `SELLER`, `BUYER`, `NODE`, `MIDDLE_ADMIN`, `BRAND_ADMIN` 공존 |
| `lib/roles.ts` | L7–16 | `normalizeRole()`: SELLER→CONSULTANT, BUYER→CUSTOMER, BRAND_ADMIN→CUSTOMER로 세션 레이어에서 변환 (**현재 올바르게 처리됨**) |
| `app/api/admin/customers/route.ts` | L40 | `role: { in: ["CUSTOMER", "BUYER"] }` — 레거시 BUYER도 조회 (하위호환) |
| `generated/prisma/schema.prisma` | L1684 | `creatorRole String // SUPER_ADMIN \| BRAND_ADMIN \| SELLER \| MIDDLE_ADMIN` — 자유 문자열 필드에 레거시 값 명시 |

**수정 방향**: `normalizeRole()` 로직은 유지(하위호환 필요). 중장기적으로 DB 마이그레이션으로 레거시 값 정리. 당장은 낮은 우선순위.

---

### 1-4. 배송 관련 공개 UI 문구 (심각도: **높음**)

실물 배송 전제 문구가 사주 상담 서비스의 공개 UI에 그대로 노출됨.

| 파일 | 위치 | 노출 문구 |
|------|------|-----------|
| `app/(public)/support/[slug]/SupportContent.tsx` | L151 | **"3만원 이상 구매 시 무료배송입니다. 미만 시 배송비 3,000원이 부과됩니다."** |
| `app/(public)/support/[slug]/SupportContent.tsx` | L159 | **"수령 후 7일 이내 신청 가능합니다. 단순 변심의 경우 왕복 배송비가 발생합니다."** |
| `app/(public)/support/[slug]/SupportContent.tsx` | L194 | 개인정보처리방침 수집 항목에 **"배송지 정보"** 포함 |
| `app/(public)/products/[id]/page.tsx` | L293 | **"무료배송 · 3~5일 이내 상담 방식"** — 배송과 상담을 혼용 표기 |

**수정 방향**: 배송비 문구 삭제, 반품 정책 → 예약 취소 정책으로 교체. 개인정보처리방침에서 배송지 항목 제거. 상품 상세 "무료배송" 제거.

---

### 1-5. 재고 관련 UI (심각도: **중간**)

상담 서비스에 "재고 N개" 표시는 맥락 불일치.

| 파일 | 위치 | 내용 |
|------|------|------|
| `components/shared/ProductDetailModal.tsx` | L246 | `"재고 {data.totalStock}"` — 상품 상세 모달 공개 노출 |
| `components/shared/ProductBottomSheet.tsx` | L478 | `"재고 {effectiveVariant.stock.toLocaleString()}개"` — 옵션 선택 UI |
| `components/shared/HomeFinalCta.tsx` | L63 | `"소싱·재고 부담 없이 브랜드 상담상품 판매"` — 공개 랜딩 |
| `components/shared/OptionGroupEditor.tsx` | L190, L232 | "재고" 열 헤더, "총 재고: N개" — 상담사/관리자 상품 등록 UI |
| `components/shared/BulkProductRegister.tsx` | L105 | "배송비 칸을 비우거나 0으로 두면 무료배송으로 표시됩니다" |

**수정 방향**: "재고" → "예약 가능 횟수" 또는 "동시 예약 제한" 등으로 교체. 랜딩 문구 사주메이트 맥락으로 재작성.

---

### 1-6. 레퍼럴 "인플루언서 추천인 코드" — 회원가입 UI (심각도: **높음**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `app/auth/register/page.tsx` | L570 | **"인플루언서 추천인 코드를 입력하면 특별 할인 혜택을 받을 수 있습니다"** — 일반 회원가입 공개 UI에 노출 |
| `app/api/auth/register/route.ts` | L17, L92 | 회원가입 API에 `referralCode` 처리 로직 존재 |
| `lib/featureFlags.ts` | L21 | `FEATURE_REFERRAL = false` — **플래그는 비활성화**, 그러나 UI 문구가 노출 중 |

**수정 방향**: `FEATURE_REFERRAL = false`임에도 UI 문구가 표시되는 버그. 조건부 렌더링이 올바르게 적용되었는지 확인 후 문구 제거 또는 사주메이트 맥락으로 교체.

---

### 1-7. 채널인증 할인 관리자 설정 UI (심각도: **중간**)

채널인증은 2026-07 폐지 처리됐으나 관리자 설정 패널이 잔존.

| 파일 | 위치 | 내용 |
|------|------|------|
| `app/(dashboard)/admin/seller-rates/page.tsx` | L120 | 페이지 설명: **"상담사별 고객 추천 혜택과 채널 인증 할인율을 설정합니다"** |
| `app/(dashboard)/admin/seller-rates/page.tsx` | L247 | **"③ 단골 + 채널인증 할인 (pickDiscountRate)"** 설정 패널 |
| `app/(public)/my/orders/[id]/page.tsx` | L138 | `"채널인증 할인"` — 주문 상세 페이지 표기 |
| `app/api/buyer/discount-info/route.ts` | L6 | 주석: "추천인/픽(채널인증) 할인은 2026-07 폐지" (기능 비활성화 처리됨) |

**수정 방향**: 관리자 할인율 설정 패널에서 채널인증 항목 제거. 주문 상세에서 "채널인증 할인" 레이블 제거 또는 숨김.

---

## 2. 라이브 방송 페이지 (`/live/*`)

### 2-1. 전체 파일 목록

| 경로 | 역할 |
|------|------|
| `app/(live-viewer)/live/[code]/page.tsx` | 채널 페이지 — `status`(SCHEDULED/LIVE/ENDED) 분기로 pre-live 겸용 |
| `app/(live-viewer)/live/[code]/watch/page.tsx` | 실시간 시청 페이지 |
| `app/(live-viewer)/layout.tsx` | 라이브 뷰어 레이아웃 |
| `app/(public)/live/page.tsx` | 라이브 목록/검색 페이지 |
| `app/(dashboard)/seller/live/page.tsx` | 상담사 라이브 관리 대시보드 |
| `app/(dashboard)/seller/live-mode/page.tsx` | 라이브 모드 설정 |
| `app/(dashboard)/admin/lives/page.tsx` | 관리자 라이브 목록 |
| `app/(dashboard)/admin/lives/[id]/page.tsx` | 관리자 라이브 상세 |
| `app/(dashboard)/admin/live-products/page.tsx` | 관리자 라이브 상담상품 관리 |

### 2-2. pre-live 미리보기 페이지 존재 여부

**별도 `/pre-live` 경로 없음.** `(live-viewer)/live/[code]/page.tsx`가 `channel.status === "SCHEDULED"` 분기로 동일 URL에서 pre-live 화면을 처리함. 구조적 문제 없음.

### 2-3. 셀러브릭스 용어 현황

| 심각도 | 내용 |
|--------|------|
| **낮음** | 라이브 UI 텍스트는 대부분 사주메이트 용어("상담사", "상담상품")로 교체됨 |
| 양호 | `(live-viewer)/live/[code]/page.tsx` L813: `"사주메이트는 통신판매중개자..."` 올바르게 반영 |

**결론**: 라이브 방송 페이지는 UI 텍스트 기준으로 양호. 기능 자체는 셀러브릭스에서 가져왔으나 현재 사주메이트 도메인에 맞게 정비된 상태.

---

## 3. 상담사 관리자 > 상담 상품 메뉴

### 3-1. 일반 커머스 개념 잔재 (심각도: **중간**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `components/shared/OptionGroupEditor.tsx` | L190, L232 | "재고" 열 헤더, "총 재고: N개" — 상담사 상품 등록/편집 UI |
| `components/shared/BulkProductRegister.tsx` | L105 | **"배송비 칸을 비우거나 0으로 두면 무료배송으로 표시됩니다"** — 대량 등록 도구 |
| `components/shared/ProductDetailModal.tsx` | L246 | `"재고 {data.totalStock}"` — 구매자 상품 상세 모달 |
| `components/shared/ProductBottomSheet.tsx` | L478 | `"재고 {effectiveVariant.stock.toLocaleString()}개"` — 구매자 옵션 선택 UI |

### 3-2. 관리자 수익 화면의 브랜드/중간관리자 잔재 (심각도: **높음**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `app/(dashboard)/admin/revenue/AdminRevenueClient.tsx` | L123 | UI 텍스트: **`"공급자(브랜드·중간관리자) 수수료 수익"`** — 관리자 화면에 3자 구조 용어 노출 |
| `app/(dashboard)/admin/revenue/page.tsx` | L39 | 주석: `"상담사 요율, 공급가(브랜드/중간관리자 몫)"` |
| `app/(dashboard)/admin/products/page.tsx` | L30–31 | 주석: `"브랜드·중간관리자"` |

**수정 방향**: `AdminRevenueClient.tsx` L123 레이블을 "플랫폼 수수료 수익" 또는 해당 항목의 실제 의미에 맞게 교체.

---

## 4. 네비게이션/메뉴

### 4-1. 역할 처리 현황 (심각도: **낮음**, 대체로 올바름)

`lib/roles.ts`의 `normalizeRole()`이 세션 레이어에서 레거시 역할을 정규화.  
앱 코드 분기는 `SUPER_ADMIN / CONSULTANT / CUSTOMER` 3역할로 처리.  
BottomNav 하단 탭: `홈 / 라이브 / 예약 / 상담사 / 마이페이지` — 사주메이트 맥락에 부합.

### 4-2. 경로 패턴 잔재 (심각도: **낮음**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `components/layout/MobileNav.tsx` | L34–35 | `DASHBOARD_PATHS` 배열에 `/brand` 경로 패턴 포함 |
| `components/shared/SidebarNavLinks.tsx` | L40 | `isDashboardRoot` 판정 배열에 `"/brand"`, `"/middle"` 포함 |
| `components/layout/Header.tsx` | L25 (주석) | `"상담사/브랜드/관리자는 숨김"` |

**수정 방향**: `/brand`, `/middle` 경로 패턴 제거. 주석 수정.

### 4-3. 사이드바 단체 상담 관리 메뉴 (심각도: **중간**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `app/(dashboard)/layout.tsx` | L52 | 관리자 사이드바 메뉴: **"단체 상담 관리"** (`/admin/campaigns`) |

공동구매 → 단체 상담으로 명칭은 변경됐으나, 사주메이트에서 이 기능이 실제 운용되는지 여부를 확인해야 함. 미사용 시 메뉴 제거 권장.

---

## 5. API 라우트

### 5-1. 공동구매/단체상담 API (심각도: **중간**)

| 엔드포인트 | 기능 | 비고 |
|-----------|------|------|
| `GET/POST /api/campaigns` | 단체 상담 캠페인 조회 | `GroupBuyCampaign` 모델 직접 사용 |
| `GET/POST /api/seller/campaigns` | 상담사 단체 상담 관리 | `FEATURE_GROUP_BUY` flag 조건부 |
| `GET/POST /api/seller/available-campaigns` | 참여 가능 단체 상담 목록 | flag 조건부 |

`lib/featureFlags.ts` `FEATURE_GROUP_BUY = true` — 현재 활성 상태. DB 모델명 `GroupBuyCampaign`은 레거시이나 기능 자체는 운용 중.

### 5-2. 레퍼럴 API (심각도: **중간**)

| 엔드포인트 | 상태 |
|-----------|------|
| `GET/POST /api/seller/referral` | 활성 상태 — referral 코드/정보 관리 |
| `app/api/admin/seller-rates` | `referralCommissionRate`, `pickDiscountRate` 필드 포함 |

`FEATURE_REFERRAL = false`로 비활성화 플래그를 설정했으나 API 자체는 살아있음.

### 5-3. 중간관리자/브랜드 관련 잔재 (심각도: **낮음**~**중간**)

| 파일 | 위치 | 내용 |
|------|------|------|
| `app/api/admin/sellers/route.ts` | L5, L14, L22–26 | PUT 핸들러에서 `middleAdminId`, `middleAdminMarginRate` 업데이트 로직 존재 |
| `app/(dashboard)/admin/manual-settlement/page.tsx` | L21–31 | `middleAdminUsers`, `brandAdminUsers` 변수 — 주석으로 "레거시 슬롯, 미사용" 명시됨 |
| `app/(dashboard)/admin/tax/page.tsx` | L49–51 | `"브랜드·중간관리자 개념이 제거되어..."` 주석 + `middleAdmins` 빈 배열 |
| `components/shared/ReferralLinkManager.tsx` | 전체 | 추천인 UI 컴포넌트 — 상담사 대시보드에 노출 |

**수정 방향**: `api/admin/sellers/route.ts` — `middleAdminId`, `middleAdminMarginRate` 업데이트 블록 제거. `ReferralLinkManager` — `FEATURE_REFERRAL` 플래그 적용 여부 확인 후 숨김 처리 또는 제거.

---

## 전체 수정 우선순위 정리

### 🔴 높음 (즉시 처리)

| # | 파일 | 내용 |
|---|------|------|
| H1 | `app/(public)/support/[slug]/SupportContent.tsx` | 무료배송/배송비/왕복배송비/배송지 정보 문구 제거 |
| H2 | `app/(public)/products/[id]/page.tsx` | "무료배송 · 3~5일 이내 상담 방식" 혼용 문구 수정 |
| H3 | `app/auth/register/page.tsx` | "인플루언서 추천인 코드" 회원가입 UI 문구 제거 또는 조건부 렌더링 수정 |
| H4 | `app/(dashboard)/admin/revenue/AdminRevenueClient.tsx` | "공급자(브랜드·중간관리자) 수수료 수익" 레이블 교체 |

### 🟡 중간 (1~2주 내 처리)

| # | 파일 | 내용 |
|---|------|------|
| M1 | `components/shared/ProductDetailModal.tsx`, `ProductBottomSheet.tsx` | "재고 N개" → "예약 가능 횟수" 등으로 교체 |
| M2 | `components/shared/HomeFinalCta.tsx` | "소싱·재고 부담 없이 브랜드 상담상품 판매" 문구 수정 |
| M3 | `app/(dashboard)/admin/seller-rates/page.tsx` | 채널인증 할인 설정 패널 제거 |
| M4 | `app/(public)/my/orders/[id]/page.tsx` | "채널인증 할인" 레이블 제거 |
| M5 | `admin/settlements/page.tsx`, `AdminPayoutSettlement.tsx` | `sellerbricksRevenue` 변수명/prop 리네임 |
| M6 | `components/shared/ReferralLinkManager.tsx` | `FEATURE_REFERRAL` 플래그 조건부 렌더링 확인 및 적용 |
| M7 | `app/(dashboard)/layout.tsx` | "단체 상담 관리" 메뉴 — 실제 운용 여부 확인 후 처리 |
| M8 | `components/shared/OptionGroupEditor.tsx`, `BulkProductRegister.tsx` | "재고"/"배송비" 레이블 수정 |
| M9 | `app/api/admin/sellers/route.ts` | `middleAdminId`, `middleAdminMarginRate` 업데이트 블록 제거 |
| M10 | `components/shared/ReferralLinkManager.tsx` | referral API 비활성화/제거 여부 결정 |

### 🟢 낮음 (클린업 스프린트)

- 6개 파일 주석에서 `셀러브릭스` 제거
- `MobileNav.tsx`, `SidebarNavLinks.tsx`에서 `/brand`, `/middle` 경로 패턴 제거
- `generated/prisma/schema.prisma` 레거시 enum 중장기 정리 (DB 마이그레이션 필요)
- 각종 파일 주석에서 "브랜드", "중간관리자", "SELLER/BUYER" 등 레거시 용어 정리

---

## 총 수정 규모 예상

| 구분 | 예상 수치 |
|------|----------|
| 영향 파일 수 | 30~35개 |
| 수정 라인 수 (순수) | 120~160줄 |
| 높음 처리 예상 시간 | 4~6시간 |
| 중간 처리 예상 시간 | 1~2일 |
| 낮음(클린업) 예상 시간 | 반나절 |

> 데이터베이스 스키마 레거시 enum(`SELLER`, `BUYER`, `BRAND_ADMIN` 등) 정리는 **운영 DB 마이그레이션**이 필요하므로 별도 계획 수립 권장. `normalizeRole()`이 올바르게 처리하고 있으므로 기능 오류는 없으나, DB 직접 조회 시 혼선 우려 있음.
