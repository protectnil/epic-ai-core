import { describe, it, expect } from 'vitest';
import { CloudRFMCPServer } from '../../src/mcp-servers/cloudrf.js';

describe('CloudRFMCPServer', () => {
  const adapter = new CloudRFMCPServer({ apiKey: 'test-api-key' });

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

  it('catalog returns correct metadata', () => {
    const catalog = CloudRFMCPServer.catalog();
    expect(catalog.name).toBe('cloudrf');
    expect(catalog.category).toBe('telecom');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names in catalog match exposed tools', () => {
    const catalog = CloudRFMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('create_area_coverage requires lat, lon, frq', () => {
    const tool = adapter.tools.find(t => t.name === 'create_area_coverage');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('lat');
    expect(tool!.inputSchema.required).toContain('lon');
    expect(tool!.inputSchema.required).toContain('frq');
  });

  it('create_path_profile requires lat, lon, frq, rxlat, rxlon', () => {
    const tool = adapter.tools.find(t => t.name === 'create_path_profile');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('rxlat');
    expect(tool!.inputSchema.required).toContain('rxlon');
  });
});
