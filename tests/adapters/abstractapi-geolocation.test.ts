import { describe, it, expect } from 'vitest';
import { AbstractApiGeolocationMCPServer } from '../../src/mcp-servers/abstractapi-geolocation.js';

describe('AbstractApiGeolocationMCPServer', () => {
  const adapter = new AbstractApiGeolocationMCPServer({ apiKey: 'test-api-key' });

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

  it('geolocate_ip missing ip_address returns error', async () => {
    const result = await adapter.callTool('geolocate_ip', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ip_address is required');
  });

  it('geolocate_my_ip does not require arguments', () => {
    const tool = adapter.tools.find(t => t.name === 'geolocate_my_ip');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toBeUndefined();
  });

  it('geolocate_ip tool has ip_address in required array', () => {
    const tool = adapter.tools.find(t => t.name === 'geolocate_ip');
    expect(tool?.inputSchema.required).toContain('ip_address');
  });

  it('catalog returns correct category', () => {
    const cat = AbstractApiGeolocationMCPServer.catalog();
    expect(cat.category).toBe('data');
    expect(cat.name).toBe('abstractapi-geolocation');
    expect(cat.toolNames).toContain('geolocate_ip');
    expect(cat.toolNames).toContain('geolocate_my_ip');
  });
});
