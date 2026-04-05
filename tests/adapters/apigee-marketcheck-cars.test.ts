import { describe, it, expect } from 'vitest';
import { MarketcheckCarsMCPServer } from '../../src/mcp-servers/apigee-marketcheck-cars.js';

describe('MarketcheckCarsMCPServer', () => {
  const adapter = new MarketcheckCarsMCPServer({ apiKey: 'test-api-key' });

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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('search_active_cars');
    expect(names).toContain('get_car_listing');
    expect(names).toContain('get_car_listing_extra');
    expect(names).toContain('get_car_listing_media');
    expect(names).toContain('decode_vin');
    expect(names).toContain('get_vehicle_history');
    expect(names).toContain('predict_car_price');
    expect(names).toContain('get_dealer');
    expect(names).toContain('search_dealers');
    expect(names).toContain('get_dealer_active_inventory');
    expect(names).toContain('get_market_stats');
    expect(names).toContain('get_popular_cars');
    expect(names).toContain('search_car_sales');
    expect(names).toContain('get_car_recall');
    expect(names).toContain('get_vin_specs');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_car_listing returns error when id missing', async () => {
    const result = await adapter.callTool('get_car_listing', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_car_listing_extra returns error when id missing', async () => {
    const result = await adapter.callTool('get_car_listing_extra', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_car_listing_media returns error when id missing', async () => {
    const result = await adapter.callTool('get_car_listing_media', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('decode_vin returns error when vin missing', async () => {
    const result = await adapter.callTool('decode_vin', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('vin is required');
  });

  it('get_vehicle_history returns error when vin missing', async () => {
    const result = await adapter.callTool('get_vehicle_history', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('vin is required');
  });

  it('get_dealer returns error when id missing', async () => {
    const result = await adapter.callTool('get_dealer', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_dealer_active_inventory returns error when dealer_id missing', async () => {
    const result = await adapter.callTool('get_dealer_active_inventory', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('dealer_id is required');
  });

  it('get_car_recall returns error when vin missing', async () => {
    const result = await adapter.callTool('get_car_recall', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('vin is required');
  });

  it('get_vin_specs returns error when vin missing', async () => {
    const result = await adapter.callTool('get_vin_specs', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('vin is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = MarketcheckCarsMCPServer.catalog();
    expect(cat.name).toBe('apigee-marketcheck-cars');
    expect(cat.category).toBe('automotive');
    expect(cat.toolNames.length).toBe(15);
    expect(cat.author).toBe('protectnil');
  });
});
