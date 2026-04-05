import { describe, it, expect } from 'vitest';
import { BluemixContainersMCPServer } from '../../src/mcp-servers/bluemix-containers.js';

describe('BluemixContainersMCPServer', () => {
  const adapter = new BluemixContainersMCPServer({
    authToken: 'test-jwt-token',
    projectId: 'test-space-guid',
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

  it('includes expected tool names', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_containers');
    expect(names).toContain('create_container');
    expect(names).toContain('inspect_container');
    expect(names).toContain('delete_container');
    expect(names).toContain('start_container');
    expect(names).toContain('stop_container');
    expect(names).toContain('list_container_groups');
    expect(names).toContain('create_container_group');
    expect(names).toContain('list_floating_ips');
    expect(names).toContain('bind_floating_ip');
    expect(names).toContain('list_images');
    expect(names).toContain('get_registry_namespace');
    expect(names).toContain('list_volumes');
    expect(names).toContain('create_volume');
    expect(names).toContain('list_file_shares');
    expect(names).toContain('get_quota');
    expect(names).toContain('get_tls_certificate');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('create_container requires Image', async () => {
    const result = await adapter.callTool('create_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Image is required');
  });

  it('inspect_container requires name_or_id', async () => {
    const result = await adapter.callTool('inspect_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name_or_id is required');
  });

  it('delete_container requires name_or_id', async () => {
    const result = await adapter.callTool('delete_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name_or_id is required');
  });

  it('create_container_group requires Name and Image', async () => {
    const result = await adapter.callTool('create_container_group', { Name: 'mygroup' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('bind_floating_ip requires name_or_id and ip', async () => {
    const result = await adapter.callTool('bind_floating_ip', { name_or_id: 'mycontainer' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('set_registry_namespace requires namespace', async () => {
    const result = await adapter.callTool('set_registry_namespace', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('namespace is required');
  });

  it('create_volume requires name', async () => {
    const result = await adapter.callTool('create_volume', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name is required');
  });

  it('create_file_share requires fsName and fsSize', async () => {
    const result = await adapter.callTool('create_file_share', { fsName: 'myfs' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('catalog returns correct metadata', () => {
    const cat = BluemixContainersMCPServer.catalog();
    expect(cat.name).toBe('bluemix-containers');
    expect(cat.category).toBe('cloud');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });
});
