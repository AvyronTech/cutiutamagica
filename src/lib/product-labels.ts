import { createElement } from "react";
import { QRCodeSVG } from "qrcode.react";
import { gtinType } from "./product-identification";

export type LabelFormat = "40x40" | "50x50" | "50x30" | "custom";
export type LabelInput = {
  name: string;
  sku: string;
  gtin?: string | null;
  qrUrl?: string | null;
  lotCode?: string | null;
  variantName?: string | null;
};
export type LabelOptions = {
  widthMm: number;
  heightMm: number;
  name: boolean;
  sku: boolean;
  gtin: boolean;
  qr: boolean;
  code128: boolean;
  eanGraphic: boolean;
  lot: boolean;
  variant: boolean;
  logo: boolean;
};

export const labelSize = (format: LabelFormat, customWidth = 50, customHeight = 40) => {
  if (format === "custom") return { widthMm: customWidth, heightMm: customHeight };
  const [widthMm, heightMm] = format.split("x").map(Number);
  return { widthMm, heightMm };
};

const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );

function nestedSvg(markup: string, x: number, y: number, width: number, height: number): string {
  const node = new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;
  if (node.nodeName.toLowerCase() !== "svg") throw new Error("Codul grafic nu a putut fi generat.");
  const originalWidth = Number(node.getAttribute("width")?.replace(/[^0-9.]/g, "")) || 512;
  const originalHeight = Number(node.getAttribute("height")?.replace(/[^0-9.]/g, "")) || 512;
  if (!node.getAttribute("viewBox"))
    node.setAttribute("viewBox", `0 0 ${originalWidth} ${originalHeight}`);
  node.setAttribute("x", String(x));
  node.setAttribute("y", String(y));
  node.setAttribute("width", String(width));
  node.setAttribute("height", String(height));
  return new XMLSerializer().serializeToString(node);
}

export async function barcodeSvg(
  value: string,
  format: "CODE128" | "EAN8" | "EAN13" | "UPC" | "ITF14" = "CODE128",
): Promise<string> {
  const { default: JsBarcode } = await import("jsbarcode");
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(node, value, {
    format,
    width: 2,
    height: 72,
    margin: 10,
    displayValue: false,
    background: "#ffffff",
    lineColor: "#111111",
  });
  return new XMLSerializer().serializeToString(node);
}

export function gtinBarcodeFormat(value: string): "EAN8" | "EAN13" | "UPC" | "ITF14" | null {
  switch (gtinType(value)) {
    case "GTIN-8":
      return "EAN8";
    case "GTIN-12":
      return "UPC";
    case "GTIN-13":
      return "EAN13";
    case "GTIN-14":
      return "ITF14";
    default:
      return null;
  }
}

let embeddedLogo: string | null = null;
async function logoDataUrl(): Promise<string> {
  if (embeddedLogo) return embeddedLogo;
  const response = await fetch("/brand/music-box-universal.webp", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Logoul nu a putut fi încărcat.");
  const blob = await response.blob();
  embeddedLogo = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Logoul nu a putut fi citit."));
    reader.readAsDataURL(blob);
  });
  return embeddedLogo;
}

export async function renderLabelSvg(input: LabelInput, options: LabelOptions): Promise<string> {
  const { widthMm: w, heightMm: h } = options;
  if (w < 35 || w > 150 || h < 25 || h > 150)
    throw new Error("Dimensiunea etichetei trebuie să fie între 35×25 și 150×150 mm.");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const margin = 2.3;
  const qrSize = options.qr && input.qrUrl ? Math.min(19, h - 13, w * 0.34) : 0;
  const codeWidth = w - margin * 2 - (qrSize ? qrSize + 2 : 0);
  const headerX = options.logo ? 9.2 : margin;
  const headerWidth = w - headerX - margin;
  const title =
    input.name.length > Math.floor(headerWidth / 1.6)
      ? `${input.name.slice(0, Math.floor(headerWidth / 1.6) - 1)}…`
      : input.name;
  const pieces = [`<rect x="0" y="0" width="${w}" height="${h}" rx="1.5" fill="#fff"/>`];
  if (options.logo)
    pieces.push(`<image href="${await logoDataUrl()}" x="2" y="1.5" width="6.5" height="6.5"/>`);
  pieces.push(
    `<text x="${headerX}" y="5" font-family="Arial,sans-serif" font-size="3.1" font-weight="700" fill="#111">${xml(options.name ? title : "Cutiuța Magică")}</text>`,
  );
  if (options.sku)
    pieces.push(
      `<text x="${headerX}" y="8" font-family="Arial,sans-serif" font-size="2.4" fill="#333">SKU ${xml(input.sku)}</text>`,
    );
  const barcodeTop = h <= 30 ? 10 : 11;
  const barcodeBottom =
    h -
    (options.eanGraphic && input.gtin && h >= 40
      ? 12.5
      : options.gtin && input.gtin
        ? 6.2
        : options.lot && input.lotCode
          ? 5.5
          : 3);
  if (options.code128 && codeWidth >= 23) {
    const barcode = await barcodeSvg(input.sku);
    pieces.push(
      nestedSvg(barcode, margin, barcodeTop, codeWidth, Math.max(7, barcodeBottom - barcodeTop)),
    );
  }
  if (qrSize && input.qrUrl) {
    const qr = renderToStaticMarkup(
      createElement(QRCodeSVG, { value: input.qrUrl, size: 512, level: "M", marginSize: 2 }),
    );
    pieces.push(nestedSvg(qr, w - margin - qrSize, barcodeTop, qrSize, qrSize));
  }
  if (options.eanGraphic && input.gtin && h >= 40) {
    const format = gtinBarcodeFormat(input.gtin);
    if (format)
      pieces.push(
        nestedSvg(await barcodeSvg(input.gtin, format), margin, h - 11.5, codeWidth, 6.8),
      );
  }
  const notes = [
    options.gtin && input.gtin ? `${gtinType(input.gtin)} ${input.gtin}` : null,
    options.lot && input.lotCode ? input.lotCode : null,
    options.variant && input.variantName ? input.variantName : null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (notes)
    pieces.push(
      `<text x="${margin}" y="${h - 1.8}" font-family="Arial,sans-serif" font-size="2.25" fill="#222">${xml(notes.slice(0, Math.floor((w - 2 * margin) / 1.2)))}</text>`,
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${pieces.join("")}</svg>`;
}

export async function svgToPng(svg: string, widthMm: number, heightMm: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Eticheta nu a putut fi randată."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((widthMm / 25.4) * 300);
    canvas.height = Math.ceil((heightMm / 25.4) * 300);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponibil.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG indisponibil."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function labelsToPdf(
  labels: Array<{ input: LabelInput; svg: string }>,
  options: LabelOptions,
  a4: boolean,
): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const point = (mm: number) => (mm * 72) / 25.4;
  const margin = point(10),
    gap = point(3);
  const width = point(options.widthMm),
    height = point(options.heightMm);
  const pageWidth = a4 ? point(210) : width,
    pageHeight = a4 ? point(297) : height;
  const cols = a4 ? Math.max(1, Math.floor((pageWidth - 2 * margin + gap) / (width + gap))) : 1;
  const rows = a4 ? Math.max(1, Math.floor((pageHeight - 2 * margin + gap) / (height + gap))) : 1;
  for (let index = 0; index < labels.length; index++) {
    const position = index % (cols * rows);
    const page =
      position === 0 ? doc.addPage([pageWidth, pageHeight]) : doc.getPage(doc.getPageCount() - 1);
    const bytes = await (
      await svgToPng(labels[index].svg, options.widthMm, options.heightMm)
    ).arrayBuffer();
    const image = await doc.embedPng(bytes);
    const x = a4 ? margin + (position % cols) * (width + gap) : 0;
    const y = a4 ? pageHeight - margin - height - Math.floor(position / cols) * (height + gap) : 0;
    page.drawImage(image, { x, y, width, height });
  }
  const bytes = await doc.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
