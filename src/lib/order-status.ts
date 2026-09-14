import type { AdminOrderStatus } from "@/lib/admin-contracts";

export interface StoredOrderState {
  orderStatus: string;
  fulfillmentStatus: string;
}

export function toAdminOrderStatus(state: StoredOrderState): AdminOrderStatus {
  if (state.orderStatus === "cancelled") return "Anulată";
  if (state.fulfillmentStatus === "returned") return "Returnată";
  if (state.fulfillmentStatus === "delivered") return "Livrată";
  if (state.fulfillmentStatus === "shipped") return "Expediată";
  if (
    state.orderStatus === "confirmed" ||
    state.orderStatus === "processing" ||
    ["reserved", "picking", "packed"].includes(state.fulfillmentStatus)
  ) {
    return "Procesare";
  }
  return "Nouă";
}

const ALLOWED_TRANSITIONS: Record<AdminOrderStatus, readonly AdminOrderStatus[]> = {
  Nouă: ["Procesare", "Anulată"],
  Procesare: ["Expediată", "Anulată"],
  Expediată: ["Livrată", "Returnată"],
  Livrată: ["Returnată"],
  Returnată: [],
  Anulată: [],
};

export function canTransitionOrderStatus(from: AdminOrderStatus, to: AdminOrderStatus): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}

export function toStoredOrderState(
  status: AdminOrderStatus,
  current: StoredOrderState,
): StoredOrderState {
  switch (status) {
    case "Nouă":
      return { orderStatus: "pending", fulfillmentStatus: "unfulfilled" };
    case "Procesare":
      return { orderStatus: "processing", fulfillmentStatus: "picking" };
    case "Expediată":
      return { orderStatus: "processing", fulfillmentStatus: "shipped" };
    case "Livrată":
      return { orderStatus: "completed", fulfillmentStatus: "delivered" };
    case "Returnată":
      return { orderStatus: "completed", fulfillmentStatus: "returned" };
    case "Anulată":
      return { orderStatus: "cancelled", fulfillmentStatus: current.fulfillmentStatus };
  }
}
