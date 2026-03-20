/**
 * @epic-ai/core — Checkpoint / Durable Execution
 * Save and restore orchestrator state for crash recovery.
 * Agent can resume from the last checkpoint after a crash.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StreamEvent, ActionRecord } from '../types/index.js';

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function assertSafeId(id: string, dir: string): string {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`Checkpoint id "${id}" contains invalid characters`);
  }
  const resolvedDir = resolve(dir);
  const resolvedPath = resolve(resolvedDir, `${id}.json`);
  if (!resolvedPath.startsWith(resolvedDir + '/') && resolvedPath !== resolvedDir) {
    throw new Error(`Checkpoint id "${id}" resolves outside checkpoint directory`);
  }
  return resolvedPath;
}

export interface CheckpointData {
  id: string;
  query: string;
  userId?: string;
  persona: string;
  iteration: number;
  events: StreamEvent[];
  priorActions: ActionRecord[];
  toolResults: { tool: string; server: string; content: unknown }[];
  pendingApprovals: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckpointStore {
  save(checkpoint: CheckpointData): Promise<void>;
  load(id: string): Promise<CheckpointData | null>;
  delete(id: string): Promise<void>;
  list(): Promise<string[]>;
}

/**
 * File-based checkpoint store. Each checkpoint is a JSON file.
 * For production, implement CheckpointStore with Redis or a database.
 */
export class FileCheckpointStore implements CheckpointStore {
  private readonly dir: string;

  constructor(dir: string = '.epic-ai-checkpoints') {
    this.dir = dir;
  }

  async save(checkpoint: CheckpointData): Promise<void> {
    const { mkdir } = await import('node:fs/promises');
    if (!existsSync(this.dir)) {
      await mkdir(this.dir, { recursive: true });
    }

    const path = assertSafeId(checkpoint.id, this.dir);
    const serialized = JSON.stringify(checkpoint, (_key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value as unknown;
    }, 2);

    await writeFile(path, serialized, 'utf-8');
  }

  async load(id: string): Promise<CheckpointData | null> {
    const path = assertSafeId(id, this.dir);
    if (!existsSync(path)) return null;

    const content = await readFile(path, 'utf-8');
    const data = JSON.parse(content) as CheckpointData;

    // Restore Date objects
    data.createdAt = new Date(data.createdAt);
    data.updatedAt = new Date(data.updatedAt);
    for (const event of data.events) {
      event.timestamp = new Date(event.timestamp);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const path = assertSafeId(id, this.dir);
    if (existsSync(path)) {
      await unlink(path);
    }
  }

  async list(): Promise<string[]> {
    const { readdir } = await import('node:fs/promises');
    if (!existsSync(this.dir)) return [];

    const files = await readdir(this.dir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }
}

/**
 * In-memory checkpoint store for testing.
 */
export class InMemoryCheckpointStore implements CheckpointStore {
  private readonly store = new Map<string, CheckpointData>();

  async save(checkpoint: CheckpointData): Promise<void> {
    this.store.set(checkpoint.id, { ...checkpoint });
  }

  async load(id: string): Promise<CheckpointData | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  clear(): void {
    this.store.clear();
  }
}
