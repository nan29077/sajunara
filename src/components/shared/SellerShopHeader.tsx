"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import SafeImage from "@/components/shared/SafeImage";
import NotificationBell from "@/components/shared/NotificationBell";
import ShopLogoutButton from "@/components/shared/ShopLogoutButton";
import { pickSajuAvatar } from "@/lib/defaults";

// 점집 전용 상단 바.
// - 좌측 상단: 사주나라 로고 대신 "상담사 프로필 사진(또는 점집 로고) + 상담사 이름".
// - 메인 페이지로 가는 링크는 일절 두지 않는다(상담사 세계 안에서만 이동).
// - 우측: 구매회원용 장바구니/내정보 진입만 제공.
export default function SellerShopHeader({
  sellerName,
  sellerLogo,
  sellerSlug,
  sellerId,
  showLive,
  liveHref,
}: {
  sellerName: string;
  sellerLogo: string | null;
  sellerSlug: string;
  sellerId?: string;
  showLive?: boolean;
  liveHref?: string | null;
}) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4">
        {/* 좌측: 상담사 로고 + 이름 — 항상 점집 홈으로 이동 (라이브 여부 무관) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={`/shop/${sellerSlug}`}
            scroll={true}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-50 flex-shrink-0 ring-1 ring-gray-200">
              <SafeImage
                src={sellerLogo}
                placeholder={pickSajuAvatar(sellerId || sellerSlug)}
                alt={sellerName}
                width={36}
                height={36}
                fallbackText={sellerName.charAt(0)}
              />
            </div>
            <span className="text-[15px] font-bold text-gray-900 truncate">{sellerName}</span>
          </Link>
        </div>

        {/* 우측: 비로그인 → 점집 전용 로그인/회원가입, 로그인 → 알림 */}
        {session ? (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* 알림 버튼 — 모든 사용자 노출 */}
            <NotificationBell className="text-gray-800" size={32} buttonClassName="p-3" />
            {/* 로그아웃 — 로그아웃 후 점집 홈으로 이동 */}
            <ShopLogoutButton slug={sellerSlug} variant="icon" className="text-gray-500 hover:text-red-500" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 점집 독립 로그인/가입 — 사주나라 메인과 분리된 점집 전용 화면 */}
            <Link
              href={`/shop/${sellerSlug}/login`}
              className="px-3 py-1.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              로그인
            </Link>
            <Link
              href={`/shop/${sellerSlug}/join`}
              className="px-3 py-1.5 text-[13px] font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors"
            >
              회원가입
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
