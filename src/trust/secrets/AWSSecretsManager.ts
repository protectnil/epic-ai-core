/**
 * @epicai/legion — AWS Secrets Manager Provider
 * Optional peer dependency: @aws-sdk/client-secrets-manager
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { SecretsProvider } from './SecretsProvider.js';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class AWSSecretsManager implements SecretsProvider {
  private client: unknown = null;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 300_000;

  constructor(private readonly region?: string) {}

  async getSecretForAdapter(adapterName: string, key: string): Promise<string> {
    const cacheKey = `${adapterName}:${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const client = await this.getClient();
    const secretName = `epicai/adapters/${adapterName}/${key}`;

    // @ts-expect-error — @aws-sdk/client-secrets-manager is an optional peer dependency
    const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await (client as { send: (cmd: unknown) => Promise<{ SecretString?: string }> }).send(command);

    const value = response.SecretString;
    if (!value) {
      throw new Error(`Secret "${secretName}" has no string value`);
    }

    this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.cacheTtlMs });
    return value;
  }

  private async getClient(): Promise<unknown> {
    if (this.client) return this.client;

    // @ts-expect-error — @aws-sdk/client-secrets-manager is an optional peer dependency
    const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');
    this.client = new SecretsManagerClient(this.region ? { region: this.region } : {});
    return this.client;
  }
}
