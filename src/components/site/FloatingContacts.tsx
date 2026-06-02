import { Phone, MessageCircle } from "lucide-react";

const items = [
  {
    label: "Sună-ne",
    href: "#",
    Icon: Phone,
    bg: "linear-gradient(135deg, oklch(0.65 0.16 145), oklch(0.5 0.14 150))",
    ring: "oklch(0.75 0.18 145 / 0.55)",
  },
  {
    label: "WhatsApp",
    href: "#",
    Icon: MessageCircle,
    bg: "linear-gradient(135deg, oklch(0.72 0.18 150), oklch(0.55 0.16 155))",
    ring: "oklch(0.78 0.2 150 / 0.55)",
  },
  {
    label: "Messenger",
    href: "#",
    // Messenger lightning glyph as inline SVG (lucide doesn't ship a Messenger icon)
    Icon: (props: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={props.className}>
        <path d="M12 2C6.48 2 2 6.14 2 11.26c0 2.86 1.4 5.4 3.6 7.08V22l3.3-1.81c.88.24 1.82.37 2.8.37 5.52 0 10-4.14 10-9.3S17.52 2 12 2zm1 12.43-2.55-2.72-5 2.72 5.5-5.84 2.6 2.72 4.95-2.72-5.5 5.84z"/>
      </svg>
    ),
    bg: "linear-gradient(135deg, oklch(0.7 0.18 260), oklch(0.55 0.2 290))",
    ring: "oklch(0.78 0.2 280 / 0.55)",
  },
];

export function FloatingContacts() {
  return (
    <div className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-50 flex flex-col gap-3">
      {items.map(({ label, href, Icon, bg, ring }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          className="group relative"
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full blur-md opacity-60 group-hover:opacity-90 transition-opacity"
            style={{ background: bg }}
          />
          <span
            className="relative flex items-center justify-center w-12 h-12 md:w-13 md:h-13 rounded-full text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)] border border-white/30 backdrop-blur-sm transition-transform duration-300 hover:scale-110 hover:-translate-y-0.5"
            style={{ background: bg, boxShadow: `0 8px 28px -8px ${ring}` }}
          >
            <Icon className="w-5 h-5" />
          </span>
          <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2.5 py-1 rounded-full text-xs font-medium bg-[color:var(--wood-dark)] text-[color:var(--cream)] opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all whitespace-nowrap shadow-soft">
            {label}
          </span>
        </a>
      ))}
    </div>
  );
}
