import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CONSENT_OPEN_EVENT,
  readConsent,
  saveConsent,
  subscribeConsent,
  type ConsentChoice,
} from "@/lib/cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [experience, setExperience] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setVisible(!readConsent());
    const open = () => {
      const choice = readConsent();
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setExperience(choice?.experience ?? false);
      setMarketing(choice?.marketing ?? false);
      setSettingsOpen(true);
      setVisible(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    const unsubscribe = subscribeConsent(() => setVisible(false));
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, open);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (visible && settingsOpen && returnFocus.current) title.current?.focus();
  }, [visible, settingsOpen]);

  if (!visible) return null;

  const choose = (choice: Omit<ConsentChoice, "savedAt">) => {
    saveConsent(choice);
    setVisible(false);
    returnFocus.current?.focus();
    returnFocus.current = null;
  };

  return (
    <aside className="cookie-story" aria-labelledby="cookie-story-title">
      <div className="cookie-story__mark" aria-hidden>
        <Sparkles />
      </div>
      <div className="cookie-story__copy">
        <p>Alegerea ta</p>
        <h2 id="cookie-story-title" ref={title} tabIndex={-1}>
          Cookie-uri, pe scurt.
        </h2>
        <span>
          Cele necesare funcționării sunt mereu active. Pentru experiență și marketing, alegi tu.
        </span>

        {settingsOpen && (
          <div className="cookie-story__settings" id="cookie-story-settings">
            <div>
              <span>
                <ShieldCheck aria-hidden /> Esențiale
              </span>
              <small>Mereu active</small>
            </div>
            <label>
              <span>Experiență și analiză</span>
              <input
                type="checkbox"
                checked={experience}
                onChange={(event) => setExperience(event.target.checked)}
              />
            </label>
            <label>
              <span>Marketing</span>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
              />
            </label>
          </div>
        )}

        <div className="cookie-story__actions">
          <button
            type="button"
            className="cookie-story__accept"
            onClick={() => choose({ necessary: true, experience: true, marketing: true })}
          >
            <Check aria-hidden /> Acceptă toate
          </button>
          <button
            type="button"
            className="cookie-story__necessary"
            onClick={() => choose({ necessary: true, experience: false, marketing: false })}
          >
            Doar necesare
          </button>
          <button
            type="button"
            className="cookie-story__preferences"
            aria-expanded={settingsOpen}
            aria-controls="cookie-story-settings"
            onClick={() => setSettingsOpen((value) => !value)}
          >
            <SlidersHorizontal aria-hidden /> Setări <ChevronDown aria-hidden />
          </button>
          {settingsOpen && (
            <button
              type="button"
              className="cookie-story__save"
              onClick={() => choose({ necessary: true, experience, marketing })}
            >
              Salvează alegerea
            </button>
          )}
        </div>
        <Link to="/politica-de-confidentialitate">Cum avem grijă de date</Link>
      </div>
    </aside>
  );
}
