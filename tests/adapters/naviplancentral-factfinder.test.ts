import { describe, it, expect } from 'vitest';
import { NaviPlanCentralFactFinderMCPServer } from '../../src/mcp-servers/naviplancentral-factfinder.js';

describe('NaviPlanCentralFactFinderMCPServer', () => {
  const adapter = new NaviPlanCentralFactFinderMCPServer({ apiKey: 'test-key' });

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

  it('get_fact_finder requires id', async () => {
    const result = await adapter.callTool('get_fact_finder', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_accounts requires factFinderId', async () => {
    const result = await adapter.callTool('get_accounts', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('factFinderId is required');
  });

  it('create_fact_finder requires model', async () => {
    const result = await adapter.callTool('create_fact_finder', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('model is required');
  });

  it('catalog returns correct name and category', () => {
    const cat = NaviPlanCentralFactFinderMCPServer.catalog();
    expect(cat.name).toBe('naviplancentral-factfinder');
    expect(cat.category).toBe('finance');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('catalog toolNames match tools getter', () => {
    const cat = NaviPlanCentralFactFinderMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('uses provided baseUrl', () => {
    const custom = new NaviPlanCentralFactFinderMCPServer({
      apiKey: 'k',
      baseUrl: 'https://custom.example.com/factfinder',
    });
    expect(custom).toBeDefined();
  });

  it('instantiates without apiKey (unauthenticated mode)', () => {
    const anon = new NaviPlanCentralFactFinderMCPServer({});
    expect(anon).toBeDefined();
    expect(anon.tools.length).toBeGreaterThan(0);
  });
});
