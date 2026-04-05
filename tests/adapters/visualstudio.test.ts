import { describe, it, expect } from 'vitest';
import { VisualStudioMCPServer } from '../../src/mcp-servers/visualstudio.js';

describe('VisualStudioMCPServer', () => {
  const adapter = new VisualStudioMCPServer({ accessToken: 'test-token' });

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
    const cat = VisualStudioMCPServer.catalog();
    expect(cat.name).toBe('visualstudio');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('all catalog toolNames match tools getter', () => {
    const cat = VisualStudioMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_environment returns error when environmentId missing', async () => {
    const result = await adapter.callTool('get_environment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('environmentId');
  });

  it('create_environment returns error when required fields missing', async () => {
    const result = await adapter.callTool('create_environment', { friendlyName: 'test' });
    expect(result.isError).toBe(true);
  });

  it('delete_environment returns error when environmentId missing', async () => {
    const result = await adapter.callTool('delete_environment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('environmentId');
  });

  it('start_environment returns error when environmentId missing', async () => {
    const result = await adapter.callTool('start_environment', {});
    expect(result.isError).toBe(true);
  });

  it('shutdown_environment returns error when environmentId missing', async () => {
    const result = await adapter.callTool('shutdown_environment', {});
    expect(result.isError).toBe(true);
  });

  it('update_environment_folder returns error when folder missing', async () => {
    const result = await adapter.callTool('update_environment_folder', { environmentId: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('folder');
  });

  it('create_secret returns error when name missing', async () => {
    const result = await adapter.callTool('create_secret', { value: 'secret-value' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('create_secret returns error when value missing', async () => {
    const result = await adapter.callTool('create_secret', { name: 'MY_SECRET' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('value');
  });

  it('update_secret returns error when secretId missing', async () => {
    const result = await adapter.callTool('update_secret', { value: 'new-value' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('secretId');
  });

  it('delete_secret returns error when secretId missing', async () => {
    const result = await adapter.callTool('delete_secret', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('secretId');
  });

  it('get_location returns error when location missing', async () => {
    const result = await adapter.callTool('get_location', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('location');
  });
});
