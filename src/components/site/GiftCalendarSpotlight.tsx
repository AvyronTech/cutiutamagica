import { Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, CalendarHeart, Gift, Mail, Sparkles } from "lucide-react";

export function GiftCalendarSpotlight() {
  return (
    <section className="gift-calendar" data-world="atelier" aria-labelledby="gift-calendar-title">
      <div className="gift-calendar-shell">
        <div className="gift-calendar-copy">
          <p className="gift-calendar-kicker">
            <Sparkles size={14} aria-hidden="true" />
            Momentele tale, păstrate cu grijă
          </p>
          <h2 id="gift-calendar-title">
            Calendarul <em>cadourilor.</em>
          </h2>
          <p className="gift-calendar-intro">
            Salvează datele importante și primește un memento înainte de ziua specială.
          </p>
          <div className="gift-calendar-channels" aria-label="Canale opționale de notificare">
            <span>
              <BellRing size={14} aria-hidden="true" /> În cont
            </span>
            <span>
              <Mail size={14} aria-hidden="true" /> Pe e-mail, dacă alegi
            </span>
          </div>
          <Link className="magic-button gift-calendar-cta" to="/cont" search={{ mod: "creare" }}>
            Creează contul Magic <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="gift-calendar-preview" aria-label="Exemplu de memento din calendar">
          <div className="gift-calendar-preview-heading">
            <span>
              <CalendarHeart size={16} aria-hidden="true" /> Un moment care se apropie
            </span>
          </div>
          <div className="gift-calendar-reminder">
            <div className="gift-calendar-reminder-icon">
              <Gift size={17} aria-hidden="true" />
            </div>
            <div>
              <small>Aniversare · Maria</small>
              <p>Mai sunt 12 zile până la aniversare.</p>
              <strong>Ai timp să alegi un dar cu poveste.</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
