export const adminWorkspaces = {
  identification: { path: "/admin/products/identification", tabs: ["products", "orders"] },
  social: { path: "/admin/social", tabs: ["accounts", "posts", "relationships"] },
  inventory: { path: "/admin/inventory", tabs: ["stock", "supply"] },
} as const;

export type WorkspaceKind = keyof typeof adminWorkspaces;
export type WorkspaceSearch<K extends WorkspaceKind> = {
  tab?: (typeof adminWorkspaces)[K]["tabs"][number];
  product?: string;
  order?: string;
  account?: string;
};

export function readWorkspaceSearch<K extends WorkspaceKind>(
  kind: K,
  input: Record<string, unknown>,
): WorkspaceSearch<K> {
  const result: WorkspaceSearch<K> = {};
  const tabs: readonly string[] = adminWorkspaces[kind].tabs;
  if (typeof input.tab === "string" && tabs.includes(input.tab))
    result.tab = input.tab as NonNullable<WorkspaceSearch<K>["tab"]>;
  for (const key of ["product", "order", "account"] as const) {
    const value = input[key];
    if (typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value)) result[key] = value;
  }
  return result;
}

export function workspaceHref<K extends WorkspaceKind>(
  kind: K,
  search: WorkspaceSearch<K> = {},
): string {
  const values = readWorkspaceSearch(kind, search);
  const params = new URLSearchParams(Object.entries(values));
  return `${adminWorkspaces[kind].path}${params.size ? `?${params}` : ""}`;
}
