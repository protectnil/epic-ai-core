import { describe, it, expect } from 'vitest';
import { NprIdentityMCPServer } from '../../src/mcp-servers/npr-identity.js';

describe('NprIdentityMCPServer', () => {
  const adapter = new NprIdentityMCPServer({ accessToken: 'test-token' });

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

  it('update_stations rejects empty station_ids without network call', async () => {
    const result = await adapter.callTool('update_stations', { station_ids: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('station_ids');
  });
});
