import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Reviewer } from "./reviews";

export function isCurrentCustomer(client: QueryClient, id: string) {
  return client.getQueryData<Reviewer | null>(["reviewer"])?.id === id;
}

export function updateCurrentCustomer(client: QueryClient, account: Reviewer) {
  if (!isCurrentCustomer(client, account.id)) return false;
  client.setQueryData(["reviewer"], account);
  return true;
}

function isPrivateCustomerQuery(key: QueryKey) {
  return ["reviewer", "customer", "customer-billing", "personalization-requests"].includes(
    String(key[0]),
  );
}

export async function clearCustomerSession(client: QueryClient) {
  const filters = {
    predicate: (query: { queryKey: QueryKey }) => isPrivateCustomerQuery(query.queryKey),
  };
  await client.cancelQueries(filters);
  client.removeQueries({
    predicate: (query) =>
      query.queryKey[0] !== "reviewer" && isPrivateCustomerQuery(query.queryKey),
  });
  client.setQueryData(["reviewer"], null);
}
