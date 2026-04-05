/**
 * @epicai/legion — Env Secrets Provider
 * Development fallback: reads from process.env.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { SecretsProvider } from './SecretsProvider.js';

export class EnvSecretsProvider implements SecretsProvider {
  async getSecretForAdapter(adapterName: string, key: string): Promise<string> {
    const envKey = `${adapterName.toUpperCase().replace(/-/g, '_')}_${key.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envKey];
    if (!value) {
      throw new Error(`Secret not found in environment: ${envKey}`);
    }
    return value;
  }
}
