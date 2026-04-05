import { describe, it, expect } from 'vitest';
import { Signl4MCPServer } from '../../src/mcp-servers/signl4.js';

describe('Signl4MCPServer', () => {
  const adapter = new Signl4MCPServer({ apiKey: 'test-api-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools with required fields', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns correct metadata', () => {
    const catalog = Signl4MCPServer.catalog();
    expect(catalog.name).toBe('signl4');
    expect(catalog.category).toBe('communication');
    expect(catalog.toolNames).toContain('trigger_alert');
    expect(catalog.toolNames).toContain('acknowledge_alert');
    expect(catalog.toolNames).toContain('close_alert');
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
