import { describe, it, expect } from 'vitest';
import { OpenAPIGeneratorTechMCPServer } from '../../src/mcp-servers/openapi-generator-tech.js';

describe('OpenAPIGeneratorTechMCPServer', () => {
  const adapter = new OpenAPIGeneratorTechMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new OpenAPIGeneratorTechMCPServer({ baseUrl: 'https://example.com' });
    expect(custom).toBeDefined();
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
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns expected shape', () => {
    const catalog = OpenAPIGeneratorTechMCPServer.catalog();
    expect(catalog.name).toBe('openapi-generator-tech');
    expect(catalog.category).toBe('devops');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tools include all expected endpoints', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('list_client_languages');
    expect(toolNames).toContain('get_client_options');
    expect(toolNames).toContain('generate_client');
    expect(toolNames).toContain('list_server_frameworks');
    expect(toolNames).toContain('get_server_options');
    expect(toolNames).toContain('generate_server');
    expect(toolNames).toContain('download_generated_file');
  });

  it('generate_client returns error when language missing', async () => {
    const result = await adapter.callTool('generate_client', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('language is required');
  });

  it('generate_client returns error when neither openapi_url nor spec provided', async () => {
    const result = await adapter.callTool('generate_client', { language: 'python' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('openapi_url or spec is required');
  });

  it('generate_server returns error when framework missing', async () => {
    const result = await adapter.callTool('generate_server', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('framework is required');
  });

  it('generate_server returns error when neither openapi_url nor spec provided', async () => {
    const result = await adapter.callTool('generate_server', { framework: 'spring' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('openapi_url or spec is required');
  });

  it('download_generated_file returns error when file_id missing', async () => {
    const result = await adapter.callTool('download_generated_file', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('file_id is required');
  });
});
