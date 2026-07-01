import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Music, Sparkles, Gift, Palette, Clock } from "lucide-react";

const URL = "https://cutiutamagica.eu/ghid-cadouri-personalizate";
const TITLE = "Ghid: cum alegi o cutie muzicală personalizată — cadou unic 2026";
const DESC =
  "Ghid complet pentru alegerea unei cutii muzicale personalizate: melodii, teme (Harry Potter, LOTR, GoT), gravură și ocazii. Cadou emoționant, handmade din lemn.";

export const Route = createFileRoute("/ghid-cadouri-personalizate")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "cutie muzicala personalizata, cadou personalizat, cutiuta muzicala harry potter, cadou aniversare, cadou handmade" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          author: { "@type": "Organization", name: "Cutiuța Magică" },
          publisher: { "@type": "Organization", name: "Cutiuța Magică", url: "https://cutiutamagica.eu" },
          mainEntityOfPage: URL,
          inLanguage: "ro-RO",
          datePublished: "2026-07-01",
          dateModified: new Date().toISOString().slice(0, 10),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Cât costă o cutie muzicală personalizată?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Prețul de bază pentru o cutie muzicală personalizată Cutiuța Magică este de 119 lei, cu livrare prin easybox (12,99 lei) sau curier la domiciliu (25 lei). Comenzile peste 250 lei beneficiază de transport gratuit.",
              },
            },
            {
              "@type": "Question",
              name: "Ce melodii pot alege pentru cutia muzicală?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Oferim melodii din universuri iconice: Harry Potter (Hedwig's Theme), Lord of the Rings, Game of Thrones, Pirații din Caraibe, dar și piese clasice pentru copii, nunți sau aniversări.",
              },
            },
            {
              "@type": "Question",
              name: "Cutia muzicală are baterii?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Nu. Mecanismul este 100% manual, cu manivelă — durabil, silențios, fără piese electronice care se pot strica. O cutie autentică rezistă zeci de ani.",
              },
            },
            {
              "@type": "Question",
              name: "Cât durează livrarea?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "24–48 de ore în toată România. Poți programa livrarea pentru o anumită zi dacă o vrei cadou de aniversare sau eveniment.",
              },
            },
          ],
        }),
      },
    ],
  }),
});

function GuidePage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      <article className="mx-auto max-w-3xl px-4 pt-24 md:pt-28">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Ghid Cutiuța Magică</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl leading-tight text-foreground">
          Cum alegi o cutie muzicală personalizată — cadoul care rămâne o viață
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          O cutie muzicală personalizată nu este un obiect. Este un moment încremenit — melodia
          preferată, tema unui univers îndrăgit, o gravură care spune „te-am ținut minte". Iată
          cum alegi cutiuța potrivită pentru persoana potrivită.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" /> 1. Alege melodia (contează mai mult decât crezi)
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Melodia este sufletul cutiei. Pentru un fan Harry Potter, Hedwig's Theme declanșează
            instantaneu nostalgia primului roman. Pentru cineva romantic, Concerning Hobbits sau
            River Flows in You transformă orice după-amiază într-o scenă de film. Cutiuța Magică
            oferă zeci de melodii din universurile Harry Potter, Lord of the Rings, Game of Thrones
            și Pirații din Caraibe — plus piese clasice pentru copii, nunți și aniversări.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> 2. Alege tema care spune ceva
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Fiecare cutiuță este gravată cu simboluri autentice: Deathly Hallows, One Ring, House
            Stark, compasul piraților. Pentru cineva care își așteaptă încă scrisoarea de la
            Hogwarts, „I'm a Keeper" este cadoul care spune totul fără cuvinte. Pentru fanii LOTR,
            „One Ring to Rule Them All" este ritualul deschis la fiecare aniversare.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> 3. Potrivește-o ocaziei
          </h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc pl-5">
            <li><strong className="text-foreground">Aniversare</strong> — melodia din anul copilăriei sau tema serialului preferat.</li>
            <li><strong className="text-foreground">Nuntă / aniversare de căsătorie</strong> — prima melodie dansată împreună.</li>
            <li><strong className="text-foreground">Cadou pentru copil</strong> — teme din poveștile lui preferate.</li>
            <li><strong className="text-foreground">Cadou corporate B2B</strong> — pachete personalizate pentru evenimente, edituri, cafenele tematice.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> 4. De ce personalizată bate „gata de raft"
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Un cadou de la magazin se uită într-o săptămână. O cutie muzicală personalizată devine
            obiectul care stă pe biroul cuiva zece ani. Lemnul se încălzește la atingere, mecanismul
            manual cere un gest — întorci manivela, aștepți nota. Este ritual, nu consum.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> 5. Livrare rapidă, personalizare fină
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Comanzi azi, primești în 24–48h prin easybox sau curier. Pentru cadouri programate
            (aniversare, Crăciun, Valentine's), poți alege data exactă la checkout. Peste 250 lei
            transportul este gratuit.
          </p>
        </section>

        <div className="mt-14 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-background p-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 font-display text-2xl text-foreground">
            Gata să alegi cutiuța ta?
          </h3>
          <p className="mt-2 text-muted-foreground">
            Explorează catalogul — fiecare cutiuță are melodia și tema descrisă în detaliu.
          </p>
          <Link
            to="/produse"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-shadow"
          >
            Vezi toate cutiuțele
          </Link>
        </div>
      </article>
    </main>
  );
}
