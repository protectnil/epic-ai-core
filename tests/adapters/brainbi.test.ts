import { describe, it, expect } from 'vitest';
import { BrainBIMCPServer } from '../../src/mcp-servers/brainbi.js';

describe('BrainBIMCPServer', () => {
  const adapter = new BrainBIMCPServer({ bearerToken: 'test-token' });

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

  it('catalog returns correct metadata', () => {
    const cat = BrainBIMCPServer.catalog();
    expect(cat.name).toBe('brainbi');
    expect(cat.category).toBe('analytics');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('login requires email and password', async () => {
    const result = await adapter.callTool('login', { email: 'user@example.com' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('password');
  });

  it('logout requires email', async () => {
    const result = await adapter.callTool('logout', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('email');
  });

  it('register requires email and password', async () => {
    const result = await adapter.callTool('register', { email: 'user@example.com' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('password');
  });

  it('register_woocommerce requires email, password, and storeUrl', async () => {
    const result = await adapter.callTool('register_woocommerce', {
      email: 'user@example.com',
      password: 'pass',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('storeUrl');
  });

  it('delete_order requires orderId', async () => {
    const result = await adapter.callTool('delete_order', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('orderId');
  });

  it('delete_product requires productId', async () => {
    const result = await adapter.callTool('delete_product', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('productId');
  });

  it('scrape_product_pricing requires url', async () => {
    const result = await adapter.callTool('scrape_product_pricing', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('get_rule_data requires ruleId', async () => {
    const result = await adapter.callTool('get_rule_data', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ruleId');
  });

  it('get_rule_data_latest requires ruleId', async () => {
    const result = await adapter.callTool('get_rule_data_latest', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ruleId');
  });

  it('catalog toolNames matches tools getter length', () => {
    const cat = BrainBIMCPServer.catalog();
    const tools = adapter.tools;
    expect(cat.toolNames.length).toBe(tools.length);
  });

  it('instantiates with email/password config (session-based auth flow)', () => {
    const sessionAdapter = new BrainBIMCPServer({ email: 'user@example.com', password: 'pass' });
    expect(sessionAdapter).toBeDefined();
  });
});
