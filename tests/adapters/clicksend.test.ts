import { describe, it, expect } from 'vitest';
import { ClickSendMCPServer } from '../../src/mcp-servers/clicksend.js';

describe('ClickSendMCPServer', () => {
  const adapter = new ClickSendMCPServer({ username: 'test@example.com', apiKey: 'test-api-key' });

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

  it('catalog returns correct metadata', () => {
    const catalog = ClickSendMCPServer.catalog();
    expect(catalog.name).toBe('clicksend');
    expect(catalog.category).toBe('communication');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names match catalog toolNames', () => {
    const catalog = ClickSendMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('send_sms missing required param returns error', async () => {
    const result = await adapter.callTool('send_sms', {});
    expect(result.isError).toBe(true);
  });

  it('send_email missing required param returns error', async () => {
    const result = await adapter.callTool('send_email', {});
    expect(result.isError).toBe(true);
  });

  it('get_contact missing list_id returns error', async () => {
    const result = await adapter.callTool('get_contact', {});
    expect(result.isError).toBe(true);
  });

  it('all 88 tools are present', () => {
    expect(adapter.tools.length).toBe(88);
  });
});
