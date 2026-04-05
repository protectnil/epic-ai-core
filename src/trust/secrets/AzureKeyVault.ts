/**
 * @epicai/legion — Azure Key Vault Secrets Provider
 * Optional peer dependencies: @azure/keyvault-secrets, @azure/identity
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { SecretsProvider } from './SecretsProvider.js';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class AzureKeyVault implements SecretsProvider {
  private client: unknown = null;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 300_000;

  constructor(private readonly vaultName: string) {}

  async getSecretForAdapter(adapterName: string, key: string): Promise<string> {
    const cacheKey = `${adapterName}:${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const client = await this.getClient();
    const secretName = `epicai-adapters-${adapterName}-${key}`;

    const secret = await (client as { getSecret: (name: string) => Promise<{ value?: string }> }).getSecret(secretName);
    const value = secret.value;
    if (!value) {
      throw new Error(`Azure Key Vault secret "${secretName}" has no value`);
    }

    this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.cacheTtlMs });
    return value;
  }

  private async getClient(): Promise<unknown> {
    if (this.client) return this.client;

    // @ts-expect-error — @azure/identity is an optional peer dependency
    const { DefaultAzureCredential } = await import('@azure/identity');
    // @ts-expect-error — @azure/keyvault-secrets is an optional peer dependency
    const { SecretClient } = await import('@azure/keyvault-secrets');

    const vaultUrl = `https://${this.vaultName}.vault.azure.net`;
    this.client = new SecretClient(vaultUrl, new DefaultAzureCredential());
    return this.client;
  }
}
