import type { QueryClient, QueryKey } from "@tanstack/react-query";

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
