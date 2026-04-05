import { describe, it, expect } from 'vitest';
import { VictorOpsMCPServer } from '../../src/mcp-servers/victorops.js';

describe('VictorOpsMCPServer', () => {
  const adapter = new VictorOpsMCPServer({ apiId: 'test-api-id', apiKey: 'test-api-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns required fields', () => {
    const cat = VictorOpsMCPServer.catalog();
    expect(cat.name).toBe('victorops');
    expect(cat.category).toBe('observability');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = VictorOpsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('list_incidents tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_incidents');
    expect(tool).toBeDefined();
  });

  it('create_incident tool exists with summary param', () => {
    const tool = adapter.tools.find(t => t.name === 'create_incident');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('summary');
  });

  it('acknowledge_incidents tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'acknowledge_incidents');
    expect(tool).toBeDefined();
  });

  it('get_oncall_users tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'get_oncall_users');
    expect(tool).toBeDefined();
  });

  it('list_teams tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_teams');
    expect(tool).toBeDefined();
  });

  it('get_maintenance_mode tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'get_maintenance_mode');
    expect(tool).toBeDefined();
  });

  it('list_routing_keys tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_routing_keys');
    expect(tool).toBeDefined();
  });

  it('list_overrides tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_overrides');
    expect(tool).toBeDefined();
  });

  it('create_override tool exists with username param', () => {
    const tool = adapter.tools.find(t => t.name === 'create_override');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('username');
    expect(tool!.inputSchema.properties).toHaveProperty('policy_slug');
  });
});
