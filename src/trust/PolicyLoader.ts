/**
 * @epicai/legion — Policy Loader
 * Loads RBAC/ABAC policy rules from a JSON file and validates
 * them against the PolicyRule schema using Zod.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createLogger } from '../logger.js';
import type { PolicyRule } from './types.js';

const log = createLogger('trust.policy-loader');

const PolicyConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'in', 'not-in', 'exists']),
  value: z.union([z.string(), z.array(z.string())]),
});

const PolicyRuleSchema = z.object({
  id: z.string(),
  effect: z.enum(['allow', 'deny']),
  principal: z.object({
    roles: z.array(z.string()).optional(),
    attributes: z.record(z.string()).optional(),
  }),
  resource: z.object({
    toolCategories: z.array(z.string()).optional(),
    toolNames: z.array(z.string()).optional(),
    adapters: z.array(z.string()).optional(),
  }),
  conditions: z.array(PolicyConditionSchema).optional(),
  priority: z.number(),
});

const PolicyFileSchema = z.object({
  rules: z.array(PolicyRuleSchema),
});

/**
 * Load policy rules from a JSON file.
 * Validates every rule against the PolicyRule schema.
 * Throws on invalid file or schema violations.
 */
export async function loadPolicyFromFile(path: string): Promise<PolicyRule[]> {
  const raw = await readFile(path, 'utf-8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Policy file is not valid JSON: ${path} — ${err instanceof Error ? err.message : String(err)}`);
  }

  const result = PolicyFileSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Policy file validation failed: ${path}\n${issues}`);
  }

  log.info('policy loaded', { path, ruleCount: result.data.rules.length });
  return result.data.rules as PolicyRule[];
}

/**
 * Validate policy rules in memory (no file I/O).
 * Returns validated rules or throws on schema violations.
 */
export function validatePolicyRules(rules: unknown[]): PolicyRule[] {
  const result = z.array(PolicyRuleSchema).safeParse(rules);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Policy rule validation failed:\n${issues}`);
  }
  return result.data as PolicyRule[];
}
