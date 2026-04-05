import { describe, it, expect } from 'vitest';
import { NYTimesTimesTagsMCPServer } from '../../src/mcp-servers/nytimes-times-tags.js';

describe('NYTimesTimesTagsMCPServer', () => {
  const adapter = new NYTimesTimesTagsMCPServer({ apiKey: 'test-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools with required fields', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns correct metadata', () => {
    const cat = NYTimesTimesTagsMCPServer.catalog();
    expect(cat.name).toBe('nytimes-times-tags');
    expect(cat.category).toBe('media');
    expect(cat.toolNames).toContain('get_content_by_url');
    expect(cat.toolNames).toContain('list_content_by_source_section');
    expect(cat.toolNames).toContain('list_content_by_source_section_timeperiod');
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
