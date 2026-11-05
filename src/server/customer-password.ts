import { pbkdf2 } from "node:crypto";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

const iterations = 210_000;

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
  try {
    return await new Promise<string>((resolve, reject) => {
      pbkdf2(password, salt, iterations, 32, "sha256", (error, result) => {
        if (error) reject(error);
        else resolve(result.toString("hex"));
      });
    });
  } catch {
    // Production Workers can also cap Node PBKDF2, unlike local workerd.
    // The audited portable implementation preserves every existing hash and
    // iteration, without downgrading password security or changing credentials.
    return hex(await pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32 }));
  }
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
