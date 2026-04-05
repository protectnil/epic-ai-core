import { describe, it, expect } from 'vitest';
import { GetgoGototrainingMCPServer } from '../../src/mcp-servers/getgo-gototraining.js';

describe('GetgoGototrainingMCPServer', () => {
  const adapter = new GetgoGototrainingMCPServer({ accessToken: 'test-token', organizerKey: '12345' });

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

  it('get_all_organizers validates required accountKey', async () => {
    const result = await adapter.callTool('get_all_organizers', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('accountKey');
  });

  it('get_training validates required trainingKey', async () => {
    const result = await adapter.callTool('get_training', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('trainingKey');
  });

  it('schedule_training validates required name and times', async () => {
    const result = await adapter.callTool('schedule_training', { name: 'My Training' });
    expect(result.isError).toBe(true);
  });

  it('register_for_training validates all required fields', async () => {
    const result = await adapter.callTool('register_for_training', { trainingKey: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('get_sessions_for_date_range validates required dates', async () => {
    const result = await adapter.callTool('get_sessions_for_date_range', { startDate: '2024-01-01' });
    expect(result.isError).toBe(true);
  });

  it('get_recording_download validates required params', async () => {
    const result = await adapter.callTool('get_recording_download', { trainingKey: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('cancel_registration validates required registrantKey', async () => {
    const result = await adapter.callTool('cancel_registration', { trainingKey: 'abc' });
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const cat = GetgoGototrainingMCPServer.catalog();
    expect(cat.name).toBe('getgo-gototraining');
    expect(cat.category).toBe('education');
    expect(cat.toolNames.length).toBe(adapter.tools.length);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog tool names match tools getter', () => {
    const cat = GetgoGototrainingMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
