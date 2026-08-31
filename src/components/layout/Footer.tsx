"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FeatureFlags, SocialLinks } from "@/lib/featureFlags";
import type { FooterSettings } from "@/lib/settings";
import { useShopChrome } from "@/components/shared/ShopChromeProvider";

export default function Footer(_props: {
  flags?: FeatureFlags;
  socialLinks?: SocialLinks;
  footerSettings?: FooterSettings;
}) {
  const pathname = usePathname() ?? "";
  const { subpageActive } = useShopChrome();
  // 점집(상담사) 페이지에는 노출하지 않는다 (해당 화면은 자체 푸터 사용)
  if (/^\/shop\/[^\/]+/.test(pathname) || subpageActive) return null;

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="px-4 py-6">
        {/* 약관 링크 */}
        <div className="flex gap-4 mb-4 text-[12px]">
          <Link href="/support/terms" className="text-gray-300 hover:text-white transition-colors">
            이용약관
          </Link>
          <Link href="/support/privacy" className="text-gray-300 hover:text-white transition-colors font-semibold">
            개인정보처리방침
          </Link>
        </div>

        {/* 사업자 정보 */}
        <div className="space-y-1.5 text-[11px] leading-relaxed">
          <p className="text-sm font-bold text-white mb-2">&lt;사주나라&gt;</p>
          <p><span className="text-gray-500">법인명</span> : 주식회사 윈스투핀</p>
          <p><span className="text-gray-500">사업자등록</span> : 219-81-34189</p>
          <p><span className="text-gray-500">대표자</span> : 박찬엽</p>
          <p><span className="text-gray-500">메일</span> : hibvo119@naver.com</p>
          <p><span className="text-gray-500">고객센터</span> : 070-8080-4536</p>
        </div>
      </div>

      {/* 모바일 하단 네비 높이만큼 여백 */}
      <div className="h-16" />
    </footer>
  );
}
