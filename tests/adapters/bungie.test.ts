import { describe, it, expect } from 'vitest';
import { BungieMCPServer } from '../../src/mcp-servers/bungie.js';

describe('BungieMCPServer', () => {
  const adapter = new BungieMCPServer({ apiKey: 'test-api-key' });
  const adapterWithToken = new BungieMCPServer({ apiKey: 'test-api-key', accessToken: 'test-token' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with optional accessToken', () => {
    expect(adapterWithToken).toBeDefined();
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

  it('catalog returns expected shape', () => {
    const cat = BungieMCPServer.catalog();
    expect(cat.name).toBe('bungie');
    expect(cat.category).toBe('gaming');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = BungieMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolNames).toContain(n);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_destiny_manifest missing no args required', async () => {
    // Just verifies the tool definition is correct — no required fields
    const tool = adapter.tools.find(t => t.name === 'get_destiny_manifest');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('get_destiny_entity_definition requires entity_type and hash_identifier', async () => {
    const result = await adapter.callTool('get_destiny_entity_definition', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entity_type');
  });

  it('search_destiny_player requires membership_type', async () => {
    const result = await adapter.callTool('search_destiny_player', { display_name: 'Test', display_name_code: 1234 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('membership_type');
  });

  it('get_linked_profiles requires membership_type and membership_id', async () => {
    const result = await adapter.callTool('get_linked_profiles', {});
    expect(result.isError).toBe(true);
  });

  it('get_profile requires membership_type, destiny_membership_id, and components', async () => {
    const result = await adapter.callTool('get_profile', { membership_type: 3 });
    expect(result.isError).toBe(true);
  });

  it('get_character requires character_id', async () => {
    const result = await adapter.callTool('get_character', {
      membership_type: 3,
      destiny_membership_id: '123',
      components: [200],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('character_id');
  });

  it('get_item requires item_instance_id', async () => {
    const result = await adapter.callTool('get_item', {
      membership_type: 3,
      destiny_membership_id: '123',
      components: [300],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item_instance_id');
  });

  it('search_destiny_entities requires type and search_term', async () => {
    const result = await adapter.callTool('search_destiny_entities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('type');
  });

  it('get_activity_history requires all three IDs', async () => {
    const result = await adapter.callTool('get_activity_history', { membership_type: 3 });
    expect(result.isError).toBe(true);
  });

  it('get_post_game_carnage_report requires activity_id', async () => {
    const result = await adapter.callTool('get_post_game_carnage_report', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('activity_id');
  });

  it('get_historical_stats requires membership_type, destiny_membership_id, character_id', async () => {
    const result = await adapter.callTool('get_historical_stats', {});
    expect(result.isError).toBe(true);
  });

  it('get_unique_weapon_history requires all three IDs', async () => {
    const result = await adapter.callTool('get_unique_weapon_history', {});
    expect(result.isError).toBe(true);
  });

  it('get_aggregate_activity_stats requires all three IDs', async () => {
    const result = await adapter.callTool('get_aggregate_activity_stats', {});
    expect(result.isError).toBe(true);
  });

  it('get_public_vendors requires components', async () => {
    const result = await adapter.callTool('get_public_vendors', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('components');
  });

  it('get_clan_weekly_reward_state requires group_id', async () => {
    const result = await adapter.callTool('get_clan_weekly_reward_state', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('group_id');
  });

  it('get_clan_aggregate_stats requires group_id', async () => {
    const result = await adapter.callTool('get_clan_aggregate_stats', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('group_id');
  });

  it('get_group requires group_id', async () => {
    const result = await adapter.callTool('get_group', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('group_id');
  });

  it('get_members_of_group requires group_id', async () => {
    const result = await adapter.callTool('get_members_of_group', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('group_id');
  });

  it('get_groups_for_member requires all four params', async () => {
    const result = await adapter.callTool('get_groups_for_member', { membership_type: 3, membership_id: '123' });
    expect(result.isError).toBe(true);
  });
});
