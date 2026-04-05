import { describe, it, expect } from 'vitest';
import { AppVeyorMCPServer } from '../../src/mcp-servers/appveyor.js';

describe('AppVeyorMCPServer', () => {
  const adapter = new AppVeyorMCPServer({ apiToken: 'test-token' });

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

  it('includes core devops tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_projects');
    expect(names).toContain('start_build');
    expect(names).toContain('cancel_build');
    expect(names).toContain('start_deployment');
    expect(names).toContain('list_environments');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('start_build requires accountName and projectSlug', async () => {
    const result = await adapter.callTool('start_build', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('catalog returns correct metadata', () => {
    const catalog = AppVeyorMCPServer.catalog();
    expect(catalog.name).toBe('appveyor');
    expect(catalog.category).toBe('devops');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });
});
