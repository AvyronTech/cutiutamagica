import { describe, expect, it } from "vitest";
import { readWorkspaceSearch, workspaceHref } from "./admin-workspaces";
import { matchesSocialDraftDestination } from "./social-destination";
import { adminNotificationLink } from "./admin-notification-link";

describe("consolidated admin workflow destinations", () => {
  it("redirects existing notification links into the right workspace with their context", () => {
    expect(adminNotificationLink("/admin/posts?account=official_instagram")).toBe(
      "/admin/social?tab=posts&account=official_instagram",
    );
    expect(adminNotificationLink("/admin/qr-generator?order=CM-2026-001")).toBe(
      "/admin/products/identification?tab=orders&order=CM-2026-001",
    );
    expect(adminNotificationLink("/admin/suppliers?product=product_kitten")).toBe(
      "/admin/inventory?tab=supply&product=product_kitten",
    );
    expect(adminNotificationLink("//outside.test/admin/posts")).toBeNull();
  });
  it("retains product and order context for the former QR workflow", () => {
    expect(
      workspaceHref("identification", {
        ...readWorkspaceSearch("identification", {
          order: "CM-2026-001",
          product: "product_hp_keeper",
        }),
        tab: "orders",
      }),
    ).toBe("/admin/products/identification?tab=orders&product=product_hp_keeper&order=CM-2026-001");
  });
  it("keeps the same product between inventory, supply and labels", () => {
    const search = readWorkspaceSearch("inventory", { product: "product_kitten", tab: "supply" });
    expect(readWorkspaceSearch("inventory", { ...search, tab: "stock" }).product).toBe(
      search.product,
    );
    expect(workspaceHref("identification", { product: search.product })).toBe(
      "/admin/products/identification?product=product_kitten",
    );
  });
  it("ignores unknown tabs and unsafe context rather than routing outside admin", () => {
    expect(
      readWorkspaceSearch("social", {
        tab: "https://outside.test",
        account: "../owner",
        product: ["one"],
        order: "<script>",
        extra: "secret",
      }),
    ).toEqual({});
  });
  it("uses a stable account id for the shared social composition workflow", () => {
    expect(workspaceHref("social", { tab: "posts", account: "official_instagram" })).toBe(
      "/admin/social?tab=posts&account=official_instagram",
    );
  });
});

describe("social draft destination consistency", () => {
  it("permits an official account on its own platform without claiming a verified connector", () => {
    expect(
      matchesSocialDraftDestination({ provider: "facebook", accountType: "page" }, "facebook"),
    ).toBe(true);
  });
  it("rejects another platform, missing accounts and personal profiles", () => {
    expect(
      matchesSocialDraftDestination({ provider: "facebook", accountType: "page" }, "instagram"),
    ).toBe(false);
    expect(matchesSocialDraftDestination(null, "instagram")).toBe(false);
    expect(
      matchesSocialDraftDestination({ provider: "facebook", accountType: "profile" }, "facebook"),
    ).toBe(false);
  });
});
