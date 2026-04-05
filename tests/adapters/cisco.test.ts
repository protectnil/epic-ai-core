import { describe, it, expect } from 'vitest';
import { CiscoMCPServer } from '../../src/mcp-servers/cisco.js';

describe('CiscoMCPServer', () => {
  const adapter = new CiscoMCPServer({ accessToken: 'test-token' });

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
    expect(names).toContain('get_all_advisories_cvrf');
    expect(names).toContain('get_advisory_cvrf');
    expect(names).toContain('get_advisory_by_cve_cvrf');
    expect(names).toContain('get_latest_advisories_cvrf');
    expect(names).toContain('get_advisories_by_product_cvrf');
    expect(names).toContain('get_advisories_by_severity_cvrf');
    expect(names).toContain('get_advisories_by_year_cvrf');
    expect(names).toContain('get_all_advisories_oval');
    expect(names).toContain('get_advisory_oval');
    expect(names).toContain('get_advisory_by_cve_oval');
    expect(names).toContain('get_ios_advisories');
    expect(names).toContain('get_iosxe_advisories');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_advisory_cvrf returns error when advisory_id missing', async () => {
    const result = await adapter.callTool('get_advisory_cvrf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('advisory_id is required');
  });

  it('get_advisory_by_cve_cvrf returns error when cve_id missing', async () => {
    const result = await adapter.callTool('get_advisory_by_cve_cvrf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('cve_id is required');
  });

  it('get_latest_advisories_cvrf returns error when number missing', async () => {
    const result = await adapter.callTool('get_latest_advisories_cvrf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('number is required');
  });

  it('get_advisories_by_product_cvrf returns error when product missing', async () => {
    const result = await adapter.callTool('get_advisories_by_product_cvrf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('product is required');
  });

  it('get_advisories_by_severity_cvrf returns error when severity missing', async () => {
    const result = await adapter.callTool('get_advisories_by_severity_cvrf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('severity is required');
  });

  it('get_advisories_by_year_cvrf returns error when year missing', async () => {
    const result = await adapter.callTool('get_advisories_by_year_cvrf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('year is required');
  });

  it('get_advisory_oval returns error when advisory_id missing', async () => {
    const result = await adapter.callTool('get_advisory_oval', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('advisory_id is required');
  });

  it('get_advisory_by_cve_oval returns error when cve_id missing', async () => {
    const result = await adapter.callTool('get_advisory_by_cve_oval', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('cve_id is required');
  });

  it('get_ios_advisories returns error when version missing', async () => {
    const result = await adapter.callTool('get_ios_advisories', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('version is required');
  });

  it('get_iosxe_advisories returns error when version missing', async () => {
    const result = await adapter.callTool('get_iosxe_advisories', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('version is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = CiscoMCPServer.catalog();
    expect(cat.name).toBe('cisco');
    expect(cat.category).toBe('cloud');
    expect(cat.toolNames.length).toBe(12);
    expect(cat.author).toBe('protectnil');
  });
});
