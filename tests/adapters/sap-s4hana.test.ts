import { describe, it, expect } from 'vitest';
import { SAPS4HANAMCPServer } from '../../src/mcp-servers/sap-s4hana.js';

describe('SAPS4HANAMCPServer', () => {
  const adapter = new SAPS4HANAMCPServer({ clientId: 'test-id', clientSecret: 'test-secret', subdomain: 'test.example.com', region: 'us-east-1', apiServer: 'test-value' });

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
