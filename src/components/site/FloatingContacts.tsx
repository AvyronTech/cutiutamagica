import { useLocation } from "@tanstack/react-router";
import { MessageCircle, Phone, Sparkles } from "lucide-react";
import { PHONE_TEL, waLink, messageForPath } from "@/lib/whatsapp";

export function FloatingContacts() {
  const { pathname } = useLocation();
  return (
    <div className="floating-contacts fixed z-50 flex flex-col gap-3" aria-label="Contact rapid">
      <a
        href={`tel:${PHONE_TEL}`}
        aria-label="Sună echipa Cutiuța Magică"
        title="Sună-ne"
        className="floating-contact group relative"
      >
        <span className="floating-contact-surface floating-contact-surface--phone relative flex h-12 w-12 items-center justify-center rounded-full border border-white/45 text-white transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.04] md:h-13 md:w-13">
          <Phone className="h-5 w-5" aria-hidden />
        </span>
        <span className="floating-contact-tooltip">Sună-ne</span>
      </a>
      <a
        href={waLink(messageForPath(pathname))}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Scrie-ne pe WhatsApp despre o cutiuță"
        title="Scrie-ne pe WhatsApp"
        className="floating-contact floating-contact--whatsapp group relative"
      >
        <span className="floating-contact-halo" aria-hidden />
        <span className="floating-contact-surface floating-contact-surface--whatsapp relative flex h-12 w-12 items-center justify-center rounded-full border border-white/45 text-white transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.04] md:h-13 md:w-13">
          <MessageCircle className="h-6 w-6" strokeWidth={1.8} aria-hidden />
          <Phone className="absolute left-[19px] top-[17px] h-3 w-3 -rotate-12" aria-hidden />
          <Sparkles className="floating-contact-sparkle" size={12} aria-hidden />
        </span>
        <span className="floating-contact-tooltip">Scrie-ne pe WhatsApp</span>
      </a>
    </div>
  );
}
