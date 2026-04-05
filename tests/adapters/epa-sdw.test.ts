import { describe, it, expect } from 'vitest';
import { EpaSdwMCPServer } from '../../src/mcp-servers/epa-sdw.js';

describe('EpaSdwMCPServer', () => {
  const adapter = new EpaSdwMCPServer();

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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('search_water_systems');
    expect(names).toContain('get_paginated_results');
    expect(names).toContain('download_water_systems');
    expect(names).toContain('get_metadata');
  });

  it('search_water_systems has no required fields (all optional filters)', () => {
    const tool = adapter.tools.find(t => t.name === 'search_water_systems');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('get_paginated_results requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_paginated_results');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('qid');
  });

  it('download_water_systems requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'download_water_systems');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('qid');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_paginated_results missing qid returns error', async () => {
    const result = await adapter.callTool('get_paginated_results', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid is required');
  });

  it('download_water_systems missing qid returns error', async () => {
    const result = await adapter.callTool('download_water_systems', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = EpaSdwMCPServer.catalog();
    expect(cat.name).toBe('epa-sdw');
    expect(cat.category).toBe('government');
    expect(cat.toolNames).toContain('search_water_systems');
    expect(cat.toolNames.length).toBe(4);
  });

  it('custom baseUrl is accepted via config', () => {
    const custom = new EpaSdwMCPServer({ baseUrl: 'https://custom.example.com/echo' });
    expect(custom).toBeDefined();
  });
});
