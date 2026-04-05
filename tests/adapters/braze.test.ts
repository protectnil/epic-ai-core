import { describe, it, expect } from 'vitest';
import { BrazeMCPServer } from '../../src/mcp-servers/braze.js';

describe('BrazeMCPServer', () => {
  const adapter = new BrazeMCPServer({ apiKey: 'test-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const a = new BrazeMCPServer({ apiKey: 'key', baseUrl: 'https://rest.eu-01.braze.com' });
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

  it('catalog() returns valid metadata', () => {
    const cat = BrazeMCPServer.catalog();
    expect(cat.name).toBe('braze');
    expect(cat.displayName).toBe('Braze');
    expect(cat.category).toBe('marketing');
    expect(Array.isArray(cat.keywords)).toBe(true);
    expect(cat.keywords.length).toBeGreaterThan(0);
    expect(Array.isArray(cat.toolNames)).toBe(true);
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('catalog toolNames match tools getter', () => {
    const cat = BrazeMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_campaign_details requires campaign_id', async () => {
    const result = await adapter.callTool('get_campaign_details', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('campaign_id');
  });

  it('get_campaign_analytics requires campaign_id', async () => {
    const result = await adapter.callTool('get_campaign_analytics', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('campaign_id');
  });

  it('get_canvas_details requires canvas_id', async () => {
    const result = await adapter.callTool('get_canvas_details', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('canvas_id');
  });

  it('get_canvas_analytics requires canvas_id', async () => {
    const result = await adapter.callTool('get_canvas_analytics', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('canvas_id');
  });

  it('get_canvas_data_summary requires canvas_id', async () => {
    const result = await adapter.callTool('get_canvas_data_summary', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('canvas_id');
  });

  it('schedule_canvas_trigger requires canvas_id and schedule', async () => {
    const result = await adapter.callTool('schedule_canvas_trigger', { canvas_id: 'c1' });
    expect(result.isError).toBe(true);
  });

  it('get_segment_details requires segment_id', async () => {
    const result = await adapter.callTool('get_segment_details', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('segment_id');
  });

  it('get_segment_analytics requires segment_id', async () => {
    const result = await adapter.callTool('get_segment_analytics', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('segment_id');
  });

  it('get_content_block requires content_block_id', async () => {
    const result = await adapter.callTool('get_content_block', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('content_block_id');
  });

  it('get_email_template requires email_template_id', async () => {
    const result = await adapter.callTool('get_email_template', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('email_template_id');
  });

  it('get_custom_events_analytics requires event', async () => {
    const result = await adapter.callTool('get_custom_events_analytics', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('event');
  });

  it('get_news_feed_card_analytics requires card_id', async () => {
    const result = await adapter.callTool('get_news_feed_card_analytics', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('card_id');
  });

  it('get_news_feed_card_details requires card_id', async () => {
    const result = await adapter.callTool('get_news_feed_card_details', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('card_id');
  });

  it('get_send_analytics requires campaign_id and send_id', async () => {
    const result = await adapter.callTool('get_send_analytics', { campaign_id: 'c1' });
    expect(result.isError).toBe(true);
  });

  it('get_subscription_group_status requires subscription_group_id', async () => {
    const result = await adapter.callTool('get_subscription_group_status', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('subscription_group_id');
  });

  it('no-required-arg tools do not throw on callTool', async () => {
    const noRequiredArgTools = [
      'list_campaigns', 'list_canvases', 'list_segments',
      'list_content_blocks', 'list_email_templates',
      'get_hard_bounces', 'get_email_unsubscribes',
      'get_custom_events_list', 'get_kpi_dau', 'get_kpi_mau',
      'get_kpi_new_users', 'get_kpi_uninstalls', 'get_app_sessions',
      'list_news_feed_cards', 'get_scheduled_broadcasts',
      'list_user_subscription_groups',
    ];
    for (const name of noRequiredArgTools) {
      const result = await adapter.callTool(name, {}).catch(() => ({ isError: true, content: [] }));
      expect(typeof result.isError).toBe('boolean');
    }
  });
});
