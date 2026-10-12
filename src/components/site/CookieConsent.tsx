import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cutiuta:cookie-consent:v1";

type ConsentChoice = {
  necessary: true;
  experience: boolean;
  marketing: boolean;
  savedAt: string;
};

function saveConsent(choice: Omit<ConsentChoice, "savedAt">) {
  const value: ConsentChoice = { ...choice, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* Alegerea rămâne valabilă pentru vizita curentă dacă stocarea este blocată. */
  }
  window.dispatchEvent(new CustomEvent("cutiuta:consent", { detail: value }));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [experience, setExperience] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(STORAGE_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const choose = (choice: Omit<ConsentChoice, "savedAt">) => {
    saveConsent(choice);
    setVisible(false);
  };

  return (
    <aside className="cookie-story" aria-labelledby="cookie-story-title">
      <div className="cookie-story__mark" aria-hidden>
        <Sparkles />
      </div>
      <div className="cookie-story__copy">
        <p>O alegere mică</p>
        <h2 id="cookie-story-title">Păstrăm magia simplă.</h2>
        <span>
          Folosim mici semne digitale ca povestea să curgă firesc. Tu alegi cât păstrăm aproape.
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
              <span>Experiență</span>
              <input
                type="checkbox"
                checked={experience}
                onChange={(event) => setExperience(event.target.checked)}
              />
            </label>
            <label>
              <span>Inspirație</span>
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
            <Check aria-hidden /> Acceptă și continuă
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
