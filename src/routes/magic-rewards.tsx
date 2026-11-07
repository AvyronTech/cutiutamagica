import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Cake,
  Camera,
  Check,
  Gift,
  Layers3,
  ShieldCheck,
  Share2,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { safeJsonLd } from "@/lib/product-discovery";
import { getPublicMagicRewards } from "@/lib/magic-rewards.functions";
import { seoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/magic-rewards")({
  component: MagicRewards,
  loader: () => getPublicMagicRewards(),
  head: () => {
    const seo = seoHead({
      title: "Magic Rewards — Magic Stars ✦ | Cutiuța Magică",
      description:
        "Descoperă Magic Stars, programul de fidelitate Cutiuța Magică: stele pentru cont, comenzi, recenzii aprobate, distribuiri și bonus aniversar.",
      path: "/magic-rewards",
      image: "/scenes/library.webp",
      imageAlt: "Magic Rewards — beneficii pentru poveștile și cadourile tale",
    });
    return {
      ...seo,
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
    };
  },
});

const rewardMoments = [
  {
    code: "account_created",
    icon: UserRound,
    title: "Cont Magic",
    text: "Prima filă a poveștii tale și locul în care se strâng toate stelele.",
    timing: "O singură dată",
  },
  {
    code: "order_delivered",
    icon: Gift,
    title: "O comandă",
    text: "Stelele se confirmă după ce această comandă a ajuns cu bine la tine.",
    timing: "După livrare",
  },
  {
    code: "review_approved",
    icon: Camera,
    title: "O recenzie",
    text: "O impresie sinceră, după verificarea și aprobarea publicării.",
    timing: "După aprobare",
  },
  {
    code: "social_share",
    icon: Share2,
    title: "O distribuire",
    text: "Pornești distribuirea unei cutiuțe din pagina ei, în limita zilnică afișată.",
    timing: "Limită zilnică",
  },
  {
    code: "birthday_bonus",
    icon: Cake,
    title: "Ziua ta",
    text: "Un dar aniversar ajunge automat în cont în ziua pe care ai salvat-o.",
    timing: "O dată pe an",
  },
  {
    code: "referral_completed",
    icon: Users,
    title: "Recomandarea unui prieten",
    text: "Când prietenul recomandat primește prima lui comandă eligibilă.",
    timing: "După livrarea prietenului",
  },
  {
    code: "gift_profile_completed",
    icon: UserRound,
    title: "Profilul de cadouri",
    text: "Completezi preferințele care ne ajută să-ți recomandăm cadouri relevante.",
    timing: "O singură dată",
  },
  {
    code: "collection_completed",
    icon: Layers3,
    title: "O colecție",
    text: "Aduni modelele eligibile din aceeași poveste și închei colecția.",
    timing: "La completarea colecției",
  },
] as const;

function MagicRewards() {
  const rewards = Route.useLoaderData();
  const threshold = Number(rewards.program?.redemption_threshold ?? 5);
  const rewardLei = Number(rewards.program?.reward_bani ?? 500) / 100;
  const rewardValidDays = Number(rewards.program?.reward_valid_days ?? 180);
  return (
    <article className="magic-rewards-page">
      <header className="magic-rewards-hero">
        <div className="magic-rewards-hero__copy">
          <span className="magic-rewards-status">
            <Sparkles aria-hidden /> Program activ
          </span>
          <p className="scene-eyebrow">Magic Rewards</p>
          <h1>
            Magic Stars <em>✦</em>
          </h1>
          <p className="magic-rewards-lead">
            Loialitate, fără matematică. Nu aduni sute de puncte și nu cauți conversii ascunse.
            Fiecare activitate eligibilă aprinde un număr clar de stele, verificat și păstrat în
            contul tău.
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
            {threshold} Magic Stars pot deveni {rewardLei} lei la următoarea comandă. Fiecare stea
            rămâne vizibilă în istoricul contului.
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
            <strong>1 stea</strong>
            <span>1 leu</span>
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
            <h2 id="magic-rewards-moments-title">Gesturi mici. Stele cu valoare clară.</h2>
          </div>
          <p>
            Activitățile de început au fiecare o valoare clară. Recenziile, distribuirile și ziua ta
            au propriile valori și limite, mereu vizibile înainte să alegi.
          </p>
        </div>

        <div className="magic-rewards-grid">
          {rewardMoments.map((moment, index) => {
            const Icon = moment.icon;
            const activity = rewards.activities.find(({ code }) => code === moment.code);
            if (!activity) return null;
            return (
              <article key={moment.title}>
                <div className="magic-rewards-card__top">
                  <span className="magic-rewards-card__icon">
                    <Icon aria-hidden />
                  </span>
                  <span className="magic-rewards-card__star">+{activity.stars} ✦</span>
                </div>
                <span className="magic-rewards-card__number">0{index + 1}</span>
                <h3>{moment.title}</h3>
                <p>{moment.text}</p>
                <small>
                  <Check aria-hidden />{" "}
                  {moment.code === "social_share" && activity.periodLimit > 0
                    ? `Max. ${activity.periodLimit} pe zi`
                    : moment.timing}
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
            Progresul este legat de cont și se actualizează numai pe baza evenimentelor confirmate
            din magazin.
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
            Magic Stars nu sunt bani și nu devin automat o reducere. La {threshold} stele poți
            genera din cont un cod de {rewardLei} lei, utilizabil o singură dată în{" "}
            {rewardValidDays}
            de zile. Istoricul fiecărei stele și al beneficiilor rămâne vizibil în contul tău.
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
