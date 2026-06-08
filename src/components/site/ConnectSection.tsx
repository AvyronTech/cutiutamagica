import { Instagram, Facebook, Phone, Mail, MessageCircle } from "lucide-react";

const socials = [
  { name: "Instagram", href: "https://www.instagram.com/cutiutamagicaofficial/", Icon: Instagram, color: "from-[#feda75] via-[#d62976] to-[#4f5bd5]" },
  { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61590919580877", Icon: Facebook, color: "from-[#1877f2] to-[#0a4db3]" },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@cutiua.magic",
    Icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.9a4.85 4.85 0 0 1-1.84-.21Z" />
      </svg>
    ),
    color: "from-[#25f4ee] via-[#000] to-[#fe2c55]",
  },
];

const contacts = [
  { name: "WhatsApp", href: "https://wa.me/40700000000", Icon: MessageCircle, accent: "bg-[#25d366] text-white" },
  { name: "Telefon", href: "tel:+40700000000", Icon: Phone, accent: "bg-[color:var(--wood-dark)] text-[color:var(--cream)]" },
  { name: "Email", href: "mailto:contact@cutiutamagica.ro", Icon: Mail, accent: "bg-[color:var(--gold)] text-[color:var(--wood-dark)]" },
  { name: "Messenger", href: "https://m.me/cutiutamagica", Icon: MessageCircle, accent: "bg-[#0084ff] text-white" },
];

export function ConnectSection() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-8 md:py-10" aria-labelledby="connect-heading">
      <div className="text-center mb-5">
        <h2 id="connect-heading" className="font-display text-2xl md:text-3xl">Urmărește-ne</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-md mx-auto">
        {socials.map(({ name, href, Icon, color }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            className="group relative overflow-hidden rounded-xl border border-border bg-card aspect-square flex flex-col items-center justify-center shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <div className={`absolute inset-0 opacity-15 bg-gradient-to-br ${color}`} />
            <Icon className="w-6 h-6 md:w-7 md:h-7 text-foreground relative" />
            <span className="text-[11px] md:text-xs font-medium relative mt-1">{name}</span>
          </a>
        ))}
      </div>

      <div className="mt-10 text-center">
        <h3 className="font-display text-xl md:text-2xl">Contactează-ne</h3>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        {contacts.map(({ name, href, Icon, accent }) => (
          <a
            key={name}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-soft hover:opacity-90 transition ${accent}`}
          >
            <Icon className="w-4 h-4" />
            {name}
          </a>
        ))}
      </div>
    </section>
  );
}
