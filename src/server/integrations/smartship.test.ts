import { describe, expect, it } from "vitest";
import { parseSmartShipTracking } from "./smartship";

const response = {
  status: 200,
  awb: "874156063265",
  tracking_link: "https://smartship.ro/t/aB3xK9mQw2",
  awb_status: 1,
  awb_status_desc: "În tranzit",
  carrier: "Cargus",
  tracking: [
    { date: "2026-07-09 14:20:00", event_id: "1", description: "Colet ridicat", locality: "Iași" },
  ],
};

describe("SmartShip tracking", () => {
  it("accepts only the AWB requested and maps provider statuses", () => {
    expect(parseSmartShipTracking(response, response.awb)).toMatchObject({
      status: "in_transit",
      carrier: "Cargus",
      events: [{ description: "Colet ridicat", locality: "Iași" }],
    });
    expect(parseSmartShipTracking({ ...response, awb_status: 2 }, response.awb).status).toBe(
      "delivered",
    );
    expect(parseSmartShipTracking({ ...response, awb_status: 6 }, response.awb).status).toBe(
      "returned",
    );
    expect(parseSmartShipTracking({ ...response, awb_status: 5 }, response.awb).status).toBe(
      "exception",
    );
    expect(() => parseSmartShipTracking(response, "OTHER-AWB")).toThrow();
    expect(() => parseSmartShipTracking({ ...response, awb_status: 99 }, response.awb)).toThrow();
  });

  it("drops unsafe links and malformed events from the provider response", () => {
    const result = parseSmartShipTracking(
      {
        ...response,
        tracking_link: "javascript:alert(1)",
        tracking: [
          ...response.tracking,
          { date: "invalid", description: "Ignored" },
          { date: "2026-07-10 08:00:00", description: "" },
        ],
      },
      response.awb,
    );
    expect(result.trackingUrl).toBeNull();
    expect(result.events).toHaveLength(1);
  });
});
