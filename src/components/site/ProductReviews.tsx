import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { reviewApi, reviewCountries, type Reviewer, type ReviewList } from "@/lib/reviews";
import { ReviewCard, ReviewStars } from "./ReviewCard";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { trackGrowthEvent } from "@/lib/growth-events";

const REVIEWS_PER_PAGE = 4;
export function ProductReviews({
  slug,
  name,
  products,
  initial,
}: {
  slug: string;
  name: string;
  products: Array<{ id: string; name: string }>;
  initial: ReviewList;
}) {
  const id = useId(),
    carousel = useRef<HTMLDivElement>(null),
    [open, setOpen] = useState(false),
    [page, setPage] = useState(0),
    [slide, setSlide] = useState(0),
    [paused, setPaused] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [rating, setRating] = useState(0),
    reduced = useReducedMotion();
  const account = useQuery({
    queryKey: ["reviewer"],
    queryFn: () => reviewApi<Reviewer | null>("/api/v1/reviewer"),
    enabled: open,
    retry: false,
    staleTime: 30000,
  });
  const query = useQuery({
    queryKey: ["reviews", slug, page],
    queryFn: () =>
      reviewApi<ReviewList>(
        `/api/v1/reviews?product=${slug}&offset=${page * REVIEWS_PER_PAGE}&limit=${REVIEWS_PER_PAGE}`,
      ),
    initialData: page === 0 ? initial : undefined,
    staleTime: 30000,
  });
  const data = query.data;
  const displayedReviews = data?.reviews.slice(0, REVIEWS_PER_PAGE) ?? [];

  function inferredLocale() {
    if (typeof navigator === "undefined")
      return { language: "ro" as const, countryCode: "RO" as const };
    const locale = navigator.languages?.[0] || navigator.language || "ro-RO";
    const [languageCode, countryCode] = locale.replace("_", "-").split("-");
    const supportedCountry = countryCode?.toUpperCase();
    return {
      language: languageCode.toLowerCase() === "ro" ? ("ro" as const) : ("en" as const),
      countryCode:
        supportedCountry && supportedCountry in reviewCountries
          ? (supportedCountry as keyof typeof reviewCountries)
          : languageCode.toLowerCase() === "ro"
            ? ("RO" as const)
            : null,
    };
  }

  const goToSlide = useCallback(
    (next: number) => {
      const count = displayedReviews.length;
      if (!count) return;
      const index = (next + count) % count;
      setSlide(index);
      const track = carousel.current;
      const card = track?.querySelector<HTMLElement>(`[data-review-slide="${index}"]`);
      if (track && card)
        track.scrollTo({
          left: card.offsetLeft - track.offsetLeft,
          behavior: reduced ? "auto" : "smooth",
        });
    },
    [displayedReviews.length, reduced],
  );

  useEffect(() => {
    setSlide(0);
    const frame = window.requestAnimationFrame(() => goToSlide(0));
    return () => window.cancelAnimationFrame(frame);
  }, [goToSlide, page, slug]);

  useEffect(() => {
    if (reduced || paused || displayedReviews.length < 2) return;
    const timer = window.setInterval(() => goToSlide(slide + 1), 6200);
    return () => window.clearInterval(timer);
  }, [displayedReviews.length, goToSlide, paused, reduced, slide]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!rating) throw new Error("Alege între 1 și 5 stele.");
      const locale = inferredLocale();
      const selectedProduct = String(form.get("productSlug") || slug);
      const created = await reviewApi<{ id: string }>("/api/v1/reviews", {
        method: "POST",
        body: JSON.stringify({
          productSlug: selectedProduct,
          displayName: account.data ? undefined : form.get("displayName"),
          email: account.data ? undefined : form.get("email"),
          rating,
          body: form.get("body"),
          language: locale.language,
          countryCode: locale.countryCode,
          consent: form.get("consent") === "on",
          website: form.get("website"),
        }),
      });
      const photo = form.get("photo");
      if (account.data && photo instanceof File && photo.size > 0) {
        const upload = new FormData();
        upload.set("photo", photo);
        const response = await fetch(`/api/v1/reviews/${created.id}/photo`, {
          method: "POST",
          credentials: "same-origin",
          body: upload,
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(
            payload?.error?.message ||
              "Recenzia a fost salvată, dar fotografia nu a putut fi încărcată.",
          );
        }
      }
      trackGrowthEvent("review_submitted", {
        productSlug: selectedProduct,
        quantity: 1,
        properties: { rating, mode: account.data ? "account" : "guest" },
      });
      setMessage("Mulțumim! Recenzia ta va apărea după verificare.");
      setOpen(false);
      setRating(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reîncearcă.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="product-reviews" aria-labelledby={`${id}-title`}>
      <div className="product-reviews-heading">
        <div>
          <p className="catalog-eyebrow">Păreri și mici povești</p>
          <h2 id={`${id}-title`}>Cum a sunat povestea ta?</h2>
          <p>{name}</p>
          {!!data?.total && (
            <p>
              <ReviewStars rating={Math.round(data.average || 0)} /> {data.average?.toFixed(1)} / 5
              · {data.total} recenzii aprobate
            </p>
          )}
        </div>
        <button
          className="review-button"
          aria-expanded={open}
          aria-controls={`${id}-form`}
          onClick={() => {
            setOpen(!open);
            setError("");
          }}
        >
          {" "}
          {open ? "Închide formularul" : "Scrie o recenzie"}{" "}
        </button>
      </div>
      {message && (
        <p role="status" className="review-feedback">
          {message}
        </p>
      )}
      {open && (
        <div id={`${id}-form`} className="review-form-wrap">
          {account.data ? (
            <p>
              Scrii ca <strong>{account.data.displayName}</strong>.{" "}
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await reviewApi("/api/v1/reviewer/logout", { method: "POST" });
                    await account.refetch();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Deconectează-te
              </button>
            </p>
          ) : (
            <p className="review-feedback">
              Poți publica fără cont. Pentru o fotografie și Magic Stars, intră în cont cu Google.{" "}
              <Link to="/cont">Deschide contul</Link>
            </p>
          )}
          <form onSubmit={submit} className="review-form">
            <div className="review-trap" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <label className="review-product-field">
              Cutiuța despre care scrii
              <select name="productSlug" defaultValue={slug} required>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            {!account.data && (
              <div className="review-fields">
                <label>
                  Numele afișat
                  <input
                    name="displayName"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="nickname"
                    placeholder="Prenume și inițială"
                  />
                </label>
                <label>
                  E-mail · nu apare public
                  <input name="email" required type="email" maxLength={254} autoComplete="email" />
                </label>
              </div>
            )}
            {
              <>
                <fieldset className="review-rating">
                  <legend>Câte stele îi oferi?</legend>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className={value <= rating ? "chosen" : ""}>
                      <input
                        type="radio"
                        name="rating"
                        value={value}
                        checked={rating === value}
                        onChange={() => setRating(value)}
                        required
                        aria-label={`${value} ${value === 1 ? "stea" : "stele"}`}
                      />
                      <span aria-hidden>★</span>
                    </label>
                  ))}
                </fieldset>
                <label>
                  Părerea ta despre {name}
                  <textarea
                    name="body"
                    required
                    minLength={10}
                    maxLength={1200}
                    rows={3}
                    placeholder="Cum ai ales-o? Ce ți-a plăcut sau ce ai îmbunătăți?"
                  />
                </label>
                {account.data && (
                  <label>
                    Fotografie proprie · opțional, maximum 5 MB
                    <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
                  </label>
                )}
                <label className="review-consent">
                  <input type="checkbox" name="consent" required />
                  Accept publicarea numelui afișat și a părerii mele după verificare.{" "}
                  <Link to="/politica-de-confidentialitate">Confidențialitate</Link>
                </label>
                <p className="review-form-note">
                  Limba și țara sunt deduse automat. Sunt binevenite și părerile critice; nu include
                  date personale în text. Recenziile sunt moderate înainte de publicare.
                </p>
              </>
            }
            {error && (
              <p role="alert" className="review-error">
                {error}
              </p>
            )}
            <button className="review-button" disabled={busy || account.isFetching}>
              {busy ? "Se salvează…" : "Trimite părerea ta"}
            </button>
          </form>
        </div>
      )}
      {query.isError ? (
        <p role="status">
          Recenziile nu pot fi încărcate.{" "}
          <button onClick={() => void query.refetch()}>Reîncearcă</button>
        </p>
      ) : displayedReviews.length ? (
        <div
          className="product-review-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="product-review-carousel__meta">
            <span>
              <ShieldCheck size={15} aria-hidden /> Numai recenzii aprobate
            </span>
            {displayedReviews.length > 1 && (
              <div className="product-review-carousel__controls">
                <button
                  type="button"
                  onClick={() => goToSlide(slide - 1)}
                  aria-label="Recenzia anterioară"
                >
                  <ArrowLeft size={17} />
                </button>
                <span aria-live="polite">
                  {slide + 1} / {displayedReviews.length}
                </span>
                <button
                  type="button"
                  onClick={() => goToSlide(slide + 1)}
                  aria-label="Recenzia următoare"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </div>
          <div
            ref={carousel}
            className="product-review-carousel__track"
            aria-label={`Recenzii aprobate pentru ${name}`}
          >
            {displayedReviews.map((review, index) => (
              <div key={review.id} data-review-slide={index}>
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
          {displayedReviews.length > 1 && (
            <div className="product-review-carousel__dots" aria-hidden>
              {displayedReviews.map((review, index) => (
                <i key={review.id} className={slide === index ? "is-active" : ""} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="product-reviews-empty">
          <ShieldCheck size={19} aria-hidden />
          <p>
            Prima părere verificată poate fi a ta. Nu afișăm texte demonstrative sau recenzii
            inventate.
          </p>
        </div>
      )}
      {(page > 0 || (data?.total ?? 0) > (page + 1) * REVIEWS_PER_PAGE) && (
        <nav className="review-pagination" aria-label="Paginile recenziilor">
          <button disabled={!page || query.isFetching} onClick={() => setPage(page - 1)}>
            ← Înapoi
          </button>
          <span>Pagina {page + 1}</span>
          <button
            disabled={(data?.total ?? 0) <= (page + 1) * REVIEWS_PER_PAGE || query.isFetching}
            onClick={() => setPage(page + 1)}
          >
            Mai multe păreri →
          </button>
        </nav>
      )}
    </section>
  );
}
