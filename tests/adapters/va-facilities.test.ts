import { describe, it, expect } from 'vitest';
import { VAFacilitiesMCPServer } from '../../src/mcp-servers/va-facilities.js';

describe('VAFacilitiesMCPServer', () => {
  const adapter = new VAFacilitiesMCPServer({ apiKey: 'test-key' });

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

  it('get_facility without id returns error', async () => {
    const result = await adapter.callTool('get_facility', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('static catalog returns required fields', () => {
    const catalog = VAFacilitiesMCPServer.catalog();
    expect(catalog.name).toBe('va-facilities');
    expect(catalog.category).toBe('government');
    expect(catalog.toolNames).toContain('search_facilities');
    expect(catalog.toolNames).toContain('get_facility');
    expect(catalog.toolNames).toContain('get_facility_ids');
    expect(catalog.author).toBe('protectnil');
  });
});
