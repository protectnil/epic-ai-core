import { describe, it, expect } from 'vitest';
import { PrismaCloudMCPServer } from '../../src/mcp-servers/prisma-cloud.js';

describe('PrismaCloudMCPServer', () => {
  const adapter = new PrismaCloudMCPServer({ username: 'test-name', password: 'test-pass' });

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
