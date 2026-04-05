import { describe, it, expect } from 'vitest';
import { EpaCaseMCPServer } from '../../src/mcp-servers/epa-case.js';

describe('EpaCaseMCPServer', () => {
  const adapter = new EpaCaseMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new EpaCaseMCPServer({ baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes the correct number of tools', () => {
    expect(adapter.tools.length).toBe(11);
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
    const cat = EpaCaseMCPServer.catalog();
    expect(cat.name).toBe('epa-case');
    expect(cat.category).toBe('government');
    expect(cat.toolNames).toHaveLength(11);
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_cases_paginated requires qid', async () => {
    const result = await adapter.callTool('get_cases_paginated', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_case_map requires qid', async () => {
    const result = await adapter.callTool('get_case_map', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('download_cases requires qid', async () => {
    const result = await adapter.callTool('download_cases', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('qid');
  });

  it('get_cases_from_facility requires p_id', async () => {
    const result = await adapter.callTool('get_cases_from_facility', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_id');
  });

  it('get_facilities_from_case requires p_id', async () => {
    const result = await adapter.callTool('get_facilities_from_case', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_id');
  });

  it('tool names match catalog toolNames', () => {
    const toolNames = adapter.tools.map(t => t.name);
    const catalogNames = EpaCaseMCPServer.catalog().toolNames;
    expect(toolNames.sort()).toEqual(catalogNames.sort());
  });
});
