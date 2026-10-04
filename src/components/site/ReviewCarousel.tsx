import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, MessageCircleHeart } from "lucide-react";
import type { ReviewList } from "@/lib/reviews";
import { ReviewCard } from "./ReviewCard";

export function ReviewCarousel({ data }: { data: ReviewList }) {
  const section = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const averageLabel = data.average?.toFixed(1) ?? "—";
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
    { loop: data.reviews.length > 2, align: "start", dragFree: true },
    [autoScroll],
  );

  useEffect(() => {
    const node = section.current;
    if (!node || !api || data.reviews.length < 2 || reducedMotion) {
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
  }, [api, autoScroll, data.reviews.length, reducedMotion]);

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
            Publicăm aici numai recenzii aprobate, asociate cutiuței și sursei lor.
            <Link to="/produse">
              Descoperă colecția <ArrowUpRight aria-hidden />
            </Link>
          </p>
        </div>
        <div className="review-empty-proof" aria-label="Cum sunt publicate recenziile">
          <span>
            <MessageCircleHeart aria-hidden /> Părere trimisă
          </span>
          <i aria-hidden />
          <span>
            <BadgeCheck aria-hidden /> Sursă verificată
          </span>
          <i aria-hidden />
          <span>Produs identificat</span>
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
