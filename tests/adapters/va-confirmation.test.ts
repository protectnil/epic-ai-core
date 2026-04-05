import { describe, it, expect } from 'vitest';
import { VAConfirmationMCPServer } from '../../src/mcp-servers/va-confirmation.js';

describe('VAConfirmationMCPServer', () => {
  const adapter = new VAConfirmationMCPServer({ apiKey: 'test-key' });

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

  it('exposes get_veteran_status tool', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_veteran_status');
  });

  it('get_veteran_status has correct required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'get_veteran_status');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('ssn');
    expect(tool!.inputSchema.required).toContain('first_name');
    expect(tool!.inputSchema.required).toContain('last_name');
    expect(tool!.inputSchema.required).toContain('birth_date');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_veteran_status returns error on missing ssn', async () => {
    const result = await adapter.callTool('get_veteran_status', {
      first_name: 'John',
      last_name: 'Doe',
      birth_date: '1970-01-15',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/ssn/i);
  });

  it('get_veteran_status returns error on missing first_name', async () => {
    const result = await adapter.callTool('get_veteran_status', {
      ssn: '123-45-6789',
      last_name: 'Doe',
      birth_date: '1970-01-15',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/first_name/i);
  });

  it('get_veteran_status returns error on missing last_name', async () => {
    const result = await adapter.callTool('get_veteran_status', {
      ssn: '123-45-6789',
      first_name: 'John',
      birth_date: '1970-01-15',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/last_name/i);
  });

  it('get_veteran_status returns error on missing birth_date', async () => {
    const result = await adapter.callTool('get_veteran_status', {
      ssn: '123-45-6789',
      first_name: 'John',
      last_name: 'Doe',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/birth_date/i);
  });

  it('catalog returns correct metadata', () => {
    const cat = VAConfirmationMCPServer.catalog();
    expect(cat.name).toBe('va-confirmation');
    expect(cat.category).toBe('government');
    expect(cat.toolNames).toContain('get_veteran_status');
    expect(cat.author).toBe('protectnil');
  });
});
