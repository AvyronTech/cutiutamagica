import { createFileRoute } from "@tanstack/react-router";

import workshopBg from "@/assets/poveste-workshop.webp";
import workshopBgSm from "@/assets/poveste-workshop-sm.webp";

export const Route = createFileRoute("/poveste")({
  component: StoryPage,
  head: () => ({
    meta: [
      { title: "Povestea Cutiuței Magice — handmade din România" },
      { name: "description", content: "Cum au prins viață cutiuțele muzicale Cutiuța Magică: lemn, laser, melodii și multă răbdare." },
      { property: "og:title", content: "Povestea Cutiuței Magice" },
      { property: "og:description", content: "Cum au prins viață cutiuțele muzicale: lemn, laser, melodii și multă răbdare." },
      { property: "og:url", content: "https://cutiutamagica.eu/poveste" },
      { property: "og:image", content: workshopBg },
    ],
    links: [
      { rel: "canonical", href: "https://cutiutamagica.eu/poveste" },
      // Preload the LCP background — responsive: small file on phones, full image on desktop.
      {
        rel: "preload",
        as: "image",
        href: workshopBg,
        imageSrcSet: `${workshopBgSm} 1100w, ${workshopBg} 1920w`,
        imageSizes: "100vw",
        fetchpriority: "high",
      } as unknown as { rel: string },
    ],
  }),
});

function StoryPage() {
  return (
    <div className="relative min-h-[100svh]">
      {/* Cinematic workshop background — real <img> for priority + responsive sources */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={workshopBg}
          srcSet={`${workshopBgSm} 1100w, ${workshopBg} 1920w`}
          sizes="100vw"
          width={1920}
          height={1280}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-[center_35%] md:object-center select-none pointer-events-none"
          draggable={false}
        />
        {/* Soft cinematic overlay so text stays readable but the photo still reads clearly */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.16 0.03 40 / 0.55) 0%, oklch(0.14 0.025 35 / 0.7) 55%, oklch(0.12 0.02 35 / 0.88) 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 20%, oklch(0.78 0.18 65 / 0.18) 0%, transparent 70%), radial-gradient(50% 40% at 10% 80%, oklch(0.55 0.18 35 / 0.18) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8 text-[color:var(--cream)]">



        <article className="py-12 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">Despre noi</div>
          <h1 className="font-display text-5xl md:text-6xl mt-2">
            Cum a apărut <span className="gold-text">Cutiuța Magică</span>
          </h1>

          <p className="mt-8 text-lg leading-relaxed text-[color:var(--cream)]/90 mx-auto max-w-2xl">
            A început dintr-un cadou. O cutiuță simplă din lemn, cu o melodie de la Hogwarts,
            oferită unei prietene care plângea la finalul ultimului film. Acel sunet metalic, cald,
            a făcut ceva ce niciun mesaj n-ar fi putut spune: a oprit timpul.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-[color:var(--cream)]/90 mx-auto max-w-2xl">
            Așa s-a născut Cutiuța Magică — un mic atelier unde gravăm cu laser în lemn natural
            poveștile pe care le iubim. Stăpânul Inelelor, Game of Thrones, Harry Potter,
            cântece de dragoste — fiecare melodie e aleasă cu grijă, fiecare gravură e verificată
            cu mâna înainte să plece spre tine.
          </p>

          <div className="mt-14 grid sm:grid-cols-2 gap-6 text-left">
            <div className="rounded-2xl border border-[color:var(--gold)]/25 bg-[oklch(0.18_0.03_40)]/75 backdrop-blur-md p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
              <h2 className="font-display text-2xl text-[color:var(--cream)]">De ce lemn?</h2>
              <p className="mt-3 text-[color:var(--cream)]/80 leading-relaxed">
                Pentru că lemnul îmbătrânește frumos. Pentru că își amintește de mâinile care l-au atins.
                Pentru că, atunci când îl așezi pe birou, aduce cu el liniștea unei biblioteci vechi.
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--gold)]/25 bg-[oklch(0.18_0.03_40)]/75 backdrop-blur-md p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
              <h2 className="font-display text-2xl text-[color:var(--cream)]">De ce manivelă?</h2>
              <p className="mt-3 text-[color:var(--cream)]/80 leading-relaxed">
                Pentru că melodia trebuie meritată. O învârți încet, urmărești pinul, asculți cum
                lamela atinge prima notă. Nu ai nevoie de baterii, nu ai nevoie de aplicație. Doar de tine.
              </p>
            </div>
          </div>

          <div className="mt-14 rounded-2xl border border-[color:var(--gold)]/30 bg-[oklch(0.14_0.025_35)]/85 backdrop-blur-md p-8 shadow-warm mx-auto max-w-2xl">
            <p className="font-display text-2xl text-[color:var(--cream)]">"Cele mai bune cadouri sunt cele care se aud."</p>
            <p className="mt-2 text-sm text-[color:var(--cream)]/70">— echipa Cutiuța Magică</p>
          </div>
        </article>
      </div>
    </div>
  );
}
