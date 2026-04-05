import { describe, it, expect } from 'vitest';
import { ViatorMCPServer } from '../../src/mcp-servers/viator.js';

describe('ViatorMCPServer', () => {
  const adapter = new ViatorMCPServer({ apiKey: 'test-api-key' });
  const sandboxAdapter = new ViatorMCPServer({ apiKey: 'test-api-key', environment: 'sandbox' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates in sandbox mode', () => {
    expect(sandboxAdapter).toBeDefined();
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

  it('catalog returns required fields', () => {
    const cat = ViatorMCPServer.catalog();
    expect(cat.name).toBe('viator');
    expect(cat.category).toBe('travel');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = ViatorMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_product tool exists with code param', () => {
    const tool = adapter.tools.find(t => t.name === 'get_product');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('code');
  });

  it('search_products_freetext tool exists with text param', () => {
    const tool = adapter.tools.find(t => t.name === 'search_products_freetext');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('text');
  });

  it('check_availability tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'check_availability');
    expect(tool).toBeDefined();
  });

  it('create_booking tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'create_booking');
    expect(tool).toBeDefined();
  });

  it('cancel_booking tool exists with booking_reference param', () => {
    const tool = adapter.tools.find(t => t.name === 'cancel_booking');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('booking_reference');
  });

  it('list_destinations tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_destinations');
    expect(tool).toBeDefined();
  });

  it('list_categories tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_categories');
    expect(tool).toBeDefined();
  });

  it('get_booking_status tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'get_booking_status');
    expect(tool).toBeDefined();
  });
});
