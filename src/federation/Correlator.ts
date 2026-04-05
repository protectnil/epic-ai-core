/**
 * @epicai/legion — Correlator
 * Cross-source entity and event correlation across federated MCP servers.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  CorrelationQuery,
  CorrelationResult,
  CorrelatedEntity,
  CorrelatedEvent,
  ToolResult,
} from '../types/index.js';
import type { MCPAdapter } from './adapters/base.js';

export class Correlator {
  /**
   * Correlate entities and events across multiple MCP servers.
   *
   * Fans out queries to each server's search/query tools,
   * then joins results by entity ID to build a unified timeline.
   */
  async correlate(
    query: CorrelationQuery,
    adapters: Map<string, MCPAdapter>,
  ): Promise<CorrelationResult> {
    const entities = new Map<string, CorrelatedEntity>();
    const timeline: CorrelatedEvent[] = [];
    const serversCovered: string[] = [];

    // Determine which servers to query
    const targetServers = query.servers
      ? Array.from(adapters.entries()).filter(([name]) => query.servers!.includes(name))
      : Array.from(adapters.entries());

    // Fan out queries to all target servers in parallel
    const queryPromises = targetServers.map(async ([serverName, adapter]) => {
      try {
        const tools = await adapter.listTools();

        // Security boundary: Correlator intentionally bypasses TieredAutonomy because
        // it only selects read-only tools (search, query, find, list, get).
        // These tools are considered safe for automated correlation queries.
        // Any tool that performs writes must NOT be added to this filter.
        // Read-only tool names used for cross-source correlation:
        const READ_ONLY_KEYWORDS = ['search', 'query', 'find', 'list', 'get'];
        const searchTool = tools.find(t =>
          READ_ONLY_KEYWORDS.some(keyword => t.name.includes(keyword))
        );

        if (!searchTool) return { serverName, results: [] as ToolResult[] };

        // Query each entity on this server
        const entityResults: ToolResult[] = [];
        for (const entityId of query.entities) {
          try {
            const result = await adapter.callTool(searchTool.name, {
              query: entityId,
              timeRange: {
                start: query.timeRange.start.toISOString(),
                end: query.timeRange.end.toISOString(),
              },
            });
            entityResults.push(result);
          } catch {
            // Server doesn't have data for this entity — not an error
          }
        }

        return { serverName, results: entityResults };
      } catch {
        return { serverName, results: [] as ToolResult[] };
      }
    });

    const serverResults = await Promise.allSettled(queryPromises);

    for (const settled of serverResults) {
      if (settled.status !== 'fulfilled') continue;
      const { serverName, results } = settled.value;
      if (results.length === 0) continue;

      serversCovered.push(serverName);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.isError) continue;

        const entityId = query.entities[i];
        if (!entityId) continue;

        // Build entity correlation
        const existing = entities.get(entityId) ?? { id: entityId, sources: [] };
        existing.sources.push({
          server: serverName,
          data: typeof result.content === 'object' && result.content !== null
            ? result.content as Record<string, unknown>
            : { raw: result.content },
        });
        entities.set(entityId, existing);

        // Build timeline event
        timeline.push({
          timestamp: new Date(),
          server: serverName,
          tool: result.tool,
          entity: entityId,
          data: typeof result.content === 'object' && result.content !== null
            ? result.content as Record<string, unknown>
            : { raw: result.content },
        });
      }
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return { entities, timeline, serversCovered };
  }
}
