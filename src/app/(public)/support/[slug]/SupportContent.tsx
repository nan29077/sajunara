"use client";

import { Icon } from '@/components/shared/Icon';
import { useRouter } from "next/navigation";
import { Hexagon } from 'lucide-react';
import { useState } from "react";

const FAQ_ITEMS = [
  { q: "상담은 어떻게 진행되나요?", a: "원하는 상담사의 페이지에서 상담상품과 시간을 선택해 예약·결제하면 됩니다. 예약이 확정되면 마이페이지 > 예약내역에서 일정과 진행 상태를 확인할 수 있으며, 예약한 시간에 상담사가 안내한 방식(라이브·전화 등)으로 상담이 진행됩니다. 상담 시작 전에 알림으로 다시 안내드려요." },
  { q: "예약 취소/환불은 어떻게 하나요?", a: "마이페이지 > 예약내역에서 해당 예약을 선택해 취소를 신청하거나 1대1 문의를 통해 접수해 주세요. 상담 시작 전 취소는 전액 환불되며, 상담 임박 시점이나 진행 이후에는 환불이 제한될 수 있습니다. 자세한 기준은 각 상담상품의 안내를 확인해 주세요. 환불은 접수 후 보통 3~5 영업일 이내에 결제 수단으로 처리됩니다." },
  { q: "상담사가 되려면 어떻게 하나요?", a: "회원가입 시 '상담사' 유형을 선택하거나, 일반 회원으로 가입한 뒤 마이페이지에서 상담사 신청을 하면 됩니다. 운영 중인 SNS 채널(인스타그램·유튜브·틱톡 등) 정보를 함께 제출해 주시면 심사에 도움이 됩니다. 관리자 검토 후 1~3 영업일 이내에 승인 결과가 안내되며, 승인되면 나만의 점집 개설과 라이브 방송 기능이 활성화됩니다." },
  { q: "결제 수단은 무엇이 있나요?", a: "신용카드, 체크카드, 계좌이체, 간편계좌이체, 네이버페이, 카카오페이 등을 지원합니다. 결제 단계에서 원하는 수단을 선택할 수 있으며, 간편계좌이체를 이용하면 계좌번호 입력 없이 빠르게 결제할 수 있습니다. 결제 과정에서 오류가 발생하면 잠시 후 다시 시도하거나 1대1 문의로 알려 주세요." },
  { q: "비밀번호를 잊어버렸어요.", a: "로그인 페이지의 '비밀번호 찾기'를 이용해 주세요. 가입 시 사용한 이메일로 재설정 링크가 발송되며, 링크는 발송 후 일정 시간 동안만 유효합니다. 메일이 보이지 않으면 스팸함을 확인하시고, 그래도 받지 못하셨다면 1대1 문의로 알려 주시면 도와드리겠습니다." },
  { q: "라이브 방송을 보려면 어떻게 하나요?", a: "상담사의 점집 페이지에서 LIVE 뱃지가 표시된 상담사를 클릭하면 진행 중인 실시간 방송을 바로 시청할 수 있습니다. 방송 중에는 채팅으로 상담사와 소통하거나 소개되는 상담상품을 그 자리에서 구매할 수 있습니다. 별도 앱 설치 없이 모바일 웹에서 시청 가능하며, 안정적인 시청을 위해 Wi-Fi 환경을 권장합니다." },
  { q: "상담 후기는 어디서 작성하나요?", a: "마이페이지 > 예약내역에서 완료된 예약을 선택해 후기를 작성할 수 있습니다. 상담 완료 후 일정 기간이 지나면 자동으로 확정 처리되며, 솔직한 후기를 남기면 다른 고객에게 큰 도움이 됩니다. 작성한 후기는 마이페이지에서 언제든 수정하거나 삭제할 수 있습니다." },
];

function PageBanner({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-5 py-8 text-center">
      {/* 별 장식 */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15%" cy="30%" r="2" fill="white"/>
        <circle cx="80%" cy="20%" r="1.5" fill="white"/>
        <circle cx="60%" cy="70%" r="1" fill="white"/>
        <circle cx="25%" cy="75%" r="2" fill="white"/>
        <circle cx="90%" cy="55%" r="1.5" fill="white"/>
      </svg>
      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/25 rounded-2xl mb-3 backdrop-blur-sm">
          <span className="text-white">{icon}</span>
        </div>
        <h2 className="text-lg font-extrabold text-white drop-shadow-sm">{title}</h2>
        <p className="text-brand-100 text-xs mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-brand-700 mb-2 flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-4 bg-brand-400 rounded-full" />
      {children}
    </h3>
  );
}

function FaqPage() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-brand-100 rounded-xl overflow-hidden bg-white shadow-sm">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-brand-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-[13px] font-semibold text-gray-900 pr-4">{item.q}</span>
            {open === i
              ? <Icon name="ChevronDown" size={16} className="text-brand-400 flex-shrink-0 rotate-180" />
              : <Icon name="ChevronDown" size={16} className="text-brand-300 flex-shrink-0" />}
          </button>
          {open === i && (
            <div className="px-4 pb-4 pt-1 bg-brand-50 border-t border-brand-100">
              <p className="text-[13px] text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("문의가 접수되었습니다. 영업일 기준 1~2일 내에 답변드리겠습니다.");
    setForm({ name: "", email: "", message: "" });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-brand-700 mb-1.5">이름</label>
        <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
          placeholder="이름을 입력하세요"
          className="w-full border border-brand-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-brand-50/50" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-brand-700 mb-1.5">이메일</label>
        <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
          placeholder="email@example.com"
          className="w-full border border-brand-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-brand-50/50" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-brand-700 mb-1.5">문의 내용</label>
        <textarea required value={form.message} onChange={e => setForm({...form, message: e.target.value})}
          placeholder="문의 내용을 입력하세요"
          rows={6}
          className="w-full border border-brand-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-brand-50/50 resize-none" />
      </div>
      <button type="submit"
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-200">
        <Icon name="Message" size={15} strokeWidth={1.5} />
        문의 접수하기
      </button>
    </form>
  );
}

const PAGE_META: Record<string, { subtitle: string; icon: React.ReactNode }> = {
  contact:      { subtitle: "빠르게 답변드릴게요", icon: <Icon name="Message" size={24} strokeWidth={1.5} /> },
  faq:          { subtitle: "궁금한 점을 찾아보세요", icon: <Icon name="Help" size={24} strokeWidth={1.5} /> },
  shipping:     { subtitle: "예약·취소·환불 안내", icon: <Icon name="Calendar" size={24} strokeWidth={1.5} /> },
  terms:        { subtitle: "서비스 이용 약관", icon: <Icon name="File" size={24} strokeWidth={1.5} /> },
  privacy:      { subtitle: "개인정보 보호 정책", icon: <Icon name="Certified" size={24} strokeWidth={1.5} /> },
  "seller-guide": { subtitle: "상담사로 시작하는 방법", icon: <Icon name="Sparkles" size={24} strokeWidth={1.5} /> },
};

const CONTENT: Record<string, { title: string; body: () => React.ReactNode }> = {
  contact: { title: "1대1 문의", body: () => <ContactPage /> },
  faq:     { title: "자주 묻는 질문", body: () => <FaqPage /> },
  shipping: {
    title: "예약·취소·환불 안내",
    body: () => (
      <div className="space-y-3">
        <Card>
          <SectionHeading>예약 확정</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">결제 완료 즉시 예약이 접수되며, 상담사가 확정하면 마이페이지 &gt; 예약내역에서 확인할 수 있습니다. 확정 알림은 앱/이메일로 발송됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>예약 취소</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">마이페이지 &gt; 예약내역에서 직접 취소하거나 1대1 문의로 접수해 주세요. 상담 시작 전에는 전액 환불이 원칙이며, 상담 임박 시점(24시간 이내)에는 환불이 제한될 수 있습니다.</p>
        </Card>
        <Card>
          <SectionHeading>그룹 상담 캠페인 환불</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">그룹 상담 캠페인 종료 후 목표 달성 실패 시 전액 자동 환불됩니다. 목표 달성 후에는 개별 상담상품의 취소·환불 정책이 적용됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>환불 처리 기간</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">취소·환불 접수 후 보통 3~5 영업일 이내에 결제 수단으로 처리됩니다. 카드사 사정에 따라 다소 늦어질 수 있습니다.</p>
        </Card>
      </div>
    ),
  },
  terms: {
    title: "이용약관",
    body: () => (
      <div className="space-y-3">
        <Card>
          <SectionHeading>제1조 (목적)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">이 약관은 주식회사 윈스투핀(이하 "회사")이 운영하는 사주나라 플랫폼(이하 "서비스")의 이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정하는 것을 목적으로 합니다.</p>
        </Card>
        <Card>
          <SectionHeading>제2조 (정의)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            ① "서비스"란 회사가 운영하는 사주나라 플랫폼을 통해 제공하는 사주·타로·운세 상담 예약·중개 및 관련 부가서비스를 말합니다.<br/>
            ② "회원"이란 본 약관에 동의하고 서비스에 가입하여 이용하는 자를 말합니다.<br/>
            ③ "상담사"란 회원 중 역술·상담 서비스를 등록하고 이용자에게 제공하는 전문가 회원을 말합니다.<br/>
            ④ "이용자"란 상담사의 서비스를 예약·결제하여 상담을 받는 회원을 말합니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>제3조 (약관의 효력 및 변경)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            ① 본 약관은 서비스 내 공지 또는 이메일을 통해 회원에게 고지함으로써 효력이 발생합니다.<br/>
            ② 회사는 「약관의 규제에 관한 법률」 등 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있습니다.<br/>
            ③ 약관 변경 시 적용일 최소 7일 전(회원에게 불리한 변경은 30일 전)에 공지합니다. 공지 후 이의 없이 계속 이용하면 변경에 동의한 것으로 간주합니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>제4조 (이용계약 체결)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            ① 이용계약은 회원이 약관에 동의하고 가입 신청을 완료한 시점에 성립합니다.<br/>
            ② 회사는 다음 각 호에 해당하는 경우 가입 신청을 거부하거나 이용을 제한할 수 있습니다.<br/>
            · 허위 정보를 기재한 경우<br/>
            · 만 14세 미만인 경우<br/>
            · 이전에 서비스 이용이 제한된 이력이 있는 경우<br/>
            · 기타 회사 정책에 반하는 경우
          </p>
        </Card>
        <Card>
          <SectionHeading>제5조 (서비스 이용)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            ① 서비스는 연중무휴 24시간 운영을 원칙으로 합니다.<br/>
            ② 회사는 시스템 점검, 서버 장애, 천재지변 등 불가피한 사유로 서비스를 일시 중단할 수 있으며, 사전 또는 사후에 공지합니다.<br/>
            ③ 서비스 내 제공되는 사주·타로·운세 등의 콘텐츠는 오락·참고 목적이며, 법적 효력이 없습니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>제6조 (회원의 의무)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            회원은 다음 행위를 하여서는 안 됩니다.<br/>
            · 타인의 정보 도용 또는 허위 정보 등록<br/>
            · 서비스 운영을 방해하거나 시스템에 악성 코드를 삽입하는 행위<br/>
            · 타인의 명예 훼손 또는 불쾌감을 주는 콘텐츠 게시<br/>
            · 영리 목적의 무단 광고·홍보 행위<br/>
            · 회사의 사전 동의 없이 서비스를 상업적으로 이용하는 행위<br/>
            · 기타 관련 법령 및 본 약관을 위반하는 행위
          </p>
        </Card>
        <Card>
          <SectionHeading>제7조 (결제 및 환불)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            ① 상담 예약 결제는 신용카드, 체크카드, 간편결제 등 회사가 지정한 수단을 통해 이루어집니다.<br/>
            ② 상담 시작 전 취소 시 전액 환불이 원칙입니다.<br/>
            ③ 상담 시작 24시간 이내 취소 또는 상담 완료 후에는 환불이 제한될 수 있습니다.<br/>
            ④ 환불은 취소 접수 후 3~5 영업일 이내에 결제 수단으로 처리됩니다.<br/>
            ⑤ 그룹 상담 캠페인의 경우 목표 미달성 시 전액 자동 환불됩니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>제8조 (회사의 의무)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            ① 회사는 관련 법령과 본 약관이 금지하는 행위를 하지 않으며, 안정적인 서비스 제공을 위해 노력합니다.<br/>
            ② 회사는 회원의 개인정보를 「개인정보 보호법」에 따라 안전하게 관리합니다.<br/>
            ③ 회사는 서비스 이용과 관련한 회원의 불만 사항이 접수되면 신속하게 처리하기 위해 노력합니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>제9조 (면책 조항)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            ① 회사는 상담사가 제공하는 사주·타로·운세 콘텐츠의 정확성·신뢰성을 보증하지 않습니다.<br/>
            ② 회사는 천재지변, 전쟁, 테러, 해킹 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.<br/>
            ③ 회원이 서비스를 이용하여 얻은 정보로 인해 발생한 손해에 대해 회사는 관련 법령이 정하는 범위 내에서만 책임을 집니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>제10조 (분쟁 해결)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">서비스 이용과 관련하여 분쟁이 발생한 경우 회사와 회원은 상호 합의를 통해 해결하며, 합의되지 않을 경우 「소비자기본법」에 따른 소비자분쟁조정위원회에 조정을 신청할 수 있습니다. 소송이 필요한 경우 회사 소재지 관할 법원을 관할 법원으로 합니다.</p>
        </Card>
        <Card>
          <SectionHeading>부칙 (사업자 정보)</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            상호: 주식회사 윈스투핀 | 서비스명: 사주나라<br/>
            대표자: 박찬엽 | 사업자등록번호: 219-81-34189<br/>
            고객센터: 070-8080-4536 | 이메일: hibvo119@naver.com<br/>
            본 약관은 2026년 8월 1일부터 시행됩니다.
          </p>
        </Card>
      </div>
    ),
  },
  privacy: {
    title: "개인정보처리방침",
    body: () => (
      <div className="space-y-3">
        <Card>
          <SectionHeading>개요</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">주식회사 윈스투핀(이하 "회사")은 사주나라 서비스를 운영하면서 이용자의 개인정보를 매우 중요하게 생각합니다. 회사는 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수하며 이용자의 개인정보를 보호합니다.</p>
        </Card>
        <Card>
          <SectionHeading>1. 수집하는 개인정보 항목</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            <strong className="text-gray-700">필수 항목 (회원가입 시):</strong> 이름, 이메일 주소, 비밀번호(암호화 저장), 닉네임<br/>
            <strong className="text-gray-700">선택 항목 (상담사 신청 시):</strong> 휴대폰 번호, 프로필 사진, SNS 채널 정보, 전문 분야 소개<br/>
            <strong className="text-gray-700">결제 정보:</strong> 카드 정보(PG사를 통해 처리, 회사가 직접 저장하지 않음), 결제 내역<br/>
            <strong className="text-gray-700">자동 수집:</strong> IP 주소, 쿠키, 브라우저 정보, 서비스 이용 기록, 접속 일시, 기기 정보
          </p>
        </Card>
        <Card>
          <SectionHeading>2. 개인정보 수집 및 이용 목적</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            · 회원 가입 및 본인 확인<br/>
            · 예약·결제·상담 서비스 제공 및 관리<br/>
            · 고객 문의 접수 및 응대<br/>
            · 서비스 품질 개선 및 신규 서비스 개발<br/>
            · 부정 이용 방지 및 서비스 보안 강화<br/>
            · 법령상 의무 이행<br/>
            · 마케팅·광고 활용 (별도 동의 시에만 해당)
          </p>
        </Card>
        <Card>
          <SectionHeading>3. 개인정보 보유 및 이용 기간</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            회원 탈퇴 시까지 보유하며, 관련 법령에 따라 아래 정보는 해당 기간 보관합니다.<br/>
            · 계약 또는 청약철회 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)<br/>
            · 대금결제 및 재화 공급 기록: 5년 (전자상거래법)<br/>
            · 소비자 불만 또는 분쟁처리 기록: 3년 (전자상거래법)<br/>
            · 접속 로그, 접속 IP 정보: 3개월 (통신비밀보호법)
          </p>
        </Card>
        <Card>
          <SectionHeading>4. 개인정보 제3자 제공</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            회사는 원칙적으로 회원의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우는 예외입니다.<br/>
            · 회원이 사전에 동의한 경우<br/>
            · 결제 처리를 위해 PG(Payment Gateway)사에 제공하는 경우<br/>
            · 법령의 규정에 의하거나 수사기관의 적법한 요청이 있는 경우
          </p>
        </Card>
        <Card>
          <SectionHeading>5. 개인정보 처리 위탁</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            회사는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁합니다.<br/>
            · 결제 처리: PG사 (결제 정보 처리 목적)<br/>
            · 이메일 발송: 이메일 서비스 제공업체 (공지·알림 발송 목적)<br/>
            위탁 처리 시 관련 법령에 따라 위탁 계약을 체결하고 안전하게 관리합니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>6. 쿠키 및 자동 수집 정보</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">회사는 서비스 이용 환경 개선과 맞춤형 서비스 제공을 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키 수집을 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.</p>
        </Card>
        <Card>
          <SectionHeading>7. 개인정보 파기 절차 및 방법</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            보유 기간 만료 또는 이용 목적 달성 시 지체 없이 파기합니다.<br/>
            · 전자적 파일: 복구 불가능한 방법으로 영구 삭제<br/>
            · 종이 출력물: 분쇄 또는 소각 처리
          </p>
        </Card>
        <Card>
          <SectionHeading>8. 정보주체의 권리·의무 및 행사 방법</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            회원은 언제든지 아래 권리를 행사할 수 있습니다.<br/>
            · 개인정보 열람 요청<br/>
            · 오류 정정 요청<br/>
            · 삭제 요청<br/>
            · 처리 정지 요청<br/>
            마이페이지에서 직접 수정하거나, 이메일(hibvo119@naver.com) 또는 고객센터(070-8080-4536)로 요청하시면 지체 없이 조치합니다.
          </p>
        </Card>
        <Card>
          <SectionHeading>9. 개인정보 보호책임자</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            회사명: 주식회사 윈스투핀<br/>
            대표자: 박찬엽<br/>
            고객센터: 070-8080-4536<br/>
            이메일: hibvo119@naver.com<br/><br/>
            개인정보 처리와 관련한 불만이나 피해 구제를 위해 아래 기관에도 문의하실 수 있습니다.<br/>
            · 개인정보보호위원회: www.pipc.go.kr / (국번없이) 182<br/>
            · 한국인터넷진흥원 개인정보침해 신고센터: privacy.kisa.or.kr / (국번없이) 118<br/><br/>
            본 방침은 2026년 8월 1일부터 적용됩니다.
          </p>
        </Card>
      </div>
    ),
  },
  "seller-guide": {
    title: "상담사 신청 안내",
    body: () => (
      <div className="space-y-3">
        <Card>
          <SectionHeading>상담사란?</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">상담사는 사주·타로·운세 등 자신만의 상담 서비스를 나만의 점집에 등록하고 고객에게 제공하는 전문가입니다. 예약·결제·라이브 방송 기능을 모두 플랫폼에서 지원합니다.</p>
        </Card>
        <Card>
          <SectionHeading>신청 자격</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">사주·타로·운세·심리상담 등 역술·상담 분야에서 활동 중이거나 준비 중인 누구나 신청 가능합니다. SNS 채널이 있으면 심사에 도움이 됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>신청 방법</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">회원가입 시 '상담사'를 선택하거나, 일반 회원으로 가입 후 마이페이지에서 상담사 신청을 할 수 있습니다. 관리자 검토 후 1~3 영업일 내 결과가 안내됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>상담료 수익</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">고객이 상담을 예약·결제할 때마다 설정된 상담료에서 플랫폼 수수료를 제한 금액이 수익으로 발생합니다. 캠페인 종료 후 확정 시점에 정산됩니다.</p>
        </Card>
        <a href="/seller-apply"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-200 mt-2">
          <Icon name="Sparkles" size={15} strokeWidth={1.5} />
          상담사 신청하기
        </a>
      </div>
    ),
  },
};

/** DB에 저장된 자유 형식(HTML/텍스트) 콘텐츠를 테마 카드로 렌더링 */
function parseSections(raw: string): { heading: string; body: string }[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === "sections" && Array.isArray(parsed.sections)) {
      return parsed.sections;
    }
  } catch {
    /* JSON이 아니면 무시 */
  }
  return null;
}

function DbContentBody({ content }: { content: string }) {
  const sections = parseSections(content);
  if (sections) {
    return (
      <div className="space-y-3">
        {sections.map((s, i) => (
          <Card key={i}>
            <SectionHeading>{s.heading}</SectionHeading>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
          </Card>
        ))}
      </div>
    );
  }
  // HTML/일반 텍스트 fallback — 카드 안에 표시
  return (
    <Card>
      <div
        className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line prose-sm"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </Card>
  );
}

export interface DbContent {
  slug: string;
  title: string;
  content: string;
}

export default function SupportContent({
  slug,
  dbContent,
}: {
  slug: string;
  dbContent?: DbContent | null;
}) {
  const router = useRouter();
  const hardcoded = CONTENT[slug];
  const meta = PAGE_META[slug];

  // DB에 저장된 콘텐츠가 있으면 우선 사용 (관리자 편집/추가 내용 반영)
  const hasDb = !!(dbContent && dbContent.content && dbContent.content.trim().length > 0);

  if (!hardcoded && !hasDb) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4">
        <Hexagon size={48} strokeWidth={1} className="fill-brand-100 text-brand-400 mb-4" />
        <p className="text-brand-700 text-sm font-medium">페이지를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const title = dbContent?.title || hardcoded?.title || "고객센터";
  const subtitle = meta?.subtitle ?? "사주나라 고객센터";
  const icon = meta?.icon ?? <Icon name="File" size={24} strokeWidth={1.5} />;

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-brand-50 pb-20">
      {/* 상단 네비게이션 바 */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-brand-100 px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-1.5 text-brand-600 hover:text-brand-800 transition-colors"
          aria-label="뒤로가기"
        >
          <Icon name="ArrowRight" size={20} strokeWidth={1.5} className="rotate-180" />
        </button>
        <h1 className="text-[15px] font-bold text-gray-900">{title}</h1>
      </div>

      {/* 배너 */}
      <PageBanner title={title} subtitle={subtitle} icon={icon} />

      {/* 본문 */}
      <div className="px-4 pt-5">
        {hasDb ? (
          <DbContentBody content={dbContent!.content} />
        ) : slug === "faq" || slug === "contact" ? (
          <Card>{hardcoded.body()}</Card>
        ) : (
          hardcoded.body()
        )}
      </div>
    </div>
  );
}
