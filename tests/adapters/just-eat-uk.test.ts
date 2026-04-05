import { describe, it, expect } from 'vitest';
import { JustEatUKMCPServer } from '../../src/mcp-servers/just-eat-uk.js';

describe('JustEatUKMCPServer', () => {
  const adapter = new JustEatUKMCPServer({ apiKey: 'test-api-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with bearer token', () => {
    const a = new JustEatUKMCPServer({ bearerToken: 'test-bearer' });
    expect(a).toBeDefined();
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
    const cat = JustEatUKMCPServer.catalog();
    expect(cat.name).toBe('just-eat-uk');
    expect(cat.category).toBe('food');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = JustEatUKMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('search_restaurants_by_postcode returns error without postcode', async () => {
    const result = await adapter.callTool('search_restaurants_by_postcode', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('postcode');
  });

  it('search_restaurants_by_location returns error without coordinates', async () => {
    const result = await adapter.callTool('search_restaurants_by_location', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('latitude');
  });

  it('search_restaurants returns error without tenant', async () => {
    const result = await adapter.callTool('search_restaurants', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tenant');
  });

  it('search_autocomplete returns error without tenant and q', async () => {
    const result = await adapter.callTool('search_autocomplete', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tenant');
  });

  it('get_checkout returns error without tenant', async () => {
    const result = await adapter.callTool('get_checkout', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tenant');
  });

  it('get_checkout returns error without checkoutId', async () => {
    const result = await adapter.callTool('get_checkout', { tenant: 'uk' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('checkoutId');
  });

  it('update_checkout returns error without tenant', async () => {
    const result = await adapter.callTool('update_checkout', {});
    expect(result.isError).toBe(true);
  });

  it('get_available_fulfilment_times returns error without checkoutId', async () => {
    const result = await adapter.callTool('get_available_fulfilment_times', { tenant: 'uk' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('checkoutId');
  });

  it('get_delivery_estimate returns error without coordinates', async () => {
    const result = await adapter.callTool('get_delivery_estimate', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('pickupLatitude');
  });

  it('get_delivery_fees returns error without tenant', async () => {
    const result = await adapter.callTool('get_delivery_fees', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tenant');
  });

  it('get_consumer_details returns error without tenant', async () => {
    const result = await adapter.callTool('get_consumer_details', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tenant');
  });

  it('create_consumer returns error without email', async () => {
    const result = await adapter.callTool('create_consumer', { tenant: 'uk' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('email');
  });

  it('get_restaurant_menu returns error without restaurantId', async () => {
    const result = await adapter.callTool('get_restaurant_menu', { tenant: 'uk' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('restaurantId');
  });

  it('get_menu_item_variations returns error without itemId', async () => {
    const result = await adapter.callTool('get_menu_item_variations', { tenant: 'uk', restaurantId: 'r1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('itemId');
  });

  it('create_order returns error without required fields', async () => {
    const result = await adapter.callTool('create_order', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('restaurantId');
  });

  it('accept_order returns error without orderId', async () => {
    const result = await adapter.callTool('accept_order', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('orderId');
  });

  it('reject_order returns error without orderId', async () => {
    const result = await adapter.callTool('reject_order', {});
    expect(result.isError).toBe(true);
  });

  it('cancel_order returns error without orderId', async () => {
    const result = await adapter.callTool('cancel_order', {});
    expect(result.isError).toBe(true);
  });

  it('complete_order returns error without orderId', async () => {
    const result = await adapter.callTool('complete_order', {});
    expect(result.isError).toBe(true);
  });

  it('create_delivery_pool returns error without name', async () => {
    const result = await adapter.callTool('create_delivery_pool', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('get_delivery_pool returns error without deliveryPoolId', async () => {
    const result = await adapter.callTool('get_delivery_pool', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('deliveryPoolId');
  });

  it('add_restaurants_to_pool returns error without restaurantIds', async () => {
    const result = await adapter.callTool('add_restaurants_to_pool', { deliveryPoolId: 'p1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('restaurantIds');
  });

  it('set_pool_availability returns error without availabilityPercentage', async () => {
    const result = await adapter.callTool('set_pool_availability', { deliveryPoolId: 'p1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('availabilityPercentage');
  });

  it('update_driver_location returns error without coordinates', async () => {
    const result = await adapter.callTool('update_driver_location', { orderId: 'o1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('latitude');
  });

  it('set_restaurant_online returns error without restaurantId', async () => {
    const result = await adapter.callTool('set_restaurant_online', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('restaurantId');
  });

  it('set_restaurant_offline returns error without restaurantId', async () => {
    const result = await adapter.callTool('set_restaurant_offline', {});
    expect(result.isError).toBe(true);
  });
});
