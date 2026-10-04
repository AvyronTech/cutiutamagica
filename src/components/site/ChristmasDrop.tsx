import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Bell, CalendarDays, Snowflake, Sparkles } from "lucide-react";

export function ChristmasDrop() {
  return (
    <section
      id="christmas-drop"
      className="christmas-drop"
      data-world="future"
      aria-labelledby="christmas-drop-title"
    >
      <div className="christmas-drop-atmosphere" aria-hidden="true">
        <span className="christmas-drop-orbit" />
        <span className="christmas-drop-star christmas-drop-star--one">✦</span>
        <span className="christmas-drop-star christmas-drop-star--two">✧</span>
        <span className="christmas-drop-star christmas-drop-star--three">·</span>
      </div>

      <div className="christmas-drop-shell">
        <div className="christmas-drop-copy">
          <p className="christmas-drop-kicker">
            <Sparkles size={14} aria-hidden="true" />
            Magic Drop
          </p>
          <h2 id="christmas-drop-title">The Christmas Collection</h2>
          <p className="christmas-drop-description">
            O nouă poveste de iarnă se pregătește să cânte. Cutiuța de Crăciun va fi dezvăluită
            aici, într-o ediție creată pentru serile care rămân în amintire.
          </p>

          <div className="christmas-drop-release">
            <CalendarDays size={17} aria-hidden="true" />
            <span>
              <small>Lansare</small>
              <time dateTime="2026-11-15">Disponibilă din 15 noiembrie</time>
            </span>
          </div>

          <div className="christmas-drop-actions">
            <Link className="magic-button christmas-drop-button" to="/cont">
              <Bell size={16} aria-hidden="true" />
              Notifică-mă când apare
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <p>Intră în cont sau înregistrează-te pentru a continua.</p>
          </div>
        </div>

        <div className="christmas-drop-visual" aria-hidden="true">
          <span className="christmas-drop-snow christmas-drop-snow--one" />
          <span className="christmas-drop-snow christmas-drop-snow--two" />
          <span className="christmas-drop-snow christmas-drop-snow--three" />
          <div className="christmas-drop-box">
            <div className="christmas-drop-box-lid">
              <span />
            </div>
            <div className="christmas-drop-box-face">
              <Snowflake size={38} strokeWidth={1.15} />
              <span className="christmas-drop-box-line" />
            </div>
            <span className="christmas-drop-crank">
              <i />
            </span>
          </div>
          <span className="christmas-drop-visual-label">Prima poveste a iernii</span>
        </div>
      </div>
    </section>
  );
}
