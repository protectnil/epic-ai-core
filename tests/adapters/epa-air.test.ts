import { describe, it, expect } from 'vitest';
import { EpaAirMCPServer } from '../../src/mcp-servers/epa-air.js';

describe('EpaAirMCPServer', () => {
  const adapter = new EpaAirMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new EpaAirMCPServer({ baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes the correct number of tools', () => {
    expect(adapter.tools.length).toBe(8);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns correct metadata', () => {
    const cat = EpaAirMCPServer.catalog();
    expect(cat.name).toBe('epa-air');
    expect(cat.category).toBe('government');
    expect(cat.toolNames).toHaveLength(8);
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_facilities_paginated requires qid', async () => {
    const result = await adapter.callTool('get_facilities_paginated', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_facility_map requires qid', async () => {
    const result = await adapter.callTool('get_facility_map', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_facility_geojson requires qid', async () => {
    const result = await adapter.callTool('get_facility_geojson', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('download_facilities requires qid', async () => {
    const result = await adapter.callTool('download_facilities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_info_clusters requires p_qid', async () => {
    const result = await adapter.callTool('get_info_clusters', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_qid');
  });

  it('tool names match catalog toolNames', () => {
    const toolNames = adapter.tools.map(t => t.name);
    const catalogNames = EpaAirMCPServer.catalog().toolNames;
    expect(toolNames.sort()).toEqual(catalogNames.sort());
  });
});
