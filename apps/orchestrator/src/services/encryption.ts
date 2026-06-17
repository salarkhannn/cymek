import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

export function createEncryptionService(masterKey: string) {
  const key = deriveKey(masterKey);

  function encrypt(plaintext: string): { encrypted: string; nonce: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return {
      encrypted: `${encrypted}:${authTag}`,
      nonce: iv.toString("hex"),
    };
  }

  function decrypt(encrypted: string, nonce: string): string {
    const [ciphertext, authTagHex] = encrypted.split(":");
    if (!ciphertext || !authTagHex) {
      throw new Error("Invalid encrypted payload format");
    }

    const iv = Buffer.from(nonce, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  function sanitizeError(err: Error): Error {
    const message = err.message;
    const apiKeyPattern = /sk-[a-zA-Z0-9]{20,}/g;
    const cleaned = message.replace(apiKeyPattern, "[REDACTED_API_KEY]");
    return cleaned !== message ? new Error(cleaned) : err;
  }

  return { encrypt, decrypt, sanitizeError };
}

export type EncryptionService = ReturnType<typeof createEncryptionService>;

function deriveKey(masterKey: string): Buffer {
  return crypto.createHash("sha256").update(masterKey).digest();
}
