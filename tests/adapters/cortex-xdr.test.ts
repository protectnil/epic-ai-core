import { describe, it, expect } from 'vitest';
import { CortexXDRMCPServer } from '../../src/mcp-servers/cortex-xdr.js';

describe('CortexXDRMCPServer', () => {
  const adapter = new CortexXDRMCPServer({ apiKey: 'test-key', apiKeyId: 'test-id', fqdn: 'test-value' });

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
