import { describe, it, expect } from 'vitest';
import { AdobeAemMCPServer } from '../../src/mcp-servers/adobe-aem.js';

describe('AdobeAemMCPServer', () => {
  const adapter = new AdobeAemMCPServer({
    baseUrl: 'http://localhost:4502',
    password: 'test-password',
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

  it('get_bundle_info missing name returns error', async () => {
    const result = await adapter.callTool('get_bundle_info', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name is required');
  });

  it('post_bundle missing action returns error', async () => {
    const result = await adapter.callTool('post_bundle', { name: 'com.example.bundle' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('action is required');
  });

  it('get_agents missing runmode returns error', async () => {
    const result = await adapter.callTool('get_agents', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('runmode is required');
  });

  it('get_agent missing name returns error', async () => {
    const result = await adapter.callTool('get_agent', { runmode: 'author' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name is required');
  });

  it('get_package missing fields returns error', async () => {
    const result = await adapter.callTool('get_package', { group: 'my_packages' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('post_package_service_json missing cmd returns error', async () => {
    const result = await adapter.callTool('post_package_service_json', { path: '/etc/packages/foo.zip' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('cmd is required');
  });

  it('get_query missing path returns error', async () => {
    const result = await adapter.callTool('get_query', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('path is required');
  });

  it('post_authorizables missing intermediate_path returns error', async () => {
    const result = await adapter.callTool('post_authorizables', { authorizable_id: 'jdoe' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('intermediate_path is required');
  });

  it('get_node missing name returns error', async () => {
    const result = await adapter.callTool('get_node', { path: '/content' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('ssl_setup missing fields returns error', async () => {
    const result = await adapter.callTool('ssl_setup', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('post_cq_actions missing changelog returns error', async () => {
    const result = await adapter.callTool('post_cq_actions', { authorizable_id: 'jdoe' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('changelog is required');
  });

  it('catalog returns correct category', () => {
    const cat = AdobeAemMCPServer.catalog();
    expect(cat.category).toBe('cloud');
    expect(cat.name).toBe('adobe-aem');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });
});
