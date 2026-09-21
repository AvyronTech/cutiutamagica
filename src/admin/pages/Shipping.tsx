import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { getCommerceOperations, saveShippingPolicy } from "@/lib/admin.functions";
import { CredentialPanel } from "@/admin/pages/GrowthSettings";

const inputClass =
  "w-full rounded-lg border border-[#334155] bg-[#0b1526] px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-400/60 focus:outline-none";

export default function Shipping() {
  const client = useQueryClient();
  const load = useServerFn(getCommerceOperations);
  const save = useServerFn(saveShippingPolicy);
  const query = useQuery({
    queryKey: ["admin", "commerce-operations"],
    queryFn: () => load(),
    staleTime: 15_000,
  });
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof save>[0]) => save(data),
    onSuccess: () => {
      toast.success("Politica de transport a fost salvată");
      client.invalidateQueries({ queryKey: ["admin", "commerce-operations"] });
    },
    onError: (error) =>
      toast.error("Configurația nu a fost salvată", { description: error.message }),
  });
  if (query.isError)
    return (
      <p role="alert">
        Livrările nu au putut fi încărcate.{" "}
        <button onClick={() => query.refetch()}>Reîncearcă</button>
      </p>
    );
  if (query.isLoading || !query.data)
    return <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />;
  const policy = query.data.shippingPolicy;
  const smartship = query.data.providers.find(
    (provider) => provider.provider === "smartship" && provider.environment === "production",
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = (name: string) => {
      const value = String(form.get(name) ?? "").trim();
      return value ? Number(value) : null;
    };
    mutation.mutate({
      data: {
        defaultWeightG: Number(form.get("defaultWeightG")),
        defaultLengthCm: Number(form.get("defaultLengthCm")),
        defaultWidthCm: Number(form.get("defaultWidthCm")),
        defaultHeightCm: Number(form.get("defaultHeightCm")),
        allowedCountries: String(form.get("allowedCountries") || "RO"),
        internationalReady: form.get("internationalReady") === "on",
        standardPrice: amount("standardPrice"),
        lockerPrice: amount("lockerPrice"),
        freeOver: amount("freeOver"),
        easyboxEnabled: form.get("easyboxEnabled") === "on",
        useLiveQuotes: form.get("useLiveQuotes") === "on",
        markVerified: form.get("markVerified") === "on",
      },
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Livrare și SmartShip</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cotație înainte de AWB, opțiuni la adresă/Easybox și costuri controlate dintr-o singură
          politică.
        </p>
      </header>
      <CredentialPanel providers={["smartship"]} />
      <div
        className={`flex gap-3 rounded-lg border p-4 text-sm ${smartship?.secretConfigured ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}
      >
        {smartship?.secretConfigured ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0" />
        )}
        <span>
          {smartship?.secretConfigured
            ? "Cheia SmartShip este configurată în Worker."
            : "Secretul SMARTSHIP_API_KEY lipsește. Cotațiile live și AWB-urile rămân dezactivate."}
        </span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <form onSubmit={submit} className="rounded-lg border border-[#28364d] bg-[#111c2e] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Truck className="h-4 w-4 text-cyan-300" /> Politica România
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Curier la adresă (RON)">
              <input
                name="standardPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  policy.standardPriceBani == null ? "" : policy.standardPriceBani / 100
                }
                className={inputClass}
              />
            </Field>
            <Field label="Easybox (RON)">
              <input
                name="lockerPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={policy.lockerPriceBani == null ? "" : policy.lockerPriceBani / 100}
                className={inputClass}
              />
            </Field>
            <Field label="Gratuit de la (RON)">
              <input
                name="freeOver"
                type="number"
                min="0"
                step="0.01"
                defaultValue={policy.freeOverBani == null ? "" : policy.freeOverBani / 100}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-5 space-y-3 text-xs text-slate-300">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Greutate implicită (g)">
                <input
                  name="defaultWeightG"
                  type="number"
                  min="100"
                  max="10000"
                  required
                  defaultValue={policy.defaultWeightG}
                  className={inputClass}
                />
              </Field>
              {(
                [
                  ["defaultLengthCm", "Lungime (cm)"],
                  ["defaultWidthCm", "Lățime (cm)"],
                  ["defaultHeightCm", "Înălțime (cm)"],
                ] as const
              ).map(([name, label]) => (
                <Field key={name} label={label}>
                  <input
                    name={name}
                    type="number"
                    min="1"
                    max="500"
                    required
                    defaultValue={policy[name]}
                    className={inputClass}
                  />
                </Field>
              ))}
              <Field label="Țări pregătite (coduri ISO, separate prin virgulă)">
                <input
                  name="allowedCountries"
                  defaultValue={policy.allowedCountries.join(", ")}
                  className={inputClass}
                />
              </Field>
            </div>
            <Check name="internationalReady" defaultChecked={policy.internationalReady}>
              Pregătește livrări internaționale; tarifele și checkout-ul extern necesită validare
              separată
            </Check>
            <Check name="easyboxEnabled" defaultChecked={policy.easyboxEnabled}>
              Permite alegerea Easybox în checkout
            </Check>
            <Check
              name="useLiveQuotes"
              defaultChecked={policy.useLiveQuotes}
              disabled={!smartship?.secretConfigured}
            >
              Folosește cotații SmartShip live înainte de AWB
            </Check>
            <Check name="markVerified" defaultChecked={policy.validationStatus === "verified"}>
              Confirm că prețurile, pragul și contractul au fost verificate
            </Check>
          </div>
          <button
            disabled={mutation.isPending}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07111f] disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Salvează politica
          </button>
        </form>
        <section className="rounded-lg border border-[#28364d] bg-[#111c2e] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <MapPin className="h-4 w-4 text-cyan-300" /> Flux operațional
          </h2>
          <ol className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
            <li>1. Normalizează județul, localitatea, codul poștal și greutatea produselor.</li>
            <li>2. Cere cotația SmartShip înainte de selectarea serviciului.</li>
            <li>
              3. Pentru Easybox păstrează identificatorul lockerului și limita de greutate a
              serviciului.
            </li>
            <li>4. Creează AWB numai după confirmarea plății sau aprobarea rambursului.</li>
            <li>5. Procesează statusurile idempotent și păstrează erorile pentru retry.</li>
          </ol>
          <p className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">
            Până la completarea contractului, adreselor de expediere și zonelor active, politica
            poate fi salvată ca neverificată; checkout-ul va cere confirmare manuală și nu va încasa
            online un total incomplet.
          </p>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs text-slate-400">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Check({
  name,
  defaultChecked,
  disabled,
  children,
}: {
  name: string;
  defaultChecked: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex items-start gap-2 ${disabled ? "opacity-50" : ""}`}>
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5"
      />
      <span>{children}</span>
    </label>
  );
}
