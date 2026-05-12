import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/poveste")({
  component: StoryPage,
  head: () => ({
    meta: [
      { title: "Povestea Cutiuței Magice — handmade din România" },
      { name: "description", content: "Cum au prins viață cutiuțele muzicale Cutiuța Magică: lemn, laser, melodii și multă răbdare." },
    ],
  }),
});

function StoryPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">Despre noi</div>
      <h1 className="font-display text-5xl md:text-6xl mt-2">Cum a apărut <span className="gold-text">Cutiuța Magică</span></h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        A început dintr-un cadou. O cutiuță simplă din lemn, cu o melodie de la Hogwarts,
        oferită unei prietene care plângea la finalul ultimului film. Acel sunet metalic, cald,
        a făcut ceva ce niciun mesaj n-ar fi putut spune: a oprit timpul.
      </p>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
        Așa s-a născut Cutiuța Magică — un mic atelier unde gravăm cu laser în lemn natural
        poveștile pe care le iubim. Stăpânul Inelelor, Game of Thrones, Harry Potter,
        cântece de dragoste — fiecare melodie e aleasă cu grijă, fiecare gravură e verificată
        cu mâna înainte să plece spre tine.
      </p>

      <h2 className="font-display text-3xl mt-12">De ce lemn?</h2>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        Pentru că lemnul îmbătrânește frumos. Pentru că își amintește de mâinile care l-au atins.
        Pentru că, atunci când îl așezi pe birou, aduce cu el liniștea unei biblioteci vechi.
      </p>

      <h2 className="font-display text-3xl mt-12">De ce manivelă?</h2>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        Pentru că melodia trebuie meritată. O învârți încet, urmărești pinul, asculți cum
        lamela atinge prima notă. Nu ai nevoie de baterii, nu ai nevoie de aplicație. Doar de tine.
      </p>

      <div className="mt-12 wood-grain text-[color:var(--cream)] rounded-2xl p-8 shadow-warm">
        <p className="font-display text-2xl">"Cele mai bune cadouri sunt cele care se aud."</p>
        <p className="mt-2 text-sm text-[color:var(--cream)]/70">— echipa Cutiuța Magică</p>
      </div>
    </article>
  );
}
