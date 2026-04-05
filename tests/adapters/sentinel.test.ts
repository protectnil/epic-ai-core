import { describe, it, expect } from 'vitest';
import { SentinelMCPServer } from '../../src/mcp-servers/sentinel.js';

describe('SentinelMCPServer', () => {
  const adapter = new SentinelMCPServer({ subscriptionId: '00000000-0000-0000-0000-000000000000', resourceGroup: 'test-rg', workspaceName: 'test-ws', bearerToken: 'test-token' });

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
});
