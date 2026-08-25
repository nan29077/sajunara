"use client";

import type { FooterSettings } from "@/lib/settings";

// 로그인/회원가입 등 초기 화면 하단 사업자 정보 푸터.
// 사주나라 사업자 정보만 노출하고 그 외 내용은 넣지 않는다.
export default function BusinessInfoFooter(_props: { settings?: FooterSettings }) {
  return (
    <footer className="w-full max-w-md mx-auto mt-8 pt-5 border-t border-gray-200 text-[11px] leading-relaxed text-gray-400">
      <div className="space-y-1">
        <p className="text-xs font-bold text-gray-600 mb-1.5">&lt;사주나라&gt;</p>
        <p><span className="text-gray-500">법인명</span> : 주식회사 윈스투핀</p>
        <p><span className="text-gray-500">사업자등록</span> : 219-81-34189</p>
        <p><span className="text-gray-500">대표자</span> : 박찬엽</p>
        <p><span className="text-gray-500">메일</span> : hibvo119@naver.com</p>
        <p><span className="text-gray-500">고객센터</span> : 070-8080-4536</p>
      </div>
    </footer>
  );
}
