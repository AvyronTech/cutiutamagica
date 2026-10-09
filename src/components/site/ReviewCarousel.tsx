import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { ReviewList } from "@/lib/reviews";
import { ReviewCard } from "./ReviewCard";

const storyPrompts = [
  ["Pentru primul vostru dans", "O melodie care știe deja drumul spre amintirea potrivită."],
  [
    "Pentru prietenul cu universul lui",
    "Un detaliu mic, ales exact din povestea pe care o iubește.",
  ],
  ["Pentru dor", "Când nu găsești fraza, lași manivela să spună ce simți."],
  ["Pentru o aniversare", "Un cadou compact, cu un moment mare ascuns înăuntru."],
  ["Pentru copilul din noi", "Melodia aceea pe care o recunoști înainte de primul refren."],
  ["Pentru mulțumesc", "Un gest simplu care rămâne pe birou și revine la viață."],
  ["Pentru cineva departe", "O cutiuță care scurtează puțin distanța, de fiecare dată."],
  ["Pentru colecționar", "Lemn, mecanism și universul preferat într-un obiect mic."],
  ["Pentru surprize fără motiv", "Cele mai frumoase cadouri nu așteaptă mereu o dată în calendar."],
  ["Pentru povestea voastră", "Alegi tema. Melodia face restul."],
] as const;

export function ReviewCarousel({ data }: { data: ReviewList }) {
  const section = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const averageLabel = data.average?.toFixed(1) ?? "—";
  const carouselSize = data.reviews.length || storyPrompts.length;
  const autoScroll = useMemo(
    () =>
      AutoScroll({
        speed: 0.42,
        direction: "backward",
        playOnInit: false,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
        stopOnFocusIn: false,
      }),
    [],
  );
  const [viewport, api] = useEmblaCarousel(
    { loop: carouselSize > 2, align: "start", dragFree: true },
    [autoScroll],
  );

  useEffect(() => {
    const node = section.current;
    if (!node || !api || carouselSize < 2 || reducedMotion) {
      autoScroll.stop();
      return;
    }
    let visible = false;
    const sync = () => {
      if (visible && !document.hidden) autoScroll.play();
      else autoScroll.stop();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px", threshold: 0.12 },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      autoScroll.stop();
    };
  }, [api, autoScroll, carouselSize, reducedMotion]);

  if (!data.reviews.length) {
    return (
      <section
        ref={section}
        className="review-carousel review-carousel--empty"
        data-world="atelier"
        aria-labelledby="review-carousel-title"
      >
        <div className="review-carousel-heading">
          <div>
            <p className="scene-eyebrow">Ecouri din povești mici</p>
            <h2 id="review-carousel-title">
              Povești cumpărate.
              <br />
              <em>Cuvinte adevărate.</em>
            </h2>
          </div>
          <p>
            Până sosesc ecourile clienților, îți lăsăm câteva idei de dăruit. Recenziile vor apărea
            aici numai după verificare.
            <Link to="/produse">
              Descoperă colecția <ArrowUpRight aria-hidden />
            </Link>
          </p>
        </div>
        <div
          ref={viewport}
          className="review-viewport review-viewport--prompts"
          role="region"
          aria-roledescription="carusel"
          aria-label="Idei de dăruit, nu recenzii de client"
        >
          <div className="review-track">
            {storyPrompts.map(([title, text]) => (
              <article className="review-slide review-prompt" key={title}>
                <span aria-hidden>✦</span>
                <small>Inspirație de poveste</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={section}
      className="review-carousel"
      data-world="atelier"
      aria-labelledby="review-carousel-title"
    >
      <div className="review-carousel-heading">
        <div>
          <p className="scene-eyebrow">Ecouri din povești mici</p>
          <h2 id="review-carousel-title">
            Melodia rămâne.
            <br />
            <em>Și gândul bun.</em>
          </h2>
        </div>
        <div className="review-carousel__intro">
          <span className="review-carousel__score" aria-label={`${averageLabel} din 5`}>
            <strong>{averageLabel}</strong>
            <span aria-hidden>★</span>
            <small>{data.total} recenzii publicate</small>
          </span>
          <p>Glisează pentru a descoperi părerile, produsul și sursa fiecărei recenzii.</p>
          <Link to="/produse">
            Găsește cutiuța ta <ArrowUpRight aria-hidden />
          </Link>
        </div>
      </div>
      <div
        ref={viewport}
        className="review-viewport"
        role="region"
        aria-roledescription="carusel"
        aria-label="Recenzii despre cutiuțele muzicale"
      >
        <div className="review-track">
          {data.reviews.map((review) => (
            <div className="review-slide" key={review.id}>
              <ReviewCard review={review} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
