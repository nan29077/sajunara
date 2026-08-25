"use client";

/**
 * ShopLogoutButton
 * ─────────────────
 * 점집(상담사) 화면 전용 로그아웃 버튼.
 * - 로그아웃 후 사주나라 메인이 아니라 "점집 홈(/shop/{slug})"으로 돌아간다.
 *   (점집은 메인과 분리된 독립 세계라 로그아웃해도 그 점집 안에 머무른다.)
 * - variant 로 아이콘(헤더용) / 알약(본문 강조용) 모양을 고른다.
 */

import { Icon } from "@/components/shared/Icon";
import { signOut } from "next-auth/react";

interface Props {
  /** 로그아웃 후 돌아갈 점집 slug */
  slug: string;
  variant?: "icon" | "pill";
  className?: string;
}

export default function ShopLogoutButton({ slug, variant = "icon", className = "" }: Props) {
  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = `${window.location.origin}/shop/${slug}`;
  };

  if (variant === "pill") {
    return (
      <button
        onClick={handleLogout}
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors ${className}`}
      >
        <Icon name="Logout" size={15} strokeWidth={1.8} />
        로그아웃
      </button>
    );
  }

  // icon variant — 헤더 우측에 놓는 아이콘 버튼
  return (
    <button
      onClick={handleLogout}
      title="로그아웃"
      aria-label="로그아웃"
      className={`p-2 transition-colors ${className || "text-gray-500 hover:text-red-500"}`}
    >
      <Icon name="Logout" size={20} strokeWidth={1.5} />
    </button>
  );
}
