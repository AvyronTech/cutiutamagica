import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const source = "/private/tmp/cutiuta-halloween-2026-10-16";
const output = "docs/marketing/drafts/2026-10-16-halloween/assets";
mkdirSync(output, { recursive: true });

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const textLayer = (width, height, title, subtitle, footer = "") => {
  const titleY = height > 1500 ? 330 : 285;
  const subtitleY = height > 1500 ? 405 : 365;
  return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title{font-family:Georgia,serif;font-weight:700;fill:#f7ead3;text-anchor:middle}
    .sub{font-family:Arial,sans-serif;font-weight:500;fill:#f1d5ad;text-anchor:middle}
    .foot{font-family:Arial,sans-serif;font-weight:700;fill:#17120f;text-anchor:middle}
  </style>
  <text x="${width / 2}" y="${titleY}" class="title" font-size="72">${esc(title)}</text>
  <text x="${width / 2}" y="${subtitleY}" class="sub" font-size="35">${esc(subtitle)}</text>
  ${footer ? `<rect x="170" y="1450" width="740" height="96" rx="48" fill="#f7ead3"/><text x="540" y="1513" class="foot" font-size="31">${esc(footer)}</text>` : ""}
</svg>`);
};

async function canvas(width, height, input, title, subtitle, footer = "") {
  const picture = await sharp(join(source, input))
    .resize({ width: width - 120, height: footer ? 1020 : height - 250, fit: "contain", withoutEnlargement: false })
    .png()
    .toBuffer();
  const meta = await sharp(picture).metadata();
  const top = footer ? 405 : 155;
  return sharp({
    create: { width, height, channels: 4, background: { r: 23, g: 18, b: 15, alpha: 1 } },
  })
    .composite([
      { input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g"><stop stop-color="#73351e"/><stop offset="1" stop-color="#17120f"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`) },
      { input: picture, left: Math.round((width - (meta.width ?? 0)) / 2), top },
      { input: textLayer(width, height, title, subtitle, footer) },
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(output, `${title.startsWith("Cum") ? "feed" : title.startsWith("Un cadou") ? "story-1" : title.startsWith("Rotești") ? "story-2" : "story-3"}.png`));
}

await canvas(1080, 1350, "1.webp", "Cum sună Halloweenul?", "O cutiuță reală. Un mecanism clasic.");
await canvas(1080, 1920, "card.webp", "Un cadou mic.", "O atmosferă de neuitat.", "Vezi povestea");
await canvas(1080, 1920, "3.webp", "Rotești manivela.", "Mecanismul prinde viață, fără baterii.", "Descoperă detaliile");
await canvas(1080, 1920, "2.webp", "Magia începe aici.", "Pentru seri de toamnă și colecții cu poveste.", "cutiutamagica.eu");

const ffmpegPath = process.env.FFMPEG_PATH;
if (ffmpegPath) {
  const frames = ["story-1.png", "story-2.png", "story-3.png"];
  const concat = frames.flatMap((name) => ["-loop", "1", "-t", "4", "-i", join(output, name)]);
  execFileSync(ffmpegPath, [
    ...concat,
    "-filter_complex",
    "[0:v]scale=1080:1920,setsar=1[v0];[1:v]scale=1080:1920,setsar=1[v1];[2:v]scale=1080:1920,setsar=1[v2];[v0][v1][v2]concat=n=3:v=1:a=0,format=yuv420p[v]",
    "-map", "[v]", "-r", "30", "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart",
    join(output, "reel-tiktok-master.mp4"), "-y",
  ], { stdio: "inherit" });
}
