import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import SafeImage from "@/components/shared/SafeImage";
import SellerShopFooter from "@/components/shared/SellerShopFooter";
import SellerShopHeader from "@/components/shared/SellerShopHeader";
import SellerShopBottomNav from "@/components/shared/SellerShopBottomNav";
import ShopContextSync from "@/components/shared/ShopContextSync";
import ShopBookingCalendar, { type DaySlots } from "@/components/shared/ShopBookingCalendar";
import ShopShareButton from "@/components/shared/ShopShareButton";
import ReservationCountdown from "@/components/shop/ReservationCountdown";
import { CalendarCheck, Clock, Video, Phone, MapPin, Sparkles, ChevronRight, CalendarDays, Play } from "lucide-react";
import { getFeatureFlags } from "@/lib/settings";
import { DEFAULT_PRODUCT_IMAGE, resolveSellerDisplayImage, resolveShopBanner } from "@/lib/defaults";
import { OnAirBadge, LIVE_RING_CLASS } from "@/components/shared/LiveBadge";
import { getShopCustomization } from "@/lib/shopCustomization";
import { safeQuery } from "@/lib/safeDb";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// /shop/[slug] — 상담사 점집 공개 페이지 (예약 커머스)
//
// 구성: 프로필 헤더 → 오늘의 예약 현황 → 상담 메뉴 → 상세 소개 → 예약 달력 → 콘텐츠
// 커머스(장바구니·배송·구매 버튼·구매 리뷰·팔로우 마케팅 UI)는 제거되었다.
//
// ⚠️ TimeSlot / Reservation 테이블은 운영 DB 에 아직 반영되지 않았다(스키마 드리프트).
//    safeQuery 로 감싸 빈 값으로 폴백하므로, 미반영 환경에서는 예약 현황·달력이
//    "열린 시간 없음" 상태로 표시된다. (페이지 자체는 죽지 않는다)
// ─────────────────────────────────────────────────────────────

const BASE_PRODUCT_SELECT = {
  id: true,
  name: true,
  basePrice: true,
  thumbnail: true,
  description: true,
} as const;

const CONSULTING_PRODUCT_SELECT = {
  ...BASE_PRODUCT_SELECT,
  consultingType: true,
  consultingMethod: true,
  durationMinutes: true,
} as const;

interface ShopProduct {
  id: string;
  name: string;
  basePrice: unknown;
  thumbnail: string | null;
  description: string | null;
  consultingType?: string;
  consultingMethod?: string;
  durationMinutes?: number;
}

function sellerInclude(productSelect: object) {
  return {
    user: { select: { id: true, name: true, avatar: true } },
    shopProducts: {
      where: { isActive: true },
      include: { product: { select: productSelect } },
      orderBy: { displayOrder: "asc" as const },
    },
    liveStreams: {
      where: { status: "LIVE" as const },
      take: 1,
      select: { id: true, shareCode: true, title: true },
    },
    _count: { select: { fans: true, followers: true } },
  };
}

/** 상담 컬럼(consultingType 등) 미반영 환경 대비 폴백 조회 */
async function getSeller(slug: string) {
  try {
    const full = await prisma.sellerProfile.findUnique({
      where: { slug },
      include: sellerInclude(CONSULTING_PRODUCT_SELECT),
    });
    return { seller: full, hasConsultingFields: true as const };
  } catch (e) {
    console.error("점집 페이지: 상담 컬럼 조회 실패, 기본 컬럼으로 폴백", e);
    const basic = await prisma.sellerProfile.findUnique({
      where: { slug },
      include: sellerInclude(BASE_PRODUCT_SELECT),
    });
    return { seller: basic, hasConsultingFields: false as const };
  }
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const METHOD_META: Record<string, { label: string; Icon: typeof Video }> = {
  video: { label: "영상 상담", Icon: Video },
  phone: { label: "전화 상담", Icon: Phone },
  visit: { label: "방문 상담", Icon: MapPin },
};

function methodMeta(raw?: string | null) {
  if (!raw) return null;
  const key = raw.toLowerCase();
  if (METHOD_META[key]) return METHOD_META[key];
  if (raw.includes("영상")) return METHOD_META.video;
  if (raw.includes("전화")) return METHOD_META.phone;
  if (raw.includes("방문")) return METHOD_META.visit;
  return { label: raw, Icon: Video };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const seller = await prisma.sellerProfile.findUnique({
    where: { slug },
    select: { id: true, shopName: true, shopDescription: true, shopBanner: true },
  });
  if (!seller) return { title: "점집을 찾을 수 없습니다 | 사주나라" };

  const custom = await getShopCustomization(seller.id);
  const description =
    custom.tagline || seller.shopDescription || `${seller.shopName}에게 지금 상담을 예약하세요.`;
  const image = resolveShopBanner(seller.shopBanner, seller.id);
  const pageTitle = seller.shopName.endsWith("점집") ? seller.shopName : `${seller.shopName}의 점집`;
  const title = `${pageTitle} - 사주나라`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/shop/${slug}`,
      siteName: "사주나라",
      type: "profile",
      images: [{ url: image, width: 1200, height: 630, alt: `${seller.shopName}의 점집` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SellerShopPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { brix: FEATURE_CONTENT } = await getFeatureFlags();
  const { slug } = await Promise.resolve(params);
  const { seller, hasConsultingFields } = await getSeller(slug);
  if (!seller || !seller.isApproved) notFound();

  const customization = await getShopCustomization(seller.id);
  const themeColor = seller.shopThemeColor || "#6D4BE8";
  const avatar = resolveSellerDisplayImage(seller);
  const banner = resolveShopBanner(seller.shopBanner, seller.id);

  // ─── 상담 메뉴 ───
  const products = seller.shopProducts.map((sp) => {
    const p = sp.product as unknown as ShopProduct;
    return {
      id: p.id,
      name: p.name,
      price: Number((sp as any).sellerPrice ?? p.basePrice),
      thumbnail: p.thumbnail,
      description: p.description,
      consultingType: hasConsultingFields ? p.consultingType ?? null : null,
      consultingMethod: hasConsultingFields ? p.consultingMethod ?? null : null,
      durationMinutes: hasConsultingFields ? p.durationMinutes ?? null : null,
    };
  });

  // ─── 상담 분야 태그 (상담사 지정 > 상품 consultingType > 카테고리) ───
  const consultTags = customization.tags.length > 0
    ? customization.tags
    : Array.from(new Set(products.map((p) => p.consultingType).filter((t): t is string => !!t))).length > 0
      ? Array.from(new Set(products.map((p) => p.consultingType).filter((t): t is string => !!t)))
      : [seller.category, seller.mood].filter((v): v is string => !!v);

  // ─── 예약 가능 슬롯 (오늘 ~ 60일) ───
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeEnd = new Date(todayStart);
  rangeEnd.setDate(rangeEnd.getDate() + 60);

  const rawSlots = await safeQuery(
    "shop page timeslots",
    () =>
      prisma.timeSlot.findMany({
        where: {
          consultantId: seller.user.id,
          isAvailable: true,
          reservationId: null,
          date: { gte: todayStart, lte: rangeEnd },
        },
        select: { date: true, startTime: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 800,
      }),
    [] as { date: Date; startTime: string }[],
  );

  const byDate = new Map<string, string[]>();
  for (const s of rawSlots) {
    const key = toYmd(new Date(s.date));
    const list = byDate.get(key) ?? [];
    list.push(s.startTime);
    byDate.set(key, list);
  }
  const daySlots: DaySlots[] = Array.from(byDate.entries())
    .map(([date, times]) => ({ date, times: times.sort() }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayKey = toYmd(now);

  // ─── 로그인 세션 + 내 예약 조회 ───
  const session = await auth();
  const myReservation = await safeQuery(
    "shop page my reservation",
    async (): Promise<{ reservationDate: Date; reservationTime: string } | null> => {
      if (!session?.user?.id) return null;
      return prisma.reservation.findFirst({
        where: {
          userId: session.user.id,
          sellerId: seller.id,
          reservationDate: { gte: now },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { reservationDate: true, reservationTime: true },
        orderBy: { reservationDate: "asc" },
      });
    },
    null,
  );

  // 예약 날짜 + 시간 → ISO string (클라이언트 컴포넌트에 직렬화하여 전달)
  let myReservationIso: string | null = null;
  if (myReservation) {
    const rd = new Date(myReservation.reservationDate);
    const [rh, rm] = myReservation.reservationTime.split(":").map(Number);
    rd.setHours(rh, rm, 0, 0);
    myReservationIso = rd.toISOString();
  }

  // ─── 콘텐츠 (선택) ───
  const contents = FEATURE_CONTENT && (seller.featureContent ?? true)
    ? await safeQuery(
        "shop page contents",
        () =>
          prisma.contentPost.findMany({
            where: { sellerId: seller.id, isPublished: true },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { id: true, title: true, images: true, createdAt: true },
          }),
        [] as { id: string; title: string; images: string | null; createdAt: Date }[],
      )
    : [];

  // ─── 라이브 진행 여부 ───
  const currentLive = seller.liveStreams[0] ?? null;
  const manualLiveOn = (seller as any).isManualLive ?? false;
  const showLive = manualLiveOn || !!currentLive;

  // 수동 라이브(방송 레코드 없이 토글만 켠 경우)에 설정한 외부 링크.
  // 스킴(https://)이 빠져 있으면 붙여줘 상대경로로 잘못 해석되지 않게 한다.
  const manualLiveLink = (() => {
    const raw = manualLiveOn ? String((seller as any).liveLink || "").trim() : "";
    if (!raw) return null;
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  })();

  // 프로필 클릭 대상:
  //   · 실제 방송 중  → 앱 내부 라이브 뷰어(/live/{shareCode})
  //   · 수동 라이브    → 상담사가 설정한 외부 링크(manualLiveLink)
  const liveHref = currentLive ? `/live/${currentLive.shareCode}` : manualLiveLink;
  const profileLiveHref = showLive ? liveHref : null;
  // "/"로 시작하면 내부 경로, 아니면 외부 링크(새 탭)로 연다.
  const profileLiveIsExternal = !!profileLiveHref && !profileLiveHref.startsWith("/");

  const bookHref = `/shop/${seller.slug}/book`;

  // 프로필 아바타 이미지 (링크 유무와 무관하게 동일 노드 재사용)
  const avatarImage = (
    <SafeImage
      src={avatar}
      alt={seller.shopName}
      width={72}
      height={72}
      fallbackText={seller.shopName.charAt(0)}
    />
  );

  return (
    <div className="animate-fade-in bg-[#f7f6fb] min-h-screen">
      <ShopContextSync shop={{ slug: seller.slug, name: seller.shopName, logo: avatar }} />

      <SellerShopHeader
        sellerName={seller.user.name || seller.shopName}
        sellerLogo={avatar}
        sellerSlug={seller.slug}
        sellerId={seller.id}
        showLive={showLive}
        liveHref={liveHref}
      />

      {/* ───── 1. 상담사 프로필 헤더 ───── */}
      <section className="relative pb-1">
        <div className="h-44 overflow-hidden bg-[#171029] relative">
          <img
            src={banner}
            alt={`${seller.shopName} 배너`}
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, rgba(16, 10, 31, 0.62) 0%, ${themeColor}20 48%, transparent 78%)` }}
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        <div className="relative px-4 -mt-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-[26px] shadow-[0_12px_36px_rgba(35,22,67,0.12)] border border-white p-[18px] pb-5">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center flex-shrink-0 -mt-9">
                {profileLiveHref ? (
                  // 라이브 중 — 프로필 클릭 시 연동된 라이브(YouTube 등)로 이동
                  <a
                    href={profileLiveHref}
                    {...(profileLiveIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    aria-label="라이브 방송 보기"
                    title="라이브 방송 보기"
                    className={`group relative block w-[72px] h-[72px] rounded-full overflow-hidden ring-4 bg-white shadow-md ${LIVE_RING_CLASS}`}
                  >
                    {avatarImage}
                    {/* 클릭 유도 오버레이 (라이브 재생) */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-90 transition-opacity group-hover:bg-black/35">
                      <Play size={22} className="text-white drop-shadow" fill="#ffffff" strokeWidth={0} />
                    </span>
                  </a>
                ) : (
                  <div
                    className={`relative w-[72px] h-[72px] rounded-full overflow-hidden ring-4 bg-white shadow-md ${
                      showLive ? LIVE_RING_CLASS : "ring-white"
                    }`}
                  >
                    {avatarImage}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-gray-950 truncate">{seller.shopName}</h1>
                  {showLive && <OnAirBadge />}
                </div>
                {seller.user.name && seller.user.name !== seller.shopName && (
                  <p className="mt-0.5 text-[11px] font-medium text-gray-400">{seller.user.name} 상담사</p>
                )}
                {customization.tagline && (
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{customization.tagline}</p>
                )}
              </div>
            </div>

            {/* 상담 분야 태그 */}
            {consultTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3.5">
                {consultTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                    style={{ color: themeColor, borderColor: `${themeColor}55`, backgroundColor: `${themeColor}12` }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3.5 pt-3.5 border-t border-gray-100">
              <ShopShareButton slug={seller.slug} shopName={seller.shopName} themeColor={themeColor} />
            </div>
          </div>
        </div>
      </section>

      {/* ───── 2. 내 예약 현황 ───── */}
      <section className="px-4 mt-5">
        <div className="bg-white rounded-3xl border border-gray-100/80 shadow-sm p-[18px]">
          <div className="flex items-center gap-1.5 mb-3">
            <CalendarDays size={15} strokeWidth={1.8} style={{ color: themeColor }} />
            <h2 className="text-sm font-bold text-gray-900">내 예약 현황</h2>
          </div>

          {myReservation && myReservationIso ? (
            <ReservationCountdown
              reservationIso={myReservationIso}
              reservationDateLabel={toYmd(new Date(myReservation.reservationDate))}
              reservationTimeStr={myReservation.reservationTime}
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">예약 내역이 없습니다</p>
              <Link
                href={bookHref}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-extrabold text-[14px] text-white shadow-sm active:scale-[0.98] transition-transform"
                style={{ backgroundColor: themeColor }}
              >
                <CalendarCheck size={17} strokeWidth={2} />
                지금 예약하기
              </Link>
            </div>
          )}

          {daySlots.length === 0 && (
            <p className="text-[11px] text-gray-400 text-center mt-2">
              열린 예약 시간이 없어 예약 신청만 접수됩니다.
            </p>
          )}
        </div>
      </section>

      {/* ───── 3. 상담 메뉴 ───── */}
      <section className="px-4 mt-4">
        <div className="bg-white rounded-3xl border border-gray-100/80 shadow-sm p-[18px]">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={15} strokeWidth={1.8} style={{ color: themeColor }} />
            <h2 className="text-sm font-bold text-gray-900">상담 메뉴</h2>
          </div>
          <p className="text-[11px] text-gray-400 mb-3">원하는 상담을 고르면 예약 화면으로 이동합니다</p>

          {products.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-gray-400">
              아직 등록된 상담 메뉴가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {products.map((p) => {
                const mm = methodMeta(p.consultingMethod);
                return (
                  <li key={p.id}>
                    <Link
                      href={`${bookHref}?productId=${p.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-transparent bg-gray-50/80 hover:bg-white hover:border-gray-200 hover:shadow-sm active:scale-[0.99] transition-all"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                        <SafeImage
                          src={p.thumbnail}
                          placeholder={DEFAULT_PRODUCT_IMAGE}
                          alt={p.name}
                          width={64}
                          height={64}
                          fallbackText={p.name.charAt(0)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{p.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                          {p.consultingType && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium">
                              {p.consultingType}
                            </span>
                          )}
                          {p.durationMinutes && (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock size={11} strokeWidth={1.6} />
                              {p.durationMinutes}분
                            </span>
                          )}
                          {mm && (
                            <span className="inline-flex items-center gap-0.5">
                              <mm.Icon size={11} strokeWidth={1.6} />
                              {mm.label}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[15px] font-extrabold" style={{ color: themeColor }}>
                          {formatPrice(p.price)}
                        </p>
                      </div>
                      <span
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
                      >
                        예약하기
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ───── 4. 상세 소개 ───── */}
      {(customization.intro || seller.shopDescription) && (
        <section className="px-4 mt-4">
          <div className="bg-white rounded-3xl border border-gray-100/80 shadow-sm p-[18px]">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={14} strokeWidth={1.8} style={{ color: themeColor }} />
              <h2 className="text-sm font-bold text-gray-900">{seller.shopName} 소개</h2>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
              {customization.intro || seller.shopDescription}
            </p>
          </div>
        </section>
      )}

      {/* ───── 5. 예약 달력 ───── */}
      <section className="px-4 mt-4">
        <ShopBookingCalendar
          sellerSlug={seller.slug}
          slots={daySlots}
          themeColor={themeColor}
          today={todayKey}
        />
      </section>

      {/* ───── 6. 콘텐츠 (feature 플래그) ───── */}
      {contents.length > 0 && (
        <section className="px-4 mt-4">
          <div className="bg-white rounded-3xl border border-gray-100/80 shadow-sm p-[18px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">상담사 콘텐츠</h2>
              <Link href="/content" className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
                더보기 <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {contents.map((c) => {
                let thumb: string | null = null;
                try {
                  const arr = JSON.parse(c.images || "[]");
                  thumb = Array.isArray(arr) ? arr[0] ?? null : null;
                } catch {
                  thumb = null;
                }
                return (
                  <Link key={c.id} href={`/content/${c.id}`} className="group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <SafeImage
                        src={thumb}
                        placeholder={DEFAULT_PRODUCT_IMAGE}
                        alt={c.title}
                        width={160}
                        height={160}
                        fallbackText={c.title.charAt(0)}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-1 group-hover:text-gray-900">
                      {c.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="mt-5">
        <SellerShopFooter
          sellerInfo={{
            shopName: seller.shopName,
            businessType: seller.businessType,
            representativeName: seller.representativeName,
            businessRegistrationNo: seller.businessRegistrationNo,
            telecomSalesLicenseNo: seller.telecomSalesLicenseNo,
            businessAddress: seller.businessAddress,
            businessCategory: seller.businessCategory,
          }}
        />
      </div>

      <div className="h-16" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
      <SellerShopBottomNav sellerSlug={seller.slug} />

      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          25% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          50% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
          75% { transform: scale(1.05); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
        }
        .animate-heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
