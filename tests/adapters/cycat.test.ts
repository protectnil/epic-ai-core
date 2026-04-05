import { describe, it, expect } from 'vitest';
import { CyCATMCPServer } from '../../src/mcp-servers/cycat.js';

describe('CyCATMCPServer', () => {
  const adapter = new CyCATMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with empty config', () => {
    const a = new CyCATMCPServer({});
    expect(a).toBeDefined();
  });

  it('accepts custom baseUrl', () => {
    const custom = new CyCATMCPServer({ baseUrl: 'https://custom.cycat.org' });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes exactly 14 tools', () => {
    expect(adapter.tools.length).toBe(14);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('tool names match expected set', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('get_info');
    expect(names).toContain('generate_uuid');
    expect(names).toContain('lookup_uuid');
    expect(names).toContain('search');
    expect(names).toContain('get_relationships');
    expect(names).toContain('get_relationships_expanded');
    expect(names).toContain('get_parent');
    expect(names).toContain('get_child');
    expect(names).toContain('list_projects');
    expect(names).toContain('list_publishers');
    expect(names).toContain('get_namespace_all');
    expect(names).toContain('get_namespace_ids');
    expect(names).toContain('find_uuid_by_namespace');
    expect(names).toContain('propose_resource');
  });

  it('lookup_uuid requires uuid', () => {
    const tool = adapter.tools.find((t) => t.name === 'lookup_uuid');
    expect(tool?.inputSchema.required).toContain('uuid');
  });

  it('search requires query', () => {
    const tool = adapter.tools.find((t) => t.name === 'search');
    expect(tool?.inputSchema.required).toContain('query');
  });

  it('find_uuid_by_namespace requires namespace and namespaceid', () => {
    const tool = adapter.tools.find((t) => t.name === 'find_uuid_by_namespace');
    expect(tool?.inputSchema.required).toContain('namespace');
    expect(tool?.inputSchema.required).toContain('namespaceid');
  });

  it('list_projects requires start and end', () => {
    const tool = adapter.tools.find((t) => t.name === 'list_projects');
    expect(tool?.inputSchema.required).toContain('start');
    expect(tool?.inputSchema.required).toContain('end');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('lookup_uuid missing uuid returns error', async () => {
    const result = await adapter.callTool('lookup_uuid', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('search missing query returns error', async () => {
    const result = await adapter.callTool('search', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('get_namespace_ids missing namespace returns error', async () => {
    const result = await adapter.callTool('get_namespace_ids', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('find_uuid_by_namespace missing args returns error', async () => {
    const result = await adapter.callTool('find_uuid_by_namespace', { namespace: 'mitre-attack' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('list_projects missing args returns error', async () => {
    const result = await adapter.callTool('list_projects', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('catalog() returns correct metadata', () => {
    const catalog = CyCATMCPServer.catalog();
    expect(catalog.name).toBe('cycat');
    expect(catalog.category).toBe('cybersecurity');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.toolNames).toHaveLength(14);
    expect(catalog.keywords).toContain('cybersecurity');
    expect(catalog.keywords).toContain('mitre-attack');
  });
});
