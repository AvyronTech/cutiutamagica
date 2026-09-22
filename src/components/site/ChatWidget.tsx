import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";

type PublicChatConfig = {
  enabled: boolean;
  availability: "online" | "offline" | "auto";
  position: "left" | "right";
  accentColor: string;
  welcomeTitle: string;
  welcomeMessage: string;
  offlineMessage: string;
  responseTimeLabel: string;
  requireConsent: boolean;
  collectName: boolean;
  collectEmail: boolean;
  quickReplies: string[];
};

type ChatMessage = {
  id: string;
  senderType: "visitor" | "admin" | "system" | "assistant";
  body: string;
  createdAt: string;
  readAt: string | null;
};

type ChatSession = { conversationId: string; accessToken: string };

const SESSION_KEY = "cutiuta:chat-session:v1";
const VISITOR_KEY = "cutiuta:chat-visitor:v1";
const SIDE_KEY = "cutiuta:chat-side";

function loadSession(): ChatSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as ChatSession | null;
    return parsed?.conversationId && parsed.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

function visitorKey(): string {
  const current = localStorage.getItem(VISITOR_KEY);
  if (current) return current;
  const value = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  localStorage.setItem(VISITOR_KEY, value);
  return value;
}

async function responseData<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; error?: { message?: string } };
  if (!response.ok || !payload.data)
    throw new Error(payload.error?.message ?? "Cererea nu a reușit.");
  return payload.data;
}

export function ChatWidget() {
  const [config, setConfig] = useState<PublicChatConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [dragX, setDragX] = useState(0);
  const pointer = useRef<{ id: number; startX: number; moved: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/chat/config")
      .then((response) => responseData<PublicChatConfig>(response))
      .then((data) => {
        if (!active) return;
        setConfig(data);
        const stored = localStorage.getItem(SIDE_KEY);
        setSide(stored === "left" || stored === "right" ? stored : data.position);
        setSession(loadSession());
      })
      .catch(() => setConfig(null));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open || !session) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/v1/chat/conversations/${session.conversationId}/messages`,
          { headers: { authorization: `Bearer ${session.accessToken}` } },
        );
        const data = await responseData<ChatMessage[]>(response);
        if (active) setMessages(data);
      } catch {
        // Keep the last successful transcript visible during transient network errors.
      }
    };
    void load();
    const timer = window.setInterval(load, document.visibilityState === "visible" ? 4_000 : 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, session]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!config?.enabled) return null;
  const activeConfig = config;

  async function ensureSession(): Promise<ChatSession> {
    if (session) return session;
    const response = await fetch("/api/v1/chat/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        consent,
        sourcePath: `${location.pathname}${location.search}`,
        visitorKey: visitorKey(),
        context: { referrer: document.referrer || undefined },
      }),
    });
    const created = await responseData<ChatSession>(response);
    localStorage.setItem(SESSION_KEY, JSON.stringify(created));
    setSession(created);
    return created;
  }

  async function sendMessage(body: string) {
    const clean = body.trim();
    if (!clean || sending) return;
    if (activeConfig.requireConsent && !consent && !session) {
      setError("Bifează acordul pentru a trimite mesajul.");
      return;
    }
    setSending(true);
    setError("");
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      senderType: "visitor",
      body: clean,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    try {
      const activeSession = await ensureSession();
      setMessages((current) => [...current, optimistic]);
      setMessage("");
      const response = await fetch(
        `/api/v1/chat/conversations/${activeSession.conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${activeSession.accessToken}`,
          },
          body: JSON.stringify({ messageId: optimistic.id, body: clean }),
        },
      );
      await responseData<{ accepted: boolean }>(response);
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setError(caught instanceof Error ? caught.message : "Mesajul nu a putut fi trimis.");
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(message);
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    pointer.current = { id: event.pointerId, startX: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!pointer.current || pointer.current.id !== event.pointerId) return;
    const delta = event.clientX - pointer.current.startX;
    if (Math.abs(delta) > 5) pointer.current.moved = true;
    setDragX(Math.max(-180, Math.min(180, delta)));
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = pointer.current;
    pointer.current = null;
    setDragX(0);
    if (!state?.moved) {
      setOpen((value) => !value);
      return;
    }
    const next = event.clientX < window.innerWidth / 2 ? "left" : "right";
    setSide(next);
    localStorage.setItem(SIDE_KEY, next);
  }

  const sideClass = side === "left" ? "left-3 sm:left-5" : "right-3 sm:right-5";
  const operatorOnline = activeConfig.availability !== "offline";

  return (
    <div
      className={`fixed bottom-4 z-[70] ${sideClass}`}
      style={{ "--chat-accent": activeConfig.accentColor } as React.CSSProperties}
    >
      {open && (
        <section
          className={`chat-panel mb-3 flex h-[min(580px,calc(100dvh-6.5rem))] w-[min(370px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-white/50 bg-[#fffaf1]/95 shadow-2xl backdrop-blur-xl ${side === "left" ? "origin-bottom-left" : "origin-bottom-right"}`}
          aria-label="Chat Cutiuța Magică"
        >
          <header className="relative overflow-hidden bg-[#35251d] px-4 py-3.5 text-white">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_80%_15%,#eabf70,transparent_38%)]" />
            <div className="relative flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-amber-200/35 bg-amber-100/10">
                <Sparkles size={18} className="text-amber-200" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-lg font-semibold">
                  {activeConfig.welcomeTitle}
                </h2>
                <p className="flex items-center gap-1.5 text-[11px] text-amber-50/75">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${operatorOnline ? "bg-emerald-400" : "bg-amber-400"}`}
                  />
                  {operatorOnline ? activeConfig.responseTimeLabel : "Mesajele rămân salvate"}
                </p>
              </div>
              <button
                className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label="Închide chatul"
              >
                <ChevronDown size={19} />
              </button>
            </div>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
            aria-live="polite"
          >
            <div className="max-w-[88%] rounded-lg rounded-tl-sm border border-amber-900/10 bg-white px-3 py-2.5 text-sm leading-relaxed text-[#4b382d] shadow-sm">
              {operatorOnline ? activeConfig.welcomeMessage : activeConfig.offlineMessage}
            </div>
            {messages.length === 0 && activeConfig.quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeConfig.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => void sendMessage(reply)}
                    className="rounded-full border border-[#a8733d]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#654527] transition hover:border-[#a8733d] hover:bg-amber-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
            {messages.map((item) => {
              const mine = item.senderType === "visitor";
              return (
                <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm ${mine ? "rounded-br-sm bg-[var(--chat-accent)] text-white" : "rounded-bl-sm border border-amber-900/10 bg-white text-[#4b382d]"}`}
                  >
                    {item.body}
                    <span
                      className={`mt-1 block text-[9px] ${mine ? "text-white/65" : "text-[#8b735f]"}`}
                    >
                      {new Intl.DateTimeFormat("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(item.createdAt))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {!session && (activeConfig.collectName || activeConfig.collectEmail) && (
            <div className="grid grid-cols-2 gap-2 border-t border-[#6d4a2b]/10 bg-white/60 px-3 pt-3">
              {activeConfig.collectName && (
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  placeholder="Prenume"
                  className="min-w-0 rounded-md border border-[#8d6b4e]/25 bg-white px-2.5 py-2 text-xs outline-none focus:border-[var(--chat-accent)]"
                />
              )}
              {activeConfig.collectEmail && (
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  type="email"
                  placeholder="E-mail"
                  className="min-w-0 rounded-md border border-[#8d6b4e]/25 bg-white px-2.5 py-2 text-xs outline-none focus:border-[var(--chat-accent)]"
                />
              )}
            </div>
          )}
          {activeConfig.requireConsent && !session && (
            <label className="flex items-start gap-2 bg-white/60 px-3 pt-2 text-[10px] leading-snug text-[#705946]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Sunt de acord cu prelucrarea mesajului conform{" "}
                <a href="/politica-de-confidentialitate" className="underline">
                  politicii de confidențialitate
                </a>
                .
              </span>
            </label>
          )}
          {error && (
            <p className="bg-white/60 px-3 pt-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
          <form
            onSubmit={submit}
            className="flex items-end gap-2 border-t border-[#6d4a2b]/10 bg-white/75 p-3"
          >
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(event);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Scrie un mesaj..."
              className="max-h-24 min-h-10 flex-1 resize-none rounded-lg border border-[#8d6b4e]/25 bg-white px-3 py-2.5 text-sm text-[#3c2b22] outline-none focus:border-[var(--chat-accent)]"
            />
            <button
              disabled={sending || !message.trim()}
              className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--chat-accent)] text-white transition hover:brightness-110 disabled:opacity-45"
              aria-label="Trimite mesajul"
            >
              {sending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </form>
        </section>
      )}

      <button
        className="chat-bubble relative grid h-14 w-14 touch-none place-items-center rounded-full border border-white/60 bg-[#3a281f] text-amber-100 shadow-[0_12px_35px_rgba(52,35,26,0.35)] transition-[transform,box-shadow] hover:shadow-[0_15px_38px_rgba(52,35,26,0.45)]"
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          pointer.current = null;
          setDragX(0);
        }}
        aria-expanded={open}
        aria-label={open ? "Închide chatul" : "Deschide chatul"}
      >
        <span className="absolute inset-[-5px] -z-10 rounded-full border border-amber-500/30 motion-safe:animate-ping [animation-duration:3s]" />
        {open ? <X size={22} /> : <MessageCircle size={23} />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#fffaf1] bg-emerald-500" />
        )}
      </button>
    </div>
  );
}
