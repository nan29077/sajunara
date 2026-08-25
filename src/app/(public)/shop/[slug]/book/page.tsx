import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopAwareLoginPath } from "@/lib/shopLoginRedirect";
import BookingFlow from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

const BASE_PRODUCT_SELECT = {
  id: true,
  name: true,
  basePrice: true,
  thumbnail: true,
  description: true,
} as const;

const CONSULTING_PRODUCT_SELECT = {
  ...BASE_PRODUCT_SELECT,
  consultingType: true,
  consultingMethod: true,
  durationMinutes: true,
} as const;

// select 를 런타임에 바꾸므로 두 select 의 합집합을 명시해 타입을 되찾는다.
interface BookProduct {
  id: string;
  name: string;
  basePrice: unknown; // Prisma.Decimal — Number() 로만 사용
  thumbnail: string | null;
  description: string | null;
  consultingType?: string;
  consultingMethod?: string;
  durationMinutes?: number;
}

function sellerQuery(productSelect: object) {
  return {
    user: { select: { id: true, name: true, avatar: true } },
    shopProducts: {
      where: { isActive: true, isApproved: true },
      include: { product: { select: productSelect } },
      orderBy: { displayOrder: "asc" as const },
    },
  };
}

/**
 * 상담사 + 상담상품 조회.
 * 상담 관련 컬럼(consultingType 등)이 아직 운영 DB 에 없는 환경에서도 예약 페이지가
 * 죽지 않도록, 실패하면 기본 컬럼만으로 한 번 더 조회한다. (c/[slug] 와 동일 패턴)
 */
async function getSeller(slug: string) {
  try {
    return await prisma.sellerProfile.findUnique({
      where: { slug },
      include: sellerQuery(CONSULTING_PRODUCT_SELECT),
    });
  } catch (e) {
    console.error("Booking page: 상담 컬럼 조회 실패, 기본 컬럼으로 폴백", e);
    return prisma.sellerProfile.findUnique({
      where: { slug },
      include: sellerQuery(BASE_PRODUCT_SELECT),
    });
  }
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?:
    | Promise<{ product?: string; live?: string }>
    | { product?: string; live?: string };
}) {
  const session = await auth();
  const { slug } = await Promise.resolve(params);
  const { product: productParam, live: liveParam } = (await Promise.resolve(searchParams)) ?? {};

  if (!session?.user) {
    redirect(getShopAwareLoginPath(`/shop/${slug}/book`));
  }

  const seller = await getSeller(slug);

  if (!seller || !seller.isApproved) notFound();

  const products = seller.shopProducts.map((sp) => {
    const p = sp.product as unknown as BookProduct;
    return {
      id: p.id,
      name: p.name,
      basePrice: Number(p.basePrice),
      consultingType: p.consultingType ?? null,
      consultingMethod: p.consultingMethod ?? null,
      durationMinutes: p.durationMinutes ?? null,
      thumbnail: p.thumbnail,
      description: p.description,
      sellerPrice: sp.sellerPrice ? Number(sp.sellerPrice) : null,
    };
  });

  // 라이브 등에서 특정 상품으로 진입: 목록에 없지만 이 상담사 소유 상품이면 추가
  if (productParam && !products.some((p) => p.id === productParam)) {
    type ExtraProduct = BookProduct & { sellerId: string | null; isActive: boolean };
    let extra: ExtraProduct | null = null;
    try {
      extra = (await prisma.product.findUnique({
        where: { id: productParam },
        select: { ...CONSULTING_PRODUCT_SELECT, sellerId: true, isActive: true },
      })) as ExtraProduct | null;
    } catch {
      try {
        extra = (await prisma.product.findUnique({
          where: { id: productParam },
          select: { ...BASE_PRODUCT_SELECT, sellerId: true, isActive: true },
        })) as ExtraProduct | null;
      } catch {
        extra = null;
      }
    }
    if (extra && extra.isActive && extra.sellerId === seller.id) {
      products.unshift({
        id: extra.id,
        name: extra.name,
        basePrice: Number(extra.basePrice),
        consultingType: extra.consultingType ?? null,
        consultingMethod: extra.consultingMethod ?? null,
        durationMinutes: extra.durationMinutes ?? null,
        thumbnail: extra.thumbnail,
        description: extra.description,
        sellerPrice: null,
      });
    }
  }

  // ── 방식×시간 조합 옵션 부착 (운영 DB 드리프트 안전) ──────────────────────
  // BookingFlow 가 방식→시간 2단계 선택 후 조합 가격으로 결제할 수 있도록,
  // 각 상품의 optionGroups(JSON) + variants([{id,name,price}]) 를 함께 넘긴다.
  const productIds = products.map((p) => p.id);
  const optionMap: Record<
    string,
    {
      optionGroups: { groupName: string; options: string[] }[] | null;
      variants: { id: string; name: string; price: number }[];
    }
  > = {};
  if (productIds.length > 0) {
    // variants — 관계 테이블은 항상 존재
    try {
      const vrows = await prisma.productVariant.findMany({
        where: { productId: { in: productIds }, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, price: true, productId: true },
      });
      for (const v of vrows) {
        if (!optionMap[v.productId]) optionMap[v.productId] = { optionGroups: null, variants: [] };
        optionMap[v.productId].variants.push({ id: v.id, name: v.name, price: Number(v.price) });
      }
    } catch (e) {
      console.error("Booking page: variants 조회 실패", e);
    }
    // optionGroups — 스칼라 컬럼이 운영 DB에 없을 수 있어 별도 try
    try {
      const grows = (await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, optionGroups: true } as any,
      })) as unknown as { id: string; optionGroups: string | null }[];
      for (const g of grows) {
        if (g.optionGroups) {
          try {
            if (!optionMap[g.id]) optionMap[g.id] = { optionGroups: null, variants: [] };
            optionMap[g.id].optionGroups = JSON.parse(g.optionGroups);
          } catch {
            /* JSON 파싱 실패 무시 */
          }
        }
      }
    } catch (e) {
      console.error("Booking page: optionGroups 조회 실패(컬럼 미반영일 수 있음)", e);
    }
  }
  const productsWithOptions = products.map((p) => ({
    ...p,
    optionGroups: optionMap[p.id]?.optionGroups ?? null,
    variants: optionMap[p.id]?.variants ?? [],
  }));

  return (
    <BookingFlow
      seller={{
        id: seller.id,
        slug: seller.slug,
        shopName: seller.shopName,
        shopLogo: seller.shopLogo,
        shopDescription: seller.shopDescription,
        consultantUserId: seller.user.id,
        consultantName: seller.user.name,
        consultantAvatar: seller.user.avatar,
      }}
      products={productsWithOptions}
      currentUserId={session.user.id}
      initialProductId={productParam || null}
      liveStreamId={liveParam || null}
    />
  );
}
