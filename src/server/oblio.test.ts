import { afterEach, describe, expect, it, vi } from "vitest";
import { emitOblioInvoice } from "./integrations/oblio";

vi.mock("@/server/services/growth-settings", () => ({
  credential: vi.fn(async (_env: unknown, provider: string) =>
    provider === "oblio" ? "secret-oblio-test" : null,
  ),
}));

describe("Oblio invoice adapter", () => {
  afterEach(() => vi.restoreAllMocks());

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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const tokenBody = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(tokenBody.get("client_secret")).toBe("secret-oblio-test");
    const invoiceBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(invoiceBody.idempotencyKey).toBe("cutiuta-magica/order-42/invoice-v1");
    expect(invoiceBody.products.map((line: { productType: string }) => line.productType)).toEqual([
      "Marfa",
      "Serviciu",
    ]);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      authorization: "Bearer temporary-access-token",
    });
  });
});
