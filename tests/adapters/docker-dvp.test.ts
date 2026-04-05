import { describe, it, expect } from 'vitest';
import { DockerDvpMCPServer } from '../../src/mcp-servers/docker-dvp.js';

describe('DockerDvpMCPServer', () => {
  const adapter = new DockerDvpMCPServer({ token: 'test-token' });

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

  it('get_namespace validates required namespace param', async () => {
    const result = await adapter.callTool('get_namespace', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('namespace');
  });

  it('get_namespace_timespans validates required params', async () => {
    const result = await adapter.callTool('get_namespace_timespans', { namespace: 'myorg' });
    expect(result.isError).toBe(true);
  });

  it('get_namespace_data validates all required params', async () => {
    const result = await adapter.callTool('get_namespace_data', { namespace: 'myorg', year: 2024, timespantype: 'months' });
    expect(result.isError).toBe(true);
  });

  it('login validates required params', async () => {
    const result = await adapter.callTool('login', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('login_2fa validates required params', async () => {
    const result = await adapter.callTool('login_2fa', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('catalog returns correct metadata', () => {
    const cat = DockerDvpMCPServer.catalog();
    expect(cat.name).toBe('docker-dvp');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBe(adapter.tools.length);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog tool names match tools getter', () => {
    const cat = DockerDvpMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
