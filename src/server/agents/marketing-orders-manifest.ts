import skill from "../../../skills/cutiuta-magica-marketing-comenzi/SKILL.md?raw";
import brandProductTruth from "../../../skills/cutiuta-magica-marketing-comenzi/references/brand-product-truth.md?raw";
import customerConversationsOrders from "../../../skills/cutiuta-magica-marketing-comenzi/references/customer-conversations-orders.md?raw";
import dailySocialOperations from "../../../skills/cutiuta-magica-marketing-comenzi/references/daily-social-operations.md?raw";
import platformSync from "../../../skills/cutiuta-magica-marketing-comenzi/references/platform-sync.md?raw";

export const MARKETING_ORDERS_AGENT_BUILD_VERSION = "2026.10.03.2";

const documents = [
  { path: "SKILL.md", content: skill },
  { path: "references/brand-product-truth.md", content: brandProductTruth },
  { path: "references/customer-conversations-orders.md", content: customerConversationsOrders },
  { path: "references/daily-social-operations.md", content: dailySocialOperations },
  { path: "references/platform-sync.md", content: platformSync },
] as const;

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getMarketingOrdersAgentBuild() {
  const canonical = documents
    .map((document) => `${document.path}\n${document.content}`)
    .join("\n\n");
  const hash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)));
  return {
    agentCode: "marketing-orders",
    version: MARKETING_ORDERS_AGENT_BUILD_VERSION,
    hash,
    byteSize: new TextEncoder().encode(canonical).byteLength,
    includedPaths: documents.map((document) => document.path),
    controlPlane: "cutiuta_magic_platform" as const,
    externalEffects: "approval_required" as const,
  };
}

export async function getMarketingOrdersSkillPackage() {
  return {
    ...(await getMarketingOrdersAgentBuild()),
    documents: documents.map((document) => ({ ...document })),
  };
}
