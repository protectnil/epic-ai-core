/**
 * @epicai/legion — Persistent Memory
 * Importance-weighted persistent memory with etch/recall/context/forget.
 * Adapted from NILAssist useEtchedMemory.ts patterns.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type {
  MemoryConfig,
  MemoryEntry,
  StoredMemory,
  RecallOptions,
  ContextSummary,
} from '../types/index.js';

const AES_ALGORITHM = 'aes-256-gcm' as const;
const IV_BYTES = 12;   // 96-bit IV recommended for GCM
const TAG_BYTES = 16;  // 128-bit auth tag (GCM default)

/**
 * Encrypt a UTF-8 plaintext using AES-256-GCM.
 * Returns a Base64-encoded blob: IV (12 bytes) + auth tag (16 bytes) + ciphertext.
 */
function encryptContent(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Decrypt a Base64-encoded blob produced by encryptContent.
 * Throws if the auth tag does not match (tampering detected).
 */
function decryptContent(blob: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** Serialise a MemoryEntry content value to a string for encryption. */
function serializeContent(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/** Deserialise content — attempt JSON parse, fall back to raw string. */
function deserializeContent(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export class PersistentMemory {
  private readonly config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  /**
   * Etch a memory — store a new entry for a user.
   * When encryptionKey is configured, content is AES-256-GCM encrypted before storage.
   */
  async etch(userId: string, entry: MemoryEntry): Promise<StoredMemory> {
    if (this.config.encryptionKey) {
      const encrypted = encryptContent(serializeContent(entry.content), this.config.encryptionKey);
      const encryptedEntry: MemoryEntry = { ...entry, content: encrypted };
      const stored = await this.config.store.save(userId, encryptedEntry);
      // Return the record with decrypted content so callers get the original value
      return { ...stored, content: entry.content };
    }
    return this.config.store.save(userId, entry);
  }

  /**
   * Recall memories — retrieve stored entries for a user.
   * Automatically updates access counts and promotes importance.
   * When encryptionKey is configured, content is decrypted transparently.
   */
  async recall(userId: string, options?: RecallOptions): Promise<StoredMemory[]> {
    const memories = await this.config.store.recall(userId, options ?? {});
    if (this.config.encryptionKey) {
      return memories.map(m => ({
        ...m,
        content: deserializeContent(decryptContent(m.content as string, this.config.encryptionKey!)),
      }));
    }
    return memories;
  }

  /**
   * Get context summary for a user — aggregate statistics.
   */
  async context(userId: string): Promise<ContextSummary> {
    return this.config.store.context(userId);
  }

  /**
   * Forget a memory — soft delete by ID.
   */
  async forget(userId: string, memoryId: string): Promise<void> {
    return this.config.store.delete(userId, memoryId);
  }
}
