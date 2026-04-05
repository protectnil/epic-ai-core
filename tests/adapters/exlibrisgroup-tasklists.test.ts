import { describe, it, expect } from 'vitest';
import { ExLibrisTaskListsMCPServer } from '../../src/mcp-servers/exlibrisgroup-tasklists.js';

describe('ExLibrisTaskListsMCPServer', () => {
  const adapter = new ExLibrisTaskListsMCPServer({ apiKey: 'test-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with explicit region', () => {
    const eu = new ExLibrisTaskListsMCPServer({ apiKey: 'test-key', region: 'eu' });
    expect(eu).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new ExLibrisTaskListsMCPServer({
      apiKey: 'test-key',
      baseUrl: 'https://custom.example.com',
    });
    expect(custom).toBeDefined();
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

  it('exposes all 10 expected tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_printouts');
    expect(names).toContain('act_on_printouts');
    expect(names).toContain('get_printout');
    expect(names).toContain('act_on_printout');
    expect(names).toContain('get_requested_resources');
    expect(names).toContain('act_on_requested_resources');
    expect(names).toContain('get_lending_requests');
    expect(names).toContain('act_on_lending_requests');
    expect(names).toContain('test_get');
    expect(names).toContain('test_post');
  });

  it('get_printout requires printout_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_printout');
    expect(tool?.inputSchema.required).toContain('printout_id');
  });

  it('act_on_printouts requires op', () => {
    const tool = adapter.tools.find(t => t.name === 'act_on_printouts');
    expect(tool?.inputSchema.required).toContain('op');
  });

  it('get_requested_resources requires library and circ_desk', () => {
    const tool = adapter.tools.find(t => t.name === 'get_requested_resources');
    expect(tool?.inputSchema.required).toContain('library');
    expect(tool?.inputSchema.required).toContain('circ_desk');
  });

  it('catalog returns correct metadata', () => {
    const cat = ExLibrisTaskListsMCPServer.catalog();
    expect(cat.name).toBe('exlibrisgroup-tasklists');
    expect(cat.category).toBe('education');
    expect(cat.toolNames.length).toBe(10);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
