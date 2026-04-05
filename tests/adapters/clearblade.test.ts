import { describe, it, expect } from 'vitest';
import { ClearBladeMCPServer } from '../../src/mcp-servers/clearblade.js';

describe('ClearBladeMCPServer', () => {
  const adapter = new ClearBladeMCPServer({ userToken: 'test-token' });

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

  it('get_collection_data returns error when collection_id missing', async () => {
    const result = await adapter.callTool('get_collection_data', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('collection_id');
  });

  it('list_devices returns error when system_key missing', async () => {
    const result = await adapter.callTool('list_devices', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('system_key');
  });

  it('execute_code_service returns error when service_name missing', async () => {
    const result = await adapter.callTool('execute_code_service', { system_key: 'sys123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('service_name');
  });

  it('authenticate_user returns error when credentials missing', async () => {
    const result = await adapter.callTool('authenticate_user', {});
    expect(result.isError).toBe(true);
  });

  it('delete_collection_data requires query param to prevent accidental deletes', async () => {
    const result = await adapter.callTool('delete_collection_data', { collection_id: 'col123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('catalog returns correct metadata', () => {
    const catalog = ClearBladeMCPServer.catalog();
    expect(catalog.name).toBe('clearblade');
    expect(catalog.category).toBe('iot');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names in catalog match tools getter', () => {
    const catalog = ClearBladeMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
