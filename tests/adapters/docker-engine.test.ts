import { describe, it, expect } from 'vitest';
import { DockerEngineMCPServer } from '../../src/mcp-servers/docker-engine.js';

describe('DockerEngineMCPServer', () => {
  const adapter = new DockerEngineMCPServer({});

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const a = new DockerEngineMCPServer({ baseUrl: 'http://remote-docker:2375/v1.33' });
    expect(a).toBeDefined();
  });

  it('exposes tools array', () => {
    const tools = adapter.tools;
    expect(Array.isArray(tools)).toBe(true);
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

  it('unknown tool returns error without throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns all required fields', () => {
    const cat = DockerEngineMCPServer.catalog();
    expect(cat.name).toBe('docker-engine');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
    expect(cat.description).toBeTruthy();
  });

  it('catalog toolNames match tools getter', () => {
    const cat = DockerEngineMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // ── Containers ───────────────────────────────────────────────────────────
  it('create_container returns error without image', async () => {
    const result = await adapter.callTool('create_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('image');
  });

  it('inspect_container returns error without id', async () => {
    const result = await adapter.callTool('inspect_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_container_processes returns error without id', async () => {
    const result = await adapter.callTool('list_container_processes', {});
    expect(result.isError).toBe(true);
  });

  it('get_container_logs returns error without id', async () => {
    const result = await adapter.callTool('get_container_logs', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_container_changes returns error without id', async () => {
    const result = await adapter.callTool('get_container_changes', {});
    expect(result.isError).toBe(true);
  });

  it('get_container_stats returns error without id', async () => {
    const result = await adapter.callTool('get_container_stats', {});
    expect(result.isError).toBe(true);
  });

  it('start_container returns error without id', async () => {
    const result = await adapter.callTool('start_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('stop_container returns error without id', async () => {
    const result = await adapter.callTool('stop_container', {});
    expect(result.isError).toBe(true);
  });

  it('restart_container returns error without id', async () => {
    const result = await adapter.callTool('restart_container', {});
    expect(result.isError).toBe(true);
  });

  it('kill_container returns error without id', async () => {
    const result = await adapter.callTool('kill_container', {});
    expect(result.isError).toBe(true);
  });

  it('update_container returns error without id', async () => {
    const result = await adapter.callTool('update_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('rename_container returns error without name', async () => {
    const result = await adapter.callTool('rename_container', { id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('pause_container returns error without id', async () => {
    const result = await adapter.callTool('pause_container', {});
    expect(result.isError).toBe(true);
  });

  it('unpause_container returns error without id', async () => {
    const result = await adapter.callTool('unpause_container', {});
    expect(result.isError).toBe(true);
  });

  it('wait_container returns error without id', async () => {
    const result = await adapter.callTool('wait_container', {});
    expect(result.isError).toBe(true);
  });

  it('delete_container returns error without id', async () => {
    const result = await adapter.callTool('delete_container', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  // ── Images ────────────────────────────────────────────────────────────────
  it('inspect_image returns error without name', async () => {
    const result = await adapter.callTool('inspect_image', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('get_image_history returns error without name', async () => {
    const result = await adapter.callTool('get_image_history', {});
    expect(result.isError).toBe(true);
  });

  it('push_image returns error without name', async () => {
    const result = await adapter.callTool('push_image', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('tag_image returns error without repo', async () => {
    const result = await adapter.callTool('tag_image', { name: 'myimage' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('repo');
  });

  it('delete_image returns error without name', async () => {
    const result = await adapter.callTool('delete_image', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('search_images returns error without term', async () => {
    const result = await adapter.callTool('search_images', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('term');
  });

  // ── Networks ─────────────────────────────────────────────────────────────
  it('create_network returns error without name', async () => {
    const result = await adapter.callTool('create_network', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('inspect_network returns error without id', async () => {
    const result = await adapter.callTool('inspect_network', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_network returns error without id', async () => {
    const result = await adapter.callTool('delete_network', {});
    expect(result.isError).toBe(true);
  });

  it('connect_container_to_network returns error without container', async () => {
    const result = await adapter.callTool('connect_container_to_network', { id: 'net1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('container');
  });

  it('disconnect_container_from_network returns error without id', async () => {
    const result = await adapter.callTool('disconnect_container_from_network', {});
    expect(result.isError).toBe(true);
  });

  // ── Volumes ───────────────────────────────────────────────────────────────
  it('inspect_volume returns error without name', async () => {
    const result = await adapter.callTool('inspect_volume', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('delete_volume returns error without name', async () => {
    const result = await adapter.callTool('delete_volume', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  // ── Exec ──────────────────────────────────────────────────────────────────
  it('create_exec returns error without cmd', async () => {
    const result = await adapter.callTool('create_exec', { id: 'mycontainer' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('cmd');
  });

  it('start_exec returns error without id', async () => {
    const result = await adapter.callTool('start_exec', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('inspect_exec returns error without id', async () => {
    const result = await adapter.callTool('inspect_exec', {});
    expect(result.isError).toBe(true);
  });

  // ── Swarm ─────────────────────────────────────────────────────────────────
  it('join_swarm returns error without join_token', async () => {
    const result = await adapter.callTool('join_swarm', { remote_addrs: ['1.2.3.4:2377'] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('join_token');
  });

  it('update_swarm returns error without version', async () => {
    const result = await adapter.callTool('update_swarm', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('version');
  });

  it('unlock_swarm returns error without unlock_key', async () => {
    const result = await adapter.callTool('unlock_swarm', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('unlock_key');
  });

  // ── Services ─────────────────────────────────────────────────────────────
  it('create_service returns error without image', async () => {
    const result = await adapter.callTool('create_service', { name: 'myservice' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('image');
  });

  it('inspect_service returns error without id', async () => {
    const result = await adapter.callTool('inspect_service', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_service_logs returns error without id', async () => {
    const result = await adapter.callTool('get_service_logs', {});
    expect(result.isError).toBe(true);
  });

  it('update_service returns error without spec', async () => {
    const result = await adapter.callTool('update_service', { id: 'svc1', version: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('spec');
  });

  it('delete_service returns error without id', async () => {
    const result = await adapter.callTool('delete_service', {});
    expect(result.isError).toBe(true);
  });

  // ── Tasks ─────────────────────────────────────────────────────────────────
  it('inspect_task returns error without id', async () => {
    const result = await adapter.callTool('inspect_task', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  // ── Nodes ─────────────────────────────────────────────────────────────────
  it('inspect_node returns error without id', async () => {
    const result = await adapter.callTool('inspect_node', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('update_node returns error without spec', async () => {
    const result = await adapter.callTool('update_node', { id: 'n1', version: 5 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('spec');
  });

  it('delete_node returns error without id', async () => {
    const result = await adapter.callTool('delete_node', {});
    expect(result.isError).toBe(true);
  });

  // ── Secrets ───────────────────────────────────────────────────────────────
  it('create_secret returns error without data', async () => {
    const result = await adapter.callTool('create_secret', { name: 'my-secret' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('data');
  });

  it('inspect_secret returns error without id', async () => {
    const result = await adapter.callTool('inspect_secret', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_secret returns error without id', async () => {
    const result = await adapter.callTool('delete_secret', {});
    expect(result.isError).toBe(true);
  });

  // ── Configs ───────────────────────────────────────────────────────────────
  it('create_config returns error without data', async () => {
    const result = await adapter.callTool('create_config', { name: 'my-config' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('data');
  });

  it('inspect_config returns error without id', async () => {
    const result = await adapter.callTool('inspect_config', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_config returns error without id', async () => {
    const result = await adapter.callTool('delete_config', {});
    expect(result.isError).toBe(true);
  });

  // ── No-arg system tools do not throw ─────────────────────────────────────
  it('ping does not throw (network failure expected)', async () => {
    const result = await adapter.callTool('ping', {});
    expect(result.content[0].text).toBeTruthy();
  });

  it('get_version does not throw (network failure expected)', async () => {
    const result = await adapter.callTool('get_version', {});
    expect(result.content[0].text).toBeTruthy();
  });

  it('list_containers does not throw (network failure expected)', async () => {
    const result = await adapter.callTool('list_containers', {});
    expect(result.content[0].text).toBeTruthy();
  });
});
