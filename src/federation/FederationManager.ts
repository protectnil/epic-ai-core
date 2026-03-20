/**
 * @epic-ai/core — Federation Manager
 * Manages connections to multiple MCP servers, provides unified tool discovery,
 * invocation, and cross-source correlation.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  FederationConfig,
  ServerConnection,
  ConnectionHealth,
  Tool,
  ToolResult,
  CorrelationQuery,
  CorrelationResult,
} from '../types/index.js';
import { ConnectionPool } from './ConnectionPool.js';
import { ToolRegistry } from './ToolRegistry.js';
import { Correlator } from './Correlator.js';
import type { MCPAdapter } from './adapters/base.js';

export class FederationManager {
  private readonly pool: ConnectionPool;
  private readonly registry: ToolRegistry;
  private readonly correlator: Correlator;
  private readonly config: FederationConfig;
  private readonly adapterMap = new Map<string, MCPAdapter>();

  constructor(config: FederationConfig) {
    this.config = config;
    this.pool = new ConnectionPool(
      config.retryPolicy,
      config.healthCheckIntervalMs,
    );
    this.registry = new ToolRegistry();
    this.correlator = new Correlator();
  }

  /**
   * Connect to a single MCP server.
   * Discovers tools and registers them in the unified catalog.
   */
  async connect(
    name: string,
    config: ServerConnection,
    adapterOrFactory?: MCPAdapter | ((config: ServerConnection) => MCPAdapter),
  ): Promise<this> {
    const serverConfig = { ...config, name };
    const adapter = await this.pool.connect(serverConfig, adapterOrFactory);

    this.adapterMap.set(name, adapter);

    // Discover and register tools
    const tools = await adapter.listTools();
    this.registry.registerServer(name, tools);

    return this;
  }

  /**
   * Connect to all servers defined in the federation config.
   */
  async connectAll(): Promise<void> {
    const connectPromises = this.config.servers.map(server =>
      this.connect(server.name, server),
    );
    await Promise.allSettled(connectPromises);
  }

  /**
   * Disconnect from a specific server.
   */
  async disconnect(name: string): Promise<this> {
    this.registry.unregisterServer(name);
    this.adapterMap.delete(name);
    await this.pool.disconnect(name);
    return this;
  }

  /**
   * Disconnect from all servers.
   */
  async disconnectAll(): Promise<void> {
    this.registry.clear();
    this.adapterMap.clear();
    await this.pool.disconnectAll();
  }

  /**
   * List all discovered tools across all connected servers.
   */
  listTools(): Tool[] {
    return this.registry.listAll();
  }

  /**
   * List tools from a specific server.
   */
  listToolsByServer(server: string): Tool[] {
    return this.registry.listByServer(server);
  }

  /**
   * Call a tool by name. Automatically routes to the correct server.
   * Validates required fields from the tool's parameters schema before dispatch.
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in any connected server`);
    }

    // Basic JSON Schema required-field type checking
    const schema = tool.parameters as { required?: string[]; properties?: Record<string, { type?: string }> };
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in args)) {
          throw new Error(`Tool "${name}" missing required argument: "${field}"`);
        }
        const propSchema = schema.properties?.[field];
        if (propSchema?.type) {
          const actualType = Array.isArray(args[field]) ? 'array' : typeof args[field];
          if (actualType !== propSchema.type) {
            throw new Error(`Tool "${name}" argument "${field}" expected type "${propSchema.type}", got "${actualType}"`);
          }
        }
      }
    }

    const adapter = this.adapterMap.get(tool.server);
    if (!adapter) {
      throw new Error(`Server "${tool.server}" for tool "${name}" is not connected`);
    }

    // Use the original tool name (without server prefix) for the MCP call
    const originalName = name.includes(':') ? name.split(':').slice(1).join(':') : name;
    return adapter.callTool(originalName, args);
  }

  /**
   * Correlate entities and events across connected servers.
   */
  async correlate(query: CorrelationQuery): Promise<CorrelationResult> {
    return this.correlator.correlate(query, this.adapterMap);
  }

  /**
   * Get health status of all connections.
   */
  async health(): Promise<ConnectionHealth[]> {
    return this.pool.health();
  }

  /**
   * Register a callback for health status changes.
   */
  onHealthChange(callback: (health: ConnectionHealth) => void): void {
    this.pool.onHealthChange(callback);
  }

  /**
   * Start periodic health monitoring.
   */
  startHealthCheck(): void {
    this.pool.startHealthCheck();
  }

  /**
   * Stop periodic health monitoring.
   */
  stopHealthCheck(): void {
    this.pool.stopHealthCheck();
  }

  /**
   * Number of connected servers.
   */
  get serverCount(): number {
    return this.pool.size;
  }

  /**
   * Total number of discovered tools.
   */
  get toolCount(): number {
    return this.registry.size;
  }
}
