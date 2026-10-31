const iterations = 210_000;
const encoder = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function normalizeCustomerPhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, "");
  const international = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  const romanian =
    international.startsWith("0") && /^07\d{8}$/.test(international)
      ? `+40${international.slice(1)}`
      : international;
  return /^\+[1-9]\d{7,14}$/.test(romanian) ? romanian : null;
}

async function derive(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const result = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
    key,
    256,
  );
  return hex(new Uint8Array(result));
}

export async function hashCustomerPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(24)));
  return { hash: `pbkdf2-sha256:${iterations}:${await derive(password, salt)}`, salt };
}

export async function verifyCustomerPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const expected = hash.match(/^pbkdf2-sha256:210000:([a-f0-9]{64})$/)?.[1];
  const actual = await derive(password, expected ? salt : "invalid-customer-password");
  if (!expected) return false;
  let mismatch = 0;
  for (let index = 0; index < 64; index += 1)
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}
