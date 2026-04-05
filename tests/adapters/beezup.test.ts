import { describe, it, expect } from 'vitest';
import { BeezupMCPServer } from '../../src/mcp-servers/beezup.js';

describe('BeezupMCPServer', () => {
  const adapter = new BeezupMCPServer({ apiKey: 'test-api-key' });

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

  it('unknown tool returns isError true without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_order returns error when required params are missing', async () => {
    const result = await adapter.callTool('get_order', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/marketplace_technical_code/);
  });
});
