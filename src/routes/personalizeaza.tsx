import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  Clock3,
  Gift,
  ImagePlus,
  LockKeyhole,
  Music2,
  PackageCheck,
  Palette,
  PenLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  PERSONALIZATION_BASE_PRICE_BANI,
  PERSONALIZATION_DELIVERY,
  PERSONALIZATION_GIFT_WRAP_BANI,
  PERSONALIZATION_MAX_IMAGE_BYTES,
  formatPersonalizationPrice,
  personalizationBoxModels,
  personalizationMelodies,
  personalizationTotalBani,
  type PersonalizationBoxColor,
  type PersonalizationBoxModel,
  type PersonalizationMelody,
} from "@/lib/personalization";
import { reviewApi, type Reviewer } from "@/lib/reviews";
import { PersonalizationSpaceStage } from "@/components/site/PersonalizationSpaceStage";
import { trackGrowthEvent } from "@/lib/growth-events";

type CreatedRequest = { id: string; reference: string; totalBani: number; status: string };

export const Route = createFileRoute("/personalizeaza")({
  component: Personalizeaza,
  head: () => ({
    meta: [
      { title: "Personalizează o cutiuță muzicală | Cutiuța Magică" },
      {
        name: "description",
        content:
          "Configurează o cutiuță muzicală într-un atelier vizual 3D: alege modelul, culoarea, melodia, imaginea, gravura și ambalarea.",
      },
      { property: "og:title", content: "Personalizează Cutiuța Magică" },
      {
        property: "og:description",
        content: "Culoare, melodie, imagine și gravură pe capac. De la 189 lei.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/personalizeaza" }],
  }),
});

const steps = ["Modelul", "Melodia", "Imaginea", "Detaliile"];

function Personalizeaza() {
  const account = useQuery({
    queryKey: ["reviewer"],
    queryFn: () => reviewApi<Reviewer | null>("/api/v1/reviewer"),
    retry: false,
    staleTime: 30_000,
  });
  const [step, setStep] = useState(0);
  const [boxModel, setBoxModel] = useState<PersonalizationBoxModel>("classic");
  const [boxColor, setBoxColor] = useState<PersonalizationBoxColor>("black");
  const [melody, setMelody] = useState<PersonalizationMelody>("melody-1");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [engraving, setEngraving] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const totalBani = personalizationTotalBani(giftWrap);
  const selectedMelody = useMemo(
    () => personalizationMelodies.find((option) => option.id === melody)!,
    [melody],
  );
  const selectedBoxModel = useMemo(
    () => personalizationBoxModels.find((option) => option.id === boxModel)!,
    [boxModel],
  );

  useEffect(() => {
    trackGrowthEvent("personalization_start", { once: "personalization_start" });
  }, []);

  useEffect(() => {
    if (!account.data) return;
    setCustomerName((value) => value || account.data!.displayName);
    setEmail((value) => value || account.data!.email);
  }, [account.data]);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function next() {
    if (step === 2 && !image) {
      setError("Adaugă imaginea pe care o dorești pe capac.");
      return;
    }
    setError("");
    setStep((value) => Math.min(3, value + 1));
  }

  function chooseImage(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Alege o imagine JPG, PNG sau WebP.");
      return;
    }
    if (file.size > PERSONALIZATION_MAX_IMAGE_BYTES) {
      setError("Imaginea poate avea cel mult 5 MB.");
      return;
    }
    setImage(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image) {
      setStep(2);
      setError("Adaugă imaginea pe care o dorești pe capac.");
      return;
    }
    setBusy(true);
    setError("");
    const data = new FormData();
    data.set("customerName", customerName);
    data.set("email", email);
    data.set("phone", phone);
    data.set("boxModel", boxModel);
    data.set("boxColor", boxColor);
    data.set("melody", melody);
    data.set("engraving", engraving.trim());
    data.set("giftWrap", String(giftWrap));
    data.set("notes", notes.trim());
    data.set("consent", String(consent));
    data.set("website", website);
    data.set("image", image, image.name);
    try {
      const response = await fetch("/api/v1/personalization/requests", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        data?: CreatedRequest;
        error?: { message?: string };
      };
      if (!response.ok || !result.data)
        throw new Error(result.error?.message || "Cererea nu a putut fi trimisă.");
      setCreated(result.data);
      toast.success("Cererea de personalizare a fost înregistrată.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Cererea nu a putut fi trimisă.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <section className="personalization-success">
        <div className="personalization-success__mark" aria-hidden>
          <Check />
        </div>
        <p className="catalog-eyebrow">Cerere primită</p>
        <h1>Povestea ta merge mai departe.</h1>
        <p>
          Referința este <strong>{created.reference}</strong>. Vom verifica imaginea și opțiunile,
          apoi te vom contacta înainte de producție. Trimiterea formularului nu inițiază o plată.
        </p>
        <div className="personalization-success__facts">
          <span>
            <Clock3 /> {PERSONALIZATION_DELIVERY}
          </span>
          <span>
            <PackageCheck /> {formatPersonalizationPrice(created.totalBani)}
          </span>
        </div>
        <div className="personalization-success__actions">
          <Link className="magic-button" to="/cont">
            {account.data ? "Vezi cererile mele" : "Creează un cont"} <ArrowRight size={17} />
          </Link>
          <Link className="magic-button magic-button--outline" to="/">
            Înapoi acasă
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="personalization-page">
      <section className="personalization-intro">
        <p className="catalog-eyebrow">
          <Sparkles size={14} /> Atelier orbital · configurație în timp real
        </p>
        <h1>Personalizează Cutiuța Magică</h1>
        <p>
          Patru pași simpli într-o scenă vizuală fluidă. Alegi forma, finisajul, melodia și
          detaliile personale; atelierul confirmă sursa, prețul și proporțiile înainte de lucru.
        </p>
        <div className="personalization-intro__facts">
          <span>
            <strong>{formatPersonalizationPrice(PERSONALIZATION_BASE_PRICE_BANI)}</strong> preț de
            bază
          </span>
          <span>
            <Clock3 size={17} /> {PERSONALIZATION_DELIVERY}
          </span>
          <span>
            <Gift size={17} /> ambalare specială +35 lei
          </span>
        </div>
      </section>

      <form className="personalization-flow" onSubmit={submit}>
        <nav className="personalization-steps" aria-label="Pașii personalizării">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index < step && setStep(index)}
              aria-current={step === index ? "step" : undefined}
              data-complete={index < step || undefined}
            >
              <span>{index < step ? <Check size={14} /> : index + 1}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="personalization-workspace">
          <div className="personalization-form-card">
            {step === 0 && (
              <fieldset className="personalization-panel">
                <legend>
                  <Box /> Alege forma cutiuței
                </legend>
                <p>
                  Fiecare model este corelat cu o sursă aprobată de administrator. Variantele la
                  cerere sunt confirmate înainte de orice achiziție sau plată.
                </p>
                <div className="box-model-options">
                  {personalizationBoxModels.map((option, index) => (
                    <label key={option.id} data-selected={boxModel === option.id || undefined}>
                      <input
                        type="radio"
                        name="box-model"
                        value={option.id}
                        checked={boxModel === option.id}
                        onChange={() => setBoxModel(option.id)}
                      />
                      <span aria-hidden>0{index + 1}</span>
                      <small>{option.eyebrow}</small>
                      <strong>{option.label}</strong>
                      <p>{option.description}</p>
                    </label>
                  ))}
                </div>
                <h3 className="personalization-subheading">
                  <Palette /> Finisajul lemnului
                </h3>
                <div className="box-color-options">
                  {(
                    [
                      ["black", "Neagră", "Profundă, elegantă, cu contrast auriu"],
                      ["yellow", "Galbenă", "Luminoasă, caldă, cu aer de poveste"],
                    ] as const
                  ).map(([value, label, description]) => (
                    <label key={value} data-selected={boxColor === value || undefined}>
                      <input
                        type="radio"
                        name="box-color"
                        value={value}
                        checked={boxColor === value}
                        onChange={() => setBoxColor(value)}
                      />
                      <span className={"color-swatch color-swatch--" + value} />
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset className="personalization-panel">
                <legend>
                  <Music2 /> Alege melodia
                </legend>
                <p>Vei confirma varianta exactă împreună cu atelierul înainte de producție.</p>
                <div className="melody-options">
                  {personalizationMelodies.map((option, index) => (
                    <label key={option.id} data-selected={melody === option.id || undefined}>
                      <input
                        type="radio"
                        name="melody"
                        value={option.id}
                        checked={melody === option.id}
                        onChange={() => setMelody(option.id)}
                      />
                      <span aria-hidden>0{index + 1}</span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="personalization-panel">
                <legend>
                  <ImagePlus /> Imaginea și gravura de pe capac
                </legend>
                <p>
                  Alege o fotografie clară, cu subiectul central. Acceptăm JPG, PNG sau WebP,
                  maximum 5 MB.
                </p>
                <label className="image-drop" data-has-image={!!image || undefined}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => chooseImage(event.target.files?.[0])}
                  />
                  <Upload aria-hidden />
                  <strong>{image ? "Schimbă imaginea" : "Alege imaginea"}</strong>
                  <small>
                    {image
                      ? image.name
                      : "Imaginea rămâne privată și este folosită pentru cererea ta."}
                  </small>
                </label>
                <label className="personalization-engraving-field">
                  <span>
                    <PenLine /> Gravură personală · opțional
                  </span>
                  <input
                    value={engraving}
                    maxLength={28}
                    onChange={(event) => setEngraving(event.target.value)}
                    placeholder="Exemplu: Pentru totdeauna"
                  />
                  <small>{engraving.length}/28 caractere</small>
                </label>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="personalization-panel personalization-contact">
                <legend>
                  <PackageCheck /> Unde confirmăm detaliile?
                </legend>
                {account.data ? (
                  <p className="personalization-account-note">
                    Cererea va apărea în <Link to="/cont">contul tău</Link> după trimitere.
                  </p>
                ) : (
                  <p className="personalization-account-note">
                    Poți trimite fără cont sau poți <Link to="/cont">intra în cont</Link> pentru a
                    vedea ulterior toate cererile tale.
                  </p>
                )}
                <div className="personalization-fields">
                  <label>
                    Nume
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      required
                      type="email"
                      maxLength={254}
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                  <label>
                    Telefon
                    <input
                      required
                      type="tel"
                      minLength={7}
                      maxLength={24}
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </label>
                  <label className="personalization-fields__wide">
                    Mesaj pentru atelier · opțional
                    <textarea
                      rows={3}
                      maxLength={920}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Spune-ne dacă imaginea trebuie decupată într-un anumit fel sau dacă este un cadou pentru o dată anume."
                    />
                  </label>
                </div>
                <label className="gift-wrap-option" data-selected={giftWrap || undefined}>
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setGiftWrap(checked);
                      if (checked)
                        trackGrowthEvent("gift_wrap_added", {
                          value: PERSONALIZATION_GIFT_WRAP_BANI / 100,
                          quantity: 1,
                          properties: { source: "personalization" },
                        });
                    }}
                  />
                  <Gift />
                  <span>
                    <strong>Ambalare specială</strong>
                    <small>Pregătită pentru a fi oferită cadou</small>
                  </span>
                  <b>+{formatPersonalizationPrice(PERSONALIZATION_GIFT_WRAP_BANI)}</b>
                </label>
                <label className="personalization-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    required
                  />
                  <span>
                    Sunt de acord ca datele și imaginea să fie folosite pentru evaluarea și
                    realizarea cererii. Am citit{" "}
                    <Link to="/politica-de-confidentialitate">politica de confidențialitate</Link>.
                  </span>
                </label>
                <label className="personalization-honeypot" aria-hidden="true">
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </label>
              </fieldset>
            )}

            {error && (
              <p className="personalization-error" role="alert">
                {error}
              </p>
            )}
            <div className="personalization-navigation">
              <button
                type="button"
                className="magic-button magic-button--outline"
                onClick={() => {
                  setError("");
                  setStep((value) => Math.max(0, value - 1));
                }}
                disabled={step === 0 || busy}
              >
                <ArrowLeft size={16} /> Înapoi
              </button>
              {step < 3 ? (
                <button type="button" className="magic-button" onClick={next}>
                  Continuă <ArrowRight size={16} />
                </button>
              ) : (
                <button type="submit" className="magic-button" disabled={busy}>
                  {busy ? "Se trimite…" : "Trimite cererea"} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          <aside className="personalization-preview" aria-label="Previzualizarea cutiuței">
            <p className="catalog-eyebrow">Atelier 3D · previzualizare orientativă</p>
            <PersonalizationSpaceStage
              boxColor={boxColor}
              boxModel={boxModel}
              preview={preview}
              engraving={engraving}
              giftWrap={giftWrap}
            />
            <dl>
              <div>
                <dt>Model</dt>
                <dd>{selectedBoxModel.label}</dd>
              </div>
              <div>
                <dt>Cutiuță</dt>
                <dd>{boxColor === "black" ? "Neagră" : "Galbenă"}</dd>
              </div>
              <div>
                <dt>Melodie</dt>
                <dd>{selectedMelody.label}</dd>
              </div>
              <div>
                <dt>Gravură</dt>
                <dd>{engraving.trim() || "Fără gravură"}</dd>
              </div>
              <div>
                <dt>Ambalare</dt>
                <dd>{giftWrap ? "Specială" : "Standard"}</dd>
              </div>
              <div className="personalization-preview__total">
                <dt>Total estimat</dt>
                <dd>{formatPersonalizationPrice(totalBani)}</dd>
              </div>
            </dl>
            <p className="personalization-preview__privacy">
              <LockKeyhole size={15} /> Imaginea este stocată privat și nu apare în catalog.
            </p>
            <p className="personalization-preview__source">
              Sursa comercială este vizibilă numai administratorului și este verificată înainte de
              comandă.
            </p>
          </aside>
        </div>
      </form>
    </div>
  );
}
