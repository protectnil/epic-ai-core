import { describe, it, expect } from 'vitest';
import { PresalyticsOoxmlMCPServer } from '../../src/mcp-servers/presalytics-ooxml.js';

describe('PresalyticsOoxmlMCPServer', () => {
  const adapter = new PresalyticsOoxmlMCPServer({ accessToken: 'test-token' });

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

  it('catalog returns expected metadata', () => {
    const catalog = PresalyticsOoxmlMCPServer.catalog();
    expect(catalog.name).toBe('presalytics-ooxml');
    expect(catalog.category).toBe('productivity');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool list matches catalog toolNames', () => {
    const catalog = PresalyticsOoxmlMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('document tools require document_id', () => {
    const docTools = ['get_document', 'delete_document', 'download_document',
      'clone_document', 'get_document_children'];
    for (const toolName of docTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('document_id');
    }
  });

  it('upload_document requires file_content and filename', () => {
    const tool = adapter.tools.find((t) => t.name === 'upload_document');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('file_content');
    expect(tool!.inputSchema.required).toContain('filename');
  });

  it('chart tools require chart_id', () => {
    const chartTools = ['get_chart', 'get_chart_details', 'get_chart_children',
      'get_chart_data', 'get_chart_xml', 'get_chart_svg'];
    for (const toolName of chartTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('chart_id');
    }
  });

  it('update_chart_data requires chart_id and data', () => {
    const tool = adapter.tools.find((t) => t.name === 'update_chart_data');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('chart_id');
    expect(tool!.inputSchema.required).toContain('data');
  });

  it('update_chart_xml requires chart_id and xml_content', () => {
    const tool = adapter.tools.find((t) => t.name === 'update_chart_xml');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('chart_id');
    expect(tool!.inputSchema.required).toContain('xml_content');
  });

  it('slide tools require slide_id', () => {
    const slideTools = ['get_slide', 'get_slide_details', 'get_slide_children',
      'get_slide_xml', 'get_slide_svg'];
    for (const toolName of slideTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('slide_id');
    }
  });

  it('table tools require table_id', () => {
    const tableTools = ['get_table', 'get_table_details', 'get_table_children',
      'get_table_data', 'get_table_xml', 'get_table_svg'];
    for (const toolName of tableTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('table_id');
    }
  });

  it('shape tools require shape_id', () => {
    const shapeTools = ['get_shape', 'get_shape_details', 'get_shape_children',
      'get_shape_xml', 'get_shape_svg'];
    for (const toolName of shapeTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('shape_id');
    }
  });

  it('image tools require image_id', () => {
    const imageTools = ['get_image', 'get_image_details', 'download_image',
      'get_image_xml', 'get_image_svg', 'get_image_children'];
    for (const toolName of imageTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('image_id');
    }
  });

  it('theme tools require theme_id', () => {
    const themeTools = ['get_theme', 'get_theme_details', 'get_theme_children',
      'get_theme_xml', 'get_theme_svg'];
    for (const toolName of themeTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('theme_id');
    }
  });

  it('list_document_types has no required fields', () => {
    const tool = adapter.tools.find((t) => t.name === 'list_document_types');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required ?? []).toHaveLength(0);
  });
});
