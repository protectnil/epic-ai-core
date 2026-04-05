import { describe, it, expect } from 'vitest';
import { GeoDataSourceMCPServer } from '../../src/mcp-servers/geodatasource.js';

describe('GeoDataSourceMCPServer', () => {
  const adapter = new GeoDataSourceMCPServer({ apiKey: 'test-key' });

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

  it('lookup_city_by_coordinates returns error when lat/lng missing', async () => {
    const result = await adapter.callTool('lookup_city_by_coordinates', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('lat and lng are required');
  });

  it('lookup_city_by_coordinates returns error for invalid format', async () => {
    const result = await adapter.callTool('lookup_city_by_coordinates', {
      lat: 40.7128,
      lng: -74.006,
      format: 'csv',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('format must be one of');
  });

  it('catalog() returns valid metadata', () => {
    const catalog = GeoDataSourceMCPServer.catalog();
    expect(catalog.name).toBe('geodatasource');
    expect(catalog.category).toBe('data');
    expect(catalog.keywords.length).toBeGreaterThan(0);
    expect(catalog.toolNames).toContain('lookup_city_by_coordinates');
  });
});
