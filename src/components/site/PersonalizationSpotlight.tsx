import { ArrowUpRight, Gift, ImagePlus, Music2, Palette, PenLine } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PersonalizationSpotlight() {
  return (
    <section
      id="personalizeaza"
      data-world="personalize"
      className="personalization-scene personalization-scene--compact"
      aria-labelledby="personalization-scene-title"
    >
      <div className="personalization-scene-glow" aria-hidden />
      <div className="personalization-compact-card" data-reveal>
        <div className="personalization-compact-copy">
          <p className="scene-eyebrow">
            <span>04</span> Fă-o numai a ta
          </p>
          <h2 id="personalization-scene-title">
            Personalizează <em>Cutiuța Magică.</em>
          </h2>
          <p>
            Alege forma, culoarea, melodia, fotografia și gravura într-un atelier vizual creat
            pentru povestea ta.
          </p>
          <div className="personalization-compact-features" aria-label="Opțiuni de personalizare">
            <span>
              <Palette aria-hidden /> Două culori
            </span>
            <span>
              <ImagePlus aria-hidden /> Imagine pe capac
            </span>
            <span>
              <PenLine aria-hidden /> Gravură
            </span>
            <span>
              <Gift aria-hidden /> Ambalare premium
            </span>
          </div>
          <Link to="/personalizeaza" className="magic-button">
            <Music2 size={16} aria-hidden /> Intră în atelier <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="personalization-compact-visual" aria-hidden>
          <span className="personalization-compact-orbit" />
          <img
            src="/scenes/personalization-box-v2.webp"
            alt=""
            width={1000}
            height={833}
            loading="lazy"
            decoding="async"
          />
          <span className="personalization-compact-spark">✦</span>
        </div>
      </div>
    </section>
  );
}
