import { describe, expect, it } from "vitest";
import {
  channelAllowsCommercialListings,
  channelRequiresVerifiedConnector,
  salesChannelDefinitions,
  validChannelUrl,
} from "./sales-channels";

describe("sales channel policy", () => {
  it("blocks commercial Cutiuța Magică listings on Vinted", () => {
    expect(channelAllowsCommercialListings("vinted")).toBe(false);
    expect(channelRequiresVerifiedConnector("vinted")).toBe(false);
    expect(salesChannelDefinitions.vinted.orderMode).toBe("none");
  });

  it("keeps eligible marketplaces behind verified connectors", () => {
    expect(channelRequiresVerifiedConnector("emag")).toBe(true);
    expect(channelRequiresVerifiedConnector("trendyol")).toBe(true);
    expect(channelRequiresVerifiedConnector("okazii")).toBe(true);
    expect(salesChannelDefinitions.emag.mode).toContain("v4.5.1");
    expect(salesChannelDefinitions.trendyol.orderMode).toBe("official_api_v2");
    expect(salesChannelDefinitions.okazii.orderMode).toBe("manual_import");
  });

  it("accepts only official portal hosts", () => {
    expect(validChannelUrl("emag", "https://marketplace.emag.ro/dashboard")).toBe(true);
    expect(validChannelUrl("trendyol", "https://partner.trendyol.com/products")).toBe(true);
    expect(validChannelUrl("okazii", "https://www.okazii.ro/contul-meu")).toBe(true);
    expect(validChannelUrl("emag", "https://emag.example.com/phishing")).toBe(false);
  });
});
