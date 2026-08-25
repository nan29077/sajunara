import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/safeDb";

// 금액(배송비 등) 파싱: 음수/NaN은 기본값으로 보정
function toMoney(value: any, fallback = 0): number {
  const n = parseFloat(String(value));
  return isNaN(n) || n < 0 ? fallback : n;
}
// 임계금액: 비어있으면 null, 값이 있으면 음수 보정
function toMoneyOrNull(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = parseFloat(String(value));
  return isNaN(n) || n < 0 ? null : n;
}
// 조합별 정원(재고) → sku 컬럼 저장용 정수 문자열 (미입력/무효는 null)
function stockToSku(value: any): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? String(n) : null;
}
// sku(정수 문자열)에 보존된 정원을 숫자로 복원 (없으면 0)
function skuToStock(sku: string | null | undefined): number {
  return sku && /^\d+$/.test(sku) ? parseInt(sku, 10) : 0;
}

// GET: Fetch product data for editing
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const role = session.user.role;
    if (!["SUPER_ADMIN", "CONSULTANT"].includes(role)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        variants: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        sellerProducts: {
          include: {
            seller: {
              select: { id: true, shopName: true, shopLogo: true, slug: true },
            },
          },
        },
        _count: {
          select: { reviews: true, campaigns: true, sellerProducts: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "상담상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // Fetch categories for the form
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    });

    const isSeller = role === "CONSULTANT";

    // 상담사 노출 공급가 = 공급가 + 관리자 마진 (공급가 없으면 판매가로 폴백)
    // 상담사에게는 원본 공급가·마진 내역을 숨기고 합계만 공급가로 보여준다.
    const sellerSupply =
      (product.supplyPrice != null ? Number(product.supplyPrice) : Number(product.basePrice)) +
      (product.adminMargin != null ? Number(product.adminMargin) : 0);

    return NextResponse.json({
      product: {
        ...product,
        basePrice: Number(product.basePrice),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
        supplyPrice: isSeller
          ? sellerSupply
          : product.supplyPrice != null ? Number(product.supplyPrice) : null,
        adminMargin: isSeller ? 0 : product.adminMargin,
        variants: product.variants.map((v) => ({
          ...v,
          price: Number(v.price),
          // 조합별 정원을 sku 에서 복원해 편집 폼에 되돌려준다
          stock: skuToStock((v as { sku?: string | null }).sku),
        })),
      },
      categories,
    });
  } catch (error) {
    console.error("Product fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

// PUT: Update product
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const role = session.user.role;
    if (!["SUPER_ADMIN", "CONSULTANT"].includes(role)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });
    if (!product) {
      return NextResponse.json({ error: "상담상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // Check seller ownership — 상담사는 본인이 직접 등록한 상담상품만 수정 가능
    if (role === "CONSULTANT") {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: session.user!.id },
      });
      if (!sellerProfile || product.sellerId !== sellerProfile.id) {
        return NextResponse.json({ error: "본인이 등록한 상담상품만 수정할 수 있습니다" }, { status: 403 });
      }
    }

    const body = await req.json();
    const {
      name, description, basePrice, comparePrice, supplyPrice, categoryId,
      thumbnail, detailContent, variants, images, badges, isActive,
      optionGroups,
      consultingType, consultingMethod, durationMinutes, maxDailySlots,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "상담상품명은 필수입니다" }, { status: 400 });
    }

    // 판매가 검증·수정
    let parsedBasePrice: number | undefined;
    if (basePrice === undefined || basePrice === null || basePrice === "") {
      return NextResponse.json({ error: "상담상품명과 가격은 필수입니다" }, { status: 400 });
    }
    parsedBasePrice = parseFloat(String(basePrice));
    if (isNaN(parsedBasePrice) || parsedBasePrice < 0) {
      return NextResponse.json({ error: "유효한 가격을 입력해주세요" }, { status: 400 });
    }

    const variantList = Array.isArray(variants) ? variants.filter((v: any) => v.name) : null;

    // 상담상품 기본 정보 업데이트
    const updateData: any = {
      name,
      description: description || null,
      detailContent: detailContent || null,
      categoryId: categoryId || null,
      thumbnail: thumbnail || null,
      isActive: isActive !== undefined ? !!isActive : undefined,
    };
    // 상담 속성 4종은 운영 DB 미반영 컬럼(P2022)일 수 있어 별도 객체로 분리 — 실패 시 제외하고 재시도
    const consultingUpdate: any = {
      consultingType: consultingType !== undefined ? String(consultingType) : undefined,
      consultingMethod: consultingMethod !== undefined ? String(consultingMethod) : undefined,
      durationMinutes:
        durationMinutes !== undefined ? Math.max(1, parseInt(String(durationMinutes), 10) || 30) : undefined,
      maxDailySlots:
        maxDailySlots !== undefined ? Math.max(1, parseInt(String(maxDailySlots), 10) || 5) : undefined,
    };
    Object.keys(consultingUpdate).forEach(k => { if (consultingUpdate[k] === undefined) delete consultingUpdate[k]; });

    if (parsedBasePrice !== undefined) {
      updateData.basePrice = parsedBasePrice;
      if (comparePrice !== undefined) {
        updateData.comparePrice = comparePrice ? parseFloat(String(comparePrice)) : null;
      }
    }
    // 상담사 응답의 supplyPrice는 마진이 합산된 노출용 값이므로, 상담사 요청의 공급가는 저장하지 않는다.
    if (supplyPrice !== undefined && role !== "CONSULTANT") {
      updateData.supplyPrice = toMoneyOrNull(supplyPrice);
    }
    if (badges !== undefined) {
      updateData.badges = badges && Array.isArray(badges) && badges.length > 0 ? JSON.stringify(badges) : null;
    }
    if (optionGroups !== undefined) {
      updateData.optionGroups = optionGroups && Array.isArray(optionGroups) && optionGroups.length > 0
        ? JSON.stringify(optionGroups)
        : null;
    }
    // undefined 값 제거 (기존값 유지)
    Object.keys(updateData).forEach(k => { if (updateData[k] === undefined) delete updateData[k]; });

    let updated;
    try {
      updated = await prisma.product.update({
        where: { id: params.id },
        data: { ...updateData, ...consultingUpdate },
      });
    } catch (e) {
      if (!isMissingSchemaError(e)) throw e;
      console.warn("[products/[id]] 상담 컬럼 미반영(P2022) — 상담 속성 제외 후 재시도");
      updated = await prisma.product.update({
        where: { id: params.id },
        data: updateData,
      });
    }

    // variants 업데이트: 기존 삭제 후 재생성
    if (variantList !== null) {
      await prisma.productVariant.deleteMany({ where: { productId: params.id } });
      if (variantList.length > 0) {
        await prisma.productVariant.createMany({
          data: variantList.map((v: any, i: number) => ({
            productId: params.id,
            name: v.name,
            price: parseFloat(String(v.price || updated.basePrice)),
            sortOrder: i,
            isActive: true,
            // 조합별 정원(재고)을 sku 에 보존 (스키마 변경 없이)
            sku: stockToSku(v.stock),
          })),
        });
      }
    }

    // images 업데이트: 제공된 경우 재생성
    if (images && Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: params.id } });
      if (images.filter(Boolean).length > 0) {
        await prisma.productImage.createMany({
          data: images.filter(Boolean).map((url: string, i: number) => ({
            productId: params.id,
            url,
            alt: `${name} 이미지 ${i + 1}`,
            sortOrder: i,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, product: { ...updated, basePrice: Number(updated.basePrice) } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  const role = session.user.role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
