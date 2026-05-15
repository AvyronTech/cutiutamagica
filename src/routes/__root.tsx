import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { ShopProvider } from "@/store/shop";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pagina nu există.</p>
        <Link to="/" className="mt-6 inline-block bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm">Înapoi acasă</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Ceva nu a mers</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm">Reîncearcă</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cutiuța Magică — Cutiuțe muzicale din lemn, gravate cu suflet" },
      { name: "description", content: "Cutiuțe muzicale din lemn fabricate grijă și pasiune cu un mecanism durabil și piesa preferată" },
      { name: "keywords", content: "cutiuta muzicala, cutiute muzicale lemn, harry potter, game of thrones, lord of the rings, cadou handmade, music box romania" },
      { property: "og:title", content: "Cutiuța Magică — Cutiuțe muzicale din lemn, gravate cu suflet" },
      { property: "og:description", content: "Cutiuțe muzicale din lemn fabricate grijă și pasiune cu un mecanism durabil și piesa preferată" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cutiuța Magică — Cutiuțe muzicale din lemn, gravate cu suflet" },
      { name: "twitter:description", content: "Cutiuțe muzicale din lemn fabricate grijă și pasiune cu un mecanism durabil și piesa preferată" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3AoonePxKwae1U6DhrnFrIXZcau1/social-images/social-1778596011877-file_00000000fd8071f58f81d921d486cb74.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3AoonePxKwae1U6DhrnFrIXZcau1/social-images/social-1778596011877-file_00000000fd8071f58f81d921d486cb74.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" },
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
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ShopProvider>
        <Header />
        <main className="min-h-[60vh]"><Outlet /></main>
        <Footer />
        <Toaster position="top-center" richColors />
      </ShopProvider>
    </QueryClientProvider>
  );
}
