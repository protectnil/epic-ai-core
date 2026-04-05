import { describe, it, expect } from 'vitest';
import { Ip2LocationMCPServer } from '../../src/mcp-servers/ip2location.js';

describe('Ip2LocationMCPServer', () => {
  const adapter = new Ip2LocationMCPServer({ apiKey: 'test-key' });
  const keylessAdapter = new Ip2LocationMCPServer({});

  it('instantiates without error with API key', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates without error without API key (keyless)', () => {
    expect(keylessAdapter).toBeDefined();
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

  it('lookup_ip requires ip parameter', () => {
    const tool = adapter.tools.find(t => t.name === 'lookup_ip');
    expect(tool?.inputSchema.required).toContain('ip');
  });

  it('lookup_ip missing ip returns error', async () => {
    const result = await adapter.callTool('lookup_ip', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ip is required');
  });

  it('lookup_ip_translated requires ip and lang', () => {
    const tool = adapter.tools.find(t => t.name === 'lookup_ip_translated');
    expect(tool?.inputSchema.required).toContain('ip');
    expect(tool?.inputSchema.required).toContain('lang');
  });

  it('lookup_ip_translated missing ip returns error', async () => {
    const result = await adapter.callTool('lookup_ip_translated', { lang: 'de' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ip is required');
  });

  it('lookup_ip_translated missing lang returns error', async () => {
    const result = await adapter.callTool('lookup_ip_translated', { ip: '8.8.8.8' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('lang is required');
  });

  it('get_my_ip tool exists and has no required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'get_my_ip');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toBeUndefined();
  });

  it('catalog returns correct category and name', () => {
    const cat = Ip2LocationMCPServer.catalog();
    expect(cat.category).toBe('data');
    expect(cat.name).toBe('ip2location');
    expect(cat.toolNames).toContain('lookup_ip');
    expect(cat.toolNames).toContain('lookup_ip_translated');
    expect(cat.toolNames).toContain('get_my_ip');
  });

  it('catalog keywords include geolocation terms', () => {
    const cat = Ip2LocationMCPServer.catalog();
    expect(cat.keywords).toContain('ip geolocation');
    expect(cat.keywords).toContain('country');
    expect(cat.keywords).toContain('asn');
  });
});
