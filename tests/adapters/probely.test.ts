import { describe, it, expect } from 'vitest';
import { ProbelyMCPServer } from '../../src/mcp-servers/probely.js';

describe('ProbelyMCPServer', () => {
  const adapter = new ProbelyMCPServer({ authToken: 'test-jwt-token' });

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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_targets');
    expect(names).toContain('start_scan');
    expect(names).toContain('list_findings');
    expect(names).toContain('get_finding');
    expect(names).toContain('update_finding');
    expect(names).toContain('get_account');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_target requires target_id', async () => {
    const result = await adapter.callTool('get_target', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/target_id/i);
  });

  it('start_scan requires target_id', async () => {
    const result = await adapter.callTool('start_scan', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/target_id/i);
  });

  it('get_scan requires target_id and scan_id', async () => {
    const result = await adapter.callTool('get_scan', { target_id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/scan_id/i);
  });

  it('get_finding requires target_id and finding_id', async () => {
    const result = await adapter.callTool('get_finding', { target_id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/finding_id/i);
  });

  it('create_target requires name and url', async () => {
    const result = await adapter.callTool('create_target', { name: 'Test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/url/i);
  });

  it('create_label requires name', async () => {
    const result = await adapter.callTool('create_label', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/name/i);
  });

  it('catalog returns correct metadata', () => {
    const cat = ProbelyMCPServer.catalog();
    expect(cat.name).toBe('probely');
    expect(cat.category).toBe('cybersecurity');
    expect(cat.toolNames.length).toBe(20);
    expect(cat.author).toBe('protectnil');
  });
});
