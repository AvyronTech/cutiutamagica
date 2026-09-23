import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, X } from "lucide-react";
import { toast } from "sonner";
import type { StorefrontMessage } from "@/lib/storefront-messages";
import {
  MESSAGE_GAP_MS,
  MESSAGE_SESSION_LIMIT,
  nextStorefrontMessage,
  readMessageSession,
  type MessageSession,
} from "@/lib/message-sequence";
import { BrandMark } from "./BrandMark";
const storageKey = "cm:message-sequence:v2";
let memory: MessageSession = { shown: [], muted: false };

export function ContextualMessages() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const query = useQuery({
    queryKey: ["storefront-messages"],
    queryFn: async ({ signal }) => {
      const r = await fetch("/api/v1/storefront/messages", { signal });
      if (!r.ok) return [];
      return ((await r.json()) as { data: StorefrontMessage[] }).data;
    },
    staleTime: 300000,
    retry: false,
  });
  useEffect(() => {
    if (!query.data?.length) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) memory = readMessageSession(saved);
    } catch {
      /* In-memory session also works when storage is blocked. */
    }
    const placement =
      path === "/"
        ? "home"
        : path === "/produse"
          ? "products"
          : path.startsWith("/produs/")
            ? "product"
            : path === "/comanda"
              ? "cart"
              : null;
    if (!placement || memory.muted || memory.shown.length >= MESSAGE_SESSION_LIMIT) return;
    let active: string | number | undefined,
      elapsed = 0,
      last = performance.now(),
      lastInteraction = performance.now(),
      nextAt = 0,
      pageCount = 0;
    const programmaticDismissals = new Set<string | number>();
    const dismiss = (id: string | number) => {
      programmaticDismissals.add(id);
      toast.dismiss(id);
    };
    const persist = () => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(memory));
      } catch {
        /* Memory fallback. */
      }
    };
    const finish = (mute = false) => {
      active = undefined;
      nextAt = performance.now() + MESSAGE_GAP_MS;
      if (mute) {
        memory.muted = true;
        persist();
      }
    };
    const tick = () => {
      if (
        active === undefined &&
        (memory.muted ||
          memory.shown.length >= MESSAGE_SESSION_LIMIT ||
          (placement !== "home" && pageCount >= 1))
      ) {
        clearInterval(interval);
        return;
      }
      const now = performance.now(),
        delta = Math.min(1000, now - last);
      last = now;
      const obstructed =
        !!document.querySelector(
          '[role="dialog"], [aria-modal="true"], [aria-label="Chat Cutiuța Magică"]',
        ) ||
        /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? "") ||
        (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable);
      if (
        document.hidden ||
        obstructed ||
        (active !== undefined && document.querySelectorAll("[data-sonner-toast]").length > 1)
      ) {
        if (active !== undefined) {
          dismiss(active);
          finish();
        }
        return;
      }
      if (document.readyState !== "complete" || document.querySelector(".story-loader")) return;
      elapsed += delta / 1000;
      if (
        active !== undefined ||
        now < nextAt ||
        now - lastInteraction < 2500 ||
        document.querySelector("[data-sonner-toast]") ||
        (placement !== "home" && pageCount >= 1)
      )
        return;
      const max = document.documentElement.scrollHeight - innerHeight;
      const message = nextStorefrontMessage(
        query.data!,
        memory,
        placement,
        elapsed,
        max > 0 ? (scrollY / max) * 100 : 0,
      );
      if (!message) return;
      memory.shown.push(message.id);
      persist();
      pageCount++;
      const sequence = memory.shown.length;
      active = toast.custom(
        (id) => (
          <aside className="context-message context-message--magic" aria-label={message.title}>
            <div className="context-message-seal" aria-hidden="true">
              <BrandMark className="h-11 w-11" />
            </div>
            <div className="context-message-copy">
              <span className="context-message-eyebrow">
                Un strop de magie <span aria-hidden="true">✧</span>
              </span>
              <strong>{message.title}</strong>
              <p>{message.message}</p>
              <Link
                to={message.link}
                onClick={() => {
                  dismiss(id);
                  finish();
                }}
              >
                {message.label}
                <ArrowUpRight size={14} />
              </Link>
              <span className="context-message-constellation" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <i key={n} className={n <= sequence ? "is-lit" : ""} />
                ))}
              </span>
            </div>
            <button
              type="button"
              aria-label="Închide și oprește sugestiile pentru această vizită"
              title="Oprește sugestiile"
              onClick={() => {
                finish(true);
                dismiss(id);
              }}
            >
              <X size={16} />
            </button>
          </aside>
        ),
        {
          duration: 5000,
          position: "bottom-left",
          onAutoClose: () => finish(),
          onDismiss: (t) => {
            if (!programmaticDismissals.delete(t.id)) finish(true);
          },
        },
      );
    };
    const interaction = () => {
      lastInteraction = performance.now();
    };
    window.addEventListener("pointerdown", interaction, { passive: true });
    window.addEventListener("keydown", interaction);
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", interaction);
      window.removeEventListener("keydown", interaction);
      if (active !== undefined) dismiss(active);
    };
  }, [path, query.data]);
  return null;
}
