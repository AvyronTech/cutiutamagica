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
} from "lucide-react";
import { toast } from "sonner";
import type { AdminProduct } from "@/lib/admin-contracts";
import { getAdminProducts, updateAdminProductStatus } from "@/lib/admin.functions";

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
      {active ? "Activ" : "Inactiv"}
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
        {nextStatus === "activ" ? "Activează produsul" : "Dezactivează produsul"}
      </button>
      <a
        href={`/admin/products/${product.id}`}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-cyan-300 py-2 text-xs font-semibold text-[#07111f] transition hover:bg-cyan-200"
      >
        Administrează media și SEO
      </a>
    </article>
  );
}

export default function Products() {
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(getAdminProducts);
  const changeProductStatus = useServerFn(updateAdminProductStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("toate");

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
    active: products.filter((product) => product.status === "activ").length,
    incomplete: products.filter((product) => product.missingFieldsCount > 0).length,
    inventoryPending: products.filter((product) => !product.inventoryTracked).length,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">Catalog cutiuțe muzicale</h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">
            Sursa operațională D1, limitată intenționat la cutiuțe muzicale.
          </p>
        </div>
        <button
          type="button"
          onClick={() => productsQuery.refetch()}
          disabled={productsQuery.isFetching}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${productsQuery.isFetching ? "animate-spin" : ""}`} />
          Sincronizează
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: ShoppingBag, color: "text-purple-400" },
          { label: "Active", value: stats.active, icon: Eye, color: "text-emerald-400" },
          {
            label: "Date incomplete",
            value: stats.incomplete,
            icon: AlertTriangle,
            color: "text-amber-400",
          },
          {
            label: "Stoc de configurat",
            value: stats.inventoryPending,
            icon: Package,
            color: "text-cyan-400",
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onToggleStatus={(entry) => statusMutation.mutate(entry)}
              updating={statusMutation.isPending && statusMutation.variables?.id === product.id}
            />
          ))}
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
    </div>
  );
}
