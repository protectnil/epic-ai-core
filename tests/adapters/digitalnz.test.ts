import { describe, it, expect } from 'vitest';
import { DigitalNZMCPServer } from '../../src/mcp-servers/digitalnz.js';

describe('DigitalNZMCPServer', () => {
  const adapter = new DigitalNZMCPServer({ apiKey: 'test-api-key' });

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

  it('exposes search_records tool', () => {
    const tool = adapter.tools.find(t => t.name === 'search_records');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('text');
    expect(tool?.inputSchema.properties).toHaveProperty('category');
    expect(tool?.inputSchema.properties).toHaveProperty('facets');
  });

  it('exposes get_record tool with required record_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_record');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('record_id');
  });

  it('exposes get_more_like_this tool with required record_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_more_like_this');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('record_id');
  });

  it('catalog returns expected shape', () => {
    const cat = DigitalNZMCPServer.catalog();
    expect(cat.name).toBe('digitalnz');
    expect(cat.category).toBe('data');
    expect(cat.toolNames).toContain('search_records');
    expect(cat.toolNames).toContain('get_record');
    expect(cat.toolNames).toContain('get_more_like_this');
    expect(cat.author).toBe('protectnil');
  });

  it('get_record returns error when record_id missing', async () => {
    const result = await adapter.callTool('get_record', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('record_id');
  });

  it('get_more_like_this returns error when record_id missing', async () => {
    const result = await adapter.callTool('get_more_like_this', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('record_id');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
