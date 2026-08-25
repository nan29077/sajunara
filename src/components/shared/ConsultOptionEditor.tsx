"use client";

/**
 * ConsultOptionEditor
 * ───────────────────
 * 상담 상품 전용 "상담 방식 × 상담 시간 → 조합별 가격" 편집 UI.
 *
 * 저장은 기존 옵션-조합(OptionGroup/Variant) 구조를 그대로 재사용한다:
 *   optionGroups = [
 *     { groupName: "상담 방식", options: [선택된 방식들] },
 *     { groupName: "상담 시간", options: [선택된 시간들] },
 *   ]
 *   variants = 방식×시간 조합마다 { name: "영상 상담/1시간", price, stock } (조합별 독립 가격)
 *
 * → 고객 화면(ProductBottomSheet 그룹 모드)이 방식→시간 2단계 선택 후
 *   조합 variant 를 찾아 그 가격으로 결제하는 흐름을 그대로 사용한다.
 * → DB 스키마 변경 없음(운영 DB 안전).
 */

import { Icon } from "@/components/shared/Icon";
import { useState } from "react";
import { X } from "lucide-react";
import type { Variant, OptionGroup } from "@/components/shared/OptionGroupEditor";

export const CONSULT_METHOD_GROUP = "상담 방식";
export const CONSULT_TIME_GROUP = "상담 시간";

const METHOD_PRESETS = ["영상 상담", "전화 상담", "방문 상담"] as const;
const TIME_PRESETS = ["30분", "1시간", "1시간 30분", "2시간", "2시간 30분", "3시간"] as const;

interface Props {
  variants: Variant[];
  optionGroups: OptionGroup[];
  basePrice: string;
  onChange: (patch: {
    optionMode?: "flat" | "group";
    variants?: Variant[];
    optionGroups?: OptionGroup[];
  }) => void;
}

function makeCombos(methods: string[], times: string[]): string[] {
  const out: string[] = [];
  for (const m of methods) for (const t of times) out.push(`${m}/${t}`);
  return out;
}

export default function ConsultOptionEditor({
  variants,
  optionGroups,
  basePrice,
  onChange,
}: Props) {
  const methodGroup = optionGroups.find((g) => g.groupName === CONSULT_METHOD_GROUP);
  const timeGroup = optionGroups.find((g) => g.groupName === CONSULT_TIME_GROUP);
  const selMethods = methodGroup?.options ?? [];
  const selTimes = timeGroup?.options ?? [];
  const [customTime, setCustomTime] = useState("");

  // 방식/시간 선택이 바뀌면 그룹 + 조합(variant)을 재생성한다.
  // 기존 조합의 가격/정원은 이름(방식/시간)이 같으면 그대로 보존한다.
  const apply = (methods: string[], times: string[]) => {
    const groups: OptionGroup[] = [];
    if (methods.length) groups.push({ groupName: CONSULT_METHOD_GROUP, options: methods });
    if (times.length) groups.push({ groupName: CONSULT_TIME_GROUP, options: times });
    const combos = makeCombos(methods, times);
    const newVariants: Variant[] = combos.map((name) => {
      const existing = variants.find((v) => v.name === name);
      return existing ?? { name, price: basePrice || "", stock: "0" };
    });
    onChange({ optionMode: "group", optionGroups: groups, variants: newVariants });
  };

  const toggleMethod = (m: string) =>
    apply(selMethods.includes(m) ? selMethods.filter((x) => x !== m) : [...selMethods, m], selTimes);

  const toggleTime = (t: string) =>
    apply(selMethods, selTimes.includes(t) ? selTimes.filter((x) => x !== t) : [...selTimes, t]);

  const addCustomTime = () => {
    const t = customTime.trim();
    if (!t) return;
    if (!selTimes.includes(t)) apply(selMethods, [...selTimes, t]);
    setCustomTime("");
  };

  const removeTime = (t: string) => apply(selMethods, selTimes.filter((x) => x !== t));

  const customTimes = selTimes.filter((t) => !TIME_PRESETS.includes(t as (typeof TIME_PRESETS)[number]));

  const updateVariant = (i: number, k: keyof Variant, v: string) => {
    const nv = [...variants];
    nv[i] = { ...nv[i], [k]: v };
    onChange({ variants: nv });
  };

  const pill = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
      active
        ? "border-brand-500 bg-brand-50 text-brand-700"
        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
    }`;

  return (
    <div className="space-y-5">
      {/* ── 상담 방식 ── */}
      <div>
        <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <Icon name="Video" size={14} /> 상담 방식 <span className="text-gray-400 font-normal">(복수 선택)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {METHOD_PRESETS.map((m) => (
            <button key={m} type="button" onClick={() => toggleMethod(m)} className={pill(selMethods.includes(m))}>
              {selMethods.includes(m) && <Icon name="Check" size={12} className="inline mr-1" />}
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── 상담 시간 ── */}
      <div>
        <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <Icon name="Clock" size={14} /> 상담 시간 <span className="text-gray-400 font-normal">(복수 선택 · 직접 추가 가능)</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {TIME_PRESETS.map((t) => (
            <button key={t} type="button" onClick={() => toggleTime(t)} className={pill(selTimes.includes(t))}>
              {selTimes.includes(t) && <Icon name="Check" size={12} className="inline mr-1" />}
              {t}
            </button>
          ))}
          {customTimes.map((t) => (
            <span key={t} className={`${pill(true)} inline-flex items-center gap-1`}>
              <Icon name="Check" size={12} /> {t}
              <button type="button" onClick={() => removeTime(t)} className="ml-0.5 text-brand-400 hover:text-red-400">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 max-w-xs">
          <input
            type="text"
            className="input-field text-sm py-2 flex-1"
            placeholder="직접 추가 (예: 4시간, 20분)"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTime();
              }
            }}
          />
          <button type="button" onClick={addCustomTime} className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700">
            <Icon name="Plus" size={14} />
          </button>
        </div>
      </div>

      {/* ── 조합별 가격 ── */}
      {variants.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-gray-600 mb-2">
            조합별 가격 · 정원 ({variants.length}개) <span className="text-gray-400 font-normal">— 방식·시간마다 다르게 입력하세요</span>
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_110px_84px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-[10px] text-gray-500 font-medium">방식 · 시간</span>
              <span className="text-[10px] text-gray-500 font-medium text-right">가격(원)</span>
              <span className="text-[10px] text-gray-500 font-medium text-right">정원</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {variants.map((v, i) => {
                const [method, time] = v.name.split("/");
                return (
                  <div key={v.name} className="grid grid-cols-[1fr_110px_84px] gap-2 px-3 py-2 items-center hover:bg-gray-50/50">
                    <span className="text-[11.5px] text-gray-800 font-medium">
                      {method} <span className="text-gray-400">·</span> <span className="text-brand-600">{time}</span>
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        className="input-field text-xs py-1.5 pr-5 text-right"
                        placeholder={basePrice || "0"}
                        value={v.price}
                        onChange={(e) => updateVariant(i, "price", e.target.value)}
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      className="input-field text-xs py-1.5 text-right"
                      placeholder="0"
                      value={v.stock}
                      onChange={(e) => updateVariant(i, "stock", e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            정원은 각 조합의 예약 가능 건수예요. 예약이 차면 해당 조합은 마감됩니다.
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400">
            상담 방식과 시간을 하나 이상씩 선택하면
            <br />
            조합별 가격 입력표가 나타납니다.
          </p>
        </div>
      )}
    </div>
  );
}
