export const PUBLIC_CHAT_SOURCES = [
  "/",
  "/despre-noi",
  "/despre-cutiuta",
  "/produse",
  "/cadouri",
  "/livrare",
  "/retur",
  "/magic-rewards",
  "/ghid-cadouri-personalizate",
] as const;

const PRIVATE_CONTENT =
  /(?:\b(?:api[ _-]?key|client[ _-]?secret|secret[ _-]?(?:key|api)|token|parol[ăa]|password|iban|cont bancar|webhook|endpoint intern|infrastructur[ăa] intern[ăa]|avyron)\b|\b(?:sk_(?:live|test)_|whsec_|cfat_|re_)[A-Za-z0-9_-]{8,}|\bRO\d{2}[A-Z]{4}\d{16}\b|\/(?:admin|api)\/|ignor[ăa] instruc[țt]iunile|system prompt|developer message)/iu;
const NON_OFFICIAL_EMAIL = /\b[\w.+-]+@(?!cutiutamagica\.eu\b)[\w.-]+\.[A-Za-z]{2,}\b/iu;

export function isPublicChatKnowledgeSafe(value: string): boolean {
  return !PRIVATE_CONTENT.test(value) && !NON_OFFICIAL_EMAIL.test(value);
}
