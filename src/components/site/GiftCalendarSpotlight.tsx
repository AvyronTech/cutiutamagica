import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  CalendarHeart,
  Gift,
  Heart,
  Mail,
  PackageSearch,
  Sparkles,
  Star,
} from "lucide-react";

const reminderPreviews = [
  {
    eyebrow: "Aniversare · Maria",
    message: "Mai sunt 12 zile până la aniversarea Mariei.",
    action: "Vrei să vezi 3 idei?",
  },
  {
    eyebrow: "Secret Santa · Birou",
    message: "Extragerea este peste 28 de zile.",
    action: "Pregătim câteva idei potrivite?",
  },
  {
    eyebrow: "Crăciun · Familie",
    message: "Povestea de Crăciun se apropie.",
    action: "Vezi cadouri care ajung la timp.",
  },
];

const occasions = [
  "Ziua ei sau a lui",
  "Aniversarea relației",
  "Ziua copilului",
  "Crăciun",
  "Secret Santa",
  "Zile de naștere",
];

const accountBenefits = [
  { icon: Star, title: "Magic Stars", text: "Aduni beneficii din momentele tale." },
  { icon: Heart, title: "Favorite aproape", text: "Revii rapid la cutiuțele care te-au ales." },
  { icon: PackageSearch, title: "Comenzi urmărite", text: "Vezi simplu unde a ajuns povestea." },
];

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
            Calendarul
            <br />
            <em>cadourilor.</em>
          </h2>
          <p className="gift-calendar-intro">
            Păstrezi datele care contează, iar noi îți reamintim discret înainte ca momentul să te
            ia prin surprindere.
          </p>

          <div className="gift-calendar-channels" aria-label="Canale opționale de notificare">
            <span>
              <BellRing size={14} /> În cont
            </span>
            <span>
              <Mail size={14} /> Pe e-mail, doar dacă alegi
            </span>
          </div>

          <div className="gift-calendar-benefits" aria-label="Beneficiile contului Magic">
            {accountBenefits.map(({ icon: Icon, title, text }) => (
              <span key={title}>
                <Icon aria-hidden />
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </span>
            ))}
          </div>

          <div className="gift-calendar-actions">
            <Link className="magic-button gift-calendar-cta" to="/cont" search={{ mod: "creare" }}>
              Creează contul Magic <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="gift-calendar-preview" aria-label="Exemple de notificări din calendar">
          <div className="gift-calendar-preview-heading">
            <span>
              <CalendarHeart size={16} /> Următorul moment
            </span>
            <i aria-hidden="true" />
          </div>
          <div className="gift-calendar-window">
            <div className="gift-calendar-track">
              {[...reminderPreviews, ...reminderPreviews].map((preview, index) => (
                <article
                  className="gift-calendar-reminder"
                  key={`${preview.eyebrow}-${index}`}
                  aria-hidden={index >= reminderPreviews.length ? "true" : undefined}
                >
                  <div className="gift-calendar-reminder-icon">
                    <Gift size={17} />
                  </div>
                  <div>
                    <small>{preview.eyebrow}</small>
                    <p>{preview.message}</p>
                    <strong>{preview.action}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="gift-calendar-occasions" aria-label="Momente pe care le poți salva">
            {occasions.map((occasion) => (
              <span key={occasion}>{occasion}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
