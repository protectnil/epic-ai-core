import { describe, it, expect } from 'vitest';
import { DatumboxMCPServer } from '../../src/mcp-servers/datumbox.js';

describe('DatumboxMCPServer', () => {
  const adapter = new DatumboxMCPServer({ apiKey: 'test-api-key' });

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

  it('exposes exactly 14 tools', () => {
    expect(adapter.tools.length).toBe(14);
  });

  it('tool names match expected set', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('sentiment_analysis');
    expect(names).toContain('topic_classification');
    expect(names).toContain('adult_content_detection');
    expect(names).toContain('spam_detection');
    expect(names).toContain('readability_assessment');
    expect(names).toContain('language_detection');
    expect(names).toContain('commercial_detection');
    expect(names).toContain('educational_detection');
    expect(names).toContain('gender_detection');
    expect(names).toContain('subjectivity_analysis');
    expect(names).toContain('twitter_sentiment_analysis');
    expect(names).toContain('keyword_extraction');
    expect(names).toContain('text_extraction');
    expect(names).toContain('document_similarity');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const cat = DatumboxMCPServer.catalog();
    expect(cat.name).toBe('datumbox');
    expect(cat.category).toBe('ai');
    expect(cat.toolNames).toHaveLength(14);
  });
});
