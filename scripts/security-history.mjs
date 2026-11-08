#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
// High-confidence patterns only. Never print credential values or blob contents.
const patterns = [
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{50,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\b[rs]k_live_[A-Za-z0-9]{20,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const objects = execFileSync("git", ["rev-list", "--objects", "--all"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const check = execFileSync(
  "git",
  ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
  {
    input: objects
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split(" ", 1)[0])
      .join("\n"),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  },
);
const paths = new Map(objects.split("\n").map((l) => [l.slice(0, 40), l.slice(41)]));
const candidates = check
  .split("\n")
  .filter(Boolean)
  .map((l) => l.split(" "))
  .filter(
    ([id, type, size]) =>
      type === "blob" &&
      Number(size) <= 2_000_000 &&
      !/\.(?:png|jpg|jpeg|webp|mp3|mp4|woff2?|pdf|zip|ico|gz|xlsx)$/i.test(paths.get(id) || ""),
  );
const findings = [];
const child = spawn("git", ["cat-file", "--batch"], { stdio: ["pipe", "pipe", "pipe"] });
let buffer = Buffer.alloc(0),
  current = null;
child.stdin.end(candidates.map(([id]) => id).join("\n") + "\n");
// Drain stderr without exposing object contents or credentials.
child.stderr.resume();
const completed = new Promise((resolve, reject) => {
  child.once("error", () => reject(new Error("Git object scan failed")));
  child.once("close", (code) =>
    code === 0 ? resolve() : reject(new Error("Git object scan failed")),
  );
});
for await (const chunk of child.stdout) {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    if (!current) {
      const end = buffer.indexOf(10);
      if (end < 0) break;
      const [id, type, size] = buffer.subarray(0, end).toString("ascii").split(" ");
      if (type !== "blob" || !Number.isFinite(Number(size)))
        throw new Error("Unexpected Git object metadata");
      current = { id, size: Number(size) };
      buffer = buffer.subarray(end + 1);
    }
    if (buffer.length < current.size + 1) break;
    const bytes = buffer.subarray(0, current.size);
    if (!bytes.includes(0) && patterns.some((p) => p.test(bytes.toString("utf8"))))
      findings.push({
        blob: current.id,
        path: paths.get(current.id),
        reason: "possible credential; value redacted",
      });
    buffer = buffer.subarray(current.size + 1);
    current = null;
  }
}
await completed;
console.log(
  JSON.stringify(
    {
      scope:
        "All reachable local Git refs, text blobs <=2MB; heuristic patterns, not a credential-validity or full entropy scan",
      scannedBlobs: candidates.length,
      findings,
    },
    null,
    2,
  ),
);
if (findings.length) process.exitCode = 1;
