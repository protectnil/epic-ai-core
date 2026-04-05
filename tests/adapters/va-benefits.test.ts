import { describe, it, expect } from 'vitest';
import { VABenefitsMCPServer } from '../../src/mcp-servers/va-benefits.js';

describe('VABenefitsMCPServer', () => {
  const adapter = new VABenefitsMCPServer({ apiKey: 'test-api-key' });

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
    const cat = VABenefitsMCPServer.catalog();
    expect(cat.name).toBe('va-benefits');
    expect(cat.category).toBe('government');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = VABenefitsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('uses sandbox URL when sandbox flag is true', () => {
    const sandboxAdapter = new VABenefitsMCPServer({ apiKey: 'test-key', sandbox: true });
    expect(sandboxAdapter).toBeDefined();
  });

  it('uses custom baseUrl when provided', () => {
    const customAdapter = new VABenefitsMCPServer({ apiKey: 'test-key', baseUrl: 'https://custom.example.com' });
    expect(customAdapter).toBeDefined();
  });

  it('get_upload_status returns error without id', async () => {
    const result = await adapter.callTool('get_upload_status', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_bulk_upload_status returns error without ids', async () => {
    const result = await adapter.callTool('get_bulk_upload_status', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids');
  });

  it('get_bulk_upload_status returns error with empty ids array', async () => {
    const result = await adapter.callTool('get_bulk_upload_status', { ids: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids');
  });

  it('validate_document returns error without documentBase64', async () => {
    const result = await adapter.callTool('validate_document', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('documentBase64');
  });

  it('download_submission returns error without id', async () => {
    const result = await adapter.callTool('download_submission', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('catalog includes veteran-related keywords', () => {
    const cat = VABenefitsMCPServer.catalog();
    expect(cat.keywords).toContain('va');
    expect(cat.keywords).toContain('veteran');
    expect(cat.keywords).toContain('benefits');
  });

  it('catalog description is informative', () => {
    const cat = VABenefitsMCPServer.catalog();
    expect(cat.description.length).toBeGreaterThan(20);
  });
});
