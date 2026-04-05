import { describe, it, expect } from 'vitest';
import { VectaraMCPServer } from '../../src/mcp-servers/vectara.js';

describe('VectaraMCPServer', () => {
  const adapter = new VectaraMCPServer({ apiKey: 'test-key' });

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

  it('catalog returns required fields', () => {
    const cat = VectaraMCPServer.catalog();
    expect(cat.name).toBe('vectara');
    expect(cat.category).toBe('ai');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = VectaraMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('delete_corpus requires corpus_id and customer_id', async () => {
    const result = await adapter.callTool('delete_corpus', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('corpus_id');
  });

  it('delete_corpus requires customer_id when corpus_id is provided', async () => {
    const result = await adapter.callTool('delete_corpus', { corpus_id: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('customer_id');
  });

  it('reset_corpus requires corpus_id and customer_id', async () => {
    const result = await adapter.callTool('reset_corpus', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('corpus_id');
  });

  it('index_document requires corpus_id, customer_id, and document_id', async () => {
    const result = await adapter.callTool('index_document', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('corpus_id');
  });

  it('index_document requires document_id', async () => {
    const result = await adapter.callTool('index_document', { corpus_id: '1', customer_id: '100' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('document_id');
  });

  it('delete_document requires all three IDs', async () => {
    const result = await adapter.callTool('delete_document', { corpus_id: '1', customer_id: '100' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('document_id');
  });

  it('upload_file requires corpus_id, customer_id, file_url, and filename', async () => {
    const result = await adapter.callTool('upload_file', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('corpus_id');
  });

  it('upload_file requires file_url', async () => {
    const result = await adapter.callTool('upload_file', { corpus_id: 1, customer_id: 100, filename: 'test.pdf' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('file_url');
  });

  it('query requires query and corpus_key', async () => {
    const result = await adapter.callTool('query', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('query requires corpus_key', async () => {
    const result = await adapter.callTool('query', { query: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('corpus_key');
  });

  it('stream_query requires query and corpus_key', async () => {
    const result = await adapter.callTool('stream_query', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('create_corpus does not require any fields', () => {
    const tool = adapter.tools.find(t => t.name === 'create_corpus');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('list_corpora does not require any fields', () => {
    const tool = adapter.tools.find(t => t.name === 'list_corpora');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('query tool has corpus_key as array type', () => {
    const tool = adapter.tools.find(t => t.name === 'query');
    expect(tool).toBeDefined();
    const props = tool!.inputSchema.properties as Record<string, { type: string }>;
    expect(props.corpus_key.type).toBe('array');
  });
});
