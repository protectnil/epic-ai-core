import { describe, it, expect } from 'vitest';
import { PineconeMCPServer } from '../../src/mcp-servers/pinecone.js';

describe('PineconeMCPServer', () => {
  const adapter = new PineconeMCPServer({ apiKey: 'test-api-key' });
  const adapterWithHost = new PineconeMCPServer({
    apiKey: 'test-api-key',
    environment: 'us-east1-gcp',
    indexHost: 'https://my-index-abc123.svc.us-east1-gcp.pinecone.io',
  });

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
    const cat = PineconeMCPServer.catalog();
    expect(cat.name).toBe('pinecone');
    expect(cat.category).toBe('ai');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = PineconeMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // ── Index validation ───────────────────────────────────────────────────────

  it('create_index returns error without name', async () => {
    const result = await adapter.callTool('create_index', { dimension: 1536 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('create_index returns error without dimension', async () => {
    const result = await adapter.callTool('create_index', { name: 'my-index' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('dimension');
  });

  it('describe_index returns error without indexName', async () => {
    const result = await adapter.callTool('describe_index', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexName');
  });

  it('configure_index returns error without indexName', async () => {
    const result = await adapter.callTool('configure_index', { replicas: 2 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexName');
  });

  it('delete_index returns error without indexName', async () => {
    const result = await adapter.callTool('delete_index', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexName');
  });

  // ── Collection validation ──────────────────────────────────────────────────

  it('create_collection returns error without name', async () => {
    const result = await adapter.callTool('create_collection', { source: 'my-index' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('create_collection returns error without source', async () => {
    const result = await adapter.callTool('create_collection', { name: 'my-snapshot' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('source');
  });

  it('describe_collection returns error without collectionName', async () => {
    const result = await adapter.callTool('describe_collection', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('collectionName');
  });

  it('delete_collection returns error without collectionName', async () => {
    const result = await adapter.callTool('delete_collection', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('collectionName');
  });

  // ── Data-plane without indexHost ───────────────────────────────────────────

  it('describe_index_stats returns error without indexHost', async () => {
    const result = await adapter.callTool('describe_index_stats', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexHost');
  });

  it('upsert_vectors returns error without vectors', async () => {
    const result = await adapterWithHost.callTool('upsert_vectors', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('vectors');
  });

  it('upsert_vectors returns error without indexHost', async () => {
    const result = await adapter.callTool('upsert_vectors', { vectors: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexHost');
  });

  it('query_vectors returns error without topK', async () => {
    const result = await adapterWithHost.callTool('query_vectors', { vector: [0.1, 0.2] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('topK');
  });

  it('query_vectors returns error without indexHost', async () => {
    const result = await adapter.callTool('query_vectors', { topK: 5 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexHost');
  });

  it('fetch_vectors returns error without ids', async () => {
    const result = await adapterWithHost.callTool('fetch_vectors', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids');
  });

  it('fetch_vectors returns error without indexHost', async () => {
    const result = await adapter.callTool('fetch_vectors', { ids: ['vec1'] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexHost');
  });

  it('update_vector returns error without id', async () => {
    const result = await adapterWithHost.callTool('update_vector', { values: [0.1, 0.2] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('update_vector returns error without indexHost', async () => {
    const result = await adapter.callTool('update_vector', { id: 'vec1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexHost');
  });

  it('delete_vectors returns error without indexHost', async () => {
    const result = await adapter.callTool('delete_vectors', { ids: ['vec1'] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('indexHost');
  });

  it('delete_vectors with deleteAll flag does not fail on missing-ids validation', () => {
    // delete_vectors has no required fields — deleteAll + namespace is structurally valid.
    // Verify schema has no required array (all fields optional).
    const tool = adapter.tools.find(t => t.name === 'delete_vectors');
    expect(tool).toBeDefined();
    expect((tool!.inputSchema as Record<string, unknown>).required).toBeUndefined();
  });

  it('custom environment is accepted in constructor', () => {
    const custom = new PineconeMCPServer({ apiKey: 'k', environment: 'us-west1-gcp' });
    expect(custom).toBeDefined();
  });
});
