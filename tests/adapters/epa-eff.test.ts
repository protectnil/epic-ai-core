import { describe, it, expect } from 'vitest';
import { EpaEffMCPServer } from '../../src/mcp-servers/epa-eff.js';

describe('EpaEffMCPServer', () => {
  const adapter = new EpaEffMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new EpaEffMCPServer({ baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes exactly 4 tools', () => {
    expect(adapter.tools.length).toBe(4);
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
    const catalog = EpaEffMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toEqual(catalog.toolNames);
  });

  it('catalog returns expected fields', () => {
    const catalog = EpaEffMCPServer.catalog();
    expect(catalog.name).toBe('epa-eff');
    expect(catalog.category).toBe('government');
    expect(catalog.toolNames.length).toBe(4);
    expect(catalog.description).toBeTruthy();
  });

  it('get_summary_chart tool requires p_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_summary_chart');
    expect(tool?.inputSchema.required).toContain('p_id');
  });

  it('get_effluent_chart tool requires p_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_effluent_chart');
    expect(tool?.inputSchema.required).toContain('p_id');
  });

  it('download_effluent_chart tool requires p_id', () => {
    const tool = adapter.tools.find(t => t.name === 'download_effluent_chart');
    expect(tool?.inputSchema.required).toContain('p_id');
  });

  it('lookup_cwa_parameters tool has no required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'lookup_cwa_parameters');
    expect(tool).toBeDefined();
    // required array is empty or absent
    const req = tool?.inputSchema.required ?? [];
    expect(req.length).toBe(0);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_summary_chart missing p_id returns error', async () => {
    const result = await adapter.callTool('get_summary_chart', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_id');
  });

  it('get_effluent_chart missing p_id returns error', async () => {
    const result = await adapter.callTool('get_effluent_chart', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_id');
  });

  it('download_effluent_chart missing p_id returns error', async () => {
    const result = await adapter.callTool('download_effluent_chart', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_id');
  });
});
