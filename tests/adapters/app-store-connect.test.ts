import { describe, it, expect } from 'vitest';
import { AppStoreConnectMCPServer } from '../../src/mcp-servers/app-store-connect.js';

describe('AppStoreConnectMCPServer', () => {
  const adapter = new AppStoreConnectMCPServer({ keyId: 'test-id', issuerId: 'test-id', privateKey: 'test-key' });

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
