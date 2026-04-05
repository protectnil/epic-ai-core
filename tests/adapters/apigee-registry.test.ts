import { describe, it, expect } from 'vitest';
import { ApigeeRegistryMCPServer } from '../../src/mcp-servers/apigee-registry.js';

describe('ApigeeRegistryMCPServer', () => {
  const adapter = new ApigeeRegistryMCPServer({ accessToken: 'test-token' });

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

  it('list_apis requires project and location', async () => {
    const result = await adapter.callTool('list_apis', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('required');
  });

  it('get_api requires project, location, and api', async () => {
    const result = await adapter.callTool('get_api', { project: 'my-project', location: 'us-central1' });
    expect(result.isError).toBe(true);
  });

  it('create_api requires project, location, and apiId', async () => {
    const result = await adapter.callTool('create_api', { project: 'my-project' });
    expect(result.isError).toBe(true);
  });

  it('static catalog returns correct metadata', () => {
    const cat = ApigeeRegistryMCPServer.catalog();
    expect(cat.name).toBe('apigee-registry');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog tool names match tools getter', () => {
    const cat = ApigeeRegistryMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
