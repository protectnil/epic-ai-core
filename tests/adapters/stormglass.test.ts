import { describe, it, expect } from 'vitest';
import { StormGlassMCPServer } from '../../src/mcp-servers/stormglass.js';

describe('StormGlassMCPServer', () => {
  const adapter = new StormGlassMCPServer({ apiKey: 'test-api-key' });

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

  it('get_forecast returns error when lat is missing', async () => {
    const result = await adapter.callTool('get_forecast', { lng: 17.8081 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('lat');
  });

  it('get_forecast returns error when lng is missing', async () => {
    const result = await adapter.callTool('get_forecast', { lat: 58.7984 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('lng');
  });

  it('get_forecast returns error for lat out of range', async () => {
    const result = await adapter.callTool('get_forecast', { lat: 95, lng: 17.8081 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('lat');
  });

  it('get_forecast returns error for lng out of range', async () => {
    const result = await adapter.callTool('get_forecast', { lat: 58.7984, lng: 200 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('lng');
  });

  it('catalog returns expected shape', () => {
    const cat = StormGlassMCPServer.catalog();
    expect(cat.name).toBe('stormglass');
    expect(cat.category).toBe('data');
    expect(cat.toolNames).toContain('get_forecast');
    expect(cat.author).toBe('protectnil');
  });

  it('tool names in catalog match tools getter', () => {
    const cat = StormGlassMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
