import { describe, it, expect } from 'vitest';
import { EpaRcraMCPServer } from '../../src/mcp-servers/epa-rcra.js';

describe('EpaRcraMCPServer', () => {
  const adapter = new EpaRcraMCPServer();

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
    expect(names).toContain('search_facilities');
    expect(names).toContain('get_facility_info');
    expect(names).toContain('get_paginated_results');
    expect(names).toContain('get_map_data');
    expect(names).toContain('get_geojson');
    expect(names).toContain('get_info_clusters');
    expect(names).toContain('download_facilities');
    expect(names).toContain('get_metadata');
  });

  it('search_facilities has no required fields (all optional filters)', () => {
    const tool = adapter.tools.find(t => t.name === 'search_facilities');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('get_paginated_results requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_paginated_results');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('qid');
  });

  it('get_map_data requires qid and p_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_map_data');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('qid');
    expect(tool!.inputSchema.required).toContain('p_id');
  });

  it('get_geojson requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_geojson');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('qid');
  });

  it('get_info_clusters requires p_qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_info_clusters');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('p_qid');
  });

  it('download_facilities requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'download_facilities');
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

  it('get_map_data missing qid returns error', async () => {
    const result = await adapter.callTool('get_map_data', { p_id: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid is required');
  });

  it('get_map_data missing p_id returns error', async () => {
    const result = await adapter.callTool('get_map_data', { qid: 'abc123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_id is required');
  });

  it('get_geojson missing qid returns error', async () => {
    const result = await adapter.callTool('get_geojson', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid is required');
  });

  it('get_info_clusters missing p_qid returns error', async () => {
    const result = await adapter.callTool('get_info_clusters', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_qid is required');
  });

  it('download_facilities missing qid returns error', async () => {
    const result = await adapter.callTool('download_facilities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = EpaRcraMCPServer.catalog();
    expect(cat.name).toBe('epa-rcra');
    expect(cat.category).toBe('government');
    expect(cat.toolNames).toContain('search_facilities');
    expect(cat.toolNames.length).toBe(8);
  });

  it('custom baseUrl is accepted via config', () => {
    const custom = new EpaRcraMCPServer({ baseUrl: 'https://custom.example.com/echo' });
    expect(custom).toBeDefined();
  });
});
