import { describe, it, expect } from 'vitest';
import { UniCourtMCPServer } from '../../src/mcp-servers/unicourt.js';

describe('UniCourtMCPServer', () => {
  const adapter = new UniCourtMCPServer({ accessToken: 'test-token' });

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
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('search_cases');
    expect(names).toContain('get_case');
    expect(names).toContain('get_case_docket_entries');
    expect(names).toContain('track_case');
    expect(names).toContain('search_attorneys');
    expect(names).toContain('get_attorney');
    expect(names).toContain('search_judges');
    expect(names).toContain('get_judge');
    expect(names).toContain('search_law_firms');
    expect(names).toContain('get_law_firm');
    expect(names).toContain('get_courts');
    expect(names).toContain('get_billing_usage');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('search_cases requires q parameter', async () => {
    const result = await adapter.callTool('search_cases', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/q is required/);
  });

  it('get_case requires case_id parameter', async () => {
    const result = await adapter.callTool('get_case', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/case_id is required/);
  });

  it('get_case_attorneys requires case_id parameter', async () => {
    const result = await adapter.callTool('get_case_attorneys', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/case_id is required/);
  });

  it('get_case_parties requires case_id parameter', async () => {
    const result = await adapter.callTool('get_case_parties', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/case_id is required/);
  });

  it('get_case_docket_entries requires case_id parameter', async () => {
    const result = await adapter.callTool('get_case_docket_entries', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/case_id is required/);
  });

  it('track_case requires case_id parameter', async () => {
    const result = await adapter.callTool('track_case', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/case_id is required/);
  });

  it('remove_case_tracking requires case_id parameter', async () => {
    const result = await adapter.callTool('remove_case_tracking', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/case_id is required/);
  });

  it('search_attorneys requires q parameter', async () => {
    const result = await adapter.callTool('search_attorneys', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/q is required/);
  });

  it('get_attorney requires norm_attorney_id parameter', async () => {
    const result = await adapter.callTool('get_attorney', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/norm_attorney_id is required/);
  });

  it('search_judges requires q parameter', async () => {
    const result = await adapter.callTool('search_judges', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/q is required/);
  });

  it('get_judge requires norm_judge_id parameter', async () => {
    const result = await adapter.callTool('get_judge', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/norm_judge_id is required/);
  });

  it('search_law_firms requires q parameter', async () => {
    const result = await adapter.callTool('search_law_firms', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/q is required/);
  });

  it('get_law_firm requires norm_law_firm_id parameter', async () => {
    const result = await adapter.callTool('get_law_firm', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/norm_law_firm_id is required/);
  });

  it('catalog returns expected shape', () => {
    const cat = UniCourtMCPServer.catalog();
    expect(cat.name).toBe('unicourt');
    expect(cat.category).toBe('legal');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.keywords).toContain('unicourt');
  });
});
