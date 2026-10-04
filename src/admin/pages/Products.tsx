import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Music2,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminProduct } from "@/lib/admin-contracts";
import {
  createAdminProductDraft,
  getAdminProducts,
  updateAdminProductStatus,
} from "@/lib/admin.functions";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function StatusBadge({ status }: { status: AdminProduct["status"] }) {
  const active = status === "activ";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
        active
          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
          : "border-slate-500/30 bg-slate-500/20 text-slate-300"
      }`}
    >
      {active ? <CheckCircle2 className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {active ? "Publicat" : "Schiță"}
    </span>
  );
}

function ProductCard({
  product,
  onToggleStatus,
  updating,
}: {
  product: AdminProduct;
  onToggleStatus: (product: AdminProduct) => void;
  updating: boolean;
}) {
  const nextStatus = product.status === "activ" ? "inactiv" : "activ";
  return (
    <article className="glass-card flex flex-col rounded-xl p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#334155]/60 bg-[#0F172A]">
          {product.imageUrl ? (
            <img className="h-full w-full object-cover" src={product.imageUrl} alt={product.name} />
          ) : (
            <Music2 className="h-7 w-7 text-purple-300" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block text-sm font-semibold text-white hover:text-purple-300"
          >
            <span className="line-clamp-2">{product.name}</span>
            <ExternalLink className="ml-1 inline h-3 w-3 opacity-60" />
          </a>
          <p className="mt-1 font-mono text-[10px] text-slate-500">{product.sku}</p>
          <p className="mt-1 text-lg font-bold text-white">
            {product.price.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei
          </p>
        </div>
      </div>

      <p className="mb-3 line-clamp-2 min-h-8 text-xs text-slate-400">
        {product.description || "Descrierea scurtă trebuie completată."}
      </p>

      <dl className="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-[#0F172A]/60 p-2 text-xs">
        <div>
          <dt className="text-slate-500">Stoc</dt>
          <dd className="font-medium text-slate-200">
            {product.inventoryTracked ? (product.stock ?? 0) : "Neconfigurat"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Vândute</dt>
          <dd className="font-medium text-slate-200">{product.sales}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Listări active</dt>
          <dd className="font-medium text-slate-200">{product.listingCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Categorie</dt>
          <dd className="truncate font-medium text-slate-200">{product.catalogCategory}</dd>
        </div>
      </dl>

      <div className="mb-3 flex flex-wrap gap-2">
        <StatusBadge status={product.status} />
        {product.storefrontState !== "available" && (
          <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs text-purple-200">
            <Sparkles className="h-3 w-3" />
            {product.storefrontState === "out_of_stock" ? "Stoc epuizat" : "În pregătire"}
          </span>
        )}
        {product.missingFieldsCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            {product.missingFieldsCount} câmpuri lipsă
          </span>
        )}
        {product.rightsStatus !== "cleared" && (
          <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
            <ShieldAlert className="h-3 w-3" /> Drepturi de verificat
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={updating}
        onClick={() => onToggleStatus(product)}
        className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] py-2 text-xs font-medium text-slate-200 transition-colors hover:border-purple-500/40 hover:text-white disabled:cursor-wait disabled:opacity-50"
      >
        {updating ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : nextStatus === "activ" ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
        {nextStatus === "activ" ? "Publică produsul" : "Retrage din publicare"}
      </button>
      <a
        href={`/admin/products/${product.id}`}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-cyan-300 py-2 text-xs font-semibold text-[#07111f] transition hover:bg-cyan-200"
      >
        Deschide mini-dashboardul
      </a>
    </article>
  );
}

function CreateProductDialog({
  saving,
  onClose,
  onCreate,
}: {
  saving: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    slug: string;
    sku: string;
    category: string;
    priceBani: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const inputClass =
    "mt-1.5 w-full rounded-lg border border-[#334155] bg-[#0b1423] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-4">
      <form
        className="w-full max-w-lg rounded-t-2xl border border-[#334155] bg-[#111b2d] p-5 md:rounded-2xl md:p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          await onCreate({
            name,
            slug,
            sku: String(values.get("sku")).toUpperCase(),
            category: String(values.get("category")),
            priceBani: Math.round(Number(values.get("price")) * 100),
          });
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Produs viitor
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Creează spațiul produsului</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Va fi salvat ca schiță și deschis în mini-dashboard pentru imagini, stoc, SEO și
              canale.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#223048]"
            aria-label="Închide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-400 sm:col-span-2">
            Nume produs
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              required
              minLength={3}
              maxLength={180}
              className={inputClass}
            />
          </label>
          <label className="text-xs text-slate-400">
            Slug
            <input
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
              required
              minLength={3}
              maxLength={100}
              className={inputClass}
            />
          </label>
          <label className="text-xs text-slate-400">
            SKU
            <input
              name="sku"
              required
              minLength={3}
              maxLength={80}
              placeholder="CM-NOU-01"
              pattern="[A-Za-z0-9_-]+"
              className={inputClass}
            />
          </label>
          <label className="text-xs text-slate-400">
            Categorie
            <input
              name="category"
              required
              minLength={2}
              maxLength={100}
              defaultValue="Cadouri speciale"
              className={inputClass}
            />
          </label>
          <label className="text-xs text-slate-400">
            Preț de lucru (lei)
            <input
              name="price"
              type="number"
              min="1"
              max="100000"
              step="0.01"
              defaultValue="129"
              required
              className={inputClass}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#334155] px-4 py-2.5 text-sm text-slate-300"
          >
            Renunță
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07111f] disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}{" "}
            Creează și continuă
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Products() {
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(getAdminProducts);
  const createProduct = useServerFn(createAdminProductDraft);
  const changeProductStatus = useServerFn(updateAdminProductStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("toate");
  const [showCreate, setShowCreate] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchProducts(),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: (product: AdminProduct) =>
      changeProductStatus({
        data: {
          productId: product.id,
          status: product.status === "activ" ? "inactiv" : "activ",
          expectedVersion: product.version,
        },
      }),
    onSuccess: ({ product }) => {
      queryClient.setQueryData<{ products: AdminProduct[] }>(["admin", "products"], (current) => ({
        products: (current?.products ?? []).map((entry) =>
          entry.id === product.id ? product : entry,
        ),
      }));
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success(product.status === "activ" ? "Produs activat" : "Produs dezactivat");
    },
    onError: (error) => {
      toast.error("Statusul nu a putut fi actualizat", {
        description:
          error instanceof Error ? error.message : "Reîncarcă pagina și încearcă din nou.",
      });
      productsQuery.refetch();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      sku: string;
      category: string;
      priceBani: number;
    }) => createProduct({ data }),
    onSuccess: ({ id }) => {
      toast.success("Schița produsului a fost creată");
      window.location.assign(`/admin/products/${id}`);
    },
    onError: (error) =>
      toast.error("Produsul nu a putut fi creat", {
        description:
          error instanceof Error
            ? error.message
            : "Verifică dacă slugul și SKU-ul sunt deja folosite.",
      }),
  });

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products],
  );
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.catalogCategory))).sort(),
    [products],
  );
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ro-RO");
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      [product.name, product.description, product.sku, product.catalogCategory].some((value) =>
        value.toLocaleLowerCase("ro-RO").includes(normalizedSearch),
      );
    const matchesCategory =
      selectedCategory === "toate" || product.catalogCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    available: products.filter(
      (product) => product.status === "activ" && product.storefrontState === "available",
    ).length,
    future: products.filter(
      (product) => product.status !== "activ" || product.storefrontState !== "available",
    ).length,
    incomplete: products.filter((product) => product.missingFieldsCount > 0).length,
  };
  const activeProducts = filteredProducts.filter(
    (product) => product.status === "activ" && product.storefrontState === "available",
  );
  const futureProducts = filteredProducts.filter(
    (product) => product.status !== "activ" || product.storefrontState !== "available",
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">Catalog cutiuțe muzicale</h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">
            Sursa operațională D1, limitată intenționat la cutiuțe muzicale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2.5 text-xs font-semibold text-[#07111f] shadow-lg shadow-cyan-950/30 hover:bg-cyan-200"
          >
            <Plus className="h-4 w-4" /> Adaugă produs
          </button>
          <button
            type="button"
            onClick={() => productsQuery.refetch()}
            disabled={productsQuery.isFetching}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${productsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Sincronizează
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: ShoppingBag, color: "text-purple-400" },
          {
            label: "Disponibile",
            value: stats.available,
            icon: Eye,
            color: "text-emerald-400",
          },
          {
            label: "Viitoare",
            value: stats.future,
            icon: Sparkles,
            color: "text-cyan-400",
          },
          {
            label: "Date incomplete",
            value: stats.incomplete,
            icon: AlertTriangle,
            color: "text-amber-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card rounded-xl p-3 md:p-4">
              <div className="mb-1 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-white md:text-2xl">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-xl p-3 md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Caută în catalog</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Caută după nume, SKU sau categorie..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-slate-200"
          >
            <option value="toate">Toate categoriile</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {productsQuery.isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Catalogul D1 nu a putut fi încărcat. Verifică autentificarea și bindingul bazei de date.
        </div>
      )}

      {productsQuery.isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400">Se încarcă catalogul...</div>
      ) : (
        <div className="space-y-7">
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Produse disponibile</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Catalog activ și pregătit pentru vânzare.
                </p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                {activeProducts.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activeProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onToggleStatus={(entry) => statusMutation.mutate(entry)}
                  updating={statusMutation.isPending && statusMutation.variables?.id === product.id}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-purple-400/25 bg-purple-400/[0.035] p-4 md:p-5">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Produse viitoare</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Schițe editabile, nevizibile în magazin până la activare.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200"
              >
                <Plus className="h-3.5 w-3.5" /> Produs nou
              </button>
            </div>
            {futureProducts.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {futureProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onToggleStatus={(entry) => statusMutation.mutate(entry)}
                    updating={
                      statusMutation.isPending && statusMutation.variables?.id === product.id
                    }
                  />
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#334155] py-8 text-sm text-slate-400 hover:border-purple-400/40 hover:text-white"
              >
                <Plus className="h-4 w-4" /> Creează primul produs viitor
              </button>
            )}
          </section>
        </div>
      )}

      {!productsQuery.isLoading && filteredProducts.length === 0 && (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-sm text-slate-400">
            Nu există cutiuțe muzicale pentru filtrul selectat.
          </p>
        </div>
      )}
      {showCreate && (
        <CreateProductDialog
          saving={createMutation.isPending}
          onClose={() => setShowCreate(false)}
          onCreate={(data) => createMutation.mutateAsync(data).then(() => undefined)}
        />
      )}
    </div>
  );
}
