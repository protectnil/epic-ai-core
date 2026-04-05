import { describe, it, expect } from 'vitest';
import { LandRegistryUKDeedMCPServer } from '../../src/mcp-servers/landregistry-uk-deed.js';

describe('LandRegistryUKDeedMCPServer', () => {
  const adapter = new LandRegistryUKDeedMCPServer();

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

  it('unknown tool returns error result, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_deed returns error when deed_reference is missing', async () => {
    const result = await adapter.callTool('get_deed', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('deed_reference');
  });
});
