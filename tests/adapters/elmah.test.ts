import { describe, it, expect } from 'vitest';
import { ElmahMCPServer } from '../../src/mcp-servers/elmah.js';

describe('ElmahMCPServer', () => {
  const adapter = new ElmahMCPServer({ apiKey: 'test-api-key' });

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
    const catalog = ElmahMCPServer.catalog();
    expect(catalog.name).toBe('elmah');
    expect(catalog.category).toBe('observability');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names in catalog match actual tools', () => {
    const catalog = ElmahMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('list_logs tool has no required params', () => {
    const tool = adapter.tools.find(t => t.name === 'list_logs');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('create_message requires logId and title', () => {
    const tool = adapter.tools.find(t => t.name === 'create_message');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('logId');
    expect(tool!.inputSchema.required).toContain('title');
  });

  it('create_deployment requires version', () => {
    const tool = adapter.tools.find(t => t.name === 'create_deployment');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('version');
  });

  it('create_heartbeat requires logId and id', () => {
    const tool = adapter.tools.find(t => t.name === 'create_heartbeat');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('logId');
    expect(tool!.inputSchema.required).toContain('id');
  });

  it('list_messages supports optional query and pagination params', () => {
    const tool = adapter.tools.find(t => t.name === 'list_messages');
    expect(tool).toBeDefined();
    const props = Object.keys(tool!.inputSchema.properties as object);
    expect(props).toContain('pageIndex');
    expect(props).toContain('pageSize');
    expect(props).toContain('query');
    expect(props).toContain('from');
    expect(props).toContain('to');
  });
});
