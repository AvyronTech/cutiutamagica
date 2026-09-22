import { describe, expect, it } from "vitest";
import { emailSettingsSchema } from "@/lib/email-contracts";
import {
  assertTemplateVariables,
  emailTextToHtml,
  renderEmailTemplate,
} from "./services/email-center";

describe("email center", () => {
  it("accepts only branded sender addresses", () => {
    expect(
      emailSettingsSchema.parse({ ordersFromEmail: "comenzi@cutiutamagica.eu" }).ordersFromEmail,
    ).toBe("comenzi@cutiutamagica.eu");
    expect(() => emailSettingsSchema.parse({ ordersFromEmail: "attacker@example.com" })).toThrow();
  });

  it("renders known variables and rejects unknown ones", () => {
    assertTemplateVariables(
      "order_confirmation",
      "Comanda {{order_number}}",
      "Bună, {{customer_name}}. Total: {{total}}",
    );
    expect(() =>
      assertTemplateVariables("order_confirmation", "Salut", "{{customer_password}}"),
    ).toThrow("Variabile nepermise");
    expect(
      renderEmailTemplate(
        {
          subjectTemplate: "Comanda {{order_number}}",
          textTemplate: "Bună, {{customer_name}}.",
        },
        { order_number: "CM-42", customer_name: "Ana" },
      ),
    ).toEqual({ subject: "Comanda CM-42", text: "Bună, Ana." });
  });

  it("escapes administrator-controlled template content before creating HTML", () => {
    const html = emailTextToHtml("Salut <script>alert(1)</script>\n\nCutiuța Magică");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
