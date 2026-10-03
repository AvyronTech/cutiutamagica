import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EasyboxLocker } from "@/lib/easybox";

function lockerAddress(locker: EasyboxLocker): string {
  return [locker.address, locker.city, locker.county].filter(Boolean).join(", ");
}

export function EasyboxPicker({
  selected,
  searchHint,
  onSelect,
}: {
  selected: EasyboxLocker | null;
  searchHint: string;
  onSelect: (locker: EasyboxLocker) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(searchHint);
  const [lockers, setLockers] = useState<EasyboxLocker[]>([]);
  const [draft, setDraft] = useState<EasyboxLocker | null>(selected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mapNode = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<LayerGroup | null>(null);

  const normalizedHint = useMemo(() => searchHint.trim().replace(/\s+/g, " "), [searchHint]);

  useEffect(() => {
    if (!open) return;
    setDraft(selected);
    if (!search.trim() && normalizedHint) setSearch(normalizedHint);
  }, [normalizedHint, open, search, selected]);

  useEffect(() => {
    if (!open) return;
    const query = search.trim();
    if (query.length < 2) {
      setLockers([]);
      setError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch(`/api/v1/shipping/easyboxes?q=${encodeURIComponent(query)}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          data?: EasyboxLocker[];
          error?: { message?: string };
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.error?.message || "Nu am găsit punctele Easybox.");
        setLockers(payload.data);
        if (!payload.data.length)
          setError(
            "Nu am găsit un easybox pentru această căutare. Încearcă localitatea sau strada.",
          );
      } catch (reason) {
        if ((reason as Error).name !== "AbortError")
          setError(reason instanceof Error ? reason.message : "Harta nu poate fi încărcată.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, search]);

  useEffect(() => {
    if (!open || !mapNode.current) return;
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled || !mapNode.current) return;
      if (!map.current) {
        map.current = leaflet.map(mapNode.current, {
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true,
        });
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          })
          .addTo(map.current);
        markers.current = leaflet.layerGroup().addTo(map.current);
        map.current.setView([45.9432, 24.9668], 6);
      }
      markers.current?.clearLayers();
      const bounds: Array<[number, number]> = [];
      for (const locker of lockers) {
        const active = draft?.id === locker.id;
        const marker = leaflet
          .circleMarker([locker.latitude, locker.longitude], {
            radius: active ? 10 : 7,
            color: active ? "#fff7cc" : "#7a4b20",
            weight: active ? 4 : 2,
            fillColor: active ? "#b98a38" : "#efc85a",
            fillOpacity: 0.95,
          })
          .bindTooltip(locker.name, { direction: "top" })
          .on("click", () => setDraft(locker));
        markers.current?.addLayer(marker);
        bounds.push([locker.latitude, locker.longitude]);
      }
      if (bounds.length) map.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
      window.setTimeout(() => map.current?.invalidateSize(), 80);
    });
    return () => {
      cancelled = true;
    };
  }, [draft?.id, lockers, open]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
      markers.current = null;
    },
    [],
  );

  useEffect(() => {
    if (open) return;
    map.current?.remove();
    map.current = null;
    markers.current = null;
  }, [open]);

  return (
    <div className="sm:col-span-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-amber-700/25 bg-gradient-to-r from-amber-50/90 to-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-600/45 hover:shadow-md dark:from-amber-950/25"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efc85a] text-[#4f2b12] shadow-inner">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">
                {selected ? selected.name : "Alege Easybox pe hartă"}
              </strong>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {selected
                  ? lockerAddress(selected)
                  : "Caută după localitate, stradă sau numele punctului"}
              </span>
            </span>
            <span className="rounded-full border border-amber-700/20 px-3 py-1 text-xs font-medium text-amber-900 dark:text-amber-100">
              {selected ? "Schimbă" : "Deschide"}
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-6xl overflow-hidden border-amber-900/15 bg-[#fffaf0] p-0 dark:bg-[#17120d] sm:rounded-3xl">
          <DialogHeader className="border-b border-amber-900/10 px-5 pb-4 pt-5 pr-12 sm:px-7 sm:pt-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> SAMEDAY easybox
            </div>
            <DialogTitle className="font-display text-2xl sm:text-3xl">
              Unde vrei să ajungă povestea?
            </DialogTitle>
            <DialogDescription>
              Alege punctul direct pe hartă sau din lista sincronizată cu rețeaua Easybox.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(300px,.78fr)_1.35fr]">
            <div className="flex min-h-0 flex-col border-b border-amber-900/10 md:border-b-0 md:border-r">
              <div className="p-4 sm:p-5">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <span className="sr-only">Caută Easybox</span>
                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ex. Cluj-Napoca, Mărăști"
                    className="h-12 w-full rounded-xl border border-amber-900/15 bg-white/80 pl-10 pr-10 text-base outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 dark:bg-black/20"
                  />
                  {busy && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-amber-700" />
                  )}
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  {lockers.length
                    ? `${lockers.length} puncte apropiate găsite`
                    : "Date oficiale de localizare, încărcate la cerere."}
                </p>
              </div>
              <div className="max-h-[29dvh] flex-1 space-y-2 overflow-y-auto px-3 pb-4 sm:px-5 md:max-h-[52dvh]">
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-amber-100/80 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    {error}
                  </p>
                )}
                {lockers.map((locker) => (
                  <button
                    key={locker.id}
                    type="button"
                    onClick={() => setDraft(locker)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${draft?.id === locker.id ? "border-amber-600 bg-amber-100/80 shadow-sm dark:bg-amber-900/25" : "border-amber-900/10 bg-white/60 hover:border-amber-600/45 dark:bg-white/5"}`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm">{locker.name}</strong>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {lockerAddress(locker)}
                      </span>
                    </span>
                    {draft?.id === locker.id && (
                      <Check className="h-4 w-4 shrink-0 text-amber-800" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative min-h-[35dvh] overflow-hidden bg-[#e9e0cb] md:min-h-[58dvh]">
              <div
                ref={mapNode}
                className="absolute inset-0 z-0"
                aria-label="Harta punctelor Easybox"
              />
              {!lockers.length && (
                <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center bg-[radial-gradient(circle_at_center,rgba(255,250,240,.55),rgba(233,224,203,.85))] p-8 text-center">
                  <div>
                    <MapPin className="mx-auto h-8 w-8 text-amber-800/70" />
                    <p className="mt-2 text-sm font-medium text-amber-950">
                      Scrie localitatea pentru a vedea punctele pe hartă.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-amber-900/10 bg-white/55 px-5 py-4 dark:bg-black/15 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="min-w-0 text-xs text-muted-foreground">
              {draft ? lockerAddress(draft) : "Selectează un punct pentru a continua."}
            </p>
            <button
              type="button"
              disabled={!draft}
              onClick={() => {
                if (!draft) return;
                onSelect(draft);
                setOpen(false);
              }}
              className="min-h-11 shrink-0 rounded-full bg-[#5a3217] px-5 text-sm font-medium text-white shadow-lg shadow-amber-950/15 transition hover:bg-[#3f210f] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Alege acest Easybox
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
