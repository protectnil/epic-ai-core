/**
 * @epicai/core — Policy Engine
 * Evaluates dynamic policies against action context with priority ordering.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { AutonomyPolicy, ActionContext } from '../types/index.js';

export class PolicyEngine {
  private policies: AutonomyPolicy[] = [];

  addPolicy(policy: AutonomyPolicy): void {
    this.policies.push(policy);
    this.sortByPriority();
  }

  removePolicy(name: string): void {
    this.policies = this.policies.filter(p => p.name !== name);
  }

  listPolicies(): AutonomyPolicy[] {
    return [...this.policies];
  }

  /**
   * Evaluate all policies against the action context.
   * Returns the override tier from the first matching policy (highest priority),
   * or null if no policy matches.
   */
  evaluate(context: ActionContext): { tier: 'auto' | 'escalate' | 'approve'; policyName: string } | null {
    for (const policy of this.policies) {
      try {
        if (policy.condition(context)) {
          return { tier: policy.override, policyName: policy.name };
        }
      } catch {
        // Policy condition threw — skip it, don't break the evaluation chain
      }
    }
    return null;
  }

  private sortByPriority(): void {
    this.policies.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
}
