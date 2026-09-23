import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { ReviewList } from "@/lib/reviews";
import { ReviewCard } from "./ReviewCard";
export function ReviewCarousel({ data }: { data: ReviewList }) {
  const section = useRef<HTMLElement>(null),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "100px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  if (!data.reviews.length) return null;
  const moving = data.reviews.length > 2;
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
        <p>
          Păreri despre cutiuțe, păstrate în cuvintele celor care le-au descoperit.
          <Link to="/produse">Găsește cutiuța ta ↗</Link>
        </p>
      </div>
      <div className={`review-marquee ${moving ? "is-moving" : ""}`}>
        <div
          className="review-marquee-track"
          style={
            {
              "--review-duration": `${Math.max(50, data.reviews.length * 8)}s`,
              animationPlayState: visible ? "running" : "paused",
            } as CSSProperties
          }
        >
          <div className="review-marquee-group">
            {data.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} compact />
            ))}
          </div>
          {moving && (
            <div className="review-marquee-group review-clone" aria-hidden="true" inert>
              {data.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
