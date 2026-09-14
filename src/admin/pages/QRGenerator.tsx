import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Download, MapPin, Package, Phone, Printer, QrCode, User } from "lucide-react";
import { getAdminOrders } from "@/lib/admin.functions";

export default function QRGenerator() {
  const fetchOrders = useServerFn(getAdminOrders);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => fetchOrders(),
    staleTime: 30_000,
  });
  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [qrContent, setQrContent] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedOrderId || orders.length === 0) return;
    const requestedOrder = new URLSearchParams(window.location.search).get("order");
    const requested = orders.find((order) => order.orderNumber === requestedOrder);
    setSelectedOrderId(requested?.id ?? orders[0].id);
  }, [orders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId],
  );

  useEffect(() => setQrContent(""), [selectedOrderId]);

  const generate = () => {
    if (!selectedOrder) return;
    setQrContent(
      JSON.stringify({
        schema: "cutiutamagica.fulfillment.v1",
        orderNumber: selectedOrder.orderNumber,
        publicToken: selectedOrder.publicToken,
        channel: selectedOrder.channelCode,
        fulfillmentStatus: selectedOrder.fulfillmentStatus,
        version: selectedOrder.version,
      }),
    );
  };

  const copy = async () => {
    if (!qrContent) return;
    await navigator.clipboard.writeText(qrContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const svg = document.querySelector<SVGElement>("#fulfillment-qr svg");
    if (!svg) return;
    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const imageUrl = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 800;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a");
      link.download = `QR-${selectedOrder?.orderNumber ?? "comanda"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(imageUrl);
    };
    image.src = imageUrl;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Generator QR operațional</h1>
        <p className="mt-1 text-xs text-slate-400 md:text-sm">
          Cod intern pentru identificarea comenzii, fără nume, telefon sau adresă în conținutul QR.
        </p>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Comenzile nu au putut fi încărcate din D1.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="glass-card rounded-xl p-4 md:p-5">
            <label className="mb-2 block text-sm font-semibold text-white" htmlFor="qr-order">
              Comandă
            </label>
            <select
              id="qr-order"
              value={selectedOrderId}
              onChange={(event) => setSelectedOrderId(event.target.value)}
              disabled={isLoading || orders.length === 0}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-slate-200 disabled:opacity-50"
            >
              {orders.length === 0 && <option value="">Nicio comandă disponibilă</option>}
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} - {order.customer} ({order.platform})
                </option>
              ))}
            </select>
          </section>

          {selectedOrder && (
            <section className="glass-card rounded-xl p-4 md:p-5">
              <h2 className="mb-3 text-sm font-semibold text-white">Detalii verificate</h2>
              <div className="space-y-2.5">
                <p className="flex items-center gap-3 text-sm text-slate-300">
                  <User className="h-4 w-4 text-slate-500" /> {selectedOrder.customer}
                </p>
                {selectedOrder.phone && (
                  <p className="flex items-center gap-3 text-sm text-slate-300">
                    <Phone className="h-4 w-4 text-slate-500" /> {selectedOrder.phone}
                  </p>
                )}
                {(selectedOrder.address || selectedOrder.city) && (
                  <p className="flex items-center gap-3 text-sm text-slate-300">
                    <MapPin className="h-4 w-4 text-slate-500" />{" "}
                    {[selectedOrder.address, selectedOrder.city].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="flex items-start gap-3 text-sm text-slate-300">
                  <Package className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />{" "}
                  {selectedOrder.products}
                </p>
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={!selectedOrder}
            className="w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generează codul QR
          </button>
        </div>

        <section className="glass-card flex min-h-[390px] flex-col items-center justify-center rounded-xl p-5">
          {qrContent ? (
            <div className="space-y-4 text-center">
              <div id="fulfillment-qr" className="inline-block rounded-xl bg-white p-5">
                <QRCodeSVG value={qrContent} size={220} level="H" includeMargin />
              </div>
              <div>
                <p className="font-semibold text-white">{selectedOrder?.orderNumber}</p>
                <p className="text-sm text-slate-400">{selectedOrder?.deliveryMethod}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={download}
                  className="flex items-center gap-2 rounded-lg bg-[#334155] px-3 py-2 text-xs text-white"
                >
                  <Download className="h-4 w-4" /> Descarcă
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg bg-[#334155] px-3 py-2 text-xs text-white"
                >
                  <Printer className="h-4 w-4" /> Printează
                </button>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-2 rounded-lg bg-[#334155] px-3 py-2 text-xs text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copiat" : "Copiază"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <QrCode className="mx-auto mb-4 h-16 w-16 text-slate-600" />
              <p className="max-w-xs text-sm text-slate-400">
                Selectează o comandă reală și generează identificatorul pentru fluxul intern de
                procesare.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
