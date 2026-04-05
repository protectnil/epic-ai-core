import { describe, it, expect } from 'vitest';
import { IntellifiNlMCPServer } from '../../src/mcp-servers/intellifi-nl.js';

describe('IntellifiNlMCPServer', () => {
  const adapter = new IntellifiNlMCPServer({ apiKey: 'test-api-key' });

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

  it('get_item requires id', async () => {
    const result = await adapter.callTool('get_item', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_item requires code', async () => {
    const result = await adapter.callTool('create_item', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('code');
  });

  it('get_spot requires id', async () => {
    const result = await adapter.callTool('get_spot', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_subscription requires url', async () => {
    const result = await adapter.callTool('create_subscription', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('add_items_to_list requires id and item_ids array', async () => {
    const result = await adapter.callTool('add_items_to_list', { id: 'list-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item_ids');
  });

  it('remove_item_from_list requires id and item_id', async () => {
    const result = await adapter.callTool('remove_item_from_list', { id: 'list-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item_id');
  });

  it('catalog returns expected metadata', () => {
    const cat = IntellifiNlMCPServer.catalog();
    expect(cat.name).toBe('intellifi-nl');
    expect(cat.category).toBe('iot');
    expect(cat.toolNames.length).toBeGreaterThan(10);
  });

  it('covers all core resource types', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_items');
    expect(names).toContain('list_spots');
    expect(names).toContain('list_locations');
    expect(names).toContain('list_presences');
    expect(names).toContain('list_events');
    expect(names).toContain('list_subscriptions');
    expect(names).toContain('list_location_rules');
    expect(names).toContain('list_item_lists');
    expect(names).toContain('list_spot_lists');
    expect(names).toContain('list_kvpairs');
    expect(names).toContain('list_blobs');
    expect(names).toContain('list_services');
  });

  it('baseUrl defaults to brain.intellifi.cloud', () => {
    const a = new IntellifiNlMCPServer({ apiKey: 'k' });
    // Access via internal field — cast to any for test inspection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((a as any).baseUrl).toContain('intellifi');
  });
});
