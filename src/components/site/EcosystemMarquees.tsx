import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Braces,
  Cloud,
  Code2,
  CreditCard,
  Layers3,
  SearchCheck,
  ShoppingBag,
  Sparkles,
  Store,
  WandSparkles,
} from "lucide-react";

type EcosystemItem = {
  name: string;
  note: string;
  tone: string;
  mark: ReactNode;
};

const partners: EcosystemItem[] = [
  { name: "eMAG", note: "Marketplace online", tone: "emag", mark: <span>eMAG</span> },
  { name: "Trendyol", note: "Marketplace regional", tone: "trendyol", mark: <span>t</span> },
  { name: "Google Pay", note: "Portofel digital", tone: "google-pay", mark: <span>G</span> },
  { name: "OLX", note: "Canal de anunțuri", tone: "olx", mark: <span>OLX</span> },
  { name: "Revolut", note: "Plăți digitale", tone: "revolut", mark: <span>R</span> },
  { name: "Vinted", note: "Comunitate de revânzare", tone: "vinted", mark: <span>V</span> },
  { name: "Stripe", note: "Infrastructură de plăți", tone: "stripe", mark: <span>S</span> },
];

const technologies: EcosystemItem[] = [
  { name: "Lovable", note: "Prototipare de produs", tone: "lovable", mark: <WandSparkles /> },
  { name: "GSAP", note: "Coregrafie în mișcare", tone: "gsap", mark: <span>G</span> },
  { name: "Codex", note: "Inginerie asistată", tone: "codex", mark: <Code2 /> },
  { name: "Three.js", note: "Scene 3D interactive", tone: "three", mark: <span>△</span> },
  { name: "Claude", note: "Asistență creativă", tone: "claude", mark: <Sparkles /> },
  { name: "CSS", note: "Sistem vizual fluid", tone: "css", mark: <Braces /> },
  { name: "Cloudflare", note: "Edge, date și securitate", tone: "cloudflare", mark: <Cloud /> },
  { name: "Post-processing", note: "Finisaj cinematic", tone: "post", mark: <Layers3 /> },
  {
    name: "Google Business Profile",
    note: "Prezență Google evaluată",
    tone: "business",
    mark: <Store />,
  },
  { name: "Hostico", note: "Domeniu și infrastructură", tone: "hostico", mark: <span>H</span> },
  { name: "Magic UI", note: "Micro-interacțiuni", tone: "magic-ui", mark: <Sparkles /> },
  { name: "GSC", note: "Indexare și căutare", tone: "gsc", mark: <SearchCheck /> },
];

function EcosystemCard({ item }: { item: EcosystemItem }) {
  return (
    <article className="ecosystem-card" data-tone={item.tone}>
      <div className="ecosystem-card__mark" aria-hidden>
        {item.mark}
      </div>
      <div>
        <h3>{item.name}</h3>
        <p>{item.note}</p>
      </div>
      <span className="ecosystem-card__glint" aria-hidden />
    </article>
  );
}

function Marquee({
  items,
  reverse = false,
  duration,
  visible,
  label,
}: {
  items: EcosystemItem[];
  reverse?: boolean;
  duration: number;
  visible: boolean;
  label: string;
}) {
  return (
    <div className="ecosystem-marquee" aria-label={label}>
      <div
        className={`ecosystem-marquee__track${reverse ? " is-reverse" : ""}`}
        style={
          {
            "--ecosystem-duration": `${duration}s`,
            animationPlayState: visible ? "running" : "paused",
          } as CSSProperties
        }
      >
        {[0, 1].map((group) => (
          <div
            key={group}
            className="ecosystem-marquee__group"
            aria-hidden={group === 1 ? "true" : undefined}
            {...(group === 1 ? { inert: true } : {})}
          >
            {items.map((item) => (
              <EcosystemCard key={`${group}-${item.name}`} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EcosystemMarquees() {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "180px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={root} className="ecosystem" aria-labelledby="ecosystem-title">
      <div className="ecosystem__heading">
        <div>
          <p className="scene-eyebrow">
            <ShoppingBag size={14} aria-hidden /> Ecosistem Comercial
          </p>
          <h2 id="ecosystem-title">
            Canale cunoscute.
            <br />
            <em>O experiență coerentă.</em>
          </h2>
        </div>
        <p>
          Marketplace-uri, servicii și infrastructuri de plată aflate în ecosistemul comercial sau
          în fluxurile de integrare ale Cutiuței Magice.
        </p>
      </div>

      <Marquee
        items={partners}
        duration={38}
        visible={visible}
        label="Platforme și servicii comerciale"
      />

      <div className="ecosystem__tech-heading">
        <p className="scene-eyebrow">
          <CreditCard size={14} aria-hidden /> Atelier Digital
        </p>
        <h2>Tehnologii care pun povestea în mișcare</h2>
        <p>
          Instrumente folosite, integrate sau evaluate pentru design, animație, dezvoltare,
          infrastructură și vizibilitate în căutare.
        </p>
      </div>

      <Marquee
        items={technologies}
        duration={58}
        visible={visible}
        reverse
        label="Tehnologii și instrumente digitale"
      />
    </section>
  );
}
