/**
 * @epicai/legion — Federation Adapter Base Interface
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { Tool, ToolResult, ConnectionStatus } from '../../types/index.js';
import type { AdapterCatalogEntry } from '../AdapterCatalog.js';

/**
 * MCPAdapter — existing interface for MCP protocol adapters.
 * Unchanged from V1. All existing adapters continue to implement this.
 */
export interface MCPAdapter {
  readonly name: string;
  readonly status: ConnectionStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  ping(): Promise<number>;
}

/**
 * EpicAIAdapter — V2 adapter contract for community/vendor contributions.
 * Simpler than MCPAdapter: no MCP protocol, just tool definitions and execution.
 * Adapters extending this class can be loaded into the federation via the
 * AdapterCatalog and lazy connection pool.
 */
export abstract class EpicAIAdapter {
  abstract readonly tools: Tool[];
  abstract callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;

  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  ping?(): Promise<number>;

  /**
   * OAuth token lifecycle note:
   * Adapters that use OAuth2 cache a `bearerToken` field in memory. Tokens are
   * intentionally short-lived — the token refresh flow overwrites the old value
   * automatically before the next request. No manual eviction is required for
   * normal operation.
   *
   * clearCredentials() is provided as an explicit cleanup hook for callers that
   * want deterministic credential removal — e.g. on user logout, session end,
   * or security incident response. Override this method in adapters that hold
   * bearer tokens or other sensitive credentials to zero them from memory.
   *
   * Default implementation is a no-op; adapters that cache credentials should
   * override it.
   */
  clearCredentials(): void {
    // No-op by default. Adapters with cached OAuth tokens should override this
    // method to clear the bearerToken field and any other credential state.
  }
}

/**
 * Static/constructor contract — enforced by FederationManager at registration time.
 * TypeScript cannot express static abstract members; enforcement is at load time.
 */
export interface EpicAIAdapterConstructor {
  catalog(): AdapterCatalogEntry;
  new (config: Record<string, string>): EpicAIAdapter;
}
