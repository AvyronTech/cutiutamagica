import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Boxes,
  CircleAlert,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Warehouse,
  X,
} from "lucide-react";
import { getAdminInventoryProducts } from "@/lib/admin.functions";
import type { AdminProduct } from "@/lib/admin-contracts";
import { ProductInventory } from "./ProductInventory";

function stockTone(product: AdminProduct): string {
  if (!product.inventoryTracked) return "border-slate-600/60 bg-slate-800/50 text-slate-300";
  if ((product.stock ?? 0) === 0) return "border-red-500/30 bg-red-500/10 text-red-300";
  if ((product.stock ?? 0) <= 3) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default function Inventory() {
  const fetchProducts = useServerFn(getAdminInventoryProducts);
  const productsQuery = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchProducts(),
    staleTime: 20_000,
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("ro-RO");
  const filtered = products.filter(
    (product) =>
      !normalizedSearch ||
      [product.name, product.sku, product.catalogCategory].some((value) =>
        value.toLocaleLowerCase("ro-RO").includes(normalizedSearch),
      ),
  );
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const tracked = products.filter((product) => product.inventoryTracked);
  const stats = {
    available: tracked.reduce((total, product) => total + (product.stock ?? 0), 0),
    tracked: tracked.length,
    low: tracked.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 3).length,
    empty: tracked.filter((product) => (product.stock ?? 0) === 0).length,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">
            Exclusiv intern
          </p>
          <h1 className="mt-1 text-xl font-bold text-white md:text-2xl">Stocuri și depozite</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-400 md:text-sm">
            Cantitățile exacte sunt vizibile numai administratorilor. Magazinul public primește doar
            starea de disponibilitate a produsului.
          </p>
        </div>
        <button
          type="button"
          onClick={() => productsQuery.refetch()}
          disabled={productsQuery.isFetching}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${productsQuery.isFetching ? "animate-spin" : ""}`} />
          Reîncarcă
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Disponibile", value: stats.available, icon: Boxes, color: "text-cyan-300" },
          {
            label: "Produse urmărite",
            value: stats.tracked,
            icon: ShieldCheck,
            color: "text-emerald-300",
          },
          { label: "Stoc redus", value: stats.low, icon: CircleAlert, color: "text-amber-300" },
          { label: "Stoc epuizat", value: stats.empty, icon: Warehouse, color: "text-red-300" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-card rounded-xl p-3 md:p-4">
              <Icon className={`mb-2 h-4 w-4 ${item.color}`} />
              <p className="text-xl font-bold tabular-nums text-white md:text-2xl">{item.value}</p>
              <p className="mt-1 text-xs text-slate-400">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-xl p-3 md:p-4">
        <label className="relative block">
          <span className="sr-only">Caută produsul pentru stoc</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Caută după nume, SKU sau categorie..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
        </label>
      </div>

      {productsQuery.isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Stocurile nu au putut fi încărcate. Verifică sesiunea și încearcă din nou.
        </div>
      )}

      {productsQuery.isLoading ? (
        <div className="py-14 text-center text-sm text-slate-400">Se încarcă stocurile…</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/25">
          <div className="hidden grid-cols-[minmax(0,1fr)_130px_120px] gap-4 border-b border-slate-800 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
            <span>Produs</span>
            <span>Stoc intern</span>
            <span className="text-right">Acțiune</span>
          </div>
          {filtered.map((product) => (
            <article
              key={product.id}
              className="grid gap-3 border-b border-slate-800 p-4 last:border-0 md:grid-cols-[minmax(0,1fr)_130px_120px] md:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <PackageCheck className="h-5 w-5 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-100">{product.name}</h2>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-500">
                    {product.sku}
                  </p>
                </div>
              </div>
              <div>
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums ${stockTone(product)}`}
                >
                  {product.inventoryTracked ? `${product.stock ?? 0} disponibile` : "Neconfigurat"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(product.id)}
                className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 md:justify-self-end"
              >
                Setează stocul
              </button>
            </article>
          ))}
          {!filtered.length && (
            <p className="p-8 text-center text-sm text-slate-500">
              Nu există produse pentru filtrul ales.
            </p>
          )}
        </div>
      )}

      {selected && (
        <section className="glass-card rounded-xl border border-cyan-400/20 p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
                Ajustare internă
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">{selected.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
              aria-label="Închide editorul de stoc"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ProductInventory
            productId={selected.id}
            onChanged={async () => {
              await productsQuery.refetch();
            }}
          />
        </section>
      )}
    </div>
  );
}
