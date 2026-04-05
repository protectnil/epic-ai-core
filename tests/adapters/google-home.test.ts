import { describe, it, expect } from 'vitest';
import { GoogleHomeMCPServer } from '../../src/mcp-servers/google-home.js';

describe('GoogleHomeMCPServer', () => {
  const adapter = new GoogleHomeMCPServer({
    localAuthToken: 'test-local-auth-token',
    deviceIp: '192.168.1.50',
  });

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

  it('delete_alarms_and_timers returns error when ids is missing', async () => {
    const result = await adapter.callTool('delete_alarms_and_timers', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids array is required');
  });

  it('set_alarm_volume returns error when volume is missing', async () => {
    const result = await adapter.callTool('set_alarm_volume', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('volume is required');
  });

  it('pair_bluetooth_device returns error when mac_address is missing', async () => {
    const result = await adapter.callTool('pair_bluetooth_device', { connect: true });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('mac_address is required');
  });

  it('catalog returns correct metadata', () => {
    const catalog = GoogleHomeMCPServer.catalog();
    expect(catalog.name).toBe('google-home');
    expect(catalog.category).toBe('iot');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });
});
