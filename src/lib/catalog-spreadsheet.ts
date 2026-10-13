import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { escapeCsv } from "./product-identification";

export const IDENTIFICATION_COLUMNS = [
  "product_id",
  "variant_id",
  "product_name",
  "variant_name",
  "sku",
  "gtin",
  "gtin_status",
  "gtin_source",
  "lot_code",
  "lot_initial",
  "lot_available",
  "location_id",
  "lot_source",
  "supplier_reference",
  "stock_available",
  "personalization_codes",
] as const;

const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[character] ?? character,
  );

export function rowsToCsv(rows: string[][]): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [],
    row: string[] = [];
  let value = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(value);
      value = "";
      if (row.some((cell) => cell !== "")) rows.push([...row]);
      row.length = 0;
    } else value += char;
  }
  if (quoted) throw new Error("Fișierul CSV are ghilimele neînchise.");
  row.push(value);
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function columnName(index: number): string {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
}

export function rowsToXlsx(rows: string[][]): Blob {
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((cell, c) => `<c r="${columnName(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Catalog" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  };
  return new Blob([new Uint8Array(zipSync(files, { level: 6 }))], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.size > 1_000_000) throw new Error("Fișierul trebuie să aibă sub 1 MB.");
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Alege un fișier CSV sau XLSX.");
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const sheet = files["xl/worksheets/sheet1.xml"];
  if (!sheet || sheet.length > 4_000_000)
    throw new Error("Fișierul Excel este invalid sau prea mare.");
  const parser = new DOMParser();
  const doc = parser.parseFromString(strFromU8(sheet), "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Fișierul Excel este invalid.");
  const shared = files["xl/sharedStrings.xml"];
  const sharedStrings = shared
    ? Array.from(
        parser.parseFromString(strFromU8(shared), "application/xml").getElementsByTagName("si"),
      ).map((node) => node.textContent ?? "")
    : [];
  const rows: Array<string[]> = [];
  for (const row of Array.from(doc.getElementsByTagName("row")).slice(0, 101)) {
    const values: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c")).slice(0, 30)) {
      const reference = cell.getAttribute("r") || "A1";
      const letters = reference.match(/^[A-Z]+/)?.[0] || "A";
      let index = 0;
      for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
      index--;
      const raw =
        cell.getElementsByTagName("v")[0]?.textContent ??
        cell.getElementsByTagName("is")[0]?.textContent ??
        "";
      values[index] = cell.getAttribute("t") === "s" ? (sharedStrings[Number(raw)] ?? "") : raw;
    }
    if (values.some(Boolean))
      rows.push(
        Array.from({ length: Math.max(values.length, 12) }, (_, index) => values[index] ?? ""),
      );
  }
  return rows;
}
