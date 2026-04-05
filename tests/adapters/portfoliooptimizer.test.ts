import { describe, it, expect } from 'vitest';
import { PortfolioOptimizerMCPServer } from '../../src/mcp-servers/portfoliooptimizer.js';

describe('PortfolioOptimizerMCPServer', () => {
  const adapter = new PortfolioOptimizerMCPServer({ apiKey: 'test-api-key' });
  const adapterNoKey = new PortfolioOptimizerMCPServer({});

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates without an API key (free tier)', () => {
    expect(adapterNoKey).toBeDefined();
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
    const cat = PortfolioOptimizerMCPServer.catalog();
    expect(cat.name).toBe('portfoliooptimizer');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = PortfolioOptimizerMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('has comprehensive coverage of optimization strategies', () => {
    const toolNames = adapter.tools.map(t => t.name);
    const expected = [
      'portfolio_optimization_minimum_variance',
      'portfolio_optimization_maximum_sharpe_ratio',
      'portfolio_optimization_hierarchical_risk_parity',
      'portfolio_optimization_equal_risk_contributions',
      'portfolio_optimization_most_diversified',
    ];
    for (const name of expected) {
      expect(toolNames).toContain(name);
    }
  });

  it('all POST tools require body', () => {
    for (const tool of adapter.tools) {
      expect(tool.inputSchema.required).toContain('body');
    }
  });

  it('portfolio_optimization_minimum_variance returns error without body', async () => {
    const result = await adapter.callTool('portfolio_optimization_minimum_variance', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('body');
  });

  it('assets_correlation_matrix returns error without body', async () => {
    const result = await adapter.callTool('assets_correlation_matrix', {});
    expect(result.isError).toBe(true);
  });

  it('exposes all 83 API endpoints', () => {
    expect(adapter.tools.length).toBe(83);
  });
});
