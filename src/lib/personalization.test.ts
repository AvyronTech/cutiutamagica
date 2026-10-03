import { describe, expect, it } from "vitest";
import {
  PERSONALIZATION_BASE_PRICE_BANI,
  PERSONALIZATION_GIFT_WRAP_BANI,
  personalizationFieldsSchema,
  personalizationReference,
  personalizationTotalBani,
} from "./personalization";

describe("personalization contract", () => {
  it("calculates only the approved 189 lei and 35 lei prices", () => {
    expect(personalizationTotalBani(false)).toBe(PERSONALIZATION_BASE_PRICE_BANI);
    expect(personalizationTotalBani(true)).toBe(
      PERSONALIZATION_BASE_PRICE_BANI + PERSONALIZATION_GIFT_WRAP_BANI,
    );
  });

  it("accepts the two colors and three melody identifiers", () => {
    const base = {
      customerName: "Ana Pop",
      email: "ANA@EXAMPLE.RO",
      phone: "+40 712 345 678",
      boxModel: "classic",
      engraving: "",
      giftWrap: "false",
      notes: "",
      consent: "true",
      website: "",
    };
    for (const boxColor of ["black", "yellow"]) {
      for (const melody of ["melody-1", "melody-2", "melody-3"]) {
        const result = personalizationFieldsSchema.parse({ ...base, boxColor, melody });
        expect(result.email).toBe("ana@example.ro");
      }
    }
  });

  it("generates a short customer reference without exposing the full id", () => {
    expect(personalizationReference("12345678-abcd-4def-8123-123456789012")).toBe("CM-12345678");
  });
});
