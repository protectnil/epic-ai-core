import { describe, it, expect } from 'vitest';
import { DiscourseMCPServer } from '../../src/mcp-servers/discourse-latest.js';

describe('DiscourseMCPServer', () => {
  const adapter = new DiscourseMCPServer({
    baseUrl: 'https://forum.example.com',
    apiKey: 'test-api-key',
    apiUsername: 'system',
  });

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
