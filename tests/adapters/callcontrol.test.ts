import { describe, it, expect } from 'vitest';
import { CallControlMCPServer } from '../../src/mcp-servers/callcontrol.js';

describe('CallControlMCPServer', () => {
  const adapter = new CallControlMCPServer({ apiKey: 'test-api-key' });

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
    const cat = CallControlMCPServer.catalog();
    expect(cat.name).toBe('callcontrol');
    expect(cat.category).toBe('communication');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = CallControlMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_complaints returns error without phoneNumber', async () => {
    const result = await adapter.callTool('get_complaints', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('phoneNumber');
  });

  it('get_reputation returns error without phoneNumber', async () => {
    const result = await adapter.callTool('get_reputation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('phoneNumber');
  });

  it('report_call returns error without PhoneNumber', async () => {
    const result = await adapter.callTool('report_call', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('PhoneNumber');
  });

  it('get_user returns error without phoneNumber', async () => {
    const result = await adapter.callTool('get_user', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('phoneNumber');
  });

  it('should_block returns error without phoneNumber', async () => {
    const result = await adapter.callTool('should_block', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('phoneNumber');
  });

  it('should_block returns error without userPhoneNumber', async () => {
    const result = await adapter.callTool('should_block', { phoneNumber: '12066194123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('userPhoneNumber');
  });

  it('upsert_user returns error without PhoneNumber', async () => {
    const result = await adapter.callTool('upsert_user', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('PhoneNumber');
  });

  it('accepts custom baseUrl', () => {
    const custom = new CallControlMCPServer({ apiKey: 'key', baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });
});
