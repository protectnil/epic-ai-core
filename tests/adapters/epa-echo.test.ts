import { describe, it, expect } from 'vitest';
import { EpaEchoMCPServer } from '../../src/mcp-servers/epa-echo.js';

describe('EpaEchoMCPServer', () => {
  const adapter = new EpaEchoMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new EpaEchoMCPServer({ baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes exactly 8 tools', () => {
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

  it('tool names match catalog toolNames', () => {
    const catalog = EpaEchoMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toEqual(catalog.toolNames);
  });

  it('catalog returns expected fields', () => {
    const catalog = EpaEchoMCPServer.catalog();
    expect(catalog.name).toBe('epa-echo');
    expect(catalog.category).toBe('government');
    expect(catalog.toolNames.length).toBe(8);
    expect(catalog.description).toBeTruthy();
  });

  it('get_qid_results tool requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_qid_results');
    expect(tool?.inputSchema.required).toContain('qid');
  });

  it('get_map_clusters tool requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_map_clusters');
    expect(tool?.inputSchema.required).toContain('qid');
  });

  it('get_geojson tool requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_geojson');
    expect(tool?.inputSchema.required).toContain('qid');
  });

  it('get_info_clusters tool requires p_qid', () => {
    const tool = adapter.tools.find(t => t.name === 'get_info_clusters');
    expect(tool?.inputSchema.required).toContain('p_qid');
  });

  it('download_facilities tool requires qid', () => {
    const tool = adapter.tools.find(t => t.name === 'download_facilities');
    expect(tool?.inputSchema.required).toContain('qid');
  });

  it('search_facilities has no required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'search_facilities');
    const req = tool?.inputSchema.required ?? [];
    expect(req.length).toBe(0);
  });

  it('get_facility_info has no required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'get_facility_info');
    const req = tool?.inputSchema.required ?? [];
    expect(req.length).toBe(0);
  });

  it('get_metadata has no required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'get_metadata');
    const req = tool?.inputSchema.required ?? [];
    expect(req.length).toBe(0);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_qid_results missing qid returns error', async () => {
    const result = await adapter.callTool('get_qid_results', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_map_clusters missing qid returns error', async () => {
    const result = await adapter.callTool('get_map_clusters', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_geojson missing qid returns error', async () => {
    const result = await adapter.callTool('get_geojson', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_info_clusters missing p_qid returns error', async () => {
    const result = await adapter.callTool('get_info_clusters', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_qid');
  });

  it('download_facilities missing qid returns error', async () => {
    const result = await adapter.callTool('download_facilities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });
});
