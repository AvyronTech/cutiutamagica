import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { extractSpreadsheetXml, parseCsv, rowsToCsv, rowsToXlsx } from "./catalog-spreadsheet";

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

describe("spreadsheet archive boundaries", () => {
  it("rejects a tiny compressed archive with oversized worksheet metadata before inflating", () => {
    const bytes = zipSync({ "xl/worksheets/sheet1.xml": new Uint8Array(4_000_001) });
    expect(bytes.length).toBeLessThan(1_000_000);
    expect(() => extractSpreadsheetXml(bytes)).toThrow("prea mare");
  });
  it("bounds shared strings and worksheet size together", () => {
    const bytes = zipSync({
      "xl/worksheets/sheet1.xml": new Uint8Array(3_100_000),
      "xl/sharedStrings.xml": new Uint8Array(3_100_000),
    });
    expect(() => extractSpreadsheetXml(bytes)).toThrow("prea mare");
  });
  it("never inflates unrelated payloads, macros or relationships", () => {
    const bytes = zipSync({
      "xl/worksheets/sheet1.xml": strToU8("<worksheet/>"),
      "xl/vbaProject.bin": new Uint8Array(8_000_000),
      "xl/_rels/workbook.xml.rels": strToU8("https://external.invalid"),
    });
    expect(Object.keys(extractSpreadsheetXml(bytes))).toEqual(["xl/worksheets/sheet1.xml"]);
  });
});

it("rejects too many ZIP entries before inflating the worksheet", () => {
  const files: Record<string, Uint8Array> = { "xl/worksheets/sheet1.xml": strToU8("<worksheet/>") };
  for (let i = 0; i < 128; i++) files[`extra/${i}`] = new Uint8Array();
  expect(() => extractSpreadsheetXml(zipSync(files))).toThrow("prea multe");
});
