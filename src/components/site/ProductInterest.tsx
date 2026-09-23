import { useId, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import type { Product } from "@/data/products";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProductInterest({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const id = useId();
  const preorder = product.preorderEnabled;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/product-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productSlug: product.id,
          email: form.get("email"),
          website: form.get("website"),
          kind: preorder ? "preorder" : "notify",
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok)
        throw new Error(
          payload.error?.message || "Nu am putut înregistra solicitarea. Încearcă din nou.",
        );
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Încearcă din nou.");
      setState("idle");
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="magic-button magic-button--outline" type="button">
          <Bell size={15} />
          {preorder ? "Solicită precomanda" : "Anunță-mă când apare"}
        </button>
      </DialogTrigger>
      <DialogContent className="interest-dialog">
        <DialogTitle>
          {state === "done"
            ? "Povestea continuă."
            : preorder
              ? "Rezervă-ți o clipă de magie"
              : "Află când revine magia"}
        </DialogTitle>
        <DialogDescription>{product.shortName || product.name}</DialogDescription>
        {state === "done" ? (
          <div role="status" className="interest-success">
            <Check />
            <p>
              Solicitarea ta a fost înregistrată. Te vom contacta la adresa indicată când avem
              noutăți despre această cutiuță.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm">
              {preorder
                ? "Înregistrăm o cerere fără plată. Disponibilitatea, prețul și livrarea vor fi confirmate înaintea unei comenzi."
                : "Lasă-ne adresa ta și te contactăm despre disponibilitatea acestui model."}
            </p>
            <label htmlFor={id} className="block text-sm">
              Adresa de e-mail
            </label>
            <input
              id={id}
              name="email"
              required
              type="email"
              autoComplete="email"
              maxLength={254}
              className="magic-input"
              placeholder="nume@exemplu.ro"
            />
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <p className="text-xs opacity-70">
              Folosim adresa doar pentru această solicitare.{" "}
              <a href="/politica-de-confidentialitate" className="underline">
                Confidențialitate
              </a>
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <button className="magic-button" disabled={state === "sending"}>
              {state === "sending" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Bell size={16} />
              )}{" "}
              {preorder ? "Înregistrează solicitarea" : "Anunță-mă"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
