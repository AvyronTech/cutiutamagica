import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gift, ImagePlus, Music2, Palette, PenLine, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import {
  PERSONALIZATION_BASE_PRICE_BANI,
  PERSONALIZATION_DELIVERY,
  PERSONALIZATION_GIFT_WRAP_BANI,
  formatPersonalizationPrice,
} from "@/lib/personalization";

type PreviewColor = "black" | "yellow";

export function PersonalizationSpotlight() {
  const [color, setColor] = useState<PreviewColor>("yellow");
  const [engraving, setEngraving] = useState("Povestea ta");
  const [giftWrap, setGiftWrap] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const total = PERSONALIZATION_BASE_PRICE_BANI + (giftWrap ? PERSONALIZATION_GIFT_WRAP_BANI : 0);

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
            Explorează aici culoarea, fotografia, gravura și ambalarea. Configurația finală se
            trimite simplu în atelier din pagina de personalizare.
          </p>
        </header>

        <div
          className="personalization-configurator"
          data-reveal
          style={{ "--reveal-order": 1 } as React.CSSProperties}
        >
          <div className="landing-customizer-controls" aria-label="Opțiuni de previzualizare">
            <div className="landing-customizer-group">
              <span>
                <Palette aria-hidden /> Culoarea Lemnului
              </span>
              <div className="landing-color-options">
                {(
                  [
                    ["black", "Neagră"],
                    ["yellow", "Galbenă"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`landing-color landing-color--${value}`}
                    aria-pressed={color === value}
                    onClick={() => setColor(value)}
                  >
                    <i aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="landing-customizer-upload">
              <span>
                <ImagePlus aria-hidden /> Imagine Pe Capac
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
              />
              <strong>
                <Upload aria-hidden /> {image ? "Schimbă Imaginea" : "Încarcă O Imagine"}
              </strong>
              <small>{image ? image.name : "Previzualizare locală, fără trimitere"}</small>
            </label>

            <label className="landing-customizer-engraving">
              <span>
                <PenLine aria-hidden /> Gravură
              </span>
              <input
                value={engraving}
                maxLength={28}
                onChange={(event) => setEngraving(event.target.value)}
                placeholder="Mesaj scurt"
              />
              <small>{engraving.length}/28 caractere</small>
            </label>

            <button
              type="button"
              className="landing-gift-toggle"
              aria-pressed={giftWrap}
              onClick={() => setGiftWrap((value) => !value)}
            >
              <Gift aria-hidden />
              <span>
                <strong>Ambalare Premium</strong>
                <small>Cutie, panglică și cartonaș · +35 lei</small>
              </span>
              <i aria-hidden>{giftWrap ? "✓" : "+"}</i>
            </button>
          </div>

          <div
            className="landing-customizer-stage"
            data-color={color}
            data-gift-wrap={giftWrap || undefined}
            aria-label={`Previzualizare cutiuță ${color === "black" ? "neagră" : "galbenă"}`}
          >
            <span className="landing-stage-glow" aria-hidden />
            <div className="landing-box-render">
              <img
                src="/scenes/personalization-box-v2.webp"
                alt="Cutiuță muzicală din lemn, cu capac deschis și manivelă"
                width={1000}
                height={833}
                loading="lazy"
                decoding="async"
              />
              <div className="landing-lid-artwork" data-empty={!preview || undefined}>
                {preview ? (
                  <img src={preview} alt="Fotografia aleasă pentru capac" />
                ) : (
                  <ImagePlus />
                )}
                {engraving.trim() && <span>{engraving.trim()}</span>}
              </div>
              <span className="landing-crank-glint" aria-hidden>
                ✦
              </span>
            </div>
            <div className="landing-premium-wrap" aria-hidden>
              <span className="landing-wrap-box" />
              <span className="landing-wrap-ribbon" />
              <span className="landing-wrap-card">Pentru cineva drag</span>
              <span className="landing-wrap-spark landing-wrap-spark--one">✦</span>
              <span className="landing-wrap-spark landing-wrap-spark--two">✧</span>
            </div>
            <p>Previzualizare orientativă · fiecare imagine este verificată înainte de realizare</p>
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
              <PenLine size={17} /> Gravură personală
            </span>
          </div>

          <div className="personalization-offer">
            <div>
              <small>Total orientativ</small>
              <strong>{formatPersonalizationPrice(total)}</strong>
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
