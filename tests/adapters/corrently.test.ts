import { describe, it, expect } from 'vitest';
import { CorrentlyMCPServer } from '../../src/mcp-servers/corrently.js';

describe('CorrentlyMCPServer', () => {
  const adapter = new CorrentlyMCPServer({});

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with api key', () => {
    const withKey = new CorrentlyMCPServer({ apiKey: 'test-key' });
    expect(withKey).toBeDefined();
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
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('get_green_power_index');
    expect(names).toContain('get_dispatch');
    expect(names).toContain('get_prediction');
    expect(names).toContain('get_best_hour');
    expect(names).toContain('get_tariff');
    expect(names).toContain('get_tariff_components');
    expect(names).toContain('get_wim_status');
    expect(names).toContain('get_stromkonto_balances');
    expect(names).toContain('get_stromkonto_choices');
    expect(names).toContain('get_meter_reading');
    expect(names).toContain('get_openmeter_meters');
    expect(names).toContain('get_openmeter_readings');
    expect(names).toContain('get_easee_sessions');
    expect(names).toContain('get_ocpp_sessions');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog() returns correct metadata', () => {
    const cat = CorrentlyMCPServer.catalog();
    expect(cat.name).toBe('corrently');
    expect(cat.category).toBe('energy');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = CorrentlyMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_best_hour tool has optional timeframe and hours params', () => {
    const tool = adapter.tools.find((t) => t.name === 'get_best_hour');
    expect(tool).toBeDefined();
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('zip');
    expect(props).toHaveProperty('timeframe');
    expect(props).toHaveProperty('hours');
  });

  it('get_tariff_components tool has zipcode and consumption params', () => {
    const tool = adapter.tools.find((t) => t.name === 'get_tariff_components');
    expect(tool).toBeDefined();
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('zipcode');
    expect(props).toHaveProperty('kwha');
    expect(props).toHaveProperty('wh');
  });

  it('get_easee_sessions tool has username and password params', () => {
    const tool = adapter.tools.find((t) => t.name === 'get_easee_sessions');
    expect(tool).toBeDefined();
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('username');
    expect(props).toHaveProperty('password');
  });
});
