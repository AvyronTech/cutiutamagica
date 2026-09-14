import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Filter,
  MapPin,
  Package,
  Phone,
  QrCode,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Truck,
  X,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_ORDER_STATUSES,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/lib/admin-contracts";
import { getAdminOrders, updateAdminOrderStatus } from "@/lib/admin.functions";
import { canTransitionOrderStatus } from "@/lib/order-status";

const PLATFORM_COLORS: Record<string, string> = {
  "Cutiuța Magică": "platform-cutiuta",
  eMAG: "platform-emag",
  OLX: "platform-olx",
  Instagram: "platform-instagram",
  TikTok: "platform-tiktok",
  Facebook: "platform-facebook",
};

function StatusIcon({ status }: { status: AdminOrderStatus }) {
  switch (status) {
    case "Nouă":
      return <AlertCircle className="h-3.5 w-3.5 text-blue-400" />;
    case "Procesare":
      return <Clock className="h-3.5 w-3.5 text-amber-400" />;
    case "Expediată":
      return <Truck className="h-3.5 w-3.5 text-purple-400" />;
    case "Livrată":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case "Returnată":
      return <RotateCcw className="h-3.5 w-3.5 text-red-400" />;
    case "Anulată":
      return <XCircle className="h-3.5 w-3.5 text-slate-400" />;
  }
}

function StatusBadge({ status }: { status: AdminOrderStatus }) {
  const colors: Record<AdminOrderStatus, string> = {
    Nouă: "border-blue-500/30 bg-blue-500/20 text-blue-300",
    Procesare: "border-amber-500/30 bg-amber-500/20 text-amber-300",
    Expediată: "border-purple-500/30 bg-purple-500/20 text-purple-300",
    Livrată: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
    Returnată: "border-red-500/30 bg-red-500/20 text-red-300",
    Anulată: "border-slate-500/30 bg-slate-500/20 text-slate-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${colors[status]}`}
    >
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-medium ${PLATFORM_COLORS[platform] ?? "bg-slate-700 text-slate-200"}`}
    >
      {platform}
    </span>
  );
}

function OrderDetailPanel({
  order,
  onClose,
  onUpdateStatus,
}: {
  order: AdminOrder;
  onClose: () => void;
  onUpdateStatus: (status: AdminOrderStatus) => Promise<void>;
}) {
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    if (currentStatus === order.status) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateStatus(currentStatus);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const copyAwb = async () => {
    if (!order.awb) return;
    await navigator.clipboard.writeText(order.awb);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-[#334155] bg-[#1E293B] p-5 md:rounded-xl md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
              <Package className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{order.orderNumber}</h2>
              <div className="flex items-center gap-2">
                <PlatformBadge platform={order.platform} />
                <span className="text-[10px] text-slate-500">{order.date}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#334155]"
            aria-label="Închide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mb-4 rounded-xl border border-[#334155]/50 bg-[#0F172A] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Client
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-white">{order.customer}</span>
            {order.phone && (
              <a
                href={`tel:${order.phone}`}
                className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300"
              >
                <Phone className="h-3 w-3" /> Sună
              </a>
            )}
          </div>
          {(order.address || order.city) && (
            <p className="mt-2 flex items-start gap-2 text-xs text-slate-400">
              <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
              {[order.address, order.city, order.county].filter(Boolean).join(", ")}
            </p>
          )}
          {order.email && <p className="mt-1 text-xs text-slate-500">{order.email}</p>}
        </section>

        <section className="mb-4 rounded-xl border border-[#334155]/50 bg-[#0F172A] p-3 text-sm">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Comandă
          </p>
          <p className="mb-2 text-slate-200">{order.products}</p>
          <div className="flex items-center justify-between border-t border-[#334155]/50 pt-2">
            <span className="text-xs text-slate-400">Total</span>
            <strong className="text-lg text-white">
              {order.total.toLocaleString("ro-RO")} {order.currency}
            </strong>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Livrare</span>
            <span className="text-xs text-slate-200">{order.deliveryMethod}</span>
          </div>
          {order.awb && (
            <button
              type="button"
              onClick={copyAwb}
              className="mt-2 flex w-full items-center justify-end gap-1.5 text-xs font-mono text-purple-300"
            >
              {order.awb} <Copy className="h-3 w-3" /> {copied && "Copiat"}
            </button>
          )}
        </section>

        <section className="mb-4 rounded-xl border border-[#334155]/50 bg-[#0F172A] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Actualizează statusul
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ADMIN_ORDER_STATUSES.map((status) => {
              const allowed = canTransitionOrderStatus(order.status, status);
              return (
                <button
                  key={status}
                  type="button"
                  disabled={!allowed || isSaving}
                  onClick={() => setCurrentStatus(status)}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    currentStatus === status
                      ? "border-purple-500/50 bg-purple-600/30 text-purple-200"
                      : "border-[#334155] bg-[#1E293B] text-slate-400"
                  }`}
                >
                  <StatusIcon status={status} /> {status}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvează
          </button>
          <a
            href={`/qr-generator?order=${encodeURIComponent(order.orderNumber)}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#334155] px-4 py-2.5 text-sm font-medium text-white"
          >
            <QrCode className="h-4 w-4" /> QR
          </a>
        </div>
      </div>
    </div>
  );
}

function exportOrdersCsv(orders: AdminOrder[]): void {
  const columns = [
    "Număr",
    "Canal",
    "Client",
    "Produse",
    "Total",
    "Monedă",
    "Status",
    "Data",
    "AWB",
  ];
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = orders.map((order) => [
    order.orderNumber,
    order.platform,
    order.customer,
    order.products,
    order.total,
    order.currency,
    order.status,
    order.date,
    order.awb ?? "",
  ]);
  const csv = [columns, ...rows].map((row) => row.map(quote).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `comenzi-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Orders() {
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(getAdminOrders);
  const changeOrderStatus = useServerFn(updateAdminOrderStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("Toate");
  const [selectedStatus, setSelectedStatus] = useState("Toate");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => fetchOrders(),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ order, status }: { order: AdminOrder; status: AdminOrderStatus }) =>
      changeOrderStatus({
        data: {
          orderId: order.id,
          status,
          expectedVersion: order.version,
        },
      }),
    onSuccess: ({ order }) => {
      queryClient.setQueryData<{ orders: AdminOrder[] }>(["admin", "orders"], (current) => ({
        orders: (current?.orders ?? []).map((entry) => (entry.id === order.id ? order : entry)),
      }));
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success("Statusul comenzii a fost actualizat");
    },
    onError: (error) => {
      toast.error("Statusul nu a putut fi actualizat", {
        description:
          error instanceof Error ? error.message : "Reîncarcă datele și încearcă din nou.",
      });
      ordersQuery.refetch();
    },
  });

  const orders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data?.orders]);
  const platforms = useMemo(
    () => Array.from(new Set(orders.map((order) => order.platform))).sort(),
    [orders],
  );
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ro-RO");
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !normalizedSearch ||
      [order.customer, order.orderNumber, order.products].some((value) =>
        value.toLocaleLowerCase("ro-RO").includes(normalizedSearch),
      );
    const matchesPlatform = selectedPlatform === "Toate" || order.platform === selectedPlatform;
    const matchesStatus = selectedStatus === "Toate" || order.status === selectedStatus;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">Comenzi</h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">
            {filteredOrders.length} comenzi din sursa centrală D1
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
            className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2.5 text-xs font-medium text-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />{" "}
            Actualizează
          </button>
          <button
            type="button"
            onClick={() => exportOrdersCsv(filteredOrders)}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2.5 text-xs font-medium text-slate-200 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Caută o comandă</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Caută client, număr sau produs..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="rounded-lg border border-[#334155] bg-[#0F172A] p-2.5 text-slate-400 md:hidden"
              aria-label="Arată filtrele"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
          <div className={`flex-col gap-2 md:flex md:flex-row ${showFilters ? "flex" : "hidden"}`}>
            <select
              value={selectedPlatform}
              onChange={(event) => setSelectedPlatform(event.target.value)}
              className="rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-slate-200"
            >
              <option value="Toate">Toate canalele</option>
              {platforms.map((platform) => (
                <option key={platform}>{platform}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-slate-200"
            >
              <option value="Toate">Toate statusurile</option>
              {ADMIN_ORDER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {ordersQuery.isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Comenzile D1 nu au putut fi încărcate. Verifică autentificarea și configurarea Workerului.
        </div>
      )}

      {ordersQuery.isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400">Se încarcă comenzile...</div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {filteredOrders.map((order) => (
            <button
              type="button"
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="glass-card group w-full rounded-xl p-3 text-left transition-colors hover:border-purple-500/30 md:p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{order.customer}</p>
                    <PlatformBadge platform={order.platform} />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-slate-500 md:text-xs">
                    <span className="font-mono">{order.orderNumber}</span> · {order.products}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold text-white">
                      {order.total.toLocaleString("ro-RO")} {order.currency}
                    </p>
                    <p className="text-[10px] text-slate-500">{order.date}</p>
                  </div>
                  <StatusBadge status={order.status} />
                  <Eye className="hidden h-4 w-4 text-slate-600 group-hover:text-purple-400 md:block" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!ordersQuery.isLoading && filteredOrders.length === 0 && (
        <div className="py-16 text-center">
          <Package className="mx-auto mb-3 h-14 w-14 text-slate-700" />
          <p className="text-sm text-slate-400">Nu există comenzi pentru filtrul selectat.</p>
          <p className="mt-1 text-xs text-slate-500">Nu sunt afișate date demonstrative.</p>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (status) => {
            await statusMutation.mutateAsync({ order: selectedOrder, status });
          }}
        />
      )}
    </div>
  );
}
