import { afterEach, describe, expect, it } from "vitest";
import { securityDatabase } from "./testing/database";
import { currentReviewer, digest, handleReviewAccount, reviewJson } from "../review-accounts";
const open: ReturnType<typeof securityDatabase>[] = [];
afterEach(() => {
  for (const d of open.splice(0)) d.sql.close();
});
describe("customer session boundary", () => {
  it("logs out every owned device without touching another customer", async () => {
    const d = securityDatabase();
    open.push(d);
    d.sql.exec(
      "INSERT INTO review_accounts(id,email,display_name,password_hash,password_salt) VALUES('a','a@example.test','A','unused','unused'),('b','b@example.test','B','unused','unused')",
    );
    const expiry = Math.floor(Date.now() / 1000) + 1000;
    for (const [token, id] of [
      ["a".repeat(64), "a"],
      ["c".repeat(64), "a"],
      ["b".repeat(64), "b"],
    ])
      d.sql
        .prepare("INSERT INTO review_sessions VALUES(?,?,?)")
        .run(await digest(token), id, expiry);
    const request = (token: string, method = "GET", origin = "https://cutiutamagica.eu") =>
      new Request("https://cutiutamagica.eu/api/v1/reviewer/logout-all", {
        method,
        headers: { cookie: `__Host-cm_reviewer=${token}`, origin },
      });
    expect(await currentReviewer(request("a".repeat(64)), { DB: d.db } as Env)).toMatchObject({
      id: "a",
    });
    const foreign = await handleReviewAccount(
      request("a".repeat(64), "POST", "https://attacker.test"),
      { DB: d.db } as Env,
    );
    expect(foreign?.status).toBe(403);
    const response = await handleReviewAccount(request("a".repeat(64), "POST"), {
      DB: d.db,
    } as Env);
    expect(response?.status).toBe(200);
    expect(response?.headers.getSetCookie().join(" ")).toContain("__Host-cm_reviewer=;");
    expect(await currentReviewer(request("c".repeat(64)), { DB: d.db } as Env)).toBeNull();
    expect(await currentReviewer(request("b".repeat(64)), { DB: d.db } as Env)).toMatchObject({
      id: "b",
    });
  });
  it("preserves cookie headers and never caches private customer data", () => {
    const headers = new Headers();
    headers.append("set-cookie", "one=1; HttpOnly");
    headers.append("set-cookie", "two=2; HttpOnly");
    const response = reviewJson({ data: { ok: true } }, 200, headers);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
