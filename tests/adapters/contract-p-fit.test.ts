import { describe, it, expect } from 'vitest';
import { ContractPFitMCPServer } from '../../src/mcp-servers/contract-p-fit.js';

describe('ContractPFitMCPServer', () => {
  const adapter = new ContractPFitMCPServer({ apiToken: 'test-token' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with basic auth credentials', () => {
    const basicAdapter = new ContractPFitMCPServer({
      username: 'test-user',
      password: 'test-pass',
    });
    expect(basicAdapter).toBeDefined();
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

  it('static catalog returns correct metadata', () => {
    const catalog = ContractPFitMCPServer.catalog();
    expect(catalog.name).toBe('contract-p-fit');
    expect(catalog.category).toBe('legal');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const catalog = ContractPFitMCPServer.catalog();
    const toolGetterNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolGetterNames).toContain(name);
    }
  });
});
