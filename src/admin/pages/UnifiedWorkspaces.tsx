import { lazy, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Barcode, Boxes, ClipboardList, MessageCircle, QrCode, Send, Users } from "lucide-react";
import { getAdminInventoryProducts } from "@/lib/admin.functions";
import { workspaceHref, type WorkspaceSearch } from "@/lib/admin-workspaces";
import { Workspace } from "@/admin/Workspace";
import { useWorkspaceActive } from "@/admin/workspace-activity";

const Identification = lazy(() => import("./ProductIdentification"));
const OrdersQR = lazy(() => import("./QRGenerator"));
const Social = lazy(() => import("./SocialNetworks"));
const Marketing = lazy(() => import("./MarketingCenter"));
const Inventory = lazy(() => import("./Inventory"));
const GrowthSettings = lazy(() => import("./GrowthSettings"));
const SupplierResearch = lazy(() => import("./SupplierResearch"));

type Props<K extends "identification" | "social" | "inventory"> = {
  search: WorkspaceSearch<K>;
  onChange: (search: WorkspaceSearch<K>) => void;
};

export function IdentificationWorkspace({ search, onChange }: Props<"identification">) {
  const active = search.tab ?? "products";
  return (
    <Workspace
      title="Identificare, etichetare și coduri QR"
      description="Coduri permanente, SKU-uri, etichete și trasabilitate într-un singur registru."
      active={active}
      onSelect={(tab) => onChange({ ...search, tab: tab as typeof active })}
      tabs={[
        {
          id: "products",
          label: "Registru și etichete",
          description: "Cod intern · SKU · referință externă",
          icon: Barcode,
          content: (
            <Identification
              embedded
              selectedProductId={search.product ?? null}
              onProductChange={(product) => onChange({ ...search, product })}
            />
          ),
        },
        {
          id: "orders",
          label: "QR comenzi",
          description: "Identificare internă · export · imprimare",
          icon: QrCode,
          content: (
            <OrdersQR
              embedded
              requestedOrder={search.order}
              onOrderChange={(order) => onChange({ ...search, order })}
            />
          ),
        },
      ]}
    />
  );
}

export function SocialWorkspace({ search, onChange }: Props<"social">) {
  const active = search.tab ?? "accounts";
  return (
    <Workspace
      title="Rețele sociale și postări"
      description="Aceleași conturi oficiale, de la rezultate și planificare la ciorne, aprobare și urmărirea publicării."
      active={active}
      onSelect={(tab) => onChange({ ...search, tab: tab as typeof active })}
      tabs={[
        {
          id: "accounts",
          label: "Conturi și rezultate",
          description: "Identitate · Metricool · calendar",
          icon: Users,
          content: <Social embedded />,
        },
        {
          id: "posts",
          label: "Postări și aprobări",
          description: "Ciornă → verificare → publicare",
          icon: Send,
          content: <Marketing section="content" embedded accountId={search.account} />,
        },
        {
          id: "relationships",
          label: "Relații și propuneri",
          description: "Analiză și decizii pentru conturi",
          icon: MessageCircle,
          content: <Marketing section="social" embedded />,
        },
      ]}
    />
  );
}

function SupplyPanel({ search, onChange }: Props<"inventory">) {
  const active = useWorkspaceActive();
  const [showConnection, setShowConnection] = useState(!search.product);
  const connection = useRef<HTMLDetailsElement>(null);
  const load = useServerFn(getAdminInventoryProducts);
  const query = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => load(),
    staleTime: 20_000,
    enabled: active,
  });
  const products = query.data?.products ?? [];
  const selected = products.find((product) => product.id === search.product);
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-950/30 p-4 md:p-5">
        <h2 className="text-lg font-semibold text-white">Aprovizionare pentru produs</h2>
        <p className="mt-1 text-sm text-slate-400">
          Alegi produsul, compari sursele, apoi înregistrezi recepția și lotul în identificare.
        </p>
        <label className="mt-4 block text-sm text-slate-200">
          Produs din catalog
          <select
            value={selected?.id ?? ""}
            onChange={(event) => onChange({ ...search, product: event.target.value || undefined })}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm text-white"
          >
            <option value="">Selectează produsul</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {product.sku}
              </option>
            ))}
          </select>
        </label>
        {query.isError && (
          <p role="alert" className="mt-3 text-sm text-rose-200">
            Catalogul nu poate fi încărcat.{" "}
            <button type="button" onClick={() => query.refetch()} className="underline">
              Reîncearcă
            </button>
          </p>
        )}
        {selected && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              className="rounded-lg border border-amber-200/30 px-3 py-2 text-amber-100"
              href={workspaceHref("identification", { product: selected.id })}
            >
              Înregistrează recepția și etichetele →
            </a>
            <button
              type="button"
              onClick={() => onChange({ ...search, tab: "stock" })}
              className="rounded-lg border border-slate-600 px-3 py-2 text-slate-200"
            >
              Vezi stocul produsului
            </button>
          </div>
        )}
      </section>
      {selected && (
        <SupplierResearch
          key={selected.id}
          productId={selected.id}
          onConfigure={() => {
            setShowConnection(true);
            connection.current?.scrollIntoView({ block: "nearest" });
          }}
        />
      )}
      <details
        ref={connection}
        className="rounded-xl border border-slate-700 p-4"
        open={showConnection}
        onToggle={(event) => setShowConnection(event.currentTarget.open)}
      >
        <summary className="cursor-pointer font-semibold text-white">
          Conexiune și buget pentru căutarea furnizorilor
        </summary>
        <div className="mt-4">
          <GrowthSettings section="supplier_research" embedded />
        </div>
      </details>
    </div>
  );
}

export function InventoryWorkspace({ search, onChange }: Props<"inventory">) {
  const active = search.tab ?? "stock";
  return (
    <Workspace
      title="Stocuri și aprovizionare"
      description="Urmărești disponibilitatea, cauți furnizori și continui cu recepția, loturile și etichetele aceluiași produs."
      active={active}
      onSelect={(tab) => onChange({ ...search, tab: tab as typeof active })}
      tabs={[
        {
          id: "stock",
          label: "Stocuri și depozite",
          description: "Disponibilitate · ajustări interne",
          icon: Boxes,
          content: (
            <Inventory
              embedded
              selectedProductId={search.product ?? null}
              onProductChange={(product) => onChange({ ...search, product: product ?? undefined })}
              onSupply={(product) => onChange({ ...search, product, tab: "supply" })}
            />
          ),
        },
        {
          id: "supply",
          label: "Furnizori și aprovizionare",
          description: "Produs → surse → recepție",
          icon: ClipboardList,
          content: <SupplyPanel search={search} onChange={onChange} />,
        },
      ]}
    />
  );
}
