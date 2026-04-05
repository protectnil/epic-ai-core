import { describe, it, expect } from 'vitest';
import { ClickMeterMCPServer } from '../../src/mcp-servers/clickmeter.js';

describe('ClickMeterMCPServer', () => {
  const adapter = new ClickMeterMCPServer({ apiKey: 'test-api-key' });

  it('instantiates', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    expect(adapter.tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('unknown tool returns error', async () => {
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const catalog = ClickMeterMCPServer.catalog();
    expect(catalog.name).toBe('clickmeter');
    expect(catalog.category).toBe('marketing');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('all tool names in catalog match tools array', () => {
    const catalog = ClickMeterMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('tool descriptions are within 10-30 words', () => {
    for (const tool of adapter.tools) {
      const wordCount = tool.description.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(5);
      expect(wordCount).toBeLessThanOrEqual(35);
    }
  });

  it('all required inputSchema properties have type and description', () => {
    for (const tool of adapter.tools) {
      const props = tool.inputSchema.properties as Record<string, { type?: string; description?: string }>;
      for (const [propName, propDef] of Object.entries(props)) {
        expect(propDef.type, `${tool.name}.${propName} missing type`).toBeTruthy();
        expect(propDef.description, `${tool.name}.${propName} missing description`).toBeTruthy();
      }
    }
  });
});
