import { describe, it, expect } from 'vitest';
import { Opto22PACMCPServer } from '../../src/mcp-servers/opto22-pac.js';

describe('Opto22PACMCPServer', () => {
  const adapter = new Opto22PACMCPServer({
    controllerHost: '192.168.1.1',
    apiKeyId: 'test-key-id',
    apiKeyValue: 'test-key-value',
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
