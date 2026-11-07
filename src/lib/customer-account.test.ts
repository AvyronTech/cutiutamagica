import { describe, expect, it } from "vitest";
import { authDestination, customerAccountSection, isAdminDestination } from "./customer-account";

describe("customer account navigation", () => {
  it("starts with orders and preserves profile recovery and existing account links", () => {
    expect(customerAccountSection("")).toBe("comenzi");
    expect(customerAccountSection("#securitatea-contului")).toBe("profil");
    for (const section of ["comenzi", "beneficii", "calendar", "portofel", "profil", "cereri"])
      expect(customerAccountSection(`#${section}`)).toBe(section);
    expect(customerAccountSection("admin")).toBe("comenzi");
  });

  it("keeps checkout and account destinations in customer login mode", () => {
    expect(isAdminDestination("/comanda")).toBe(false);
    expect(authDestination("/comanda", "client")).toBe("/comanda");
    expect(authDestination("/cont#calendar", "client")).toBe("/cont#calendar");
    expect(isAdminDestination("/admin/orders?page=2")).toBe(true);
    expect(authDestination("/admin/orders", "client")).toBe("/cont");
    expect(authDestination("/admin/orders?page=2", "admin")).toBe("/admin/orders?page=2");
    expect(authDestination("/cont", "admin")).toBe("/admin");
  });

  it("rejects external, protocol-relative, backslash and privileged redirect targets", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\nevil.example",
      "/api/v1/admin",
      "/_server/operation",
      "/auth?role=admin",
    ]) {
      expect(authDestination(value, "client")).toBe("/cont");
    }
    expect(authDestination("/%2e%2e/admin", "client")).toBe("/cont");
    expect(authDestination("//evil.example", "admin")).toBe("/admin");
  });
});
