import { describe, it, expect } from 'vitest';
import { JavatpointMCPServer } from '../../src/mcp-servers/javatpoint.js';

describe('JavatpointMCPServer', () => {
  const adapter = new JavatpointMCPServer({ projectId: 'test-project', accessToken: 'test-token' });

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

  it('catalog returns correct name and category', () => {
    const cat = JavatpointMCPServer.catalog();
    expect(cat.name).toBeTruthy();
    expect(cat.category).toBeTruthy();
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });
});
