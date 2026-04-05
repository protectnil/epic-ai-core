import { describe, it, expect } from 'vitest';
import { BrandLoversMCPServer } from '../../src/mcp-servers/brandlovers.js';

describe('BrandLoversMCPServer', () => {
  const adapter = new BrandLoversMCPServer({ apiKey: 'test-key' });

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

  it('catalog returns correct metadata', () => {
    const cat = BrandLoversMCPServer.catalog();
    expect(cat.name).toBe('brandlovers');
    expect(cat.category).toBe('marketing');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_product requires skuSellerId', async () => {
    const result = await adapter.callTool('get_product', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('skuSellerId');
  });

  it('create_product requires required fields', async () => {
    const result = await adapter.callTool('create_product', { skuSellerId: 'SKU-1' });
    expect(result.isError).toBe(true);
  });

  it('update_product_price requires price', async () => {
    const result = await adapter.callTool('update_product_price', { skuSellerId: 'SKU-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('price');
  });

  it('update_product_status requires status', async () => {
    const result = await adapter.callTool('update_product_status', { skuSellerId: 'SKU-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('status');
  });

  it('update_product_stock requires stock', async () => {
    const result = await adapter.callTool('update_product_stock', { skuSellerId: 'SKU-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('stock');
  });

  it('bulk_create_products requires products', async () => {
    const result = await adapter.callTool('bulk_create_products', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('products');
  });

  it('bulk_create_products rejects invalid JSON', async () => {
    const result = await adapter.callTool('bulk_create_products', { products: 'not-json' });
    expect(result.isError).toBe(true);
  });

  it('get_order requires orderId', async () => {
    const result = await adapter.callTool('get_order', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('orderId');
  });

  it('confirm_shipment_sent requires orderId and trackingNumber', async () => {
    const result = await adapter.callTool('confirm_shipment_sent', { orderId: 'ORD-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('trackingNumber');
  });

  it('confirm_shipment_delivered requires orderId', async () => {
    const result = await adapter.callTool('confirm_shipment_delivered', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('orderId');
  });

  it('create_ticket requires orderId, subject, and message', async () => {
    const result = await adapter.callTool('create_ticket', { orderId: 'ORD-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('subject');
  });

  it('get_ticket_messages requires ticketId', async () => {
    const result = await adapter.callTool('get_ticket_messages', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ticketId');
  });

  it('add_ticket_message requires ticketId and message', async () => {
    const result = await adapter.callTool('add_ticket_message', { ticketId: 'T-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('message');
  });

  it('update_ticket_status requires ticketId and status', async () => {
    const result = await adapter.callTool('update_ticket_status', { ticketId: 'T-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('status');
  });

  it('catalog toolNames matches tools getter length', () => {
    const cat = BrandLoversMCPServer.catalog();
    const tools = adapter.tools;
    expect(cat.toolNames.length).toBe(tools.length);
  });
});
