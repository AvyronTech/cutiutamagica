#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";

// Local tree only: never print a matched secret, request body or environment value.
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const issues = [];
const functions = [];
const patterns = [
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{50,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bsk_live_[A-Za-z0-9]{20,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const ownFunctions = new Set([
  "getMyRole",
  "changeAdminAccountPassword",
  "logoutAdminAccount",
  "registerAdminDevice",
]);
for (const file of files) {
  if (!existsSync(file) || /\.(?:png|jpg|jpeg|webp|mp3|mp4|woff2?|pdf|zip|ico|gz|xlsx)$/.test(file))
    continue;
  if (
    /(?:^|\/)\.env(?:\.|$)|(?:^|\/)\.dev\.vars(?:\.|$)/.test(file) &&
    !/(?:example|sample|template)$/.test(file)
  )
    issues.push(`${file}: credential environment file included in source`);
  const source = readFileSync(file, "utf8");
  source.split("\n").forEach((line, i) => {
    if (patterns.some((p) => p.test(line)))
      issues.push(`${file}:${i + 1}: possible credential (value redacted)`);
  });
  if (!file.startsWith("src/lib/") || !file.endsWith(".functions.ts")) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer;
      const calls = [];
      function collect(n) {
        if (ts.isCallExpression(n)) calls.push(n);
        ts.forEachChild(n, collect);
      }
      collect(init);
      if (
        calls.some((c) => ts.isIdentifier(c.expression) && c.expression.text === "createServerFn")
      ) {
        const name = node.name.text;
        const auth = calls.some(
          (c) =>
            ts.isPropertyAccessExpression(c.expression) &&
            c.expression.name.text === "middleware" &&
            c.arguments.some(
              (a) =>
                ts.isArrayLiteralExpression(a) &&
                a.elements.some((e) => ts.isIdentifier(e) && e.text === "requireAdminAuth"),
            ),
        );
        const permissions = calls
          .filter((c) => ts.isIdentifier(c.expression) && c.expression.text === "assertPermission")
          .flatMap((c) =>
            c.arguments
              .slice(1, 2)
              .filter(ts.isStringLiteral)
              .map((a) => a.text),
          );
        const privateName =
          /^(?:getAdmin|setAdmin|createAdmin|updateAdmin|deleteAdmin|saveAdmin|removeAdmin|revokeAdmin|rotateAdmin|registerAdmin)/.test(
            name,
          );
        if (privateName && !auth)
          issues.push(`${file}:${name}: private function missing authentication middleware`);
        if (auth && !permissions.length && !ownFunctions.has(name))
          issues.push(
            `${file}:${name}: no explicit permission or documented own-account exception`,
          );
        functions.push({
          file,
          name,
          authentication: auth ? "admin-session" : "public-or-handler-specific",
          permissions,
          ownAccount: ownFunctions.has(name),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
if (process.argv.includes("--inventory"))
  process.stdout.write(
    JSON.stringify(
      { scope: "Source inventory; complements runtime authorization tests", functions },
      null,
      2,
    ) + "\n",
  );
else
  console.log(
    `Security source checks: ${files.length} files, ${functions.length} server functions, ${issues.length} findings.`,
  );
if (issues.length) {
  for (const issue of issues) console.error(issue);
  process.exitCode = 1;
}
