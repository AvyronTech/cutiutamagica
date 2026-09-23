import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewApi, reviewSources, type PublicReview } from "@/lib/reviews";
type AdminReview = PublicReview & {
  email: string | null;
  origin: string;
  status: string;
  featured: number;
  version: number;
  note: string;
  createdAt: string;
};
type Page = {
  reviews: AdminReview[];
  hasMore: boolean;
  counts: { status: string; count: number }[];
};
const field = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white";
const button = "rounded-lg border border-slate-600 px-4 py-2 text-sm disabled:opacity-50";
export default function Reviews({ productSlug }: { productSlug?: string }) {
  const [status, setStatus] = useState("pending"),
    [page, setPage] = useState(0),
    [product, setProduct] = useState(productSlug || ""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [showImport, setShowImport] = useState(false);
  const client = useQueryClient();
  const catalog = useQuery({
    queryKey: ["admin", "review-catalog"],
    queryFn: () => reviewApi<Array<{ slug: string; name: string }>>("/api/v1/catalog/products"),
  });
  const query = useQuery({
    queryKey: ["admin", "reviews", status, page, product],
    queryFn: () =>
      reviewApi<Page>(
        `/api/v1/admin/reviews?status=${status}&offset=${page * 50}&product=${encodeURIComponent(product)}`,
      ),
    refetchInterval: 30000,
  });
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["admin", "reviews"] });
    await client.invalidateQueries({ queryKey: ["reviews"] });
  }
  async function moderate(event: FormEvent<HTMLFormElement>, review: AdminReview) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await reviewApi(`/api/v1/admin/reviews/${review.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          expectedVersion: review.version,
          status: form.get("status"),
          featured: form.get("featured") === "on",
          note: form.get("note"),
        }),
      });
      await refresh();
      setNotice("Moderarea a fost salvată.");
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function importReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await reviewApi("/api/v1/admin/reviews/import", {
        method: "POST",
        body: JSON.stringify({
          productSlug: form.get("productSlug"),
          displayName: form.get("displayName"),
          rating: Number(form.get("rating")),
          body: form.get("body"),
          language: form.get("language"),
          source: form.get("source"),
          sourceUrl: form.get("sourceUrl"),
          authentic: form.get("authentic") === "on",
        }),
      });
      setShowImport(false);
      setStatus("pending");
      setPage(0);
      await refresh();
      setNotice("Recenzia a fost importată în coada de aprobare.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5 text-slate-200">
      <header>
        <h1 className="text-2xl font-semibold text-white">Recenzii și comentarii</h1>
        <p className="mt-2 text-sm text-slate-400">
          Aprobă, respinge sau retrage recenzii. Textul original rămâne intact; observațiile de
          moderare sunt private.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        {["pending", "approved", "rejected"].map((key) => (
          <span key={key} className="rounded-xl border border-slate-700 p-3 text-sm">
            {key === "pending" ? "În așteptare" : key === "approved" ? "Aprobate" : "Respinse"}:{" "}
            {query.data?.counts.find((c) => c.status === key)?.count || 0}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <label>
          Stare
          <select
            className={field}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="pending">În așteptare</option>
            <option value="approved">Aprobate</option>
            <option value="rejected">Respinse</option>
            <option value="all">Toate</option>
          </select>
        </label>
        <label>
          Cutiuță
          <select
            className={field}
            value={product}
            onChange={(e) => {
              setProduct(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Toate cutiuțele</option>
            {catalog.data?.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className={button}
          onClick={() => setShowImport(!showImport)}
          aria-expanded={showImport}
        >
          Importă o recenzie reală
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-emerald-300">
          {notice}
        </p>
      )}
      {showImport && (
        <form
          onSubmit={importReview}
          className="grid gap-3 rounded-xl border border-cyan-400/30 p-5 md:grid-cols-2"
        >
          <label>
            Cutiuța
            <select required name="productSlug" className={field} defaultValue={product}>
              <option value="">Alege cutiuța</option>
              {catalog.data?.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nume public
            <input name="displayName" required minLength={2} maxLength={60} className={field} />
          </label>
          <label>
            Platforma
            <select name="source" className={field}>
              {Object.entries(reviewSources).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Link direct către recenzia originală
            <input name="sourceUrl" type="url" required maxLength={1000} className={field} />
          </label>
          <label>
            Stele
            <select name="rating" defaultValue="5" className={field}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Limba
            <select name="language" className={field}>
              <option value="ro">Română</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="md:col-span-2">
            Textul original
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={1200}
              rows={4}
              className={field}
            />
          </label>
          <label className="flex gap-2 text-sm md:col-span-2">
            <input name="authentic" type="checkbox" required />
            Am verificat sursa reală, legătura cu această cutiuță și păstrez sensul original al
            recenziei.
          </label>
          <button disabled={busy} className={button}>
            Importă pentru verificare
          </button>
        </form>
      )}
      {query.isLoading ? (
        <p>Se încarcă…</p>
      ) : query.isError ? (
        <p role="alert">
          Lista nu poate fi încărcată.{" "}
          <button className={button} onClick={() => void query.refetch()}>
            Reîncearcă
          </button>
        </p>
      ) : !query.data?.reviews.length ? (
        <p className="rounded-xl border border-dashed border-slate-700 p-8">
          Nu există recenzii în această listă.
        </p>
      ) : (
        query.data.reviews.map((review) => (
          <article
            key={`${review.id}-${review.version}`}
            className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-5"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <strong>
                {review.displayName} · {review.rating}/5 ★
              </strong>
              <span className="text-xs text-slate-400">
                {reviewSources[review.source]} · {review.language.toUpperCase()} ·{" "}
                {new Date(review.createdAt).toLocaleDateString("ro-RO")}
              </span>
            </div>
            <a
              className="text-sm text-cyan-300"
              href={`/produs/${review.productSlug}`}
              target="_blank"
              rel="noreferrer"
            >
              {review.productName} ↗
            </a>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">{review.body}</p>
            {review.sourceUrl && (
              <a
                className="block break-all text-xs text-cyan-300"
                href={review.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Vezi recenzia originală ↗
              </a>
            )}
            {review.email && (
              <p className="text-xs text-slate-400">
                E-mail privat: {review.email} ·{" "}
                {review.origin === "account" ? "Cont autentificat" : "Vizitator"}
              </p>
            )}
            <form
              onSubmit={(e) => void moderate(e, review)}
              className="flex flex-wrap items-end gap-3"
            >
              <label>
                Stare
                <select name="status" defaultValue={review.status} className={field}>
                  <option value="pending">În așteptare / retrage</option>
                  <option value="approved">Aprobată</option>
                  <option value="rejected">Respinsă</option>
                </select>
              </label>
              <label className="flex-1">
                Notă internă
                <input name="note" maxLength={500} defaultValue={review.note} className={field} />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="featured" defaultChecked={!!review.featured} />
                Prioritate în carusel
              </label>
              <button className={button} disabled={busy}>
                Salvează moderarea
              </button>
            </form>
          </article>
        ))
      )}
      <nav className="flex items-center gap-4" aria-label="Paginare recenzii">
        <button
          className={button}
          disabled={!page || query.isFetching}
          onClick={() => setPage(page - 1)}
        >
          Înapoi
        </button>
        <span>Pagina {page + 1}</span>
        <button
          className={button}
          disabled={!query.data?.hasMore || query.isFetching}
          onClick={() => setPage(page + 1)}
        >
          Următoarele
        </button>
      </nav>
    </div>
  );
}
