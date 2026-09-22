import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  CheckCircle2,
  CircleAlert,
  Mail,
  RefreshCw,
  Save,
  Send,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  addPartnerContact,
  getEmailHub,
  saveEmailSettings,
  saveEmailTemplate,
  sendEmailTest,
  sendPartnerMessage,
  setPartnerContactStatus,
} from "@/lib/email.functions";
import type { EmailChannel, EmailTemplateCode } from "@/lib/email-contracts";
import { CredentialPanel } from "./GrowthSettings";

const input =
  "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/60 hover:text-white disabled:opacity-50";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  hint,
  required = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5 text-sm text-slate-300">
      <span>{label}</span>
      <input
        className={input}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={254}
      />
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export default function EmailHub() {
  const client = useQueryClient();
  const load = useServerFn(getEmailHub);
  const saveSettings = useServerFn(saveEmailSettings);
  const saveTemplate = useServerFn(saveEmailTemplate);
  const addPartner = useServerFn(addPartnerContact);
  const setPartnerStatus = useServerFn(setPartnerContactStatus);
  const testEmail = useServerFn(sendEmailTest);
  const messagePartner = useServerFn(sendPartnerMessage);
  const [testChannel, setTestChannel] = useState<EmailChannel | null>(null);
  const query = useQuery({
    queryKey: ["admin", "email-hub"],
    queryFn: () => load(),
    staleTime: 20_000,
  });
  const invalidate = () => client.invalidateQueries({ queryKey: ["admin", "email-hub"] });

  const settingsMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: async () => {
      await invalidate();
      toast.success("Configurația e-mail a fost salvată");
    },
    onError: (error) => toast.error(error.message),
  });
  const templateMutation = useMutation({
    mutationFn: saveTemplate,
    onSuccess: async () => {
      await invalidate();
      toast.success("Șablonul a fost actualizat");
    },
    onError: (error) => toast.error(error.message),
  });
  const partnerMutation = useMutation({
    mutationFn: addPartner,
    onSuccess: async () => {
      await invalidate();
      toast.success("Partenerul a fost adăugat");
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isError)
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">
        Centrul e-mail nu a putut fi încărcat. Aplică migrația D1 și reîncearcă.
      </div>
    );
  if (!query.data) return <p role="status">Se încarcă centrul e-mail...</p>;

  const data = query.data;
  const counts = data.counts;
  const summaryCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: "Clienți cu e-mail", value: counts.customers, icon: Users },
    { label: "Parteneri activi", value: counts.partners, icon: Users },
    { label: "Abonați confirmați", value: counts.subscribers, icon: Mail },
    { label: "Trimise în 30 zile", value: counts.sent30d, icon: CheckCircle2 },
    { label: "Eșuate în 30 zile", value: counts.failed30d, icon: CircleAlert },
  ];

  function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "");
    settingsMutation.mutate({
      data: {
        provider: "resend",
        senderName: value("senderName"),
        defaultFromEmail: value("defaultFromEmail"),
        ordersFromEmail: value("ordersFromEmail"),
        returnsFromEmail: value("returnsFromEmail"),
        partnersFromEmail: value("partnersFromEmail"),
        replyToEmail: value("replyToEmail"),
        inboundAddress: value("inboundAddress"),
        forwardingTarget: value("forwardingTarget"),
        customerEmailsEnabled: form.get("customerEmailsEnabled") === "on",
        partnerEmailsEnabled: form.get("partnerEmailsEnabled") === "on",
      },
    });
  }

  async function runTest(channel: EmailChannel) {
    setTestChannel(channel);
    try {
      await testEmail({ data: { channel } });
      await invalidate();
      toast.success("Mesajul de test a fost trimis către contul tău de administrator");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test nereușit");
    } finally {
      setTestChannel(null);
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Comunicare centralizată
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Centru e-mail</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Identitatea Cutiuța Magică, mesaje tranzacționale pentru clienți, contacte de parteneri,
            teste de livrare și istoric Resend.
          </p>
        </div>
        <button className={secondaryButton} onClick={() => query.refetch()}>
          <RefreshCw size={16} /> Actualizează
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Rezumat e-mail">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <Icon className="h-4 w-4 text-cyan-300" />
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Starea serviciului</h2>
            <p className="mt-1 text-sm text-slate-400">
              Resend: {data.resend?.configured ? data.resend.status : "neconfigurat"}. Domeniul
              expeditor trebuie verificat cu SPF și DKIM înainte de activarea în producție.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["default", "orders", "returns", "partners"] as EmailChannel[]).map((channel) => (
              <button
                key={channel}
                className={secondaryButton}
                disabled={!data.resend?.configured || testChannel !== null}
                onClick={() => runTest(channel)}
              >
                <Send size={14} /> Test {channel}
              </button>
            ))}
          </div>
        </div>
      </section>

      <form onSubmit={submitSettings} className="space-y-5 rounded-lg border border-slate-700 p-5">
        <div>
          <h2 className="font-semibold text-white">Identitate și adrese</h2>
          <p className="mt-1 text-xs text-slate-400">
            Expeditorii trebuie să aparțină domeniului cutiutamagica.eu. Inboxul poate fi
            redirecționat prin Cloudflare Email Routing către adresa proprietarului.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nume expeditor" name="senderName" defaultValue={data.settings.senderName} />
          <Field
            label="Adresă generală de expediere"
            name="defaultFromEmail"
            type="email"
            defaultValue={data.settings.defaultFromEmail}
          />
          <Field
            label="Comenzi · expeditor"
            name="ordersFromEmail"
            type="email"
            defaultValue={data.settings.ordersFromEmail}
          />
          <Field
            label="Retururi · expeditor"
            name="returnsFromEmail"
            type="email"
            defaultValue={data.settings.returnsFromEmail}
          />
          <Field
            label="Parteneri · expeditor"
            name="partnersFromEmail"
            type="email"
            defaultValue={data.settings.partnersFromEmail}
          />
          <Field
            label="Reply-To"
            name="replyToEmail"
            type="email"
            defaultValue={data.settings.replyToEmail}
          />
          <Field
            label="Adresă publică de inbox"
            name="inboundAddress"
            type="email"
            defaultValue={data.settings.inboundAddress}
          />
          <Field
            label="Destinație redirecționare inbox"
            name="forwardingTarget"
            type="email"
            defaultValue={data.settings.forwardingTarget}
            hint="Configurarea efectivă se confirmă în Cloudflare Email Routing."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-slate-700 p-4 text-sm text-slate-300">
            <input
              type="checkbox"
              name="customerEmailsEnabled"
              defaultChecked={data.settings.customerEmailsEnabled}
              className="mt-1"
            />
            <span>
              <strong className="block text-white">Mesaje tranzacționale clienți</strong>
              Confirmări pentru comenzi și retururi, fără marketing.
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-slate-700 p-4 text-sm text-slate-300">
            <input
              type="checkbox"
              name="partnerEmailsEnabled"
              defaultChecked={data.settings.partnerEmailsEnabled}
              className="mt-1"
            />
            <span>
              <strong className="block text-white">Mesaje manuale către parteneri</strong>
              Activează numai după verificarea domeniului și a adresei partenerului.
            </span>
          </label>
        </div>
        <button className={button} disabled={settingsMutation.isPending}>
          <Save size={16} /> Salvează identitatea e-mail
        </button>
      </form>

      <CredentialPanel providers={["resend"]} />

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-white">Șabloane tranzacționale</h2>
          <p className="mt-1 text-xs text-slate-400">
            HTML-ul este generat server-side din text escapizat. Variabilele disponibile sunt
            afișate pentru fiecare șablon.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {data.templates.map((template) => {
            const code = template.code as EmailTemplateCode;
            const variables =
              code === "order_confirmation"
                ? "{{customer_name}}, {{order_number}}, {{total}}"
                : "{{customer_name}}, {{return_number}}";
            return (
              <form
                key={code}
                className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  templateMutation.mutate({
                    data: {
                      code,
                      enabled: form.get("enabled") === "on",
                      subjectTemplate: String(form.get("subjectTemplate") || ""),
                      textTemplate: String(form.get("textTemplate") || ""),
                    },
                  });
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-white">{String(template.name)}</h3>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={Boolean(template.enabled)}
                    />
                    Activ
                  </label>
                </div>
                <label className="block space-y-1.5 text-xs text-slate-400">
                  Subiect
                  <input
                    name="subjectTemplate"
                    className={input}
                    defaultValue={String(template.subjectTemplate)}
                    maxLength={180}
                    required
                  />
                </label>
                <label className="block space-y-1.5 text-xs text-slate-400">
                  Conținut text
                  <textarea
                    name="textTemplate"
                    className={`${input} min-h-40 resize-y`}
                    defaultValue={String(template.textTemplate)}
                    maxLength={10_000}
                    required
                  />
                </label>
                <p className="text-xs text-slate-500">Variabile: {variables}</p>
                <button className={button} disabled={templateMutation.isPending}>
                  <Save size={15} /> Salvează șablonul
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <form
          className="space-y-4 rounded-lg border border-slate-700 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const target = event.currentTarget;
            const form = new FormData(target);
            partnerMutation.mutate(
              {
                data: {
                  name: String(form.get("name") || ""),
                  company: String(form.get("company") || ""),
                  email: String(form.get("email") || ""),
                  notes: String(form.get("notes") || ""),
                },
              },
              { onSuccess: () => target.reset() },
            );
          }}
        >
          <h2 className="font-semibold text-white">Adaugă partener</h2>
          <Field label="Persoană de contact" name="name" />
          <Field label="Companie" name="company" required={false} />
          <Field label="E-mail" name="email" type="email" />
          <label className="block space-y-1.5 text-sm text-slate-300">
            Note interne
            <textarea name="notes" className={`${input} min-h-24`} maxLength={1_000} />
          </label>
          <button className={button} disabled={partnerMutation.isPending}>
            <Users size={16} /> Adaugă
          </button>
        </form>

        <div className="space-y-3 rounded-lg border border-slate-700 p-5">
          <h2 className="font-semibold text-white">Parteneri și mesaje</h2>
          {!data.contacts.length ? (
            <p className="text-sm text-slate-400">Nu există încă parteneri salvați.</p>
          ) : (
            data.contacts.map((contact) => (
              <article key={String(contact.id)} className="rounded-lg border border-slate-700 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{String(contact.name)}</p>
                    <p className="text-xs text-slate-400">
                      {contact.company ? `${contact.company} · ` : ""}
                      {contact.email}
                    </p>
                  </div>
                  <button
                    className={secondaryButton}
                    onClick={async () => {
                      await setPartnerStatus({
                        data: {
                          contactId: String(contact.id),
                          status: contact.status === "active" ? "archived" : "active",
                        },
                      });
                      await invalidate();
                    }}
                  >
                    <Archive size={14} />
                    {contact.status === "active" ? "Arhivează" : "Reactivează"}
                  </button>
                </div>
                {contact.status === "active" && (
                  <form
                    className="mt-4 grid gap-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const target = event.currentTarget;
                      const form = new FormData(target);
                      try {
                        await messagePartner({
                          data: {
                            contactId: String(contact.id),
                            subject: String(form.get("subject") || ""),
                            message: String(form.get("message") || ""),
                          },
                        });
                        target.reset();
                        await invalidate();
                        toast.success("Mesaj trimis partenerului");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Trimitere nereușită");
                      }
                    }}
                  >
                    <input
                      name="subject"
                      className={input}
                      placeholder="Subiect"
                      minLength={3}
                      maxLength={180}
                      required
                    />
                    <textarea
                      name="message"
                      className={`${input} min-h-24`}
                      placeholder="Mesaj profesional pentru partener"
                      minLength={10}
                      maxLength={10_000}
                      required
                    />
                    <button
                      className={`${button} justify-self-start`}
                      disabled={!data.settings.partnerEmailsEnabled}
                    >
                      <Send size={15} /> Trimite
                    </button>
                  </form>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-white">Ultimele livrări Resend</h2>
        {!data.operations.length ? (
          <p className="text-sm text-slate-400">Nu există încă trimiteri înregistrate.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Stare</th>
                  <th className="px-4 py-3">HTTP</th>
                  <th className="px-4 py-3">Dată</th>
                  <th className="px-4 py-3">Detaliu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.operations.map((operation, index) => (
                  <tr key={`${operation.createdAt}-${index}`}>
                    <td className="px-4 py-3 text-slate-200">{String(operation.entityType)}</td>
                    <td className="px-4 py-3 text-slate-200">{String(operation.status)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {operation.responseCode == null ? "—" : String(operation.responseCode)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(String(operation.createdAt)).toLocaleString("ro-RO")}
                    </td>
                    <td className="max-w-sm truncate px-4 py-3 text-slate-400">
                      {operation.errorMessage
                        ? String(operation.errorMessage)
                        : "Livrare acceptată"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
