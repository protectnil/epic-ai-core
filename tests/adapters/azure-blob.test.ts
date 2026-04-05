import { describe, it, expect } from 'vitest';
import { AzureBlobMCPServer } from '../../src/mcp-servers/azure-blob.js';

describe('AzureBlobMCPServer', () => {
  const adapter = new AzureBlobMCPServer({ tenantId: 'test-id', clientId: 'test-id', clientSecret: 'test-secret', accountName: 'test-account' });

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
