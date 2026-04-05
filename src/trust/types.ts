/**
 * @epicai/legion — Trust Layer Types
 * Type definitions for enterprise authentication, authorization,
 * tenant context, and policy evaluation.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { AdapterCategory } from '../federation/AdapterCatalog.js';

// =============================================================================
// Authentication
// =============================================================================

export interface JWTAuthConfig {
  type: 'jwt';
  issuer: string;
  audience: string;
  jwksUri: string;
  clockSkewSeconds: number;
}

export interface MTLSConfig {
  type: 'mtls';
  caCertPath: string;
  requireClientCert: boolean;
  revocationCheck: 'none' | 'ocsp' | 'crl';
  ocspResponderUrl?: string;
  crlPemPath?: string;
}

export type AuthConfig = JWTAuthConfig | MTLSConfig;

// =============================================================================
// Tenant Context
// =============================================================================

export interface TenantContext {
  tenantId: string;
  principalId: string;
  roles: string[];
  tier: 'free' | 'pro' | 'enterprise';
  attributes: Record<string, string>;
}

// =============================================================================
// Policy
// =============================================================================

export type PolicyEffect = 'allow' | 'deny';

export interface PolicyCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not-in' | 'exists';
  value: string | string[];
}

export interface PolicyRule {
  id: string;
  effect: PolicyEffect;
  principal: {
    roles?: string[];
    attributes?: Record<string, string>;
  };
  resource: {
    toolCategories?: AdapterCategory[];
    toolNames?: string[];
    adapters?: string[];
  };
  conditions?: PolicyCondition[];
  priority: number;
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
  ruleId?: string;
  redactedArgs?: Record<string, unknown>;
}

// =============================================================================
// Secrets
// =============================================================================

export interface SecretsConfig {
  provider: 'env' | 'hashicorp-vault' | 'aws-secrets-manager' | 'azure-key-vault';
  address?: string;
  token?: string;
  roleId?: string;
  secretId?: string;
  region?: string;
  vaultName?: string;
  cacheTtlMs?: number;
}

// =============================================================================
// Trust Configuration (top-level)
// =============================================================================

export interface TrustConfig {
  auth: AuthConfig;
  secrets: SecretsConfig;
  policy: {
    rulesPath?: string;
    rules?: PolicyRule[];
    defaultEffect: PolicyEffect;
  };
  artifacts?: {
    verifyDigests: boolean;
    enforceSLSA?: 'SLSA_L1' | 'SLSA_L2' | 'SLSA_L3';
  };
}
