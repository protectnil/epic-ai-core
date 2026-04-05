import { describe, it, expect } from 'vitest';
import { StackExchangeMCPServer } from '../../src/mcp-servers/stackexchange.js';

describe('StackExchangeMCPServer', () => {
  const adapter = new StackExchangeMCPServer({ apiKey: 'test-key' });
  const adapterAuth = new StackExchangeMCPServer({ apiKey: 'test-key', accessToken: 'test-token' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with no config', () => {
    const bare = new StackExchangeMCPServer();
    expect(bare).toBeDefined();
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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('search_questions');
    expect(names).toContain('get_questions');
    expect(names).toContain('get_answers');
    expect(names).toContain('get_comments');
    expect(names).toContain('get_tags');
    expect(names).toContain('get_users');
    expect(names).toContain('get_site_info');
    expect(names).toContain('get_badges');
    expect(names).toContain('get_errors');
    expect(names).toContain('get_posts');
    expect(names).toContain('get_me');
    expect(names).toContain('get_my_questions');
    expect(names).toContain('get_my_answers');
    expect(names).toContain('get_events');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_questions returns error when ids missing', async () => {
    const result = await adapter.callTool('get_questions', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids is required');
  });

  it('get_answers returns error when ids missing', async () => {
    const result = await adapter.callTool('get_answers', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids is required');
  });

  it('get_comments returns error when ids missing', async () => {
    const result = await adapter.callTool('get_comments', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids is required');
  });

  it('get_users returns error when ids missing', async () => {
    const result = await adapter.callTool('get_users', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids is required');
  });

  it('get_posts returns error when ids missing', async () => {
    const result = await adapter.callTool('get_posts', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids is required');
  });

  it('get_me returns error without access_token', async () => {
    const result = await adapter.callTool('get_me', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('access_token is required');
  });

  it('get_my_questions returns error without access_token', async () => {
    const result = await adapter.callTool('get_my_questions', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('access_token is required');
  });

  it('get_my_answers returns error without access_token', async () => {
    const result = await adapter.callTool('get_my_answers', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('access_token is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = StackExchangeMCPServer.catalog();
    expect(cat.name).toBe('stackexchange');
    expect(cat.category).toBe('data');
    expect(cat.toolNames.length).toBe(14);
    expect(cat.author).toBe('protectnil');
  });
});
