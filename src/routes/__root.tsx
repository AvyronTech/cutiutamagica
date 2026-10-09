import { ContextualMessages } from "@/components/site/ContextualMessages";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import displayFontNormal from "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-400-normal.woff2?url";
import displayFontItalic from "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-400-italic.woff2?url";
import { ShopProvider } from "@/store/shop";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SideScrollMagic } from "@/components/site/SideScrollMagic";
import { PageStoryLoader } from "@/components/site/PageStoryLoader";
import { ChatWidget } from "@/components/site/ChatWidget";
import { CartRecoveryPrompt } from "@/components/site/CartRecoveryPrompt";
import { CookieConsent } from "@/components/site/CookieConsent";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { trackGrowthEvent } from "@/lib/growth-events";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/seo-head";
import { isProductPath, productIdFromPathname } from "@/lib/product-url";

function GrowthPageView({ pathname }: { pathname: string }) {
  useEffect(() => {
    const productSlug = productIdFromPathname(pathname);
    trackGrowthEvent("page_view", {
      productSlug,
      once: `page_view:${pathname}`,
      properties: {
        pageType: productSlug
          ? "product"
          : pathname === "/comanda"
            ? "checkout"
            : pathname === "/produse"
              ? "catalog"
              : pathname === "/"
                ? "home"
                : "content",
      },
    });
    if (productSlug) {
      trackGrowthEvent("product_view", {
        productSlug,
        once: `product_view:${productSlug}`,
      });
    }
  }, [pathname]);
  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pagina nu există.</p>
        <Link
          to="/"
          className="mt-6 inline-block bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
        >
          Înapoi acasă
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Ceva nu a mers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A apărut o eroare neașteptată. Te rugăm să încerci din nou.
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
        >
          Reîncearcă
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ location }) => ({
    pricing:
      location.pathname.startsWith("/admin") || location.pathname === "/auth"
        ? null
        : await getStorePricing(),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b1120" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Cutiuța Magică" },
      { title: "Cutiuța Magică — Cutiuțe muzicale din lemn" },
      {
        name: "description",
        content:
          "Cutiuțe muzicale din lemn cu manivelă, mecanism manual și melodii tematice, prezentate prin fotografiile produselor.",
      },
      { name: "google-site-verification", content: "qIm8mkNBA6rC0vDEbBupl5-0tB_p1GpgJnylo2aKYKo" },
      { name: "google-site-verification", content: "I2EUSXQN6RyLVGECPjtdXrhfF7-IMJ2unBAIrmfwxfw" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Cutiuța Magică" },
      { property: "og:locale", content: "ro_RO" },
      { property: "og:title", content: "Cutiuța Magică — cutiuțe muzicale cu poveste" },
      {
        property: "og:description",
        content:
          "Cutiuțe muzicale din lemn cu manivelă, melodii îndrăgite și daruri alese pentru amintiri care rămân.",
      },
      { property: "og:url", content: "https://cutiutamagica.eu/" },
      { property: "og:image", content: DEFAULT_SOCIAL_IMAGE },
      {
        property: "og:image:alt",
        content: "Cutiuțe muzicale din lemn într-un decor de poveste",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cutiuța Magică — cutiuțe muzicale cu poveste" },
      {
        name: "twitter:description",
        content:
          "Cutiuțe muzicale din lemn cu manivelă, melodii îndrăgite și daruri alese pentru amintiri care rămân.",
      },
      { name: "twitter:image", content: DEFAULT_SOCIAL_IMAGE },
    ],
    links: [
      {
        rel: "preload",
        href: displayFontNormal,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: displayFontItalic,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          "@id": "https://cutiutamagica.eu/#organization",
          name: "Cutiuța Magică",
          alternateName: "Cutiuta Magica",
          legalName: "DIGITAL ECOTECH SOLUTIONS S.R.L.",
          taxID: "55055976",
          url: "https://cutiutamagica.eu",
          logo: "https://cutiutamagica.eu/icon-512.png",
          brand: {
            "@type": "Brand",
            "@id": "https://cutiutamagica.eu/#brand",
            name: "Cutiuța Magică",
            alternateName: "Cutiuta Magica",
            logo: "https://cutiutamagica.eu/icon-512.png",
          },
          description: "Cutiuțe muzicale din lemn cu manivelă și mecanism manual.",
          email: "mailto:contact@cutiutamagica.eu",
          telephone: "+40734605742",
          address: { "@type": "PostalAddress", addressCountry: "RO" },
          areaServed: { "@type": "Country", name: "România" },
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: "+40734605742",
            email: "contact@cutiutamagica.eu",
            availableLanguage: ["ro"],
            areaServed: "RO",
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "RO",
            returnPolicyCountry: "RO",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 14,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/ReturnShippingFees",
            refundType: "https://schema.org/FullRefund",
            merchantReturnLink: "https://cutiutamagica.eu/retur",
          },
          hasShippingService: [
            {
              "@type": "ShippingService",
              "@id": "https://cutiutamagica.eu/#shipping-home",
              name: "Curier la adresă în România",
              description:
                "Livrare la adresă prin curier, cu tariful afișat înainte de finalizarea comenzii.",
              fulfillmentType: "https://schema.org/FulfillmentTypeDelivery",
              shippingConditions: {
                "@type": "ShippingConditions",
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "RO" },
                shippingRate: { "@type": "MonetaryAmount", value: 25, currency: "RON" },
              },
            },
            {
              "@type": "ShippingService",
              "@id": "https://cutiutamagica.eu/#shipping-easybox",
              name: "Livrare SAMEDAY easybox în România",
              description:
                "Livrare la punctul SAMEDAY easybox ales în checkout, în limita disponibilității.",
              fulfillmentType: "https://schema.org/FulfillmentTypeCollectionPoint",
              shippingConditions: {
                "@type": "ShippingConditions",
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "RO" },
                shippingRate: { "@type": "MonetaryAmount", value: 15, currency: "RON" },
              },
            },
          ],
          sameAs: [
            "https://www.facebook.com/profile.php?id=61590919580877",
            "https://www.instagram.com/cutiutamagicaofficial/",
            "https://www.tiktok.com/@cutiua.magic",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://cutiutamagica.eu/#website",
          publisher: { "@id": "https://cutiutamagica.eu/#organization" },
          name: "Cutiuța Magică",
          url: "https://cutiutamagica.eu",
          inLanguage: "ro-RO",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('cutiuta:cinematic-intro:v2')==='1')document.documentElement.classList.add('story-intro-seen')}catch{}",
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { pricing } = Route.useLoaderData();
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChrome = !pathname.startsWith("/admin") && pathname !== "/auth";
  const showBack = isChrome && pathname !== "/";
  const isProductPage = isProductPath(pathname);
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ShopProvider pricing={pricing}>
          {isChrome && <GrowthPageView pathname={pathname} />}
          {isChrome && <PageStoryLoader initialPath={pathname} />}
          {isChrome && <Header />}
          {isChrome && <CartRecoveryPrompt pathname={pathname} />}
          {showBack && (
            <div className="page-back-dock">
              <Link to={isProductPage ? "/produse" : "/"} className="page-back-link group">
                <span className="page-back-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                </span>
                {isProductPage ? "Înapoi la cutiuțe" : "Înapoi acasă"}
              </Link>
            </div>
          )}
          <main className="min-h-[60vh]">
            <Outlet />
          </main>
          {isChrome && <Footer />}
          {isChrome && <ContextualMessages />}
          {isChrome && <SideScrollMagic />}
          {isChrome && <ChatWidget />}
          {isChrome && <CookieConsent />}
          {isChrome ? (
            <>
              <Toaster
                position="top-center"
                offset={76}
                mobileOffset={68}
                gap={7}
                visibleToasts={2}
                style={
                  {
                    "--normal-bg": "oklch(0.21 0.035 40 / 0.94)",
                    "--normal-border": "oklch(0.74 0.14 78 / 0.38)",
                    "--normal-text": "oklch(0.96 0.02 80)",
                    "--border-radius": "13px",
                  } as React.CSSProperties
                }
                toastOptions={{
                  classNames: {
                    toast:
                      "!backdrop-blur-xl !shadow-[0_18px_44px_-18px_oklch(0.2_0.05_40/0.75),inset_0_1px_0_oklch(0.95_0.05_85/0.12)] !font-body",
                    title: "!font-display !text-[0.95rem] !tracking-tight",
                    description: "!text-xs !text-[oklch(0.96_0.02_80/0.72)]",
                    actionButton:
                      "!rounded-full !bg-[linear-gradient(135deg,oklch(0.92_0.09_85),oklch(0.78_0.14_62))] !text-[oklch(0.25_0.04_40)] !font-medium",
                    icon: "!text-[oklch(0.8_0.15_78)]",
                  },
                }}
              />
            </>
          ) : (
            <Toaster position="top-center" richColors />
          )}
        </ShopProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
