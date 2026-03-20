/**
 * @epicai/core — Tiered Autonomy
 * Governance layer: evaluate actions against tiers and policies,
 * manage approval workflows.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  AutonomyRules,
  AutonomyPolicy,
  ActionContext,
  ActionDecision,
  PendingApproval,
  ApprovalQueueConfig,
} from '../types/index.js';
import { PolicyEngine } from './PolicyEngine.js';
import { ApprovalQueue } from './ApprovalQueue.js';
import { RedisQueue } from './adapters/RedisQueue.js';

/**
 * Common interface for approval queue implementations (in-memory and Redis).
 */
export interface ApprovalQueueLike {
  enqueue(context: ActionContext, tier: 'escalate' | 'approve'): PendingApproval | Promise<PendingApproval>;
  approve(actionId: string, approver: string): ActionDecision | Promise<ActionDecision>;
  deny(actionId: string, approver: string, reason: string): ActionDecision | Promise<ActionDecision>;
  pending(): PendingApproval[] | Promise<PendingApproval[]>;
  destroy?(): void;
  onApprovalNeeded?(callback: (approval: PendingApproval) => void): void;
  onExpired?(callback: (approval: PendingApproval) => void): void;
}

export class TieredAutonomy {
  private readonly rules: AutonomyRules;
  private readonly policyEngine: PolicyEngine;
  private readonly approvalQueue: ApprovalQueueLike;
  private readonly isRedisQueue: boolean;

  constructor(rules: AutonomyRules, queueConfig?: ApprovalQueueConfig) {
    this.rules = rules;
    this.policyEngine = new PolicyEngine();

    if (queueConfig?.persistence === 'redis' && queueConfig.redis) {
      this.approvalQueue = new RedisQueue({
        host: queueConfig.redis.host,
        port: queueConfig.redis.port,
        password: queueConfig.redis.password,
        ttlMs: queueConfig.ttlMs,
      });
      this.isRedisQueue = true;
    } else {
      this.approvalQueue = new ApprovalQueue(queueConfig);
      this.isRedisQueue = false;
    }
  }

  /**
   * Evaluate an action against tiers and dynamic policies.
   * Async because Redis-backed queue enqueue is async.
   * Returns the real approval ID from the queue (not a synthetic one).
   */
  async evaluate(context: ActionContext): Promise<ActionDecision> {
    const policyResult = this.policyEngine.evaluate(context);

    let tier: 'auto' | 'escalate' | 'approve';
    let policyApplied: string | undefined;

    if (policyResult) {
      tier = policyResult.tier;
      policyApplied = policyResult.policyName;
    } else {
      tier = this.classifyAction(context.tool);
    }

    const timestamp = new Date();

    switch (tier) {
      case 'auto':
        return { id: crypto.randomUUID(), action: context.tool, tier, allowed: true, timestamp, policyApplied };

      case 'escalate': {
        const approval = await this.approvalQueue.enqueue(context, 'escalate');
        return {
          id: approval.id,
          action: context.tool,
          tier,
          allowed: true,
          timestamp,
          policyApplied,
          reason: 'Escalated for human review',
        };
      }

      case 'approve': {
        const approval = await this.approvalQueue.enqueue(context, 'approve');
        return {
          id: approval.id,
          action: context.tool,
          tier,
          allowed: false,
          timestamp,
          policyApplied,
          reason: 'Awaiting human approval',
        };
      }
    }
  }

  /**
   * Approve a pending action. Idempotent.
   */
  async approve(actionId: string, approver: string): Promise<ActionDecision> {
    return this.approvalQueue.approve(actionId, approver);
  }

  /**
   * Deny a pending action. Idempotent.
   */
  async deny(actionId: string, approver: string, reason: string): Promise<ActionDecision> {
    return this.approvalQueue.deny(actionId, approver, reason);
  }

  /**
   * Get all pending approvals.
   */
  async pending(): Promise<PendingApproval[]> {
    return this.approvalQueue.pending();
  }

  addPolicy(policy: AutonomyPolicy): this {
    this.policyEngine.addPolicy(policy);
    return this;
  }

  removePolicy(name: string): this {
    this.policyEngine.removePolicy(name);
    return this;
  }

  listPolicies(): AutonomyPolicy[] {
    return this.policyEngine.listPolicies();
  }

  onApprovalNeeded(callback: (approval: PendingApproval) => void): void {
    if (this.approvalQueue.onApprovalNeeded) {
      this.approvalQueue.onApprovalNeeded(callback);
    }
  }

  onExpired(callback: (approval: PendingApproval) => void): void {
    if (this.approvalQueue.onExpired) {
      this.approvalQueue.onExpired(callback);
    }
  }

  destroy(): void {
    if (this.approvalQueue.destroy) {
      this.approvalQueue.destroy();
    }
    if (this.isRedisQueue) {
      const redisQueue = this.approvalQueue as RedisQueue;
      redisQueue.disconnect().catch(() => { /* non-fatal */ });
    }
  }

  /**
   * Classify an action into a tier based on static rules.
   * Matches against both the full prefixed name (e.g. "vault:read") and the
   * unprefixed tool name (e.g. "read").
   */
  private classifyAction(toolName: string): 'auto' | 'escalate' | 'approve' {
    const unprefixed = toolName.includes(':') ? toolName.split(':').slice(1).join(':') : toolName;

    for (const action of this.rules.auto) {
      if (toolName === action || unprefixed === action) return 'auto';
    }
    for (const action of this.rules.escalate) {
      if (toolName === action || unprefixed === action) return 'escalate';
    }
    for (const action of this.rules.approve) {
      if (toolName === action || unprefixed === action) return 'approve';
    }

    return 'approve';
  }
}
