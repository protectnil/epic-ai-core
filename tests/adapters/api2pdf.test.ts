import { describe, it, expect } from 'vitest';
import { Api2PdfMCPServer } from '../../src/mcp-servers/api2pdf.js';

describe('Api2PdfMCPServer', () => {
  const adapter = new Api2PdfMCPServer({ apiKey: 'test-api-key' });

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
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns required fields', () => {
    const cat = Api2PdfMCPServer.catalog();
    expect(cat.name).toBe('api2pdf');
    expect(cat.category).toBe('productivity');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
    expect(cat.displayName).toBeTruthy();
    expect(cat.description).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = Api2PdfMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('chrome_html_to_pdf returns error without html', async () => {
    const result = await adapter.callTool('chrome_html_to_pdf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('html');
  });

  it('chrome_url_to_pdf_get returns error without url', async () => {
    const result = await adapter.callTool('chrome_url_to_pdf_get', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('chrome_url_to_pdf_post returns error without url', async () => {
    const result = await adapter.callTool('chrome_url_to_pdf_post', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('libreoffice_convert returns error without url', async () => {
    const result = await adapter.callTool('libreoffice_convert', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('merge_pdfs returns error without urls', async () => {
    const result = await adapter.callTool('merge_pdfs', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('urls');
  });

  it('merge_pdfs returns error with empty urls array', async () => {
    const result = await adapter.callTool('merge_pdfs', { urls: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('urls');
  });

  it('wkhtmltopdf_html_to_pdf returns error without html', async () => {
    const result = await adapter.callTool('wkhtmltopdf_html_to_pdf', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('html');
  });

  it('wkhtmltopdf_url_to_pdf_get returns error without url', async () => {
    const result = await adapter.callTool('wkhtmltopdf_url_to_pdf_get', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('wkhtmltopdf_url_to_pdf_post returns error without url', async () => {
    const result = await adapter.callTool('wkhtmltopdf_url_to_pdf_post', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('generate_barcode returns error without value', async () => {
    const result = await adapter.callTool('generate_barcode', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('value');
  });

  it('all 9 tools are present', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = [
      'chrome_html_to_pdf',
      'chrome_url_to_pdf_get',
      'chrome_url_to_pdf_post',
      'libreoffice_convert',
      'merge_pdfs',
      'wkhtmltopdf_html_to_pdf',
      'wkhtmltopdf_url_to_pdf_get',
      'wkhtmltopdf_url_to_pdf_post',
      'generate_barcode',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('chrome_html_to_pdf tool has required html in schema', () => {
    const tool = adapter.tools.find(t => t.name === 'chrome_html_to_pdf');
    expect(tool?.inputSchema.required).toContain('html');
  });

  it('merge_pdfs tool has required urls in schema', () => {
    const tool = adapter.tools.find(t => t.name === 'merge_pdfs');
    expect(tool?.inputSchema.required).toContain('urls');
  });

  it('chrome_url_to_pdf_get tool has required url in schema', () => {
    const tool = adapter.tools.find(t => t.name === 'chrome_url_to_pdf_get');
    expect(tool?.inputSchema.required).toContain('url');
  });

  it('generate_barcode tool has required value in schema', () => {
    const tool = adapter.tools.find(t => t.name === 'generate_barcode');
    expect(tool?.inputSchema.required).toContain('value');
  });
});
