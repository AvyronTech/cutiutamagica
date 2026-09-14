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

import appCss from "../styles.css?url";
import { ShopProvider } from "@/store/shop";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SideScrollMagic } from "@/components/site/SideScrollMagic";
import { StoryLoadingScreen } from "@/components/site/StoryLoadingScreen";

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b1120" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "Cutiuța Magică — Cutiuțe muzicale din lemn" },
      {
        name: "description",
        content:
          "Cutiuțe muzicale din lemn cu manivelă, mecanism manual și melodii tematice, prezentate prin fotografiile produselor.",
      },
      { name: "google-site-verification", content: "qIm8mkNBA6rC0vDEbBupl5-0tB_p1GpgJnylo2aKYKo" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Cutiuța Magică" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Cutiuța Magică",
          url: "https://cutiutamagica.eu",
          logo: "https://cutiutamagica.eu/favicon.ico",
          description: "Cutiuțe muzicale din lemn cu manivelă și mecanism manual.",
          address: { "@type": "PostalAddress", addressCountry: "RO" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Cutiuța Magică",
          url: "https://cutiutamagica.eu",
          inLanguage: "ro-RO",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://cutiutamagica.eu/produse?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
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
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChrome = !pathname.startsWith("/admin") && pathname !== "/auth";
  const showBack = isChrome && pathname !== "/";
  const isProductPage = pathname.startsWith("/produs/");
  const isHome = pathname === "/";
  return (
    <QueryClientProvider client={queryClient}>
      <ShopProvider>
        {isHome && <StoryLoadingScreen />}
        {isChrome && <Header />}
        {showBack && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <Link
              to={isProductPage ? "/produse" : "/"}
              className="group inline-flex items-center gap-2 rounded-full pl-2 pr-4 py-1.5 text-sm font-medium text-[color:var(--wood-dark)] bg-[color:var(--cream)]/55 backdrop-blur-md border border-[color:var(--gold)]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_-8px_rgba(120,80,40,0.35)] hover:bg-[color:var(--cream)]/85 hover:border-[color:var(--gold)] hover:-translate-y-0.5 transition-all"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[color:var(--cream)] border border-[color:var(--gold)]/50 group-hover:-translate-x-0.5 transition-transform">
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
        {isChrome && <SideScrollMagic />}
        <Toaster position="top-center" richColors />
      </ShopProvider>
    </QueryClientProvider>
  );
}
