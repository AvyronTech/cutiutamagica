import { createFileRoute } from "@tanstack/react-router";
import { PersonalizationSourceSetup } from "@/admin/pages/PersonalizationSourceSetup";
import { PersonalizationProcurementQueue } from "@/admin/pages/PersonalizationProcurementQueue";

export const Route = createFileRoute("/_authenticated/admin/procurement")({
  component: () => (
    <div className="space-y-5 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Aprovizionare
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Modele pentru personalizare</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Verifică sursa fiecărui model și pregătește cererile existente pentru comandă.
        </p>
      </header>
      <PersonalizationSourceSetup />
      <PersonalizationProcurementQueue />
    </div>
  ),
});
