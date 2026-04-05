/**
 * @epicai/legion — Trust Layer Barrel Export
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export { AuthMiddleware, AuthError } from './AuthMiddleware.js';
export { AccessPolicyEngine } from './AccessPolicyEngine.js';
export { loadPolicyFromFile, validatePolicyRules } from './PolicyLoader.js';
export { createDevContext, contextFromJWT, contextFromCert } from './TenantContext.js';
export { ArtifactVerifier } from './ArtifactVerifier.js';
export { createSecretsProvider } from './secrets/SecretsProvider.js';
export type { SecretsProvider } from './secrets/SecretsProvider.js';
export type {
  AuthConfig,
  JWTAuthConfig,
  MTLSConfig,
  TenantContext,
  PolicyRule,
  PolicyDecision,
  PolicyEffect,
  PolicyCondition,
  SecretsConfig,
  TrustConfig,
} from './types.js';
