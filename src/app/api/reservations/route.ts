import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery, isMissingSchemaError } from "@/lib/safeDb";
import { generateOrderNumber } from "@/lib/utils";
import { hhmmToMinutes, parseConsultDurationMinutes } from "@/lib/consultSlots";

export const dynamic = "force-dynamic";

// GET /api/reservations — 예약 목록 조회
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const consultantId = url.searchParams.get("consultantId");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const role = session.user.role;
  const where: Record<string, unknown> = {};

  if (role === "CUSTOMER") {
    where.userId = session.user.id;
  } else if (role === "CONSULTANT") {
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!seller) return NextResponse.json({ reservations: [] });
    where.sellerId = seller.id;
  }
  // SUPER_ADMIN: 필터만 적용

  if (status && status !== "ALL") where.status = status;
  if (consultantId && role === "SUPER_ADMIN") where.sellerId = consultantId;
  if (dateFrom || dateTo) {
    where.reservationDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  const [reservations, total] = await safeQuery("reservations list", () => Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        seller: { select: { id: true, shopName: true, slug: true, user: { select: { name: true, avatar: true } } } },
        items: {
          include: { variant: { select: { name: true } } },
        },
        timeSlot: { select: { id: true, startTime: true, endTime: true } },
      },
      orderBy: { reservationDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]), [[], 0]);

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      discountAmount: Number(r.discountAmount),
      finalAmount: Number(r.finalAmount),
      items: r.items.map((i) => ({
        ...i,
        price: Number(i.price),
        totalPrice: Number(i.totalPrice),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/reservations — 예약 생성
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const {
    sellerId,
    productId,
    timeSlotId,
    reservationDate,
    reservationTime,
    customerName,
    customerPhone,
    birthDate,
    birthTime,
    gender,
    consultingContent,
    liveStreamId,
    variantId,
  } = body;

  if (!sellerId || !productId || !timeSlotId || !reservationDate || !reservationTime || !customerName || !customerPhone) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 대상 상담사 확인 — body의 sellerId 는 신뢰하지 않고 슬롯·상품과의 정합성을 검증한다
      const sellerProfile = await tx.sellerProfile.findUnique({
        where: { id: sellerId },
        select: { id: true, userId: true },
      });
      if (!sellerProfile) throw new Error("상담사를 찾을 수 없습니다.");

      // 슬롯 가용 여부 확인 (비관적 잠금 대신 트랜잭션 내 재확인)
      const slot = await tx.timeSlot.findUnique({
        where: { id: timeSlotId },
      });
      if (!slot) throw new Error("존재하지 않는 예약 시간입니다.");
      // 슬롯 소유자(consultantId=User.id)와 예약 대상 상담사가 일치해야 한다
      if (slot.consultantId !== sellerProfile.userId) {
        throw new Error("해당 상담사의 예약 시간이 아닙니다.");
      }
      if (!slot.isAvailable || slot.reservationId) {
        throw new Error("SLOT_TAKEN");
      }

      // 상품 정보 조회
      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!product || !product.isActive) throw new Error("상담 상품을 찾을 수 없습니다.");
      // 상품 ↔ 상담사 정합성: 상담사 직접 등록 상품이거나, 해당 점집에 담긴 상품이어야 한다
      if (product.sellerId !== sellerId) {
        const shopProduct = await tx.sellerShopProduct.findFirst({
          where: { sellerId, productId, isActive: true },
          select: { id: true },
        });
        if (!shopProduct) throw new Error("해당 상담사의 상담 상품이 아닙니다.");
      }

      // 선택된 조합(방식×시간) variant — 있으면 그 조합의 가격으로 결제한다.
      // 조합명은 "영상 상담/1시간" 형태로 상담 시간(길이)이 포함돼 있어 캘린더 동기화에 재사용된다.
      let variant: { id: string; name: string; price: number } | null = null;
      if (typeof variantId === "string" && variantId) {
        const v = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { id: true, name: true, price: true, productId: true, isActive: true },
        });
        // 이 상품에 속한 활성 조합일 때만 신뢰 (아니면 무시하고 기본가로 진행)
        if (v && v.isActive && v.productId === product.id) {
          variant = { id: v.id, name: v.name, price: Number(v.price) };
        }
      }

      // 라이브 방송 유래 예약: 방송 검증 + 당일 슬롯 제한 확인
      let liveId: string | null = null;
      if (typeof liveStreamId === "string" && liveStreamId) {
        const live = await tx.liveStream.findUnique({
          where: { id: liveStreamId },
          select: { id: true, sellerId: true },
        });
        // 방송이 존재하고 예약 대상 상담사의 방송일 때만 연결 (아니면 조용히 무시)
        if (live && live.sellerId === sellerId) {
          liveId = live.id;
          // 당일 예약 가능 슬롯 수 제한 (설정 테이블 미반영 시 무제한)
          try {
            const settings = await tx.liveReservationSettings.findUnique({
              where: { liveStreamId: live.id },
              select: { dailySlotLimit: true },
            });
            if (settings?.dailySlotLimit != null && settings.dailySlotLimit > 0) {
              const dayStart = new Date();
              dayStart.setHours(0, 0, 0, 0);
              const todayCount = await tx.reservation.count({
                where: {
                  liveStreamId: live.id,
                  createdAt: { gte: dayStart },
                  status: { not: "CANCELLED" },
                },
              });
              if (todayCount >= settings.dailySlotLimit) {
                throw new Error("LIVE_SLOTS_FULL");
              }
            }
          } catch (e) {
            if ((e as Error).message === "LIVE_SLOTS_FULL") throw e;
            if (!isMissingSchemaError(e)) throw e;
            // 설정 테이블 미반영 — 제한 없이 진행
          }
        }
      }

      // 조합(variant)을 고르면 그 가격, 아니면 상품 기본가
      const amount = Number(variant ? variant.price : product.basePrice);
      const reservationNumber = generateOrderNumber();

      // 예약 생성
      const reservation = await tx.reservation.create({
        data: {
          reservationNumber,
          userId: session.user.id,
          sellerId,
          liveStreamId: liveId,
          status: "PENDING",
          paymentStatus: "PENDING",
          totalAmount: amount,
          discountAmount: 0,
          finalAmount: amount,
          reservationDate: new Date(reservationDate),
          reservationTime,
          customerName,
          customerPhone,
          birthDate: birthDate || null,
          birthTime: birthTime || null,
          gender: gender || null,
          consultingContent: consultingContent || null,
          items: {
            create: {
              itemType: "PRODUCT",
              productId,
              variantId: variant?.id ?? null,
              productName: product.name,
              variantName: variant?.name ?? null,
              price: amount,
              quantity: 1,
              totalPrice: amount,
            },
          },
        },
      });

      // 슬롯 예약 연결 및 비활성화
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: {
          isAvailable: false,
          reservationId: reservation.id,
        },
      });

      // 선택한 상담 시간(길이)만큼 이어지는 슬롯도 함께 닫기 위한 정보를 함께 반환.
      // 조합(variant)을 고른 예약에만 적용 — 기존 단일 슬롯 예약 동작은 그대로 유지한다.
      // (실제 차단은 트랜잭션 밖에서 베스트-에포트로 수행 — 실패해도 예약은 유지)
      const durationMinutes = variant ? parseConsultDurationMinutes(variant.name) : null;

      return {
        reservation,
        consultantId: sellerProfile.userId,
        slotStartTime: slot.startTime,
        durationMinutes,
      };
    });

    // ── 캘린더 동기화: 예약 길이만큼 이어지는 다른 슬롯도 닫는다 ──────────────
    // 예: 15:00 에 2시간 예약 → 15:00 슬롯(예약 연결) 외에 16:00 등 [15:00,17:00) 슬롯을 마감.
    // reservationId 는 1:1(@unique)이라 추가 슬롯에는 걸지 않고 isAvailable=false 로만 막는다.
    // 취소 시 PATCH 핸들러가 같은 구간을 다시 연다. 전 과정 베스트-에포트(실패해도 예약 성공 유지).
    try {
      const startMin = hhmmToMinutes(result.slotStartTime);
      const dur = result.durationMinutes;
      if (Number.isFinite(startMin) && dur && dur > 0) {
        const dayStart = new Date(reservationDate + "T00:00:00.000Z");
        const dayEnd = new Date(reservationDate + "T23:59:59.999Z");
        const siblings = await prisma.timeSlot.findMany({
          where: {
            consultantId: result.consultantId,
            date: { gte: dayStart, lte: dayEnd },
            isAvailable: true,
            reservationId: null,
          },
          select: { id: true, startTime: true },
        });
        const toBlock = siblings
          .filter((s) => {
            const m = hhmmToMinutes(s.startTime);
            return Number.isFinite(m) && m > startMin && m < startMin + dur;
          })
          .map((s) => s.id);
        if (toBlock.length > 0) {
          await prisma.timeSlot.updateMany({
            where: { id: { in: toBlock } },
            data: { isAvailable: false },
          });
        }
      }
    } catch (e) {
      console.warn("[reservations] 캘린더 동기화(연속 슬롯 차단) 실패 — 예약은 정상 처리됨", e);
    }

    return NextResponse.json({ reservation: result.reservation }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "예약 생성에 실패했습니다.";
    if (msg === "SLOT_TAKEN") {
      return NextResponse.json({ error: "이미 예약된 시간입니다. 다른 시간을 선택해 주세요." }, { status: 409 });
    }
    if (msg === "LIVE_SLOTS_FULL") {
      return NextResponse.json(
        { error: "오늘 이 방송에서 받을 수 있는 상담이 모두 마감되었습니다." },
        { status: 409 },
      );
    }
    if (isMissingSchemaError(err)) {
      return NextResponse.json(
        { error: "예약 저장소가 아직 준비되지 않았습니다. 관리자에게 문의해 주세요." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
