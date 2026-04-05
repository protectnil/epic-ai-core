/**
 * @epicai/legion — Access Policy Engine
 * RBAC/ABAC evaluation. Default-deny. Called before every tool dispatch.
 * Named AccessPolicyEngine to avoid collision with src/autonomy/PolicyEngine.ts.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../logger.js';
import type {
  TenantContext,
  PolicyRule,
  PolicyDecision,
  PolicyEffect,
  PolicyCondition,
} from './types.js';

const log = createLogger('trust.access-policy');

export class AccessPolicyEngine {
  private rules: PolicyRule[];
  private readonly defaultEffect: PolicyEffect;

  constructor(rules: PolicyRule[], defaultEffect: PolicyEffect = 'deny') {
    this.rules = this.sortByPriority(rules);
    this.defaultEffect = defaultEffect;
  }

  /**
   * Evaluate whether a principal may invoke a tool with given args.
   * Returns PolicyDecision with allow/deny and reason.
   */
  evaluate(
    ctx: TenantContext,
    toolName: string,
    args: Record<string, unknown>,
    toolCategory?: string,
    adapterName?: string,
  ): PolicyDecision {
    // Find all matching rules
    const matching = this.rules.filter(rule => this.ruleMatches(rule, ctx, toolName, toolCategory, adapterName));

    if (matching.length === 0) {
      log.debug('no matching rules — applying default', { defaultEffect: this.defaultEffect, toolName, principal: ctx.principalId });
      return {
        allow: this.defaultEffect === 'allow',
        reason: `Default policy: ${this.defaultEffect}`,
      };
    }

    // Rules are pre-sorted by priority (highest first).
    // Among rules at the same priority, deny takes precedence over allow.
    const topPriority = matching[0].priority;
    const topRules = matching.filter(r => r.priority === topPriority);

    // If any deny rule exists at top priority, deny wins
    const denyRule = topRules.find(r => r.effect === 'deny');
    if (denyRule) {
      log.debug('deny rule matched', { ruleId: denyRule.id, toolName, principal: ctx.principalId });
      return {
        allow: false,
        reason: `Denied by rule: ${denyRule.id}`,
        ruleId: denyRule.id,
        redactedArgs: this.redactArgs(args),
      };
    }

    // Otherwise, allow wins at top priority
    const allowRule = topRules.find(r => r.effect === 'allow');
    if (allowRule) {
      log.debug('allow rule matched', { ruleId: allowRule.id, toolName, principal: ctx.principalId });
      return {
        allow: true,
        reason: `Allowed by rule: ${allowRule.id}`,
        ruleId: allowRule.id,
      };
    }

    // Should not reach here, but default-deny as safety
    return {
      allow: this.defaultEffect === 'allow',
      reason: `Default policy: ${this.defaultEffect}`,
    };
  }

  /**
   * Hot-swap rules without restart. Atomic replacement.
   */
  reload(rules: PolicyRule[]): void {
    const sorted = this.sortByPriority(rules);
    this.rules = sorted; // Single assignment — atomic in JS event loop
    log.info('policy rules reloaded', { count: sorted.length });
  }

  get ruleCount(): number {
    return this.rules.length;
  }

  // ---------------------------------------------------------------------------
  // Rule Matching
  // ---------------------------------------------------------------------------

  private ruleMatches(
    rule: PolicyRule,
    ctx: TenantContext,
    toolName: string,
    toolCategory?: string,
    adapterName?: string,
  ): boolean {
    // Principal match: roles OR attributes
    const principalMatch = this.principalMatches(rule, ctx);
    if (!principalMatch) return false;

    // Resource match: tool categories, tool names, or adapters
    const resourceMatch = this.resourceMatches(rule, toolName, toolCategory, adapterName);
    if (!resourceMatch) return false;

    // Condition match (ABAC)
    if (rule.conditions && rule.conditions.length > 0) {
      return rule.conditions.every(c => this.conditionMatches(c, ctx));
    }

    return true;
  }

  private principalMatches(rule: PolicyRule, ctx: TenantContext): boolean {
    const { roles, attributes } = rule.principal;

    // If neither specified, matches all principals
    if (!roles?.length && (!attributes || Object.keys(attributes).length === 0)) {
      return true;
    }

    // Role match: any role in ctx.roles matches any role in rule.principal.roles
    if (roles?.length) {
      const hasRole = roles.some(r => ctx.roles.includes(r));
      if (hasRole) return true;
    }

    // Attribute match: all specified attributes must match
    if (attributes && Object.keys(attributes).length > 0) {
      const allMatch = Object.entries(attributes).every(
        ([key, value]) => ctx.attributes[key] === value,
      );
      if (allMatch) return true;
    }

    return false;
  }

  private resourceMatches(
    rule: PolicyRule,
    toolName: string,
    toolCategory?: string,
    adapterName?: string,
  ): boolean {
    const { toolCategories, toolNames, adapters } = rule.resource;

    // If nothing specified, matches all resources
    if (!toolCategories?.length && !toolNames?.length && !adapters?.length) {
      return true;
    }

    if (toolCategories?.length && toolCategory) {
      if (toolCategories.includes(toolCategory as never)) return true;
    }

    if (toolNames?.length) {
      if (toolNames.includes(toolName)) return true;
    }

    if (adapters?.length && adapterName) {
      if (adapters.includes(adapterName)) return true;
    }

    return false;
  }

  private conditionMatches(condition: PolicyCondition, ctx: TenantContext): boolean {
    const actual = ctx.attributes[condition.field];

    switch (condition.operator) {
      case 'eq':
        return actual === condition.value;
      case 'neq':
        return actual !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actual);
      case 'not-in':
        return Array.isArray(condition.value) && !condition.value.includes(actual);
      case 'exists':
        return actual !== undefined;
      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private sortByPriority(rules: PolicyRule[]): PolicyRule[] {
    return [...rules].sort((a, b) => b.priority - a.priority);
  }

  private redactArgs(args: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    const sensitiveKeys = new Set(['password', 'token', 'secret', 'key', 'credential', 'api_key', 'apiKey']);

    for (const [key, value] of Object.entries(args)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}
