import { describe, it, expect } from 'vitest';
import { DataflowkitMCPServer } from '../../src/mcp-servers/dataflowkit.js';

describe('DataflowkitMCPServer', () => {
  const adapter = new DataflowkitMCPServer({ apiKey: 'test-api-key' });

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

  it('exposes all expected tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('fetch_page');
    expect(names).toContain('parse_page');
    expect(names).toContain('scrape_serp');
    expect(names).toContain('convert_url_to_pdf');
    expect(names).toContain('capture_screenshot');
  });

  it('fetch_page tool requires url', () => {
    const tool = adapter.tools.find(t => t.name === 'fetch_page');
    expect(tool?.inputSchema.required).toContain('url');
  });

  it('parse_page tool requires url, name, format, fields', () => {
    const tool = adapter.tools.find(t => t.name === 'parse_page');
    expect(tool?.inputSchema.required).toContain('url');
    expect(tool?.inputSchema.required).toContain('name');
    expect(tool?.inputSchema.required).toContain('format');
    expect(tool?.inputSchema.required).toContain('fields');
  });

  it('scrape_serp tool requires url, name, format, proxy', () => {
    const tool = adapter.tools.find(t => t.name === 'scrape_serp');
    expect(tool?.inputSchema.required).toContain('url');
    expect(tool?.inputSchema.required).toContain('name');
    expect(tool?.inputSchema.required).toContain('format');
    expect(tool?.inputSchema.required).toContain('proxy');
  });

  it('convert_url_to_pdf tool requires url', () => {
    const tool = adapter.tools.find(t => t.name === 'convert_url_to_pdf');
    expect(tool?.inputSchema.required).toContain('url');
  });

  it('capture_screenshot tool requires url', () => {
    const tool = adapter.tools.find(t => t.name === 'capture_screenshot');
    expect(tool?.inputSchema.required).toContain('url');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('fetch_page returns error when url is missing', async () => {
    const result = await adapter.callTool('fetch_page', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url is required');
  });

  it('parse_page returns error when name is missing', async () => {
    const result = await adapter.callTool('parse_page', { url: 'https://example.com', format: 'json', fields: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name is required');
  });

  it('scrape_serp returns error when proxy is missing', async () => {
    const result = await adapter.callTool('scrape_serp', { url: 'https://google.com/search?q=test', name: 'test', format: 'json' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('proxy is required');
  });

  it('catalog() returns correct metadata', () => {
    const catalog = DataflowkitMCPServer.catalog();
    expect(catalog.name).toBe('dataflowkit');
    expect(catalog.category).toBe('data');
    expect(catalog.toolNames).toContain('fetch_page');
    expect(catalog.toolNames).toContain('scrape_serp');
    expect(catalog.description).toBeTruthy();
  });
});
