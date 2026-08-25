import { cookies } from "next/headers";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import FloatingButtons from "@/components/shared/FloatingButtons";
import HideOnShop from "@/components/shared/HideOnShop";
import ShopChromeProvider from "@/components/shared/ShopChromeProvider";
import { ShopSubpageHeader, ShopSubpageBottomNav } from "@/components/shared/ShopSubpageChrome";
import { getFeatureFlags, getSocialLinks, getFooterSettings } from "@/lib/settings";
import { SB_SHOP_COOKIE, parseShopCookie } from "@/lib/shopContext";
import BeeDecorations from "@/components/shared/BeeDecorations";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [flags, socialLinks, footerSettings] = await Promise.all([
    getFeatureFlags(),
    getSocialLinks(),
    getFooterSettings(),
  ]);
  const initialShop = parseShopCookie(cookies().get(SB_SHOP_COOKIE)?.value);

  return (
    <ShopChromeProvider initialShop={initialShop}>
      <div className="sajunara-public-shell min-h-screen">
        <div className="sajunara-app-frame relative z-10 max-w-[480px] mx-auto bg-white min-h-screen shadow-[0_0_52px_rgba(36,20,69,0.14)] pb-[env(safe-area-inset-bottom)]">
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <ShopSubpageHeader />
          <main className="pb-20">{children}</main>
          <Footer flags={flags} socialLinks={socialLinks} footerSettings={footerSettings} />
        </div>
        <HideOnShop>
          <FloatingButtons />
        </HideOnShop>
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
        <ShopSubpageBottomNav />
        <BeeDecorations />
      </div>
    </ShopChromeProvider>
  );
}
