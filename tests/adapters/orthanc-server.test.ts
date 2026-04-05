import { describe, it, expect } from 'vitest';
import { OrthancServerMCPServer } from '../../src/mcp-servers/orthanc-server.js';

describe('OrthancServerMCPServer', () => {
  const adapter = new OrthancServerMCPServer({
    baseUrl: 'https://demo.orthanc-server.com',
    username: 'test-user',
    password: 'test-pass',
  });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with no config (anonymous)', () => {
    const anon = new OrthancServerMCPServer({});
    expect(anon).toBeDefined();
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
    const catalog = OrthancServerMCPServer.catalog();
    expect(catalog.name).toBe('orthanc-server');
    expect(catalog.category).toBe('healthcare');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('all tool names in catalog match tools array', () => {
    const catalog = OrthancServerMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('all inputSchema properties have type and description', () => {
    for (const tool of adapter.tools) {
      const props = tool.inputSchema.properties as Record<string, { type?: string; description?: string }>;
      for (const [propName, propDef] of Object.entries(props)) {
        expect(propDef.type, `${tool.name}.${propName} missing type`).toBeTruthy();
        expect(propDef.description, `${tool.name}.${propName} missing description`).toBeTruthy();
      }
    }
  });
});
