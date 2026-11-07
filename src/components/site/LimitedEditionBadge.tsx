import { Gem } from "lucide-react";
import type { ProductLimitedEdition } from "@/data/products";

export function LimitedEditionBadge({
  edition,
  surface = "card",
}: {
  edition?: ProductLimitedEdition;
  surface?: "card" | "hero" | "detail";
}) {
  if (!edition) return null;

  return (
    <span
      className={`limited-edition-seal limited-edition-seal--${surface}`}
      aria-label="Ediție limitată"
    >
      <Gem aria-hidden />
      <span>
        <strong>{surface === "detail" ? "Ediție limitată" : "Limited Edition"}</strong>
      </span>
    </span>
  );
}
