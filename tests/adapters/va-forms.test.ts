import { describe, it, expect } from 'vitest';
import { VAFormsMCPServer } from '../../src/mcp-servers/va-forms.js';

describe('VAFormsMCPServer', () => {
  const adapter = new VAFormsMCPServer({ apiKey: 'test-key' });

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

  it('get_form without form_name returns error', async () => {
    const result = await adapter.callTool('get_form', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('form_name is required');
  });

  it('static catalog returns required fields', () => {
    const catalog = VAFormsMCPServer.catalog();
    expect(catalog.name).toBe('va-forms');
    expect(catalog.category).toBe('government');
    expect(catalog.toolNames).toContain('list_forms');
    expect(catalog.toolNames).toContain('get_form');
    expect(catalog.author).toBe('protectnil');
  });
});
