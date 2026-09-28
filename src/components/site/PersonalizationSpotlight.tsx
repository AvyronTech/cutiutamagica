import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gift, ImagePlus, Music2, Palette } from "lucide-react";
import {
  PERSONALIZATION_BASE_PRICE_BANI,
  PERSONALIZATION_DELIVERY,
  formatPersonalizationPrice,
} from "@/lib/personalization";

export function PersonalizationSpotlight() {
  return (
    <section
      id="personalizeaza"
      data-world="personalize"
      className="personalization-scene"
      aria-labelledby="personalization-scene-title"
    >
      <div className="personalization-scene-glow" aria-hidden />
      <div className="personalization-scene-inner">
        <header className="scene-heading personalization-heading" data-reveal>
          <p className="scene-eyebrow">
            <span>04</span> Fă-o numai a ta
          </p>
          <h2 id="personalization-scene-title">
            Personalizează
            <br />
            <em>Cutiuța Magică.</em>
          </h2>
          <p>
            Alegi culoarea, melodia și imaginea de pe capac. Noi verificăm fotografia și te
            contactăm înainte ca povestea să intre în atelier.
          </p>
        </header>

        <div
          className="personalization-showcase"
          data-reveal
          style={{ "--reveal-order": 1 } as React.CSSProperties}
        >
          <div className="personalization-box-pair" aria-label="Cutiuță neagră și cutiuță galbenă">
            <div className="mini-magic-box mini-magic-box--black" aria-hidden>
              <span className="mini-magic-box__lid">
                <span>imaginea ta</span>
              </span>
              <span className="mini-magic-box__body" />
            </div>
            <div className="mini-magic-box mini-magic-box--yellow" aria-hidden>
              <span className="mini-magic-box__lid">
                <span>imaginea ta</span>
              </span>
              <span className="mini-magic-box__body" />
            </div>
          </div>

          <div className="personalization-features">
            <span>
              <Music2 size={17} /> 3 melodii
            </span>
            <span>
              <Palette size={17} /> Neagră sau galbenă
            </span>
            <span>
              <ImagePlus size={17} /> Imagine pe capac
            </span>
            <span>
              <Gift size={17} /> Ambalare specială +35 lei
            </span>
          </div>

          <div className="personalization-offer">
            <div>
              <small>Preț de la</small>
              <strong>{formatPersonalizationPrice(PERSONALIZATION_BASE_PRICE_BANI)}</strong>
            </div>
            <p>Termen estimat: {PERSONALIZATION_DELIVERY}</p>
            <Link className="magic-button" to="/personalizeaza">
              Personalizează acum
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
