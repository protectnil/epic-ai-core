/**
 * @epicai/legion — Secrets Provider Interface
 * Adapter credentials are resolved at connection time, never stored in config.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { SecretsConfig } from '../types.js';

export interface SecretsProvider {
  getSecretForAdapter(adapterName: string, key: string): Promise<string>;
  rotateSecretForAdapter?(adapterName: string, key: string): Promise<string>;
  renewLeases?(): Promise<void>;
}

export async function createSecretsProvider(config: SecretsConfig): Promise<SecretsProvider> {
  switch (config.provider) {
    case 'env': {
      const { EnvSecretsProvider } = await import('./EnvSecretsProvider.js');
      return new EnvSecretsProvider();
    }
    case 'hashicorp-vault': {
      const { VaultProvider } = await import('./VaultProvider.js');
      return new VaultProvider(config.address!, config.token, config.roleId, config.secretId);
    }
    case 'aws-secrets-manager': {
      const { AWSSecretsManager } = await import('./AWSSecretsManager.js');
      return new AWSSecretsManager(config.region);
    }
    case 'azure-key-vault': {
      const { AzureKeyVault } = await import('./AzureKeyVault.js');
      return new AzureKeyVault(config.vaultName!);
    }
    default:
      throw new Error(`Unknown secrets provider: ${config.provider}`);
  }
}
