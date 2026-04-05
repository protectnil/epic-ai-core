import { describe, it, expect } from 'vitest';
import { CodatAssessMCPServer } from '../../src/mcp-servers/codat-assess.js';

describe('CodatAssessMCPServer', () => {
  const adapter = new CodatAssessMCPServer({ apiKey: 'test-api-key' });

  it('instantiates', () => {
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
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns expected metadata', () => {
    const catalog = CodatAssessMCPServer.catalog();
    expect(catalog.name).toBe('codat-assess');
    expect(catalog.category).toBe('finance');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('has all 27 expected tools', () => {
    expect(adapter.tools.length).toBe(27);
  });

  it('has enhanced report tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_enhanced_balance_sheet_accounts');
    expect(names).toContain('get_enhanced_cash_flow_transactions');
    expect(names).toContain('get_enhanced_invoices_report');
    expect(names).toContain('get_enhanced_profit_and_loss_accounts');
  });

  it('has data integrity tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_data_integrity_details');
    expect(names).toContain('get_data_integrity_status');
    expect(names).toContain('get_data_integrity_summaries');
  });

  it('has excel report tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_excel_report_status');
    expect(names).toContain('generate_excel_report');
    expect(names).toContain('get_excel_report_download');
    expect(names).toContain('download_excel_report');
  });

  it('has commerce metrics tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_commerce_customer_retention_metrics');
    expect(names).toContain('get_commerce_lifetime_value_metrics');
    expect(names).toContain('get_commerce_orders_metrics');
    expect(names).toContain('get_commerce_refunds_metrics');
    expect(names).toContain('get_commerce_revenue_metrics');
  });

  it('has subscription MRR tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_recurring_revenue_metrics');
    expect(names).toContain('request_recurring_revenue_metrics');
  });

  it('list_available_account_categories has no required params', () => {
    const tool = adapter.tools.find(t => t.name === 'list_available_account_categories')!;
    expect(tool.inputSchema.required ?? []).toHaveLength(0);
  });

  it('commerce metrics tools require reportDate, periodLength, numberOfPeriods, periodUnit', () => {
    const commerceTools = [
      'get_commerce_customer_retention_metrics',
      'get_commerce_lifetime_value_metrics',
      'get_commerce_orders_metrics',
      'get_commerce_refunds_metrics',
      'get_commerce_revenue_metrics',
    ];
    for (const toolName of commerceTools) {
      const tool = adapter.tools.find(t => t.name === toolName)!;
      expect(tool.inputSchema.required).toContain('reportDate');
      expect(tool.inputSchema.required).toContain('periodLength');
      expect(tool.inputSchema.required).toContain('numberOfPeriods');
      expect(tool.inputSchema.required).toContain('periodUnit');
    }
  });

  it('every tool description is 5-100 words', () => {
    for (const tool of adapter.tools) {
      const wordCount = tool.description.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(5);
      expect(wordCount).toBeLessThanOrEqual(100);
    }
  });
});
