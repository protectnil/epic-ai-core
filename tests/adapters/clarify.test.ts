import { describe, it, expect } from 'vitest';
import { ClarifyMCPServer } from '../../src/mcp-servers/clarify.js';

describe('ClarifyMCPServer', () => {
  const adapter = new ClarifyMCPServer({ apiKey: 'test-api-key' });

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

  it('get_bundle returns error when bundle_id missing', async () => {
    const result = await adapter.callTool('get_bundle', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('bundle_id');
  });

  it('add_bundle_track returns error when media_url missing', async () => {
    const result = await adapter.callTool('add_bundle_track', { bundle_id: 'bun123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('media_url');
  });

  it('get_bundle_insight returns error when insight_id missing', async () => {
    const result = await adapter.callTool('get_bundle_insight', { bundle_id: 'bun123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('insight_id');
  });

  it('get_scores_report returns error when required params missing', async () => {
    const result = await adapter.callTool('get_scores_report', { interval: 'day' });
    expect(result.isError).toBe(true);
  });

  it('get_trends_report returns error when interval missing', async () => {
    const result = await adapter.callTool('get_trends_report', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('interval');
  });

  it('update_bundle_tracks requires parts_complete', async () => {
    const result = await adapter.callTool('update_bundle_tracks', { bundle_id: 'bun123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('parts_complete');
  });

  it('catalog returns correct metadata', () => {
    const catalog = ClarifyMCPServer.catalog();
    expect(catalog.name).toBe('clarify');
    expect(catalog.category).toBe('ai');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names in catalog match tools getter', () => {
    const catalog = ClarifyMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
