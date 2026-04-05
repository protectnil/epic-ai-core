import { describe, it, expect } from 'vitest';
import { Ip2ProxyMCPServer } from '../../src/mcp-servers/ip2proxy.js';

describe('Ip2ProxyMCPServer', () => {
  const adapter = new Ip2ProxyMCPServer({ apiKey: 'test-key' });

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

  it('detect_proxy tool exists in tools list', () => {
    const tool = adapter.tools.find(t => t.name === 'detect_proxy');
    expect(tool).toBeDefined();
  });

  it('detect_proxy_full tool exists in tools list', () => {
    const tool = adapter.tools.find(t => t.name === 'detect_proxy_full');
    expect(tool).toBeDefined();
  });

  it('detect_proxy ip param is not required', () => {
    const tool = adapter.tools.find(t => t.name === 'detect_proxy');
    expect(tool?.inputSchema.required).toBeUndefined();
  });

  it('detect_proxy_full ip param is not required', () => {
    const tool = adapter.tools.find(t => t.name === 'detect_proxy_full');
    expect(tool?.inputSchema.required).toBeUndefined();
  });

  it('catalog returns correct category and name', () => {
    const cat = Ip2ProxyMCPServer.catalog();
    expect(cat.category).toBe('cybersecurity');
    expect(cat.name).toBe('ip2proxy');
    expect(cat.toolNames).toContain('detect_proxy');
    expect(cat.toolNames).toContain('detect_proxy_full');
  });

  it('catalog keywords include proxy detection terms', () => {
    const cat = Ip2ProxyMCPServer.catalog();
    expect(cat.keywords).toContain('proxy detection');
    expect(cat.keywords).toContain('vpn detection');
    expect(cat.keywords).toContain('tor');
  });
});
