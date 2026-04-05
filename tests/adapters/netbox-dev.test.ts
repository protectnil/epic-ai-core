import { describe, it, expect } from 'vitest';
import { NetBoxDevMCPServer } from '../../src/mcp-servers/netbox-dev.js';

describe('NetBoxDevMCPServer', () => {
  const adapter = new NetBoxDevMCPServer({ apiToken: 'test-token' });

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

  it('exposes expected resource groups', () => {
    const toolNames = adapter.tools.map((t) => t.name);
    expect(toolNames).toContain('get_status');
    expect(toolNames).toContain('list_devices');
    expect(toolNames).toContain('create_device');
    expect(toolNames).toContain('list_ip_addresses');
    expect(toolNames).toContain('create_ip_address');
    expect(toolNames).toContain('list_prefixes');
    expect(toolNames).toContain('get_available_ips');
    expect(toolNames).toContain('get_available_prefixes');
    expect(toolNames).toContain('list_vlans');
    expect(toolNames).toContain('list_virtual_machines');
    expect(toolNames).toContain('list_clusters');
    expect(toolNames).toContain('list_cables');
    expect(toolNames).toContain('list_circuits');
    expect(toolNames).toContain('list_tenants');
    expect(toolNames).toContain('list_tags');
  });

  it('missing id returns error result without throwing', async () => {
    const result = await adapter.callTool('get_device', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('missing prefix_id returns error result without throwing', async () => {
    const result = await adapter.callTool('get_available_ips', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('prefix_id is required');
  });

  it('static catalog returns correct category and author', () => {
    const catalog = NetBoxDevMCPServer.catalog();
    expect(catalog.category).toBe('devops');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.name).toBe('netbox-dev');
    expect(catalog.keywords).toContain('netbox');
    expect(catalog.keywords).toContain('ipam');
    expect(catalog.keywords).toContain('dcim');
  });
});
