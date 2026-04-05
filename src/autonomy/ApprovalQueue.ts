/**
 * @epicai/legion — Approval Queue
 * State machine for pending actions: pending → approved | denied | expired.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import type {
  ActionContext,
  ActionDecision,
  PendingApproval,
  ApprovalQueueConfig,
} from '../types/index.js';

const DEFAULT_TTL_MS = 3600000; // 1 hour

export class ApprovalQueue {
  private readonly queue = new Map<string, PendingApproval>();
  private readonly config: ApprovalQueueConfig;
  private expirationTimer: ReturnType<typeof setInterval> | null = null;
  private readonly approvalCallbacks: ((approval: PendingApproval) => void)[] = [];
  private readonly expiredCallbacks: ((approval: PendingApproval) => void)[] = [];

  constructor(config?: ApprovalQueueConfig) {
    this.config = config ?? {
      persistence: 'memory',
      ttlMs: DEFAULT_TTL_MS,
      onExpire: 'deny',
    };

    this.startExpirationCheck();
  }

  /**
   * Enqueue an action for approval. Returns the pending approval with a UUID.
   */
  enqueue(context: ActionContext, tier: 'escalate' | 'approve'): PendingApproval {
    const id = randomUUID();
    const now = new Date();

    const approval: PendingApproval = {
      id,
      action: context,
      tier,
      state: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.ttlMs),
    };

    this.queue.set(id, approval);

    for (const cb of this.approvalCallbacks) {
      try { cb(approval); } catch { /* don't break the queue */ }
    }

    return approval;
  }

  /**
   * Approve a pending action. Idempotent — returns existing decision if already decided.
   */
  approve(actionId: string, approver: string): ActionDecision {
    const approval = this.queue.get(actionId);
    if (!approval) {
      throw new Error(`Action "${actionId}" not found in approval queue`);
    }

    // Idempotent: already decided
    if (approval.state !== 'pending') {
      return this.toDecision(approval);
    }

    approval.state = 'approved';
    approval.decidedAt = new Date();
    approval.decidedBy = approver;

    return this.toDecision(approval);
  }

  /**
   * Deny a pending action. Idempotent — returns existing decision if already decided.
   */
  deny(actionId: string, approver: string, reason: string): ActionDecision {
    const approval = this.queue.get(actionId);
    if (!approval) {
      throw new Error(`Action "${actionId}" not found in approval queue`);
    }

    // Idempotent: already decided
    if (approval.state !== 'pending') {
      return this.toDecision(approval);
    }

    approval.state = 'denied';
    approval.decidedAt = new Date();
    approval.decidedBy = approver;
    approval.denyReason = reason;

    return this.toDecision(approval);
  }

  /**
   * Get all pending approvals.
   */
  pending(): PendingApproval[] {
    return Array.from(this.queue.values()).filter(a => a.state === 'pending');
  }

  /**
   * Get a specific approval by ID.
   */
  get(actionId: string): PendingApproval | undefined {
    return this.queue.get(actionId);
  }

  /**
   * Register callback for when a new approval is needed.
   */
  onApprovalNeeded(callback: (approval: PendingApproval) => void): void {
    this.approvalCallbacks.push(callback);
  }

  /**
   * Register callback for when an approval expires.
   */
  onExpired(callback: (approval: PendingApproval) => void): void {
    this.expiredCallbacks.push(callback);
  }

  /**
   * Stop expiration checking and clear the queue.
   */
  destroy(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }
    this.queue.clear();
  }

  private startExpirationCheck(): void {
    // Check every 10 seconds for expired approvals
    // Also evict decided entries older than TTL*2 to prevent unbounded growth
    this.expirationTimer = setInterval(() => {
      const now = new Date();
      const evictBefore = new Date(now.getTime() - this.config.ttlMs * 2);

      for (const [id, approval] of this.queue) {
        if (approval.state === 'pending' && now >= approval.expiresAt) {
          approval.state = 'expired';
          approval.decidedAt = now;

          for (const cb of this.expiredCallbacks) {
            try { cb(approval); } catch { /* don't break */ }
          }
        } else if (
          approval.state !== 'pending' &&
          approval.decidedAt &&
          approval.decidedAt < evictBefore
        ) {
          // Evict decided entries that are older than TTL*2
          this.queue.delete(id);
        }
      }
    }, 10000);

    if (this.expirationTimer.unref) {
      this.expirationTimer.unref();
    }
  }

  private toDecision(approval: PendingApproval): ActionDecision {
    return {
      id: approval.id,
      action: approval.action.tool,
      tier: approval.tier,
      allowed: approval.state === 'approved',
      reason: approval.denyReason,
      approvedBy: approval.decidedBy,
      timestamp: approval.decidedAt ?? approval.createdAt,
    };
  }
}
