import { describe, it, expect } from 'vitest';
import { NetatmoMCPServer } from '../../src/mcp-servers/netatmo.js';

describe('NetatmoMCPServer', () => {
  const adapter = new NetatmoMCPServer({ accessToken: 'test-access-token' });

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

  it('unknown tool returns isError true, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns required fields', () => {
    const cat = NetatmoMCPServer.catalog();
    expect(cat.name).toBe('netatmo');
    expect(cat.category).toBe('iot');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = NetatmoMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('add_webhook requires url and app_type', () => {
    const tool = adapter.tools.find(t => t.name === 'add_webhook');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('url');
    expect(tool!.inputSchema.required).toContain('app_type');
  });

  it('get_measure requires device_id, scale, and type', () => {
    const tool = adapter.tools.find(t => t.name === 'get_measure');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('device_id');
    expect(tool!.inputSchema.required).toContain('scale');
    expect(tool!.inputSchema.required).toContain('type');
  });

  it('set_therm_point requires device_id, module_id, setpoint_mode', () => {
    const tool = adapter.tools.find(t => t.name === 'set_therm_point');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('device_id');
    expect(tool!.inputSchema.required).toContain('module_id');
    expect(tool!.inputSchema.required).toContain('setpoint_mode');
  });

  it('get_public_data requires bounding box coordinates', () => {
    const tool = adapter.tools.find(t => t.name === 'get_public_data');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('lat_ne');
    expect(tool!.inputSchema.required).toContain('lon_ne');
    expect(tool!.inputSchema.required).toContain('lat_sw');
    expect(tool!.inputSchema.required).toContain('lon_sw');
  });

  it('get_user has no required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'get_user');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required ?? []).toHaveLength(0);
  });

  it('get_stations_data has no required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'get_stations_data');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required ?? []).toHaveLength(0);
  });
});
