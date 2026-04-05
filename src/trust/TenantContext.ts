/**
 * @epicai/legion — Tenant Context
 * Request-scoped tenant/principal/role propagation.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { TenantContext } from './types.js';

const DEV_CONTEXT: TenantContext = {
  tenantId: 'dev',
  principalId: 'dev-user',
  roles: ['admin'],
  tier: 'enterprise',
  attributes: {},
};

/**
 * Create a development-mode tenant context.
 * Used when NODE_ENV=development and no auth is configured.
 */
export function createDevContext(): TenantContext {
  return { ...DEV_CONTEXT };
}

/**
 * Create a tenant context from JWT claims.
 */
export function contextFromJWT(claims: Record<string, unknown>): TenantContext {
  return {
    tenantId: String(claims.tenant_id ?? claims.org_id ?? claims.sub ?? 'unknown'),
    principalId: String(claims.sub ?? 'unknown'),
    roles: Array.isArray(claims.roles) ? claims.roles as string[] : [],
    tier: parseTier(claims.tier),
    attributes: typeof claims.attributes === 'object' && claims.attributes !== null
      ? claims.attributes as Record<string, string>
      : {},
  };
}

/**
 * Create a tenant context from an mTLS client certificate.
 */
export function contextFromCert(cert: { subject: { CN?: string }; subjectaltname?: string }): TenantContext {
  const cn = cert.subject?.CN ?? 'unknown';
  return {
    tenantId: cn.split('.')[0] ?? cn,
    principalId: cn,
    roles: ['authenticated'],
    tier: 'enterprise',
    attributes: {
      ...(cert.subjectaltname ? { san: cert.subjectaltname } : {}),
    },
  };
}

function parseTier(value: unknown): 'free' | 'pro' | 'enterprise' {
  if (value === 'free' || value === 'pro' || value === 'enterprise') return value;
  return 'free';
}
