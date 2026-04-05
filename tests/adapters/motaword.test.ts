import { describe, it, expect } from 'vitest';
import { MotaWordMCPServer } from '../../src/mcp-servers/motaword.js';

describe('MotaWordMCPServer', () => {
  const adapter = new MotaWordMCPServer({ clientId: 'test-id', clientSecret: 'test-secret' });

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

  it('exposes all 20 tools', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('get_languages');
    expect(names).toContain('get_formats');
    expect(names).toContain('list_projects');
    expect(names).toContain('get_project');
    expect(names).toContain('create_project');
    expect(names).toContain('update_project');
    expect(names).toContain('delete_project');
    expect(names).toContain('launch_project');
    expect(names).toContain('cancel_project');
    expect(names).toContain('get_project_progress');
    expect(names).toContain('download_project');
    expect(names).toContain('list_project_documents');
    expect(names).toContain('create_project_document');
    expect(names).toContain('delete_project_document');
    expect(names).toContain('get_glossaries');
    expect(names).toContain('create_glossary');
    expect(names).toContain('delete_glossary');
    expect(names).toContain('get_style_guides');
    expect(names).toContain('create_style_guide');
    expect(names).toContain('delete_style_guide');
    expect(adapter.tools.length).toBe(20);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_project with no args returns error', async () => {
    const result = await adapter.callTool('get_project', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_project with missing args returns error', async () => {
    const result = await adapter.callTool('create_project', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('source_language');
  });

  it('delete_project with no args returns error', async () => {
    const result = await adapter.callTool('delete_project', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('launch_project with no args returns error', async () => {
    const result = await adapter.callTool('launch_project', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_project_documents with no args returns error', async () => {
    const result = await adapter.callTool('list_project_documents', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('projectId');
  });

  it('create_project_document with missing args returns error', async () => {
    const result = await adapter.callTool('create_project_document', { projectId: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('create_glossary with missing args returns error', async () => {
    const result = await adapter.callTool('create_glossary', { projectId: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('delete_glossary with missing args returns error', async () => {
    const result = await adapter.callTool('delete_glossary', { projectId: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('glossaryId');
  });

  it('delete_style_guide with missing args returns error', async () => {
    const result = await adapter.callTool('delete_style_guide', { projectId: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('styleGuideId');
  });

  it('catalog() returns correct metadata', () => {
    const cat = MotaWordMCPServer.catalog();
    expect(cat.name).toBe('motaword');
    expect(cat.category).toBe('productivity');
    expect(cat.toolNames.length).toBe(20);
    expect(cat.keywords).toContain('translation');
  });

  it('accepts baseUrl override', () => {
    const custom = new MotaWordMCPServer({
      clientId: 'id',
      clientSecret: 'secret',
      baseUrl: 'https://sandbox.motaword.com',
    });
    expect(custom).toBeDefined();
  });
});
