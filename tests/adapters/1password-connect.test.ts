import { describe, it, expect } from 'vitest';
import { OnePasswordConnectMCPServer } from '../../src/mcp-servers/1password-connect.js';

describe('OnePasswordConnectMCPServer', () => {
  const adapter = new OnePasswordConnectMCPServer({ connectToken: 'test-token' });

  it('instantiates with required config', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new OnePasswordConnectMCPServer({
      connectToken: 'test-token',
      baseUrl: 'https://connect.example.com/v1',
    });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes all 12 expected tools', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_vaults');
    expect(names).toContain('get_vault');
    expect(names).toContain('list_items');
    expect(names).toContain('get_item');
    expect(names).toContain('create_item');
    expect(names).toContain('update_item');
    expect(names).toContain('patch_item');
    expect(names).toContain('delete_item');
    expect(names).toContain('list_item_files');
    expect(names).toContain('get_item_file');
    expect(names).toContain('get_api_activity');
    expect(names).toContain('get_server_health');
    expect(names.length).toBe(12);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('every tool description is 10+ words', () => {
    for (const tool of adapter.tools) {
      const wordCount = tool.description.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(10);
    }
  });

  it('every tool inputSchema property has type and description', () => {
    for (const tool of adapter.tools) {
      const props = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
      for (const [propName, propDef] of Object.entries(props)) {
        expect(propDef.type, `tool ${tool.name} prop ${propName} missing type`).toBeTruthy();
        expect(propDef.description, `tool ${tool.name} prop ${propName} missing description`).toBeTruthy();
      }
    }
  });

  it('unknown tool returns isError: true, does not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('callTool returns ToolResult shape on network error', async () => {
    // Unreachable port forces a network error; must return ToolResult, not throw
    const offline = new OnePasswordConnectMCPServer({
      connectToken: 'test-token',
      baseUrl: 'http://localhost:19999/v1',
    });
    const result = await offline.callTool('list_vaults', {});
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('isError');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    expect(result.isError).toBe(true);
  });

  it('static catalog returns correct category and required fields', () => {
    const catalog = OnePasswordConnectMCPServer.catalog();
    expect(catalog.category).toBe('identity');
    expect(catalog.name).toBe('1password-connect');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.keywords).toContain('1password');
    expect(catalog.keywords).toContain('vault');
    expect(catalog.toolNames.length).toBe(12);
  });

  it('create_item tool has required vault_uuid and category in required array', () => {
    const createTool = adapter.tools.find((t) => t.name === 'create_item');
    expect(createTool).toBeDefined();
    expect(createTool!.inputSchema.required).toContain('vault_uuid');
    expect(createTool!.inputSchema.required).toContain('category');
  });

  it('delete_item tool has required vault_uuid and item_uuid', () => {
    const deleteTool = adapter.tools.find((t) => t.name === 'delete_item');
    expect(deleteTool).toBeDefined();
    expect(deleteTool!.inputSchema.required).toContain('vault_uuid');
    expect(deleteTool!.inputSchema.required).toContain('item_uuid');
  });
});
