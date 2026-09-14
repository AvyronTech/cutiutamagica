import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getCommerceOperations, updateReturnStatus } from "@/lib/admin.functions";

const statuses = [
  "submitted",
  "eligibility_review",
  "approved",
  "rejected",
  "in_transit",
  "received",
  "inspecting",
  "refund_pending",
  "refunded",
  "closed",
  "cancelled",
] as const;

export default function Returns() {
  const client = useQueryClient();
  const load = useServerFn(getCommerceOperations);
  const update = useServerFn(updateReturnStatus);
  const query = useQuery({
    queryKey: ["admin", "commerce-operations"],
    queryFn: () => load(),
    staleTime: 15_000,
  });
  const mutation = useMutation({
    mutationFn: ({ returnId, status }: { returnId: string; status: (typeof statuses)[number] }) =>
      update({ data: { returnId, status } }),
    onSuccess: () => {
      toast.success("Statusul returului a fost actualizat");
      client.invalidateQueries({ queryKey: ["admin", "commerce-operations"] });
    },
    onError: (error) =>
      toast.error("Statusul nu a fost actualizat", { description: error.message }),
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <RotateCcw className="h-6 w-6 text-cyan-300" /> Retururi și garanții
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Cererile publice sunt verificate cu datele comenzii, jurnalizate și analizate individual.
        </p>
      </header>
      <section className="overflow-hidden rounded-lg border border-[#28364d] bg-[#111c2e]">
        {query.isLoading ? (
          <div className="grid min-h-48 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          </div>
        ) : (query.data?.returnRequests.length ?? 0) === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Nu există cereri de retur.
          </p>
        ) : (
          <div className="divide-y divide-[#28364d]">
            {query.data?.returnRequests.map((request) => (
              <div
                key={request.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_180px] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{request.returnNumber}</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] ${request.eligibilityStatus === "eligible" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                    >
                      {request.eligibilityStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {request.orderNumber} · {request.customerName} · {request.requestType}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {new Date(request.submittedAt).toLocaleString("ro-RO")}
                  </p>
                </div>
                <select
                  aria-label={`Status ${request.returnNumber}`}
                  value={request.status}
                  disabled={mutation.isPending}
                  onChange={(event) =>
                    mutation.mutate({
                      returnId: request.id,
                      status: event.target.value as (typeof statuses)[number],
                    })
                  }
                  className="rounded-lg border border-[#334155] bg-[#0b1526] px-3 py-2 text-xs text-slate-200"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
