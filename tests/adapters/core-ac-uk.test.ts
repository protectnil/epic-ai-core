import { describe, it, expect } from 'vitest';
import { CoreAcUkMCPServer } from '../../src/mcp-servers/core-ac-uk.js';

describe('CoreAcUkMCPServer', () => {
  const adapter = new CoreAcUkMCPServer({});

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with api key', () => {
    const withKey = new CoreAcUkMCPServer({ apiKey: 'test-key-123' });
    expect(withKey).toBeDefined();
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
    expect(names).toContain('search_articles');
    expect(names).toContain('get_article');
    expect(names).toContain('get_article_history');
    expect(names).toContain('search_articles_batch');
    expect(names).toContain('find_similar_articles');
    expect(names).toContain('deduplicate_articles');
    expect(names).toContain('search_journals');
    expect(names).toContain('get_journal');
    expect(names).toContain('search_journals_batch');
    expect(names).toContain('search_repositories');
    expect(names).toContain('get_repository');
    expect(names).toContain('search_repositories_batch');
    expect(names).toContain('search_all');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog() returns correct metadata', () => {
    const cat = CoreAcUkMCPServer.catalog();
    expect(cat.name).toBe('core-ac-uk');
    expect(cat.category).toBe('science');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = CoreAcUkMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('search_articles requires query', async () => {
    const result = await adapter.callTool('search_articles', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('query');
  });

  it('get_article requires coreId', async () => {
    const result = await adapter.callTool('get_article', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('coreId');
  });

  it('get_journal requires issn', async () => {
    const result = await adapter.callTool('get_journal', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('issn');
  });

  it('search_articles_batch requires queries array', async () => {
    const result = await adapter.callTool('search_articles_batch', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('queries');
  });

  it('search_journals_batch requires issns array', async () => {
    const result = await adapter.callTool('search_journals_batch', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('issns');
  });

  it('search_repositories_batch requires repositoryIds array', async () => {
    const result = await adapter.callTool('search_repositories_batch', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('repositoryIds');
  });

  it('search_articles tool has pagination and filter params', () => {
    const tool = adapter.tools.find((t) => t.name === 'search_articles');
    expect(tool).toBeDefined();
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('query');
    expect(props).toHaveProperty('page');
    expect(props).toHaveProperty('pageSize');
    expect(props).toHaveProperty('metadata');
    expect(props).toHaveProperty('fulltext');
    expect(props).toHaveProperty('citations');
  });

  it('find_similar_articles tool has doi, title, description params', () => {
    const tool = adapter.tools.find((t) => t.name === 'find_similar_articles');
    expect(tool).toBeDefined();
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('doi');
    expect(props).toHaveProperty('title');
    expect(props).toHaveProperty('description');
    expect(props).toHaveProperty('limit');
  });
});
