"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";
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
      <div className="px-4 py-5">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* 브랜드 */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-2">
              <span className="text-base font-extrabold text-white tracking-tight">&lt;사주나라&gt;</span>
            </Link>
            <p className="text-[11px] text-gray-500">사주·타로·운세 전문 상담 플랫폼</p>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="text-xs font-semibold text-white mb-3">서비스</h4>
            <ul className="space-y-2">
              <li><Link href="/auth/register?role=seller" className="text-xs hover:text-white transition-colors">상담사 신청하기</Link></li>
              <li><Link href="/support/seller-guide" className="text-xs hover:text-white transition-colors">상담사 신청 안내</Link></li>
              <li><Link href="/support/terms" className="text-xs hover:text-white transition-colors">이용약관</Link></li>
              <li><Link href="/support/privacy" className="text-xs hover:text-white transition-colors">개인정보처리방침</Link></li>
            </ul>
          </div>

          {/* 고객센터 */}
          <div>
            <h4 className="text-xs font-semibold text-white mb-3">고객센터</h4>
            <ul className="space-y-2">
              <li><Link href="/support/contact" className="text-xs hover:text-white transition-colors">1대1 문의</Link></li>
              <li><Link href="/support/faq" className="text-xs hover:text-white transition-colors">자주 묻는 질문</Link></li>
              <li><Link href="/support/shipping" className="text-xs hover:text-white transition-colors">예약·취소·환불 안내</Link></li>
              <li>
                <a
                  href="/sajunara-brochure.pdf"
                  download="사주나라-서비스소개서.pdf"
                  className="inline-flex items-center gap-1 text-xs hover:text-white transition-colors"
                >
                  <Download size={12} strokeWidth={1.8} />
                  서비스 소개서 PDF
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <div className="space-y-1.5 text-[10px] text-gray-500 leading-relaxed">
            <p><span className="text-gray-400">법인명</span> 주식회사 윈스투핀</p>
            <p><span className="text-gray-400">사업자등록</span> 219-81-34189</p>
            <p><span className="text-gray-400">대표자</span> 박찬엽</p>
            <p><span className="text-gray-400">메일</span> hibvo119@naver.com</p>
            <p><span className="text-gray-400">고객센터</span> 070-8080-4536</p>
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-900 text-[10px]">
            <Link href="/support/terms" className="hover:text-gray-300">이용약관</Link>
            <Link href="/support/privacy" className="hover:text-gray-300 font-semibold text-gray-300">개인정보처리방침</Link>
          </div>
        </div>
      </div>

      {/* 모바일 하단 네비 높이만큼 여백 */}
      <div className="h-16" />
    </footer>
  );
}
