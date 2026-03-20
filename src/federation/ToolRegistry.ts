/**
 * @epicai/core — Tool Registry
 * Unified tool catalog across all connected MCP servers.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { Tool } from '../types/index.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();
  private readonly toolsByServer = new Map<string, Tool[]>();

  /**
   * Register tools from a connected server.
   * Always prefixes tool names with the server name (e.g., "vault:read-secret")
   * to ensure deterministic, collision-free tool naming across multiple servers.
   */
  registerServer(serverName: string, tools: Tool[]): void {
    const serverTools: Tool[] = [];

    for (const tool of tools) {
      // Always prefix with server name for deterministic naming
      const registeredName = `${serverName}:${tool.name}`;

      const registeredTool: Tool = { ...tool, name: registeredName };
      this.tools.set(registeredName, registeredTool);
      serverTools.push(registeredTool);
    }

    this.toolsByServer.set(serverName, serverTools);
  }

  /**
   * Remove all tools registered by a server.
   */
  unregisterServer(serverName: string): void {
    const serverTools = this.toolsByServer.get(serverName);
    if (serverTools) {
      for (const tool of serverTools) {
        this.tools.delete(tool.name);
      }
      this.toolsByServer.delete(serverName);
    }
  }

  /**
   * Get all registered tools across all servers.
   */
  listAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools registered by a specific server.
   */
  listByServer(serverName: string): Tool[] {
    return this.toolsByServer.get(serverName) ?? [];
  }

  /**
   * Look up a tool by name. Returns undefined if not found.
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Resolve which server owns a tool by name.
   */
  resolveServer(toolName: string): string | undefined {
    return this.tools.get(toolName)?.server;
  }

  /**
   * Total number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.tools.clear();
    this.toolsByServer.clear();
  }
}
