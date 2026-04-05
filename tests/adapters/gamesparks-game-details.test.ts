import { describe, it, expect } from 'vitest';
import { GameSparksGameDetailsMCPServer } from '../../src/mcp-servers/gamesparks-game-details.js';

describe('GameSparksGameDetailsMCPServer', () => {
  const adapter = new GameSparksGameDetailsMCPServer({ accessToken: 'test-jwt-token', apiKey: 'test-api-key' });

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

  it('catalog returns correct metadata', () => {
    const catalog = GameSparksGameDetailsMCPServer.catalog();
    expect(catalog.name).toBe('gamesparks-game-details');
    expect(catalog.category).toBe('gaming');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names in catalog match actual tools', () => {
    const catalog = GameSparksGameDetailsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('list_games tool has no required params', () => {
    const tool = adapter.tools.find(t => t.name === 'list_games');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('get_snapshot tool requires apiKey and snapshotId', () => {
    const tool = adapter.tools.find(t => t.name === 'get_snapshot');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('apiKey');
    expect(tool!.inputSchema.required).toContain('snapshotId');
  });

  it('get_analytics_data tool requires all date/stage params', () => {
    const tool = adapter.tools.find(t => t.name === 'get_analytics_data');
    expect(tool).toBeDefined();
    const req = tool!.inputSchema.required as string[];
    expect(req).toContain('apiKey');
    expect(req).toContain('stage');
    expect(req).toContain('startDate');
    expect(req).toContain('endDate');
  });
});
