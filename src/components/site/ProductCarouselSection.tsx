import { SceneAtmosphere } from "@/components/site/SceneAtmosphere";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  sharedWorld?: boolean;
  description?: string;
  bgImage?: string;
  spotlight?: ReactNode;
  scene?: "story" | "emotion" | "dedicated";
  id?: string;
  number?: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaTo?: string;
  tone?: "warm" | "cream";
  secondaryCta?: { label: string; to: string };
};
export function ProductCarouselSection({
  title,
  sharedWorld = false,
  description,
  bgImage,
  spotlight,
  scene = "story",
  id,
  number = "01",
  eyebrow = "Alege o emoție",
  ctaLabel = "Explorează toate cutiuțele",
  ctaTo = "/produse",
}: Props) {
  return (
    <section
      id={id}
      data-world={scene}
      className={`collection-scene collection-scene--${scene} ${sharedWorld ? "collection-scene--shared" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      {bgImage && (
        <img
          className="scene-backdrop"
          src={bgImage}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          width="1920"
          height="1080"
        />
      )}
      <div className="scene-shade" aria-hidden />
      <SceneAtmosphere />
      <div className="scene-inner">
        <header className="scene-heading" data-reveal>
          <p className="scene-eyebrow">
            <span>{number}</span> {eyebrow}
          </p>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{description}</p>
        </header>
        <div
          className="scene-product"
          data-reveal
          style={{ "--reveal-order": 1 } as React.CSSProperties}
        >
          {spotlight}
        </div>
        <Link className="scene-link" to={ctaTo}>
          {ctaLabel}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}
