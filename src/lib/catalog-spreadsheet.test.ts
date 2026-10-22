import { describe, expect, it } from "vitest";
import { parseCsv, rowsToCsv, rowsToXlsx } from "./catalog-spreadsheet";

describe("catalog import and export", () => {
  it("round trips commas, diacritics and leading spreadsheet formulas as text", () => {
    const rows = [
      ["sku", "product_name"],
      ["CM-PIS-001", "Cutiuța, Pisicuță"],
      ["CM-X-001", "=1+1"],
    ];
    expect(parseCsv(rowsToCsv(rows))).toEqual([
      ["sku", "product_name"],
      ["CM-PIS-001", "Cutiuța, Pisicuță"],
      ["CM-X-001", "'=1+1"],
    ]);
  });
  it("creates a real ZIP based XLSX workbook", async () => {
    const blob = rowsToXlsx([
      ["SKU", "Nume"],
      ["CM-01", "Cutiuță"],
    ]);
    expect(blob.type).toContain("spreadsheetml.sheet");
    expect(new Uint8Array(await blob.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([80, 75]));
  });
});
