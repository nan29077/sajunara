/**
 * 상담 예약 — 시간/슬롯 유틸
 * ────────────────────────────
 * 조합 옵션(방식×시간) 예약에서 "선택한 상담 시간(길이)"을 분으로 환산하고,
 * 그 길이만큼 캘린더 슬롯을 함께 닫기/되돌리기 위한 순수 함수들.
 * DB 접근 없음 — 어디서든 안전하게 재사용.
 */

/** "14:00" → 840(분). 형식이 아니면 NaN. */
export function hhmmToMinutes(time: string | null | undefined): number {
  if (!time) return NaN;
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return NaN;
  return h * 60 + min;
}

/**
 * 상담 시간 라벨 → 분.
 *   "1시간 30분" → 90, "2시간" → 120, "30분" → 30
 *   "영상 상담/1시간 30분" 처럼 방식이 앞에 붙어 있어도 시간·분 토큰만 추출한다.
 * 시간/분 토큰이 하나도 없으면 null.
 */
export function parseConsultDurationMinutes(label: string | null | undefined): number | null {
  if (!label) return null;
  let total = 0;
  let matched = false;
  const hour = label.match(/(\d+)\s*시간/);
  if (hour) {
    total += parseInt(hour[1], 10) * 60;
    matched = true;
  }
  const min = label.match(/(\d+)\s*분/);
  if (min) {
    total += parseInt(min[1], 10);
    matched = true;
  }
  return matched && total > 0 ? total : null;
}
