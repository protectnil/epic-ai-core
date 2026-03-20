/**
 * @epic-ai/core — Federation Adapter Base Interface
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { Tool, ToolResult, ConnectionStatus } from '../../types/index.js';

export interface MCPAdapter {
  readonly name: string;
  readonly status: ConnectionStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  ping(): Promise<number>;
}
