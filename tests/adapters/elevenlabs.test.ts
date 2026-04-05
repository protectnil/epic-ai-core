import { describe, it, expect } from 'vitest';
import { ElevenLabsMCPServer } from '../../src/mcp-servers/elevenlabs.js';

describe('ElevenLabsMCPServer', () => {
  const adapter = new ElevenLabsMCPServer({ apiKey: 'test-api-key' });

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

  it('synthesize_speech requires voice_id', async () => {
    const result = await adapter.callTool('synthesize_speech', { text: 'hello' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('voice_id');
  });

  it('synthesize_speech requires text', async () => {
    const result = await adapter.callTool('synthesize_speech', { voice_id: 'abc123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('text');
  });

  it('get_voice requires voice_id', async () => {
    const result = await adapter.callTool('get_voice', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('voice_id');
  });

  it('delete_voice requires voice_id', async () => {
    const result = await adapter.callTool('delete_voice', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('voice_id');
  });

  it('delete_history_items requires non-empty array', async () => {
    const result = await adapter.callTool('delete_history_items', { history_item_ids: [] });
    expect(result.isError).toBe(true);
  });

  it('exposes catalog metadata', () => {
    const catalog = ElevenLabsMCPServer.catalog();
    expect(catalog.name).toBe('elevenlabs');
    expect(catalog.category).toBe('ai-ml');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });
});
