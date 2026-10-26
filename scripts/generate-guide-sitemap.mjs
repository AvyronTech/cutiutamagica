import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const sourcePath = resolve("src/data/gift-guides.ts");
const outputPath = resolve("public/sitemap-guides.xml");
const source = ts.createSourceFile(
  sourcePath,
  readFileSync(sourcePath, "utf8"),
  ts.ScriptTarget.Latest,
  true,
);

function declaration(name) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const match = statement.declarationList.declarations.find(
      (item) => ts.isIdentifier(item.name) && item.name.text === name,
    );
    if (match) return match.initializer;
  }
  throw new Error(`Missing ${name} in gift guides`);
}

function stringProperty(object, name) {
  const property = object.properties.find(
    (item) => ts.isPropertyAssignment(item) && item.name.getText(source) === name,
  );
  if (
    !property ||
    !ts.isPropertyAssignment(property) ||
    !ts.isStringLiteral(property.initializer)
  ) {
    throw new Error(`Expected a string ${name} in gift guides`);
  }
  return property.initializer.text;
}

let guides = declaration("giftGuides");
while (guides && (ts.isSatisfiesExpression(guides) || ts.isAsExpression(guides))) {
  guides = guides.expression;
}
const updated = declaration("DISCOVERY_UPDATED");
if (!guides || !ts.isArrayLiteralExpression(guides) || !updated || !ts.isStringLiteral(updated)) {
  throw new Error("Gift guide sitemap source has an unexpected shape");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(updated.text)) {
  throw new Error("DISCOVERY_UPDATED must be a YYYY-MM-DD date");
}

const slugs = guides.elements.map((guide) => {
  if (!ts.isObjectLiteralExpression(guide)) throw new Error("Expected a gift guide object");
  const slug = stringProperty(guide, "slug");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid guide slug: ${slug}`);
  return slug;
});
if (slugs.length === 0 || new Set(slugs).size !== slugs.length) {
  throw new Error("Gift guide slugs must be nonempty and unique");
}

const paths = ["/cadouri", ...slugs.map((slug) => `/cadouri/${slug}`)];
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...paths.map(
    (path) =>
      `  <url><loc>https://cutiutamagica.eu${path}</loc><lastmod>${updated.text}</lastmod></url>`,
  ),
  "</urlset>",
  "",
].join("\n");

if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== xml) {
    throw new Error("sitemap-guides.xml is out of date; run npm run seo:guides");
  }
} else {
  writeFileSync(outputPath, xml);
  console.log(`Generated sitemap-guides.xml with ${paths.length} URLs`);
}
