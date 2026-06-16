import { Instagram, Facebook, Phone, Mail, MessageCircle, Sparkles, Handshake, ArrowRight, Star, Music, Feather, Compass } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { PHONE_TEL, PHONE_DISPLAY, waLink, messageForPath, B2B_MESSAGE } from "@/lib/whatsapp";

type SocialCard = {
  name: string;
  handle: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Card-specific accent gradient (used as a wash, not background). */
  accent: string;
  /** Glow color for the ember ring. */
  glow: string;
};

const socials: SocialCard[] = [
  {
    name: "Instagram",
    handle: "@cutiutamagicaofficial",
    href: "https://www.instagram.com/cutiutamagicaofficial/",
    Icon: Instagram,
    accent:
      "radial-gradient(120% 90% at 0% 0%, oklch(0.78 0.16 35 / 0.55) 0%, transparent 55%), radial-gradient(120% 90% at 100% 100%, oklch(0.55 0.2 320 / 0.55) 0%, transparent 60%)",
    glow: "oklch(0.78 0.18 50 / 0.55)",
  },
  {
    name: "Facebook",
    handle: "Cutiuța Magică",
    href: "https://www.facebook.com/profile.php?id=61590919580877",
    Icon: Facebook,
    accent:
      "radial-gradient(120% 90% at 0% 0%, oklch(0.58 0.18 250 / 0.6) 0%, transparent 55%), radial-gradient(120% 90% at 100% 100%, oklch(0.4 0.14 260 / 0.55) 0%, transparent 60%)",
    glow: "oklch(0.6 0.18 245 / 0.55)",
  },
  {
    name: "TikTok",
    handle: "@cutiua.magic",
    href: "https://www.tiktok.com/@cutiua.magic",
    Icon: (props: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={props.className}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.9a4.85 4.85 0 0 1-1.84-.21Z" />
      </svg>
    ),
    accent:
      "radial-gradient(120% 90% at 0% 0%, oklch(0.85 0.16 195 / 0.55) 0%, transparent 55%), radial-gradient(120% 90% at 100% 100%, oklch(0.58 0.22 15 / 0.55) 0%, transparent 60%)",
    glow: "oklch(0.78 0.2 200 / 0.55)",
  },
];

export function ConnectSection() {
  const { pathname } = useLocation();
  const waHref = waLink(messageForPath(pathname));
  const b2bHref = waLink(B2B_MESSAGE);

  const contacts = [
    { name: "WhatsApp", href: waHref, Icon: MessageCircle, accent: "bg-[#25d366] text-white", external: true },
    { name: "Telefon", href: `tel:${PHONE_TEL}`, Icon: Phone, accent: "bg-[color:var(--wood-dark)] text-[color:var(--cream)]", external: false },
    { name: "Email", href: "mailto:contact@cutiutamagica.ro", Icon: Mail, accent: "bg-[color:var(--gold)] text-[color:var(--wood-dark)]", external: false },
    { name: "Messenger", href: "https://m.me/61590919580877", Icon: MessageCircle, accent: "bg-[#0084ff] text-white", external: true },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 md:py-14" aria-labelledby="connect-heading">
      <div className="text-center mb-6">
        <h2 id="connect-heading" className="font-display text-2xl md:text-3xl">Urmărește-ne</h2>
        <p className="mt-2 text-sm md:text-[15px] text-[color:var(--cream)]/75 max-w-xl mx-auto">
          Lansări noi, culise din atelier și melodii rare — direct în feed-ul tău.
        </p>
      </div>

      {/* Compact thematic social cards — name only */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-3 max-w-md mx-auto">
        {socials.map(({ name, handle, href, Icon, accent, glow }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} — ${handle}`}
            className="group relative overflow-hidden rounded-xl border border-[color:var(--gold)]/25 text-[color:var(--cream)] px-3 py-3 md:px-4 md:py-4 shadow-[0_14px_36px_-22px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-0.5 hover:border-[color:var(--gold)]/55"
            style={{
              backgroundImage:
                "linear-gradient(180deg, oklch(0.22 0.04 45) 0%, oklch(0.16 0.03 40) 100%)",
            }}
          >
            <span aria-hidden className="absolute inset-0 opacity-70 pointer-events-none" style={{ background: accent }} />
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ boxShadow: `inset 0 0 0 1px oklch(0.85 0.16 70 / 0.55), 0 0 28px -8px ${glow}` }}
            />
            <span
              aria-hidden
              className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-40 group-hover:opacity-75 transition-opacity duration-500"
              style={{ background: glow }}
            />
            <div className="relative flex flex-col items-center gap-1.5 text-center">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-[color:var(--gold)]/30 bg-[oklch(0.15_0.03_40)]/70 backdrop-blur-sm transition-transform duration-500 group-hover:rotate-[-4deg] group-hover:scale-105"
                style={{ boxShadow: `inset 0 0 14px ${glow}` }}
              >
                <Icon className="w-4 h-4 text-[color:var(--gold)]" />
              </span>
              <span className="font-display text-sm md:text-base leading-none">{name}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-12 text-center">
        <h3 className="font-display text-xl md:text-2xl">Contactează-ne</h3>
        <p className="mt-2 text-sm md:text-[15px] text-[color:var(--cream)]/75 max-w-xl mx-auto">
          Răspuns rapid pe canalul tău preferat — întrebări, personalizări sau o melodie aparte.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        {contacts.map(({ name, href, Icon, accent, external }) => (
          <a
            key={name}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-soft hover:opacity-90 transition ${accent}`}
          >
            <Icon className="w-4 h-4" />
            {name}
          </a>
        ))}
      </div>

      {/* B2B partnership strip — discreet, placed last just above the footer */}
      <a
        href={b2bHref}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 mt-12 max-w-2xl mx-auto rounded-full border border-[color:var(--gold)]/25 bg-[oklch(0.22_0.04_45)]/70 backdrop-blur-sm text-[color:var(--cream)] pl-3 pr-3 py-2 shadow-[0_10px_30px_-20px_oklch(0.55_0.18_55/0.5)] hover:border-[color:var(--gold)]/50 transition-colors"
        aria-label="Discută parteneriat B2B pe WhatsApp"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 border border-[color:var(--gold)]/30 bg-[oklch(0.18_0.03_40)]">
          <Handshake className="w-3.5 h-3.5 text-[color:var(--gold)]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--gold)]/85">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Parteneriate B2B</span>
          </div>
          <p className="text-[12.5px] md:text-[13px] text-[color:var(--cream)]/85 leading-snug truncate">
            Cadouri corporate & comenzi în volum — scrie-ne pe WhatsApp.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#25d366]/95 text-white px-2.5 py-1 text-[11px] font-medium shrink-0 group-hover:translate-x-0.5 transition-transform">
          <MessageCircle className="w-3 h-3" />
          WhatsApp
          <ArrowRight className="w-3 h-3" />
        </span>
        <ArrowRight className="sm:hidden w-4 h-4 text-[color:var(--gold)] shrink-0" />
      </a>
    </section>
  );
}
