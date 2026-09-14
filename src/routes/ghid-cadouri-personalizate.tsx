import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Heart, Music, Search, Settings2 } from "lucide-react";

const URL = "https://cutiutamagica.eu/ghid-cadouri-personalizate";
const TITLE = "Ghid cadou: cum alegi o cutiuță muzicală cu manivelă";
const DESC =
  "Află cum alegi o cutiuță muzicală cadou după melodie, temă și ocazie. Ghid pentru modele din lemn cu manivelă și mecanism mecanic manual.";

const faq = [
  {
    question: "Cum funcționează o cutiuță muzicală cu manivelă?",
    answer:
      "Manivela acționează mecanic mecanismul muzical. Nu sunt necesare baterii, iar ritmul depinde de viteza cu care este rotită manivela.",
  },
  {
    question: "Cum aleg melodia potrivită pentru cadou?",
    answer:
      "Pornește de la filmul, povestea sau amintirea preferată a persoanei. Pe fiecare pagină de produs sunt afișate tema și melodia modelului.",
  },
  {
    question: "Există cutiuțe muzicale Harry Potter sau LOTR?",
    answer:
      "Catalogul include modele tematice asociate universurilor Harry Potter și Stăpânul Inelelor. Fotografia și melodia fiecărui model pot fi verificate înainte de comandă.",
  },
  {
    question: "Cât costă o cutiuță muzicală?",
    answer:
      "Prețul curent este afișat pe pagina fiecărui produs și în coș. Verifică sumarul comenzii înainte de trimitere, inclusiv eventualele reduceri de cantitate.",
  },
];

export const Route = createFileRoute("/ghid-cadouri-personalizate")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: `${TITLE} | Cutiuța Magică` },
      { name: "description", content: DESC },
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
          publisher: {
            "@type": "Organization",
            name: "Cutiuța Magică",
            url: "https://cutiutamagica.eu",
          },
          mainEntityOfPage: URL,
          inLanguage: "ro-RO",
          dateModified: "2026-09-05",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }),
      },
    ],
  }),
});

function GuidePage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      <article className="mx-auto max-w-3xl px-4 pt-20 md:pt-24">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Ghid Cutiuța Magică</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-foreground md:text-5xl">
          Cum alegi o cutiuță muzicală cadou
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          O cutiuță muzicală poate lega un obiect mic de o melodie, un film sau o amintire comună.
          Alegerea bună pornește de la persoana care primește cadoul, nu doar de la modelul care
          arată cel mai spectaculos.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
            <Music className="h-5 w-5 text-primary" /> 1. Pornește de la melodie
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Melodia este partea pe care destinatarul o va recunoaște de fiecare dată când rotește
            manivela. Pentru un fan al poveștilor fantasy poți alege o cutiuță muzicală Harry Potter
            sau un model cu piesă asociată universului LOTR. Pentru un cadou romantic ori delicat,
            caută o melodie cu o semnificație personală.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
            <Gift className="h-5 w-5 text-primary" /> 2. Potrivește tema cu ocazia
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Aniversare:</strong> tema filmului, serialului sau
              personajului preferat.
            </li>
            <li>
              <strong className="text-foreground">Cadou pentru partener:</strong> o melodie asociată
              unei amintiri comune.
            </li>
            <li>
              <strong className="text-foreground">Crăciun:</strong> un obiect mic, ușor de așezat
              într-un pachet cadou.
            </li>
            <li>
              <strong className="text-foreground">Cadou pentru tata:</strong> un mesaj dedicat și o
              temă pe care o recunoaște.
            </li>
            <li>
              <strong className="text-foreground">Halloween:</strong> un model sezonier, cu
              ilustrație și melodie tematică.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
            <Settings2 className="h-5 w-5 text-primary" /> 3. Înțelege mecanismul clasic
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Modelele din catalog sunt cutiuțe muzicale cu manivelă. Mecanismul este acționat manual,
            fără baterii: rotești manivela și controlezi ritmul. Acest gest simplu este partea
            interactivă a cadoului și îl diferențiază de o boxă sau de un obiect decorativ obișnuit.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
            <Search className="h-5 w-5 text-primary" /> 4. Verifică produsul înainte de comandă
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Compară fotografia, denumirea melodiei, materialul și detaliile mecanismului. O pagină
            de produs trebuie să te ajute să înțelegi ce primești, nu să înlocuiască produsul real
            cu o reprezentare generică. Dacă un detaliu comercial nu este clar, confirmă-l înainte
            de trimiterea comenzii.
          </p>
        </section>

        <section className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-2xl text-foreground">Întrebări frecvente</h2>
          <div className="mt-5 space-y-5">
            {faq.map((item) => (
              <div key={item.question}>
                <h3 className="font-medium text-foreground">{item.question}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-14 rounded-lg border border-primary/20 bg-primary/5 p-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-display text-2xl text-foreground">
            Alege după persoană și melodie
          </h2>
          <p className="mt-2 text-muted-foreground">
            Catalogul poate fi filtrat și căutat după temă, melodie sau tipul de cadou.
          </p>
          <Link
            to="/produse"
            search={{ q: "cadou" }}
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            Vezi cutiuțele cadou
          </Link>
        </div>
      </article>
    </main>
  );
}
