import { describe, it, expect } from 'vitest';
import { InfermedicaMCPServer } from '../../src/mcp-servers/infermedica.js';

describe('InfermedicaMCPServer', () => {
  const adapter = new InfermedicaMCPServer({ appId: 'test-app-id', appKey: 'test-app-key' });

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

  it('catalog returns correct metadata', () => {
    const cat = InfermedicaMCPServer.catalog();
    expect(cat.name).toBe('infermedica');
    expect(cat.category).toBe('healthcare');
    expect(cat.toolNames.length).toBe(adapter.tools.length);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tool definitions', () => {
    const cat = InfermedicaMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_symptom without id returns error', async () => {
    const result = await adapter.callTool('get_symptom', {});
    expect(result.isError).toBe(true);
  });

  it('get_condition without id returns error', async () => {
    const result = await adapter.callTool('get_condition', {});
    expect(result.isError).toBe(true);
  });

  it('lookup_observation without phrase returns error', async () => {
    const result = await adapter.callTool('lookup_observation', {});
    expect(result.isError).toBe(true);
  });

  it('parse_text without text returns error', async () => {
    const result = await adapter.callTool('parse_text', {});
    expect(result.isError).toBe(true);
  });

  it('run_diagnosis without required fields returns error', async () => {
    const result = await adapter.callTool('run_diagnosis', {});
    expect(result.isError).toBe(true);
  });

  it('explain_diagnosis without target returns error', async () => {
    const result = await adapter.callTool('explain_diagnosis', {
      sex: 'male',
      age: { value: 30 },
      evidence: [],
    });
    expect(result.isError).toBe(true);
  });

  it('get_concept without id returns error', async () => {
    const result = await adapter.callTool('get_concept', {});
    expect(result.isError).toBe(true);
  });
});
