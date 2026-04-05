import { describe, it, expect } from 'vitest';
import { ConsumerFinanceMCPServer } from '../../src/mcp-servers/consumerfinance.js';

describe('ConsumerFinanceMCPServer', () => {
  const adapter = new ConsumerFinanceMCPServer();

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

  it('get_dataset missing arg returns error', async () => {
    const result = await adapter.callTool('get_dataset', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('dataset is required');
  });

  it('get_hmda_concept missing arg returns error', async () => {
    const result = await adapter.callTool('get_hmda_concept', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('concept is required');
  });

  it('query_hmda_slice missing arg returns error', async () => {
    const result = await adapter.callTool('query_hmda_slice', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('slice is required');
  });

  it('get_hmda_slice_metadata missing arg returns error', async () => {
    const result = await adapter.callTool('get_hmda_slice_metadata', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('slice is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = ConsumerFinanceMCPServer.catalog();
    expect(cat.name).toBe('consumerfinance');
    expect(cat.category).toBe('government');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('accepts custom baseUrl in config', () => {
    const custom = new ConsumerFinanceMCPServer({ baseUrl: 'http://localhost:9999' });
    expect(custom).toBeDefined();
    expect(custom.tools.length).toBeGreaterThan(0);
  });
});
