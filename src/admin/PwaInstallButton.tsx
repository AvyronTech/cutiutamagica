import { useEffect, useState } from "react";
import { CheckCircle2, Download, MonitorDown, Share, Smartphone, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { registerAdminDevice } from "@/lib/operations.functions";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function platform(): "ios" | "android" | "desktop" | "unknown" {
  const agent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agent)) return "ios";
  if (/android/.test(agent)) return "android";
  return /macintosh|windows|linux/.test(agent) ? "desktop" : "unknown";
}

function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallButton() {
  const registerDevice = useServerFn(registerAdminDevice);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [guide, setGuide] = useState(false);
  const currentPlatform = typeof navigator === "undefined" ? "unknown" : platform();

  useEffect(() => {
    setInstalled(standalone());
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  useEffect(() => {
    if (!installed) return;
    const key = "cutiuta:admin-device-id";
    const deviceId = localStorage.getItem(key) ?? crypto.randomUUID();
    localStorage.setItem(key, deviceId);
    const deviceLabel =
      currentPlatform === "ios"
        ? "iPhone/iPad"
        : currentPlatform === "android"
          ? "Android"
          : "Browser desktop";
    void registerDevice({
      data: {
        deviceId,
        name: `${deviceLabel} · ${navigator.platform || "staff"}`,
        platform: currentPlatform,
      },
    }).catch(() => undefined);
  }, [currentPlatform, installed, registerDevice]);

  const install = async () => {
    if (installed) return;
    if (!prompt) {
      setGuide(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/15"
        title={installed ? "Aplicația rulează instalată" : "Instalează aplicația de administrare"}
      >
        {installed ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        <span className="hidden sm:inline">
          {installed ? "Aplicație instalată" : "Descarcă aplicația"}
        </span>
      </button>

      {guide && (
        <div
          className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Instalare aplicație"
        >
          <section className="w-full max-w-md rounded-lg border border-cyan-300/20 bg-slate-900 p-5 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200">
                  {currentPlatform === "desktop" ? (
                    <MonitorDown size={19} />
                  ) : (
                    <Smartphone size={19} />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold">Instalează Cutiuța Magică Admin</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Aplicația deschide direct dashboardul și păstrează aceeași autentificare
                    securizată.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGuide(false)}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Închide"
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
              {currentPlatform === "ios" ? (
                <p>
                  <Share className="mr-2 inline h-4 w-4 text-cyan-300" /> În Safari apasă
                  <strong> Partajează</strong>, apoi <strong>Adaugă pe ecranul principal</strong> și
                  confirmă.
                </p>
              ) : currentPlatform === "android" ? (
                <p>
                  În meniul browserului alege <strong>Instalează aplicația</strong> sau
                  <strong> Adaugă pe ecranul principal</strong>. Folosește Chrome pentru instalare
                  completă.
                </p>
              ) : (
                <p>
                  În Chrome sau Edge folosește pictograma de instalare din bara de adrese ori meniul{" "}
                  <strong>Instalează Cutiuța Magică Admin</strong>.
                </p>
              )}
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-500">
              Din motive de securitate, instalarea nu elimină expirarea sesiunii și nu stochează
              parola pe dispozitiv.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
