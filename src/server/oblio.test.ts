import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectOblioCardPayment,
  emitOblioInvoice,
  oblioIssueDate,
  verifyOblioSetup,
} from "./integrations/oblio";

vi.mock("@/server/services/growth-settings", () => ({
  credential: vi.fn(async (_env: unknown, provider: string) =>
    provider === "oblio" ? "secret-oblio-test" : null,
  ),
}));

describe("Oblio invoice adapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the Bucharest calendar date for the fiscal issue date", () => {
    expect(oblioIssueDate(new Date("2026-10-17T22:30:00Z"))).toBe("2026-10-18");
    expect(oblioIssueDate(new Date("2026-01-17T22:30:00Z"))).toBe("2026-01-18");
  });

  const collectionInput = {
    accountEmail: "billing@example.test",
    taxId: "55055976",
    series: "CM",
    number: "0042",
    reference: "cs_paid_42",
    amountBani: 12500,
    capturedAt: "2026-10-20T19:30:00.000Z",
  };

  it("does not record a second collection after an uncertain first response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ access_token: "temporary-access-token" }))
      .mockResolvedValueOnce(
        Response.json({
          status: 200,
          data: {
            seriesName: "CM",
            number: "0042",
            collects: [{ type: "Card", number: "cs_paid_42", value: 125 }],
          },
        }),
      );
    await expect(collectOblioCardPayment({} as never, collectionInput)).resolves.toBe(
      "already_collected",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("records and verifies a card collection against the exact payment reference", async () => {
    const empty = { status: 200, data: { seriesName: "CM", number: "0042", collects: [] } };
    const collected = {
      status: 200,
      data: {
        seriesName: "CM",
        number: "0042",
        collects: [{ type: "Card", number: "cs_paid_42", value: "125.00" }],
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ access_token: "temporary-access-token" }))
      .mockResolvedValueOnce(Response.json(empty))
      .mockResolvedValueOnce(Response.json(collected))
      .mockResolvedValueOnce(Response.json(collected));
    await expect(collectOblioCardPayment({} as never, collectionInput)).resolves.toBe("collected");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const [url, init] = fetchMock.mock.calls[2]!;
    expect(String(url)).toBe("https://www.oblio.eu/api/docs/invoice/collect");
    const body = init?.body as URLSearchParams;
    expect(body.get("collect[type]")).toBe("Card");
    expect(body.get("collect[documentNumber]")).toBe("cs_paid_42");
    expect(body.get("collect[value]")).toBe("125.00");
    expect(body.get("collect[issueDate]")).toBe("2026-10-20");
  });

  it("requires manual reconciliation if another collection is already present", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ access_token: "temporary-access-token" }))
      .mockResolvedValueOnce(
        Response.json({
          status: 200,
          data: {
            seriesName: "CM",
            number: "0042",
            collects: [{ type: "Ordin de plata", number: "OP 1", value: 125 }],
          },
        }),
      );
    await expect(collectOblioCardPayment({} as never, collectionInput)).rejects.toMatchObject({
      code: "OBLIO_COLLECTION_CONFLICT",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("verifies the company, invoice series and non-VAT rate without issuing a document", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ access_token: "temporary-access-token" }))
      .mockResolvedValueOnce(Response.json({ status: 200, data: [{ cif: "55055976" }] }))
      .mockResolvedValueOnce(
        Response.json({
          status: 200,
          data: [{ type: "Factura", name: "CM", start: "0001", next: "0001" }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ status: 200, data: [{ name: "Neplatitor TVA", percent: 0 }] }),
      );

    await expect(
      verifyOblioSetup({} as never, {
        accountEmail: "billing@example.test",
        taxId: "55055976",
        series: "CM",
        expectedNextNumber: 1,
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.every(([url]) => !String(url).endsWith("/docs/invoice"))).toBe(
      true,
    );
  });

  it("authorizes separately and sends an idempotent product/service invoice", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "temporary-access-token", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 200, data: [{ cif: "55055976" }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 200,
            data: [{ type: "Factura", name: "CM", start: "0001", next: "0042" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 200, data: [{ name: "Neplatitor TVA", percent: 0 }] }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 200,
            statusMessage: "Success",
            data: { seriesName: "CM", number: "0042", link: "https://www.oblio.eu/invoice.pdf" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const result = await emitOblioInvoice({} as never, {
      orderId: "order-42",
      accountEmail: "billing@example.test",
      taxId: "55055976",
      series: "CM",
      expectedNextNumber: 42,
      currency: "RON",
      customer: {
        name: "Client Test",
        email: "client@example.test",
        phone: "+40700000000",
        country: "RO",
        county: "București",
        city: "București",
        address: "Adresă test",
      },
      lines: [
        {
          name: "Cutiuță muzicală",
          sku: "CM-01",
          quantity: 1,
          unitPrice: 99,
          vatRate: 0,
          itemType: "product",
        },
        {
          name: "Personalizare",
          sku: "SERV-01",
          quantity: 1,
          unitPrice: 20,
          vatRate: 0,
          itemType: "service",
        },
      ],
    });

    expect(result).toEqual({
      number: "0042",
      series: "CM",
      pdfUrl: "https://www.oblio.eu/invoice.pdf",
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const tokenBody = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(tokenBody.get("client_secret")).toBe("secret-oblio-test");
    const invoiceBody = JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body));
    expect(invoiceBody.idempotencyKey).toBe("cutiuta-magica/order-42/invoice-v1");
    expect(invoiceBody.products.map((line: { productType: string }) => line.productType)).toEqual([
      "Marfa",
      "Serviciu",
    ]);
    expect(invoiceBody.products.map((line: { vatName: string }) => line.vatName)).toEqual([
      "Neplatitor TVA",
      "Neplatitor TVA",
    ]);
    expect(fetchMock.mock.calls[4]?.[1]?.headers).toMatchObject({
      authorization: "Bearer temporary-access-token",
    });
  });

  it("does not issue when the connected Oblio account belongs to another company", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ access_token: "temporary-access-token" }))
      .mockResolvedValueOnce(Response.json({ status: 200, data: [{ cif: "99999999" }] }));

    await expect(
      emitOblioInvoice({} as never, {
        orderId: "order-42",
        accountEmail: "billing@example.test",
        taxId: "55055976",
        series: "CM",
        expectedNextNumber: 1,
        currency: "RON",
        customer: {
          name: "Client Test",
          phone: "0700000000",
          country: "RO",
          city: "București",
          address: "Adresă test",
        },
        lines: [
          {
            name: "Cutiuță muzicală",
            sku: "CM-01",
            quantity: 1,
            unitPrice: 99,
            vatRate: 0,
            itemType: "product",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "OBLIO_COMPANY_MISMATCH" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
