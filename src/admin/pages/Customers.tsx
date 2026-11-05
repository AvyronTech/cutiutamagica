import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronLeft, ChevronRight, Search, Sparkles, Users, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getAdminCustomerDetail, getAdminCustomers } from "@/lib/customer-admin.functions";

const money = (bani: unknown) =>
  (Number(bani ?? 0) / 100).toLocaleString("ro-RO", { style: "currency", currency: "RON" });
const date = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(String(value)))
    : "—";

export default function Customers() {
  const load = useServerFn(getAdminCustomers);
  const loadDetail = useServerFn(getAdminCustomerDetail);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "customers", page, search],
    queryFn: () => load({ data: { page, search } }),
  });
  const detail = useQuery({
    queryKey: ["admin", "customer", selectedId],
    queryFn: () => loadDetail({ data: { customerId: selectedId! } }),
    enabled: Boolean(selectedId),
  });
  const summary = query.data?.summary;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(searchDraft.trim());
  }
  return (
    <div className="space-y-5 pb-10 text-slate-100">
      <header className="rounded-2xl border border-amber-200/20 bg-[radial-gradient(circle_at_90%_0%,rgba(216,171,97,.18),transparent_45%),linear-gradient(130deg,#172536,#111a29)] p-6 md:p-8">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-amber-200">
          <Users size={16} /> Relații cu clienții
        </span>
        <h1 className="mt-3 text-3xl font-semibold">Membri și comenzi</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Conturile, comenzile și momentele salvate sunt citite din aceeași bază D1 a magazinului.
        </p>
      </header>
      <section aria-label="Indicatori clienți" className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {[
          ["Clienți", summary?.customers],
          ["Membri", summary?.members],
          ["Comenzi", summary?.orders],
          ["Încasat", money(summary?.paid_bani)],
          ["Momente salvate", summary?.moments],
          ["Mementouri trimise", summary?.reminders_sent],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-white/10 bg-white/[.045] p-4"
          >
            <strong className="block text-xl font-semibold tabular-nums text-white">
              {query.isLoading ? "…" : (value ?? 0)}
            </strong>
            <span className="mt-1 block text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#172235]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-lg font-semibold">Lista clienților</h2>
            <p className="mt-1 text-xs text-slate-400">
              Alege o persoană pentru comenzi, stele și calendar.
            </p>
          </div>
          <form onSubmit={submit} role="search" className="flex w-full gap-2 md:w-80">
            <label className="relative flex-1">
              <span className="sr-only">Caută după nume sau e-mail</span>
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                maxLength={80}
                placeholder="Nume sau e-mail"
                className="min-h-10 w-full rounded-lg border border-white/15 bg-slate-950/35 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-200/60"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-amber-200 px-4 text-xs font-semibold text-slate-950"
            >
              Caută
            </button>
          </form>
        </div>
        {query.isError && (
          <p role="alert" className="p-5 text-sm text-rose-300">
            Lista nu poate fi încărcată. Verifică permisiunea și conexiunea D1.
          </p>
        )}
        {query.isLoading && <p className="p-5 text-sm text-slate-400">Se încarcă membrii…</p>}
        {query.data?.customers.length === 0 && (
          <p className="p-5 text-sm text-slate-400">Nu există clienți pentru această căutare.</p>
        )}
        <div className="divide-y divide-white/10">
          {query.data?.customers.map((customer) => (
            <button
              key={String(customer.id)}
              type="button"
              onClick={() => setSelectedId(String(customer.id))}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-4 text-left transition hover:bg-white/[.055] md:grid-cols-[minmax(0,1.5fr)_minmax(0,.75fr)_minmax(0,.75fr)_auto] md:items-center md:px-5"
            >
              <span className="min-w-0">
                <strong className="block truncate text-sm text-white">
                  {customer.fullName || "Client"}
                </strong>
                <small className="block truncate text-xs text-slate-400">
                  {customer.email || "Fără e-mail"}
                </small>
              </span>
              <span className="hidden text-xs text-slate-300 md:block">
                {customer.accountId ? "Membru" : "Vizitator"} · {customer.orderCount} comenzi
              </span>
              <span className="hidden text-xs text-slate-300 md:block">
                {money(customer.lifetimeValueBani)}
              </span>
              <ChevronRight size={18} className="self-center text-amber-200" />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-slate-400">
          <button
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
            className="inline-flex min-h-9 items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft size={15} /> Înapoi
          </button>
          <span>Pagina {page + 1}</span>
          <button
            disabled={!query.data?.hasMore}
            onClick={() => setPage((value) => value + 1)}
            className="inline-flex min-h-9 items-center gap-1 disabled:opacity-40"
          >
            Înainte <ChevronRight size={15} />
          </button>
        </div>
      </section>
      {selectedId && (
        <section
          aria-label="Detalii client"
          className="rounded-2xl border border-amber-200/25 bg-[#172235] p-5 md:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[.14em] text-amber-200">Fișa clientului</p>
              <h2 className="mt-1 text-xl font-semibold">
                {detail.data?.customer.fullName || "Se încarcă…"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{detail.data?.customer.email}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Închide detaliile"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15"
            >
              <X size={16} />
            </button>
          </div>
          {detail.isError && (
            <p role="alert" className="mt-4 text-sm text-rose-300">
              Fișa clientului nu poate fi încărcată.
            </p>
          )}
          {detail.data && (
            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Users size={16} /> Profil
                </h3>
                <p className="mt-3 text-sm text-slate-300">
                  {detail.data.customer.accountId ? "Membru înregistrat" : "Client fără cont"} ·{" "}
                  {detail.data.customer.orderCount} comenzi
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Valoare istorică: {money(detail.data.customer.lifetimeValueBani)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Membru din {date(detail.data.customer.createdAt)}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-amber-200">
                  <Sparkles size={15} /> {detail.data.customer.availableStars} Magic Stars
                  disponibile
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Comenzi recente</h3>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                  {detail.data.orders.length ? (
                    detail.data.orders.map((order) => (
                      <div
                        key={String(order.orderNumber)}
                        className="rounded-lg border border-white/10 p-3 text-xs"
                      >
                        <strong>{order.orderNumber}</strong>
                        <span className="ml-2 text-slate-400">{date(order.placedAt)}</span>
                        <p className="mt-1 text-slate-300">
                          {money(order.totalBani)} · {order.orderStatus} · {order.paymentStatus}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">Fără comenzi.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays size={16} /> Momente salvate
                </h3>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                  {detail.data.moments.length ? (
                    detail.data.moments.map((moment, index) => (
                      <div
                        key={`${moment.personName}-${index}`}
                        className="rounded-lg border border-white/10 p-3 text-xs"
                      >
                        <strong>{moment.personName}</strong>
                        <p className="mt-1 text-slate-300">
                          {String(moment.eventDay).padStart(2, "0")}/
                          {String(moment.eventMonth).padStart(2, "0")} ·{" "}
                          {moment.emailEnabled ? "memento e-mail activ" : "fără memento"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">Niciun moment salvat.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
