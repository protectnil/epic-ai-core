import { describe, it, expect } from 'vitest';
import { StellastraMCPServer } from '../../src/mcp-servers/stellastra.js';

describe('StellastraMCPServer', () => {
  const adapter = new StellastraMCPServer({ authEmail: 'test@example.com', apiKey: 'test-key' });

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

  it('post_review rejects missing user_email', async () => {
    const result = await adapter.callTool('post_review', { rating: 5 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('user_email');
  });

  it('post_review rejects missing rating', async () => {
    const result = await adapter.callTool('post_review', { user_email: 'test@corp.com' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('rating');
  });

  it('post_review rejects invalid rating', async () => {
    const result = await adapter.callTool('post_review', { user_email: 'test@corp.com', rating: 6 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('1 to 5');
  });
});
