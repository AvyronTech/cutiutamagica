import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  BadgeCheck,
  Banknote,
  Braces,
  Cloud,
  Code2,
  Gauge,
  Layers3,
  MapPinned,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Truck,
  UserCheck,
} from "lucide-react";

type EcosystemItem = {
  name: string;
  note: string;
  tone: string;
  mark: ReactNode;
};

const shoppingExperience: EcosystemItem[] = [
  { name: "Easybox", note: "Ridicare din locker · 15 lei", tone: "ocean", mark: <MapPinned /> },
  { name: "Curier", note: "Livrare la adresă · 25 lei", tone: "amber", mark: <Truck /> },
  { name: "Ramburs", note: "Plată la predarea coletului", tone: "blue", mark: <Banknote /> },
  { name: "Fără cont", note: "Checkout rapid și clar", tone: "green", mark: <UserCheck /> },
  { name: "Retur", note: "Drept de retragere în 14 zile", tone: "silver", mark: <RotateCcw /> },
  { name: "Preț final", note: "Afișat transparent", tone: "teal", mark: <BadgeCheck /> },
  {
    name: "Confirmare",
    note: "Comanda ajunge și pe e-mail",
    tone: "violet",
    mark: <PackageCheck />,
  },
];

const technologies: EcosystemItem[] = [
  { name: "GSAP", note: "Coregrafie în mișcare", tone: "lime", mark: <span>G</span> },
  { name: "Three.js", note: "Scene 3D interactive", tone: "neutral", mark: <span>△</span> },
  { name: "Framer Motion", note: "Tranziții fluide", tone: "warm", mark: <Sparkles /> },
  { name: "CSS", note: "Sistem vizual fluid", tone: "blue", mark: <Braces /> },
  { name: "Cloudflare", note: "Edge, date și securitate", tone: "orange", mark: <Cloud /> },
  { name: "TanStack", note: "Navigare și date coerente", tone: "steel", mark: <Code2 /> },
  { name: "Vite", note: "Încărcare optimizată", tone: "ocean", mark: <span>V</span> },
  { name: "Embla", note: "Carusele tactile", tone: "violet", mark: <Layers3 /> },
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
            <PackageCheck size={14} aria-hidden /> Cumpărare Simplă
          </p>
          <h2 id="ecosystem-title">
            Detalii clare.
            <br />
            <em>O experiență fără surprize.</em>
          </h2>
        </div>
        <p>
          De la preț până la livrare și retur, păstrăm la vedere lucrurile care te ajută să alegi
          simplu și să comanzi în siguranță.
        </p>
      </div>

      <Marquee
        items={shoppingExperience}
        duration={38}
        visible={visible}
        label="Avantajele experienței de cumpărare"
      />

      <div className="ecosystem__tech-heading">
        <p className="scene-eyebrow">
          <Gauge size={14} aria-hidden /> Atelier Digital
        </p>
        <h2>Tehnologii care pun povestea în mișcare</h2>
        <p>
          Tehnologii folosite efectiv pentru design, animație, interacțiuni tactile, infrastructură
          și o experiență rapidă pe mobil și desktop.
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
