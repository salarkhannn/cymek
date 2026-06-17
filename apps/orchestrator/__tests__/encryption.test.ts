import { describe, it, expect } from "vitest"
import { createEncryptionService } from "../src/services/encryption.js"

describe("encryption service", () => {
  const service = createEncryptionService("test-master-key-32-bytes-long!!!!!")

  it("encrypts and decrypts a string", () => {
    const plaintext = "Hello, Cymek!"
    const { encrypted, nonce } = service.encrypt(plaintext)
    expect(encrypted).toBeTruthy()
    expect(nonce).toBeTruthy()
    const decrypted = service.decrypt(encrypted, nonce)
    expect(decrypted).toBe(plaintext)
  })

  it("produces different ciphertext each time", () => {
    const plaintext = "same text"
    const r1 = service.encrypt(plaintext)
    const r2 = service.encrypt(plaintext)
    expect(r1.encrypted).not.toBe(r2.encrypted)
    expect(r1.nonce).not.toBe(r2.nonce)
  })

  it("throws on invalid encrypted payload", () => {
    expect(() => service.decrypt("invalid-no-colon", "abcdef")).toThrow("Invalid encrypted payload format")
  })

  it("sanitizes API keys from error messages", () => {
    const err = new Error("API key sk-abc123xyz456def789ghi failed")
    const sanitized = service.sanitizeError(err)
    expect(sanitized.message).not.toContain("sk-abc123xyz456def789ghi")
    expect(sanitized.message).toContain("[REDACTED_API_KEY]")
  })

  it("passes through errors without API keys", () => {
    const err = new Error("Something went wrong")
    const sanitized = service.sanitizeError(err)
    expect(sanitized.message).toBe("Something went wrong")
  })
})
