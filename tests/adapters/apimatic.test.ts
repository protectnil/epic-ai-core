import { describe, it, expect } from 'vitest';
import { APIMAtICMCPServer } from '../../src/mcp-servers/apimatic.js';

describe('APIMAtICMCPServer', () => {
  const adapter = new APIMAtICMCPServer({ apiKey: 'test-api-key' });
  const adapterBasic = new APIMAtICMCPServer({ email: 'user@example.com', password: 'pass' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with basic auth config', () => {
    expect(adapterBasic).toBeDefined();
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

  it('unknown tool returns isError true, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns required fields', () => {
    const cat = APIMAtICMCPServer.catalog();
    expect(cat.name).toBe('apimatic');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = APIMAtICMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('transform_api returns error without format', async () => {
    const result = await adapter.callTool('transform_api', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('format');
  });

  it('transform_api returns error without url or file_content', async () => {
    const result = await adapter.callTool('transform_api', { format: 'OpenApi3Json' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('transform_api tool has format in required', () => {
    const tool = adapter.tools.find(t => t.name === 'transform_api');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('format');
  });
});
