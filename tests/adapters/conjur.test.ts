import { describe, it, expect } from 'vitest';
import { ConjurMCPServer } from '../../src/mcp-servers/conjur.js';

describe('ConjurMCPServer', () => {
  const adapter = new ConjurMCPServer({
    baseUrl: 'https://conjur.example.com',
    account: 'myorg',
    accessToken: 'test-token',
  });

  it('instantiates', () => {
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
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });
});
