/**
 * ToolPreFilter — BM25 scoring, server diversity, edge cases
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolPreFilter } from '../src/federation/ToolPreFilter.js';
import type { Tool } from '../src/types/index.js';

function makeTool(name: string, description: string, server: string): Tool {
  return { name, description, parameters: { type: 'object', properties: {} }, server };
}

// Realistic security tool catalog (20 tools across 5 servers)
const CATALOG: Tool[] = [
  // CrowdStrike (EDR)
  makeTool('crowdstrike:list_detections', 'List recent threat detections from EDR sensors', 'crowdstrike'),
  makeTool('crowdstrike:get_detection', 'Get full details for a specific detection by ID', 'crowdstrike'),
  makeTool('crowdstrike:search_hosts', 'Search for endpoints by hostname, IP, or OS', 'crowdstrike'),
  makeTool('crowdstrike:quarantine_host', 'Network-isolate a compromised host', 'crowdstrike'),
  // Splunk (SIEM)
  makeTool('splunk:search', 'Run a Splunk SPL query across indexed log data', 'splunk'),
  makeTool('splunk:list_alerts', 'List triggered correlation alerts', 'splunk'),
  makeTool('splunk:get_notable', 'Get details of a notable event by ID', 'splunk'),
  makeTool('splunk:create_investigation', 'Create a new investigation from a notable', 'splunk'),
  // Vault (Secrets)
  makeTool('vault:read_secret', 'Read a secret from HashiCorp Vault KV store', 'vault'),
  makeTool('vault:list_secrets', 'List secret keys at a given path', 'vault'),
  makeTool('vault:write_secret', 'Write or update a secret in Vault', 'vault'),
  // GitHub (Code)
  makeTool('github:search_code', 'Search code across repositories', 'github'),
  makeTool('github:list_pulls', 'List open pull requests for a repo', 'github'),
  makeTool('github:get_commit', 'Get commit details by SHA', 'github'),
  makeTool('github:create_issue', 'Create a new GitHub issue', 'github'),
  // Sentinel (Cloud SIEM)
  makeTool('sentinel:query_logs', 'Run a KQL query against Azure Sentinel log tables', 'sentinel'),
  makeTool('sentinel:list_incidents', 'List active security incidents', 'sentinel'),
  makeTool('sentinel:get_incident', 'Get full incident details by ID', 'sentinel'),
  makeTool('sentinel:list_rules', 'List active analytics rules', 'sentinel'),
  makeTool('sentinel:update_incident', 'Update severity or status of an incident', 'sentinel'),
];

describe('ToolPreFilter', () => {
  let filter: ToolPreFilter;

  beforeEach(() => {
    filter = new ToolPreFilter();
    filter.index(CATALOG);
  });

  it('indexes all tools', async () => {
    expect(filter.size).toBe(20);
  });

  it('returns all tools when catalog fits within maxTools', async () => {
    const small = new ToolPreFilter();
    small.index(CATALOG.slice(0, 5));
    const result = await small.select('anything', { maxTools: 8 });
    expect(result).toHaveLength(5);
  });

  it('selects threat/detection tools for a threat query', async () => {
    const result = await filter.select('Show me recent threat detections', { maxTools: 5 });
    const names = result.map(t => t.name);
    expect(names).toContain('crowdstrike:list_detections');
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('selects vault tools for a secrets query', async () => {
    const result = await filter.select('Read the database password from vault', { maxTools: 5 });
    const names = result.map(t => t.name);
    expect(names).toContain('vault:read_secret');
  });

  it('selects Splunk tools for a log search query', async () => {
    const result = await filter.select('Search the logs for failed SSH logins', { maxTools: 5 });
    const names = result.map(t => t.name);
    expect(names).toContain('splunk:search');
  });

  it('selects GitHub tools for a code query', async () => {
    const result = await filter.select('Find the code that handles authentication', { maxTools: 5 });
    const names = result.map(t => t.name);
    expect(names).toContain('github:search_code');
  });

  it('selects incident tools for an incident query', async () => {
    const result = await filter.select('List active security incidents', { maxTools: 5 });
    const names = result.map(t => t.name);
    expect(names).toContain('sentinel:list_incidents');
  });

  it('enforces server diversity with maxPerServer', async () => {
    const result = await filter.select('List all detections and hosts and quarantine everything', {
      maxTools: 8,
      maxPerServer: 2,
    });
    const serverCounts = new Map<string, number>();
    for (const tool of result) {
      serverCounts.set(tool.server, (serverCounts.get(tool.server) ?? 0) + 1);
    }
    for (const [, count] of serverCounts) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it('handles empty query gracefully', async () => {
    const result = await filter.select('', { maxTools: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('handles query with only stopwords', async () => {
    const result = await filter.select('the and or is are', { maxTools: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('handles empty catalog', async () => {
    const empty = new ToolPreFilter();
    empty.index([]);
    const result = await empty.select('anything');
    expect(result).toHaveLength(0);
  });

  it('re-indexing replaces old catalog', async () => {
    const newCatalog = [makeTool('new:tool', 'A completely new tool', 'new-server')];
    filter.index(newCatalog);
    expect(filter.size).toBe(1);
    const result = await filter.select('new tool');
    expect(result[0].name).toBe('new:tool');
  });

  it('cross-domain query surfaces tools from multiple servers', async () => {
    const result = await filter.select('Search for threats in logs and quarantine the host', { maxTools: 8 });
    const servers = new Set(result.map(t => t.server));
    // Should have tools from at least 2 different servers
    expect(servers.size).toBeGreaterThanOrEqual(2);
  });

  it('scores tool with matching parameter names higher', async () => {
    const toolsWithParams: Tool[] = [
      {
        name: 'generic:action',
        description: 'Perform a generic action',
        parameters: { type: 'object', properties: { hostname: { type: 'string' }, severity: { type: 'string' } } },
        server: 'generic',
      },
      {
        name: 'other:action',
        description: 'Perform another action',
        parameters: { type: 'object', properties: { count: { type: 'number' } } },
        server: 'other',
      },
    ];
    const f = new ToolPreFilter();
    f.index(toolsWithParams);
    const result = await f.select('check hostname severity', { maxTools: 2 });
    expect(result[0].name).toBe('generic:action');
  });
});
