import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { WorkspaceActivity } from "./workspace-activity";

type Tab = { id: string; label: string; description: string; icon: LucideIcon; content: ReactNode };

export function Workspace({
  title,
  description,
  active,
  onSelect,
  tabs,
  toolbar,
  compactTabs = false,
}: {
  title: string;
  description: string;
  active: string;
  onSelect: (tab: string) => void;
  tabs: Tab[];
  toolbar?: ReactNode;
  compactTabs?: boolean;
}) {
  const id = useId();
  const [visited, setVisited] = useState<string[]>([active]);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(
    () => setVisited((previous) => (previous.includes(active) ? previous : [...previous, active])),
    [active],
  );
  return (
    <div className="min-w-0 space-y-4 md:space-y-5">
      <header className="rounded-2xl border border-amber-200/15 bg-[linear-gradient(120deg,#142238,#101827)] p-4 md:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-amber-200">
          Atelier · spațiu de lucru
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white md:text-2xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
      </header>
      {toolbar}
      <div
        role="tablist"
        aria-label={title}
        className={`grid gap-2 sm:flex sm:flex-wrap ${compactTabs ? "grid-cols-2" : ""}`}
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttons.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-${tab.id}-tab`}
              aria-controls={`${id}-${tab.id}-panel`}
              aria-selected={active === tab.id}
              tabIndex={active === tab.id ? 0 : -1}
              onClick={() => {
                if (active !== tab.id) onSelect(tab.id);
              }}
              onKeyDown={(event) => {
                let next: number | undefined;
                if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
                if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
                if (event.key === "Home") next = 0;
                if (event.key === "End") next = tabs.length - 1;
                if (next === undefined) return;
                event.preventDefault();
                onSelect(tabs[next].id);
                buttons.current[tabs[next].id]?.focus();
              }}
              className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${active === tab.id ? "border-amber-200/40 bg-amber-200/10 text-white" : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500"}`}
            >
              <Icon className="h-4 w-4 flex-none text-amber-200" aria-hidden />
              <span>
                <strong className="block text-sm font-semibold">{tab.label}</strong>
                <span
                  className={`mt-0.5 text-xs text-slate-400 ${compactTabs ? "hidden sm:block" : "block"}`}
                >
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <section
          key={tab.id}
          role="tabpanel"
          id={`${id}-${tab.id}-panel`}
          aria-labelledby={`${id}-${tab.id}-tab`}
          hidden={active !== tab.id}
        >
          {(active === tab.id || visited.includes(tab.id)) && (
            <WorkspaceActivity.Provider value={active === tab.id}>
              <Suspense
                fallback={
                  <p
                    role="status"
                    className="rounded-xl border border-slate-700 p-5 text-sm text-slate-300"
                  >
                    Se încarcă secțiunea…
                  </p>
                }
              >
                {tab.content}
              </Suspense>
            </WorkspaceActivity.Provider>
          )}
        </section>
      ))}
    </div>
  );
}
