import { describe, it, expect } from 'vitest';
import { OpenStatesMCPServer } from '../../src/mcp-servers/openstates.js';

describe('OpenStatesMCPServer', () => {
  const adapter = new OpenStatesMCPServer({ apiKey: 'test-api-key' });

  it('instantiates', () => {
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
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const catalog = OpenStatesMCPServer.catalog();
    expect(catalog.name).toBe('openstates');
    expect(catalog.category).toBe('government');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names are unique', () => {
    const names = adapter.tools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('get_bill_by_id requires openstates_bill_id', async () => {
    const result = await adapter.callTool('get_bill_by_id', {});
    expect(result.isError).toBe(true);
  });

  it('get_bill requires jurisdiction', async () => {
    const result = await adapter.callTool('get_bill', {});
    expect(result.isError).toBe(true);
  });

  it('get_bill requires session', async () => {
    const result = await adapter.callTool('get_bill', { jurisdiction: 'California' });
    expect(result.isError).toBe(true);
  });

  it('get_bill requires bill_id', async () => {
    const result = await adapter.callTool('get_bill', { jurisdiction: 'California', session: '2021' });
    expect(result.isError).toBe(true);
  });

  it('get_people_by_location requires lat', async () => {
    const result = await adapter.callTool('get_people_by_location', { lng: -122.4 });
    expect(result.isError).toBe(true);
  });

  it('get_people_by_location requires lng', async () => {
    const result = await adapter.callTool('get_people_by_location', { lat: 37.7 });
    expect(result.isError).toBe(true);
  });

  it('get_jurisdiction requires jurisdiction_id', async () => {
    const result = await adapter.callTool('get_jurisdiction', {});
    expect(result.isError).toBe(true);
  });

  it('get_committee requires committee_id', async () => {
    const result = await adapter.callTool('get_committee', {});
    expect(result.isError).toBe(true);
  });

  it('get_event requires event_id', async () => {
    const result = await adapter.callTool('get_event', {});
    expect(result.isError).toBe(true);
  });
});
