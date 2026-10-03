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
      aria-label={`Ediție limitată, serie de ${edition.totalUnits} de bucăți`}
    >
      <Gem aria-hidden />
      <span>
        <strong>Limited Edition</strong>
        <small>Serie de {edition.totalUnits} bucăți</small>
      </span>
    </span>
  );
}
