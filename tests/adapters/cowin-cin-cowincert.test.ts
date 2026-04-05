import { describe, it, expect } from 'vitest';
import { CoWinCinCowincertMCPServer } from '../../src/mcp-servers/cowin-cin-cowincert.js';

describe('CoWinCinCowincertMCPServer', () => {
  const adapter = new CoWinCinCowincertMCPServer({ accessToken: 'test-token' });

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
    const cat = CoWinCinCowincertMCPServer.catalog();
    expect(cat.name).toBe('cowin-cin-cowincert');
    expect(cat.category).toBe('healthcare');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = CoWinCinCowincertMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_certificate_pdf tool exists in tools list', () => {
    const tool = adapter.tools.find(t => t.name === 'get_certificate_pdf');
    expect(tool).toBeDefined();
    expect(tool!.description).toBeTruthy();
    expect(tool!.inputSchema.properties).toBeDefined();
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props['beneficiaryId']).toBeDefined();
    expect(props['mobile']).toBeDefined();
  });

  it('get_certificate_pdf input schema has correct structure', () => {
    const tool = adapter.tools.find(t => t.name === 'get_certificate_pdf');
    expect(tool!.inputSchema.type).toBe('object');
  });
});
