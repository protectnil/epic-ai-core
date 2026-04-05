import { describe, it, expect } from 'vitest';
import { Opto22GroovMCPServer } from '../../src/mcp-servers/opto22-groov.js';

describe('Opto22GroovMCPServer', () => {
  const adapter = new Opto22GroovMCPServer({
    groovHost: '192.168.1.2',
    apiKey: 'test-api-key',
  });

  it('instantiates', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    expect(adapter.tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('unknown tool returns error', async () => {
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });
});
