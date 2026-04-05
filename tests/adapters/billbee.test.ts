import { describe, it, expect } from 'vitest';
import { BillbeeMCPServer } from '../../src/mcp-servers/billbee.js';

describe('BillbeeMCPServer', () => {
  const adapter = new BillbeeMCPServer({ apiKey: 'test-key', username: 'test@example.com', apiPassword: 'test-api-pass' });

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

  it('covers core order tool names', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = [
      'list_orders', 'get_order', 'create_order', 'patch_order', 'update_order_state',
      'add_order_shipment', 'create_order_invoice', 'create_order_delivery_note',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('covers core product tool names', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = [
      'list_products', 'get_product', 'create_product', 'delete_product', 'patch_product',
      'update_product_stock', 'update_product_stock_multiple',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('covers customer tools', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = ['list_customers', 'get_customer', 'create_customer', 'update_customer', 'get_customer_orders'];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('covers shipment tools', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = ['list_shipments', 'create_shipment', 'ship_order_with_label', 'get_shipping_providers'];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('covers webhook tools', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = ['list_webhooks', 'create_webhook', 'update_webhook', 'delete_webhook', 'list_webhook_filters'];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('callTool missing required id throws gracefully', async () => {
    const result = await adapter.callTool('get_order', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const cat = BillbeeMCPServer.catalog();
    expect(cat.name).toBe('billbee');
    expect(cat.category).toBe('ecommerce');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('catalog toolNames match exposed tools', () => {
    const cat = BillbeeMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('tools requiring id declare it in required array', () => {
    const idTools = ['get_order', 'update_order_state', 'add_order_shipment', 'get_customer', 'delete_product'];
    for (const toolName of idTools) {
      const tool = adapter.tools.find(t => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('id');
    }
  });

  it('search tool requires Term', () => {
    const tool = adapter.tools.find(t => t.name === 'search');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('Term');
  });
});
