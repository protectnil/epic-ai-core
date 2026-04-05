import { describe, it, expect } from 'vitest';
import { PressAssociationMCPServer } from '../../src/mcp-servers/pressassociation.js';

describe('PressAssociationMCPServer', () => {
  const adapter = new PressAssociationMCPServer({ apiKey: 'test-api-key' });

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
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_assets');
    expect(names).toContain('get_asset');
    expect(names).toContain('get_schedule');
    expect(names).toContain('list_channels');
    expect(names).toContain('list_catalogues');
    expect(names).toContain('list_contributors');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_asset requires assetId', async () => {
    const result = await adapter.callTool('get_asset', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/assetId/i);
  });

  it('get_channel requires channelId', async () => {
    const result = await adapter.callTool('get_channel', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/channelId/i);
  });

  it('get_contributor requires contributorId', async () => {
    const result = await adapter.callTool('get_contributor', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/contributorId/i);
  });

  it('get_schedule requires channelId and start', async () => {
    const result = await adapter.callTool('get_schedule', { channelId: 'ch1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/start/i);
  });

  it('list_catalogue_assets requires catalogueId', async () => {
    const result = await adapter.callTool('list_catalogue_assets', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/catalogueId/i);
  });

  it('get_catalogue_asset requires both catalogueId and assetId', async () => {
    const result = await adapter.callTool('get_catalogue_asset', { catalogueId: 'cat1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/assetId/i);
  });

  it('catalog returns correct metadata', () => {
    const cat = PressAssociationMCPServer.catalog();
    expect(cat.name).toBe('pressassociation');
    expect(cat.category).toBe('media');
    expect(cat.toolNames.length).toBe(14);
    expect(cat.author).toBe('protectnil');
  });
});
