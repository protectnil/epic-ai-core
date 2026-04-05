import { describe, it, expect } from 'vitest';
import { BetfairMCPServer } from '../../src/mcp-servers/betfair.js';

describe('BetfairMCPServer', () => {
  const adapter = new BetfairMCPServer({ sessionToken: 'test-session', appKey: 'test-app-key' });

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

  it('get_market_book returns error when market_ids missing', async () => {
    const result = await adapter.callTool('get_market_book', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/market_ids/);
  });
});
