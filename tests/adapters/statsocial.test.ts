import { describe, it, expect } from 'vitest';
import { StatSocialMCPServer } from '../../src/mcp-servers/statsocial.js';

describe('StatSocialMCPServer', () => {
  const adapter = new StatSocialMCPServer({ apiKey: 'test-api-key' });

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

  it('get_report rejects missing report_hash', async () => {
    const result = await adapter.callTool('get_report', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('report_hash');
  });

  it('get_report_dates rejects missing report_hash', async () => {
    const result = await adapter.callTool('get_report_dates', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('report_hash');
  });

  it('get_report_status rejects missing report_hash', async () => {
    const result = await adapter.callTool('get_report_status', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('report_hash');
  });

  it('create_custom_report rejects missing name', async () => {
    const result = await adapter.callTool('create_custom_report', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('create_tweet_report rejects missing handles', async () => {
    const result = await adapter.callTool('create_tweet_report', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('handles');
  });

  it('create_twitter_report rejects missing handles', async () => {
    const result = await adapter.callTool('create_twitter_report', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('handles');
  });
});
