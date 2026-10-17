import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  Settings2,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  getChatCenter,
  getChatConversation,
  replyToChatConversation,
  updateChatConversationStatus,
  updateChatSettings,
} from "@/lib/chat.functions";
import type { ChatConversationStatus, ChatSettings } from "@/lib/chat-contracts";

const input =
  "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-300";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-300/60 hover:text-white disabled:opacity-50";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ChatCenter() {
  const client = useQueryClient();
  const loadCenter = useServerFn(getChatCenter);
  const loadConversation = useServerFn(getChatConversation);
  const sendReply = useServerFn(replyToChatConversation);
  const saveStatus = useServerFn(updateChatConversationStatus);
  const saveSettings = useServerFn(updateChatSettings);
  const [tab, setTab] = useState<"inbox" | "settings">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const center = useQuery({
    queryKey: ["admin", "chat-center"],
    queryFn: () => loadCenter(),
    staleTime: 4_000,
    refetchInterval: tab === "inbox" ? 5_000 : false,
  });
  const conversations = useMemo(() => center.data?.conversations ?? [], [center.data]);
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0] ?? null;

  useEffect(() => {
    if (!selectedId && conversations[0]) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const transcript = useQuery({
    queryKey: ["admin", "chat-conversation", selected?.id],
    queryFn: () => loadConversation({ data: { conversationId: selected!.id } }),
    enabled: Boolean(selected?.id && tab === "inbox"),
    refetchInterval: tab === "inbox" ? 4_000 : false,
  });

  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin", "chat-center"] }),
      client.invalidateQueries({ queryKey: ["admin", "chat-conversation", selected?.id] }),
      client.invalidateQueries({ queryKey: ["admin", "notifications"] }),
    ]);
  };

  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      sendReply({
        data: { conversationId: selected!.id, messageId: crypto.randomUUID(), body },
      }),
    onSuccess: async () => {
      setReply("");
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (status: ChatConversationStatus) =>
      saveStatus({ data: { conversationId: selected!.id, status } }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });

  const settingsMutation = useMutation({
    mutationFn: (settings: ChatSettings) => saveSettings({ data: settings }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Configurația chatului a fost salvată");
    },
    onError: (error) => toast.error(error.message),
  });

  if (center.isError) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">
        Centrul de chat nu poate fi încărcat. Aplică migrația D1 0014 și reîncearcă.
      </div>
    );
  }
  if (!center.data) return <p role="status">Se încarcă centrul de chat...</p>;

  const openCount = conversations.filter((item) => item.status === "open").length;
  const unreadCount = conversations.reduce((sum, item) => sum + item.unreadAdminCount, 0);

  function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    settingsMutation.mutate({
      enabled: form.get("enabled") === "on",
      availability: value("availability") as ChatSettings["availability"],
      position: value("position") as ChatSettings["position"],
      accentColor: value("accentColor"),
      welcomeTitle: value("welcomeTitle"),
      welcomeMessage: value("welcomeMessage"),
      offlineMessage: value("offlineMessage"),
      responseTimeLabel: value("responseTimeLabel"),
      requireConsent: form.get("requireConsent") === "on",
      collectName: form.get("collectName") === "on",
      collectEmail: form.get("collectEmail") === "on",
      quickReplies: value("quickReplies")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8),
      aiEnabled: false,
      retentionDays: Number(value("retentionDays")),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Conversații magazin
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Chat clienți</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Inbox pentru vizitatori, răspunsuri umane, configurarea widgetului și controlul
            consimțământului. Datele rămân în D1-ul Cutiuța Magică.
          </p>
        </div>
        <button className={secondary} onClick={() => center.refetch()}>
          <RefreshCw size={16} /> Actualizează
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Conversații active", openCount, MessageCircle],
            ["Mesaje necitite", unreadCount, Clock3],
            ["Stare widget", center.data.settings.enabled ? "Activ" : "Oprit", CheckCircle2],
          ] as Array<[string, string | number, LucideIcon]>
        ).map(([label, count, Icon]) => (
          <article
            key={String(label)}
            className="rounded-lg border border-slate-700 bg-slate-900/60 p-4"
          >
            <Icon className="h-4 w-4 text-amber-300" />
            <p className="mt-3 text-2xl font-semibold text-white">{String(count)}</p>
            <p className="text-xs text-slate-400">{String(label)}</p>
          </article>
        ))}
      </section>

      <div className="flex gap-2 border-b border-slate-700 pb-3">
        <button className={tab === "inbox" ? primary : secondary} onClick={() => setTab("inbox")}>
          <MessageCircle size={16} /> Inbox
        </button>
        <button
          className={tab === "settings" ? primary : secondary}
          onClick={() => setTab("settings")}
        >
          <Settings2 size={16} /> Configurare
        </button>
      </div>

      {tab === "inbox" ? (
        <section className="grid min-h-[620px] overflow-hidden rounded-lg border border-slate-700 bg-slate-950 lg:grid-cols-[320px_1fr]">
          <aside className="max-h-[620px] overflow-y-auto border-b border-slate-700 lg:border-b-0 lg:border-r">
            {conversations.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">Nu există încă mesaje.</p>
            ) : (
              conversations.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full border-b border-slate-800 p-4 text-left transition hover:bg-slate-900 ${selected?.id === item.id ? "bg-slate-900" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm text-white">
                      {item.visitorName || "Vizitator"}
                    </strong>
                    {item.unreadAdminCount > 0 && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 text-[10px] font-bold text-slate-950">
                        {item.unreadAdminCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {item.lastMessage || "Conversație nouă"}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="capitalize">{item.status}</span>
                    <time>{formatDate(item.lastMessageAt)}</time>
                  </div>
                </button>
              ))
            )}
          </aside>

          <div className="flex min-h-[620px] flex-col">
            {!selected ? (
              <div className="grid flex-1 place-items-center text-sm text-slate-500">
                Selectează o conversație.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium text-white">
                      <UserRound size={15} /> {selected.visitorName || "Vizitator"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.visitorEmail || "Fără e-mail"} · {selected.sourcePath}
                    </p>
                  </div>
                  <select
                    value={selected.status}
                    onChange={(event) =>
                      statusMutation.mutate(event.target.value as ChatConversationStatus)
                    }
                    className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="open">Deschis</option>
                    <option value="pending">În așteptare</option>
                    <option value="closed">Închis</option>
                    <option value="spam">Spam</option>
                  </select>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {transcript.isLoading && (
                    <LoaderCircle className="mx-auto mt-10 animate-spin text-amber-300" />
                  )}
                  {transcript.data?.messages.map((item) => {
                    const operator = item.senderType === "admin" || item.senderType === "assistant";
                    return (
                      <div
                        key={item.id}
                        className={`flex ${operator ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${operator ? "bg-amber-300 text-slate-950" : "bg-slate-800 text-slate-100"}`}
                        >
                          {item.body}
                          <time
                            className={`mt-1 block text-[9px] ${operator ? "text-slate-700" : "text-slate-500"}`}
                          >
                            {formatDate(item.createdAt)}
                          </time>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form
                  className="flex gap-2 border-t border-slate-700 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (reply.trim()) replyMutation.mutate(reply.trim());
                  }}
                >
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder="Răspunde clientului..."
                    className={`${input} resize-none`}
                  />
                  <button
                    className={primary}
                    disabled={!reply.trim() || replyMutation.isPending}
                    aria-label="Trimite răspunsul"
                  >
                    <Send size={17} />
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      ) : (
        <form onSubmit={submitSettings} className="space-y-6">
          <section className="grid gap-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5 md:grid-cols-2">
            <label className="space-y-1.5 text-sm text-slate-300">
              Titlu
              <input
                name="welcomeTitle"
                defaultValue={center.data.settings.welcomeTitle}
                className={input}
                maxLength={80}
                required
              />
            </label>
            <label className="space-y-1.5 text-sm text-slate-300">
              Timp de răspuns
              <input
                name="responseTimeLabel"
                defaultValue={center.data.settings.responseTimeLabel}
                className={input}
                maxLength={100}
                required
              />
            </label>
            <label className="space-y-1.5 text-sm text-slate-300 md:col-span-2">
              Mesaj de bun venit
              <textarea
                name="welcomeMessage"
                defaultValue={center.data.settings.welcomeMessage}
                className={`${input} min-h-24`}
                maxLength={400}
                required
              />
            </label>
            <label className="space-y-1.5 text-sm text-slate-300 md:col-span-2">
              Mesaj offline
              <textarea
                name="offlineMessage"
                defaultValue={center.data.settings.offlineMessage}
                className={`${input} min-h-20`}
                maxLength={400}
                required
              />
            </label>
            <label className="space-y-1.5 text-sm text-slate-300">
              Disponibilitate
              <select
                name="availability"
                defaultValue={center.data.settings.availability}
                className={input}
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="auto">Automat, după program</option>
              </select>
              <span className="block text-xs text-slate-500">
                Modul automat este online luni-vineri, 09:00-18:00, ora României.
              </span>
            </label>
            <label className="space-y-1.5 text-sm text-slate-300">
              Latura inițială a chatului
              <select
                name="position"
                defaultValue={center.data.settings.position}
                className={input}
              >
                <option value="right">Dreapta</option>
                <option value="left">Stânga · mijlocul ecranului</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm text-slate-300">
              Culoare accent
              <input
                name="accentColor"
                type="color"
                defaultValue={center.data.settings.accentColor}
                className="h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-1"
              />
            </label>
            <label className="space-y-1.5 text-sm text-slate-300">
              Păstrare date (zile)
              <input
                name="retentionDays"
                type="number"
                min="30"
                max="1095"
                defaultValue={center.data.settings.retentionDays}
                className={input}
              />
            </label>
            <label className="space-y-1.5 text-sm text-slate-300 md:col-span-2">
              Răspunsuri rapide, unul pe linie
              <textarea
                name="quickReplies"
                defaultValue={center.data.settings.quickReplies.join("\n")}
                className={`${input} min-h-28`}
              />
            </label>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["enabled", "Widget activ", center.data.settings.enabled],
              ["requireConsent", "Solicită consimțământ", center.data.settings.requireConsent],
              ["collectName", "Solicită prenume", center.data.settings.collectName],
              ["collectEmail", "Solicită e-mail", center.data.settings.collectEmail],
            ].map(([name, label, checked]) => (
              <label
                key={String(name)}
                className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-200"
              >
                <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} />{" "}
                {String(label)}
              </label>
            ))}
          </section>

          <section className="flex items-start gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4">
            <Bot className="mt-0.5 text-cyan-300" size={18} />
            <div>
              <h2 className="text-sm font-semibold text-white">Asistent AI pregătit, dar oprit</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Schema acceptă mesaje de tip assistant. Activarea va necesita furnizor, bază de
                cunoștințe aprobată, limită de cost, disclosure și escaladare obligatorie către
                operator.
              </p>
            </div>
          </section>

          <button className={primary} disabled={settingsMutation.isPending}>
            <Save size={16} /> Salvează configurarea
          </button>
        </form>
      )}
    </div>
  );
}
