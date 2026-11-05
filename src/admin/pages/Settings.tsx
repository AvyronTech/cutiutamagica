import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { AboutSceneSettings } from "./AboutSceneSettings";
import type { AdminSettingsData } from "@/lib/admin-contracts";
import { getAdminSettings, saveAdminBusinessSettings } from "@/lib/admin.functions";

const EMPTY_SETTINGS: Omit<AdminSettingsData, "updatedAt"> = {
  business: {
    name: "Cutiuța Magică",
    description: "",
    email: "",
    phone: "",
    website: "https://cutiutamagica.eu",
    address: "",
    taxId: "",
    registrationNumber: "",
  },
  social: { instagram: "", facebook: "", tiktok: "", pinterest: "", youtube: "" },
  notifications: {
    newOrder: true,
    paymentFailed: true,
    orderShipped: true,
    orderDelivered: false,
    returnRequest: true,
    integrationFailure: true,
    dailyReport: false,
  },
  fulfillment: { defaultShippingMethod: "", defaultDeliveryType: "" },
};

const inputClass =
  "w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50";

export default function Settings() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getAdminSettings);
  const persistSettings = useServerFn(saveAdminBusinessSettings);
  const [form, setForm] = useState(EMPTY_SETTINGS);

  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => fetchSettings(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const { updatedAt: _updatedAt, ...editable } = settingsQuery.data;
    setForm(editable);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => persistSettings({ data: form.business }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["admin", "settings"], saved);
      toast.success("Setările au fost salvate în D1");
    },
    onError: (error) =>
      toast.error("Setările nu au putut fi salvate", {
        description: error instanceof Error ? error.message : "Verifică datele introduse.",
      }),
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">Datele magazinului</h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">
            Datele afacerii, separate de secretele și fluxurile integrărilor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !settingsQuery.data || settingsQuery.isError}
          className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saveMutation.isPending ? "Se salvează..." : "Salvează"}
        </button>
      </div>

      {settingsQuery.isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Setările nu au putut fi încărcate din D1.
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
        <p className="text-xs text-amber-100/80">
          Datele juridice și de contact rămân private și marcate pentru verificare. Publicarea lor
          trebuie făcută numai după confirmarea proprietarului.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="glass-card rounded-xl p-4 lg:col-span-2 md:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Building2 className="h-5 w-5 text-purple-400" /> Date afacere
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-xs text-slate-400">
              Nume
              <input
                className={`${inputClass} mt-1.5`}
                value={form.business.name}
                onChange={(event) =>
                  setForm({ ...form, business: { ...form.business, name: event.target.value } })
                }
              />
            </label>
            <label className="text-xs text-slate-400">
              Website
              <input
                type="url"
                className={`${inputClass} mt-1.5`}
                value={form.business.website}
                onChange={(event) =>
                  setForm({ ...form, business: { ...form.business, website: event.target.value } })
                }
              />
            </label>
            <label className="text-xs text-slate-400 md:col-span-2">
              Descriere
              <textarea
                rows={3}
                className={`${inputClass} mt-1.5 resize-none`}
                value={form.business.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    business: { ...form.business, description: event.target.value },
                  })
                }
                placeholder="Descriere confirmată a activității"
              />
            </label>
            <label className="text-xs text-slate-400">
              Email
              <input
                type="email"
                className={`${inputClass} mt-1.5`}
                value={form.business.email}
                onChange={(event) =>
                  setForm({ ...form, business: { ...form.business, email: event.target.value } })
                }
                placeholder="contact@..."
              />
            </label>
            <label className="text-xs text-slate-400">
              Telefon
              <input
                type="tel"
                className={`${inputClass} mt-1.5`}
                value={form.business.phone}
                onChange={(event) =>
                  setForm({ ...form, business: { ...form.business, phone: event.target.value } })
                }
                placeholder="+40..."
              />
            </label>
            <label className="text-xs text-slate-400 md:col-span-2">
              Adresă
              <input
                className={`${inputClass} mt-1.5`}
                value={form.business.address}
                onChange={(event) =>
                  setForm({ ...form, business: { ...form.business, address: event.target.value } })
                }
              />
            </label>
            <label className="text-xs text-slate-400">
              CUI / CIF
              <input
                className={`${inputClass} mt-1.5`}
                value={form.business.taxId}
                onChange={(event) =>
                  setForm({ ...form, business: { ...form.business, taxId: event.target.value } })
                }
              />
            </label>
            <label className="text-xs text-slate-400">
              Registrul Comerțului
              <input
                className={`${inputClass} mt-1.5`}
                value={form.business.registrationNumber}
                onChange={(event) =>
                  setForm({
                    ...form,
                    business: { ...form.business, registrationNumber: event.target.value },
                  })
                }
              />
            </label>
          </div>
        </section>
      </div>

      <details className="glass-card rounded-xl p-4 md:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Aspectul paginii Despre
        </summary>
        <div className="mt-4">
          <AboutSceneSettings />
        </div>
      </details>

      <p className="text-xs text-slate-500">
        Ultima actualizare:{" "}
        {settingsQuery.data?.updatedAt
          ? new Date(settingsQuery.data.updatedAt).toLocaleString("ro-RO")
          : "setările nu au fost salvate încă"}
        .
      </p>
    </div>
  );
}
