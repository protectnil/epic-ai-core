import { describe, it, expect } from 'vitest';
import { GeneeaMCPServer } from '../../src/mcp-servers/geneea.js';

describe('GeneeaMCPServer', () => {
  const adapter = new GeneeaMCPServer({ apiKey: 'test-key' });

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

  it('catalog() returns valid metadata', () => {
    const catalog = GeneeaMCPServer.catalog();
    expect(catalog.name).toBe('geneea');
    expect(catalog.category).toBe('ai');
    expect(catalog.keywords.length).toBeGreaterThan(0);
    expect(catalog.toolNames).toContain('analyze_sentiment');
    expect(catalog.toolNames).toContain('extract_entities');
    expect(catalog.toolNames).toContain('detect_topic');
  });

  it('exposes all 7 expected tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_account_info');
    expect(names).toContain('get_service_status');
    expect(names).toContain('correct_text');
    expect(names).toContain('extract_entities');
    expect(names).toContain('lemmatize_text');
    expect(names).toContain('analyze_sentiment');
    expect(names).toContain('detect_topic');
  });
});
