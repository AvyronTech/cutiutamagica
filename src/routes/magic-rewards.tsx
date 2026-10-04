import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Camera,
  Check,
  Gift,
  Layers3,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { safeJsonLd } from "@/lib/product-discovery";

export const Route = createFileRoute("/magic-rewards")({
  component: MagicRewards,
  head: () => ({
    meta: [
      { title: "Magic Rewards — Magic Stars ✦ | Cutiuța Magică" },
      {
        name: "description",
        content:
          "Descoperă Magic Stars, viitorul program de fidelitate Cutiuța Magică: stele pentru comenzi, recenzii cu fotografie, recomandări și colecții.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Magic Rewards — loialitate, fără matematică" },
      {
        property: "og:description",
        content:
          "O acțiune eligibilă, o Magic Star. Momentele tale cu Cutiuța Magică, păstrate simplu și transparent.",
      },
      { property: "og:url", content: "https://cutiutamagica.eu/magic-rewards" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://cutiutamagica.eu/icon-512.png" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/magic-rewards" }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": "https://cutiutamagica.eu/magic-rewards#page",
              url: "https://cutiutamagica.eu/magic-rewards",
              name: "Magic Rewards — Magic Stars",
              description:
                "Pagina programului de fidelitate Magic Rewards al magazinului Cutiuța Magică.",
              inLanguage: "ro-RO",
              isPartOf: { "@id": "https://cutiutamagica.eu/#website" },
              about: { "@id": "https://cutiutamagica.eu/#organization" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Acasă",
                  item: "https://cutiutamagica.eu/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Magic Rewards",
                  item: "https://cutiutamagica.eu/magic-rewards",
                },
              ],
            },
          ],
        }),
      },
    ],
  }),
});

const rewardMoments = [
  {
    icon: Gift,
    title: "O comandă",
    text: "Steaua se confirmă după ce comanda a ajuns cu bine la tine.",
    timing: "După livrare",
  },
  {
    icon: Camera,
    title: "Un review cu fotografie",
    text: "O impresie sinceră și o fotografie proprie, după verificarea publicării.",
    timing: "După aprobare",
  },
  {
    icon: Users,
    title: "Recomandarea unui prieten",
    text: "Când prietenul recomandat primește prima lui comandă eligibilă.",
    timing: "După livrarea prietenului",
  },
  {
    icon: UserRound,
    title: "Profilul de cadouri",
    text: "Completezi preferințele care ne ajută să-ți recomandăm cadouri relevante.",
    timing: "O singură dată",
  },
  {
    icon: Layers3,
    title: "O colecție",
    text: "Aduni modelele eligibile din aceeași poveste și închei colecția.",
    timing: "La completarea colecției",
  },
] as const;

function MagicRewards() {
  return (
    <article className="magic-rewards-page">
      <header className="magic-rewards-hero">
        <div className="magic-rewards-hero__copy">
          <span className="magic-rewards-status">
            <Sparkles aria-hidden /> Program în pregătire
          </span>
          <p className="scene-eyebrow">Magic Rewards</p>
          <h1>
            Magic Stars <em>✦</em>
          </h1>
          <p className="magic-rewards-lead">
            Loialitate, fără matematică. Nu aduni sute de puncte și nu cauți conversii ascunse.
            Fiecare moment eligibil poate deveni o stea, verificată și păstrată în contul tău.
          </p>
          <div className="magic-rewards-actions">
            <Link className="magic-button" to="/cont">
              Intră în cont <ArrowUpRight aria-hidden />
            </Link>
            <a className="magic-button magic-button--outline" href="#cum-primesti-stele">
              Cum primești stele
            </a>
          </div>
          <small>
            Programul nu este încă activ. Nicio stea și niciun beneficiu nu sunt promise retroactiv
            înainte de publicarea regulamentului.
          </small>
        </div>

        <div className="magic-rewards-orbit" aria-hidden>
          <span className="magic-rewards-orbit__ring magic-rewards-orbit__ring--outer" />
          <span className="magic-rewards-orbit__ring magic-rewards-orbit__ring--inner" />
          <span className="magic-rewards-orbit__trail" />
          <span className="magic-rewards-orbit__node magic-rewards-orbit__node--one">✦</span>
          <span className="magic-rewards-orbit__node magic-rewards-orbit__node--two">✦</span>
          <span className="magic-rewards-orbit__node magic-rewards-orbit__node--three">✦</span>
          <span className="magic-rewards-orbit__node magic-rewards-orbit__node--four">✦</span>
          <span className="magic-rewards-orbit__node magic-rewards-orbit__node--five">✦</span>
          <div className="magic-rewards-orbit__core">
            <Star aria-hidden />
            <strong>1 moment</strong>
            <span>1 Magic Star</span>
          </div>
        </div>
      </header>

      <section
        id="cum-primesti-stele"
        className="magic-rewards-moments"
        aria-labelledby="magic-rewards-moments-title"
      >
        <div className="magic-rewards-section-heading">
          <div>
            <p className="scene-eyebrow">Momente Care Contează</p>
            <h2 id="magic-rewards-moments-title">Cinci moduri simple de a aprinde o stea.</h2>
          </div>
          <p>
            Fiecare acțiune eligibilă valorează o singură stea. Confirmarea se face numai după ce
            condiția este îndeplinită, pentru ca programul să rămână corect pentru toată lumea.
          </p>
        </div>

        <div className="magic-rewards-grid">
          {rewardMoments.map((moment, index) => {
            const Icon = moment.icon;
            return (
              <article key={moment.title}>
                <div className="magic-rewards-card__top">
                  <span className="magic-rewards-card__icon">
                    <Icon aria-hidden />
                  </span>
                  <span className="magic-rewards-card__star">+1 ✦</span>
                </div>
                <span className="magic-rewards-card__number">0{index + 1}</span>
                <h3>{moment.title}</h3>
                <p>{moment.text}</p>
                <small>
                  <Check aria-hidden /> {moment.timing}
                </small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="magic-rewards-flow" aria-labelledby="magic-rewards-flow-title">
        <div className="magic-rewards-flow__intro">
          <p className="scene-eyebrow">Fără Efort</p>
          <h2 id="magic-rewards-flow-title">Tu trăiești povestea. Noi păstrăm stelele.</h2>
          <p>
            După activare, progresul va fi legat de cont și actualizat doar pe baza evenimentelor
            confirmate din magazin.
          </p>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Ai un cont</strong>
              <p>Contul unește comenzile și momentele eligibile într-un singur loc.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Momentul este verificat</strong>
              <p>Livrarea, review-ul sau recomandarea trebuie să fie confirmate.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Steaua apare în cont</strong>
              <p>Vezi sursa fiecărei stele, fără calcule și fără reguli ascunse.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="magic-rewards-promise" aria-labelledby="magic-rewards-promise-title">
        <div className="magic-rewards-promise__seal" aria-hidden>
          <ShieldCheck />
        </div>
        <div>
          <p className="scene-eyebrow">Promisiunea Programului</p>
          <h2 id="magic-rewards-promise-title">Beneficii clare înainte să alegi.</h2>
          <p>
            Magic Stars nu sunt bani și nu devin automat o reducere. Înainte de activarea
            programului vom publica regulamentul, perioada de valabilitate și beneficiul exact al
            fiecărei stele. Fără condiții importante ascunse în litere mici.
          </p>
        </div>
        <ul>
          <li>
            <Check aria-hidden /> Istoric vizibil în cont
          </li>
          <li>
            <Check aria-hidden /> O singură regulă pentru fiecare moment
          </li>
          <li>
            <Check aria-hidden /> Confirmare doar din evenimente reale
          </li>
        </ul>
      </section>

      <section className="magic-rewards-closing">
        <div>
          <p className="scene-eyebrow">Primul Capitol</p>
          <h2>Începe cu o poveste pe care vrei s-o păstrezi.</h2>
        </div>
        <div>
          <Link className="magic-button" to="/produse">
            Descoperă cutiuțele <ArrowUpRight aria-hidden />
          </Link>
          <Link className="magic-button magic-button--outline" to="/cont">
            Contul meu
          </Link>
        </div>
      </section>
    </article>
  );
}
