import { describe, it, expect } from 'vitest';
import { EtsiMec0102AppPkgMgmtMCPServer } from '../../src/mcp-servers/etsi-mec010-2-apppkgmgmt.js';

describe('EtsiMec0102AppPkgMgmtMCPServer', () => {
  const adapter = new EtsiMec0102AppPkgMgmtMCPServer({ baseUrl: 'https://localhost/app_pkgm/v1' });

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

  it('catalog returns expected metadata', () => {
    const cat = EtsiMec0102AppPkgMgmtMCPServer.catalog();
    expect(cat.name).toBe('etsi-mec010-2-apppkgmgmt');
    expect(cat.category).toBe('telecom');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
