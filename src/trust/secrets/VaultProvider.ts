/**
 * @epicai/legion — HashiCorp Vault Secrets Provider
 * KV v2 integration with lease management. Zero npm dependencies
 * beyond node:https.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../../logger.js';
import type { SecretsProvider } from './SecretsProvider.js';

const log = createLogger('trust.secrets.vault');

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class VaultProvider implements SecretsProvider {
  private readonly address: string;
  private token: string | undefined;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 300_000; // 5 minutes

  constructor(
    address: string,
    token?: string,
    private readonly roleId?: string,
    private readonly secretId?: string,
  ) {
    this.address = address.replace(/\/$/, '');
    this.token = token;
  }

  async getSecretForAdapter(adapterName: string, key: string): Promise<string> {
    const cacheKey = `${adapterName}:${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    await this.ensureAuthenticated();

    const path = `secret/data/adapters/${adapterName}/${key}`;
    const url = `${this.address}/v1/${path}`;

    const response = await fetch(url, {
      headers: { 'X-Vault-Token': this.token! },
    });

    if (!response.ok) {
      throw new Error(`Vault returned ${response.status} for ${path}`);
    }

    const data = await response.json() as { data?: { data?: Record<string, string> } };
    const value = data.data?.data?.[key];
    if (!value) {
      throw new Error(`Secret key "${key}" not found at ${path}`);
    }

    this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.cacheTtlMs });
    return value;
  }

  async rotateSecretForAdapter(adapterName: string, key: string): Promise<string> {
    const cacheKey = `${adapterName}:${key}`;
    this.cache.delete(cacheKey);
    log.info('secret cache invalidated for rotation', { adapterName, key });
    return this.getSecretForAdapter(adapterName, key);
  }

  async renewLeases(): Promise<void> {
    if (!this.token) return;

    try {
      const response = await fetch(`${this.address}/v1/auth/token/renew-self`, {
        method: 'POST',
        headers: { 'X-Vault-Token': this.token },
      });

      if (response.ok) {
        log.info('vault token lease renewed');
      } else {
        log.warn('vault token lease renewal failed', { status: response.status });
      }
    } catch (err) {
      log.warn('vault lease renewal error', { error: String(err) });
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.token) return;

    if (this.roleId && this.secretId) {
      const response = await fetch(`${this.address}/v1/auth/approle/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: this.roleId, secret_id: this.secretId }),
      });

      if (!response.ok) {
        throw new Error(`Vault AppRole login failed: ${response.status}`);
      }

      const data = await response.json() as { auth?: { client_token?: string } };
      this.token = data.auth?.client_token;
      if (!this.token) {
        throw new Error('Vault AppRole login returned no token');
      }

      log.info('authenticated to Vault via AppRole');
      return;
    }

    throw new Error('Vault: no token and no AppRole credentials configured');
  }
}
