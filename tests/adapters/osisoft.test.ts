import { describe, it, expect } from 'vitest';
import { OsisoftMCPServer } from '../../src/mcp-servers/osisoft.js';

describe('OsisoftMCPServer', () => {
  const adapter = new OsisoftMCPServer({ username: 'test-user', password: 'test-pass' });

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

  it('unknown tool returns isError without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('list_points rejects missing server_web_id without network call', async () => {
    const result = await adapter.callTool('list_points', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('server_web_id');
  });
});
