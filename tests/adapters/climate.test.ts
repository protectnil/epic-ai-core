import { describe, it, expect } from 'vitest';
import { ClimateMCPServer } from '../../src/mcp-servers/climate.js';

describe('ClimateMCPServer', () => {
  const adapter = new ClimateMCPServer({ accessToken: 'test-access-token', apiKey: 'test-api-key' });

  it('instantiates', () => {
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
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const catalog = ClimateMCPServer.catalog();
    expect(catalog.name).toBe('climate');
    expect(catalog.category).toBe('agriculture');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names match catalog toolNames', () => {
    const catalog = ClimateMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('missing required param returns error without throw', async () => {
    const result = await adapter.callTool('get_field', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fieldId');
  });

  it('get_boundary missing id returns error', async () => {
    const result = await adapter.callTool('get_boundary', {});
    expect(result.isError).toBe(true);
  });

  it('query_boundaries missing ids returns error', async () => {
    const result = await adapter.callTool('query_boundaries', {});
    expect(result.isError).toBe(true);
  });

  it('all 26 tools are present', () => {
    expect(adapter.tools.length).toBe(26);
  });
});
