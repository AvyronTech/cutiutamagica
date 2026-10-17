import { describe, expect, it } from "vitest";
import { rewardDigestContent } from "./services/reward-emails";

describe("Magic Rewards email digest", () => {
  it("groups awarded activities into one safe, account-linked message", () => {
    const message = rewardDigestContent(
      { display_name: "Ana <script>", stars: 8, available_stars: 13 },
      [
        { name: "Comandă <script> primită", stars: 5 },
        { name: "Recenzie aprobată", stars: 3 },
      ],
      "https://cutiutamagica.eu",
    );
    expect(message.subject).toBe("Ai primit +8 Magic Stars ✦");
    expect(message.text).toContain("+5 ✦ Comandă <script> primită");
    expect(message.text).toContain("+3 ✦ Recenzie aprobată");
    expect(message.text).toContain("https://cutiutamagica.eu/cont");
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});
