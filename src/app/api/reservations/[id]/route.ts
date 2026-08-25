import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError, safeQuery } from "@/lib/safeDb";
import {
  ensureConsultingSession,
  completeConsultingSession,
  getReservationConsultingInfo,
} from "@/lib/consultingSession";
import { notifyReservationConfirmedToCustomer } from "@/lib/alimtalkTriggers";
import { hhmmToMinutes, parseConsultDurationMinutes } from "@/lib/consultSlots";

export const dynamic = "force-dynamic";

// 운영 DB에 reservations/time_slots 테이블이 아직 없는 환경(P2021)에서는
// 500 대신 명확한 503을 반환한다 (DB 스키마 드리프트 안전망).
const schemaDriftResponse = () =>
  NextResponse.json({ error: "예약 기능이 아직 준비 중입니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });

// PATCH /api/reservations/[id] — 상태 변경
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "상태 값이 필요합니다." }, { status: 400 });
  }

  let reservation;
  try {
    reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { seller: true },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) return schemaDriftResponse();
    throw e;
  }

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  const role = session.user.role;

  // 권한 체크
  if (role === "CUSTOMER") {
    // 고객은 본인 예약만, CANCELLED만 가능
    if (reservation.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (status !== "CANCELLED") {
      return NextResponse.json({ error: "고객은 취소만 가능합니다." }, { status: 403 });
    }
    if (reservation.status !== "PENDING") {
      return NextResponse.json({ error: "대기 중인 예약만 취소할 수 있습니다." }, { status: 400 });
    }
  } else if (role === "CONSULTANT") {
    // 상담사는 본인 샵 예약만
    if (reservation.seller.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    const allowed = ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "허용되지 않은 상태 변경입니다." }, { status: 400 });
    }
  }
  // SUPER_ADMIN: 모든 변경 허용

  // 상태 변경 시각 업데이트
  const now = new Date();
  const extraData: Record<string, unknown> = {};
  if (status === "CONFIRMED") extraData.confirmedAt = now;
  else if (status === "COMPLETED") extraData.completedAt = now;
  else if (status === "CANCELLED") extraData.cancelledAt = now;
  else if (status === "NO_SHOW") extraData.noShowAt = now;

  // 취소 시 슬롯 해제
  if (status === "CANCELLED") {
    const slot = await prisma.timeSlot.findFirst({
      where: { reservationId: id },
    });
    if (slot) {
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: { isAvailable: true, reservationId: null },
      });

      // 캘린더 동기화 되돌리기: 예약 길이만큼 함께 닫혔던 연속 슬롯을 다시 연다.
      // (예약 시점에 isAvailable=false 로만 막아둔 슬롯들 — reservationId 는 null)
      // 베스트-에포트: 실패해도 취소 처리 자체는 유지.
      try {
        // 조합(variant) 예약만 되돌린다 — 예약 시점에도 조합 예약에만 연속 슬롯을 막았다.
        const item = await prisma.reservationItem.findFirst({
          where: { reservationId: id },
          select: { variantName: true },
        });
        const durationMinutes = parseConsultDurationMinutes(item?.variantName);
        const startMin = hhmmToMinutes(slot.startTime);
        if (durationMinutes && durationMinutes > 0 && Number.isFinite(startMin)) {
          const dayStart = new Date(slot.date);
          dayStart.setUTCHours(0, 0, 0, 0);
          const dayEnd = new Date(slot.date);
          dayEnd.setUTCHours(23, 59, 59, 999);
          const siblings = await prisma.timeSlot.findMany({
            where: {
              consultantId: slot.consultantId,
              date: { gte: dayStart, lte: dayEnd },
              isAvailable: false,
              reservationId: null,
            },
            select: { id: true, startTime: true },
          });
          const toOpen = siblings
            .filter((s) => {
              const m = hhmmToMinutes(s.startTime);
              return Number.isFinite(m) && m > startMin && m < startMin + durationMinutes!;
            })
            .map((s) => s.id);
          if (toOpen.length > 0) {
            await prisma.timeSlot.updateMany({
              where: { id: { in: toOpen } },
              data: { isAvailable: true },
            });
          }
        }
      } catch (e) {
        console.warn("[reservations] 캘린더 동기화 되돌리기 실패 — 취소는 정상 처리됨", e);
      }
    }
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status, ...extraData },
  });

  // 예약 확정 → 영상 상담이면 세션 자동 생성 + 고객 알림톡 (실패해도 확정 흐름은 유지)
  if (status === "CONFIRMED") {
    try {
      await ensureConsultingSession(id);
    } catch (e) {
      console.error(`[reservations] 영상 세션 생성 실패 (${id}):`, e);
    }
    notifyReservationConfirmedToCustomer(id).catch((e) =>
      console.error(`[reservations] 확정 알림톡 발송 실패 (${id}):`, e),
    );
  }

  // 상담 완료/취소 → 열려 있는 영상 세션 정리
  if (status === "COMPLETED" || status === "CANCELLED") {
    try {
      const cs = await prisma.consultingSession.findUnique({
        where: { reservationId: id },
        select: { id: true, status: true },
      });
      if (cs && (cs.status === "WAITING" || cs.status === "ACTIVE")) {
        await completeConsultingSession(cs.id, { cancelled: status === "CANCELLED" });
      }
    } catch (e) {
      if (!isMissingSchemaError(e)) {
        console.error(`[reservations] 영상 세션 정리 실패 (${id}):`, e);
      }
    }
  }

  return NextResponse.json({ reservation: updated });
}

// GET /api/reservations/[id] — 예약 상세
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await Promise.resolve(params);

  let reservation;
  try {
    reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        seller: { select: { id: true, shopName: true, slug: true, user: { select: { name: true, avatar: true } } } },
        items: { include: { variant: { select: { name: true } } } },
        timeSlot: { select: { id: true, startTime: true, endTime: true } },
      },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) return schemaDriftResponse();
    throw e;
  }

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  // 권한 체크
  const role = session.user.role;
  if (role === "CUSTOMER" && reservation.userId !== session.user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  // 상담사는 본인 점집 예약만 열람 가능 (조건 없이 항상 소유권 검사)
  if (role === "CONSULTANT") {
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
    if (!seller || seller.id !== reservation.sellerId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  }

  // 상담 방식(영상/전화/방문) — Reservation 에 저장되지 않으므로 상품에서 역조회
  const { method: consultingMethod } = await getReservationConsultingInfo(id);

  // 영상 상담 세션 (테이블 미반영 환경에서는 null)
  const consultingSession = await safeQuery(
    `reservation session (${id})`,
    () =>
      prisma.consultingSession.findUnique({
        where: { reservationId: id },
        select: { id: true, status: true },
      }),
    null,
  );

  // 확정된 전화/방문 상담이면 상담사 연락처·상담소 주소를 공개한다 (마스킹 해제)
  let consultantContact: { phone?: string | null; address?: string | null } | null = null;
  if (
    (reservation.status === "CONFIRMED" || reservation.status === "COMPLETED") &&
    consultingMethod &&
    ["전화", "방문"].includes(consultingMethod)
  ) {
    const sellerDetail = await prisma.sellerProfile.findUnique({
      where: { id: reservation.sellerId },
      select: {
        businessAddress: true,
        user: { select: { phone: true } },
      },
    });
    consultantContact = {
      ...(consultingMethod === "전화" ? { phone: sellerDetail?.user.phone ?? null } : {}),
      ...(consultingMethod === "방문" ? { address: sellerDetail?.businessAddress ?? null } : {}),
    };
  }

  return NextResponse.json({
    reservation: {
      ...reservation,
      totalAmount: Number(reservation.totalAmount),
      discountAmount: Number(reservation.discountAmount),
      finalAmount: Number(reservation.finalAmount),
      consultingMethod,
      consultingSession,
      consultantContact,
      items: reservation.items.map((i) => ({
        ...i,
        price: Number(i.price),
        totalPrice: Number(i.totalPrice),
      })),
    },
  });
}
