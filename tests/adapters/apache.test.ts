import { describe, it, expect } from 'vitest';
import { ApacheMCPServer } from '../../src/mcp-servers/apache.js';

describe('ApacheMCPServer', () => {
  const adapter = new ApacheMCPServer();

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

  it('create_queue missing name returns error', async () => {
    const result = await adapter.callTool('create_queue', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name is required');
  });

  it('delete_queue missing queue_name returns error', async () => {
    const result = await adapter.callTool('delete_queue', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('queue_name is required');
  });

  it('get_queue_config missing queue_name returns error', async () => {
    const result = await adapter.callTool('get_queue_config', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('queue_name is required');
  });

  it('send_message missing required args returns error', async () => {
    const result = await adapter.callTool('send_message', { queue_name: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('content_type is required');
  });

  it('ack_message missing queue_message_id returns error', async () => {
    const result = await adapter.callTool('ack_message', { queue_name: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('queue_message_id is required');
  });

  it('get_message_data missing queue_message_id returns error', async () => {
    const result = await adapter.callTool('get_message_data', { queue_name: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('queue_message_id is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = ApacheMCPServer.catalog();
    expect(cat.name).toBe('apache');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('accepts apiToken in config', () => {
    const authed = new ApacheMCPServer({ apiToken: 'test-token', baseUrl: 'http://localhost:8080' });
    expect(authed).toBeDefined();
    expect(authed.tools.length).toBeGreaterThan(0);
  });
});
