import { describe, it, expect } from 'vitest';
import { OpenTargetsMCPServer } from '../../src/mcp-servers/opentargets.js';

describe('OpenTargetsMCPServer', () => {
  const adapter = new OpenTargetsMCPServer();

  it('instantiates', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new OpenTargetsMCPServer({ baseUrl: 'https://custom.example.com/v3/platform' });
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

  it('every tool description is 10-30 words', () => {
    for (const tool of adapter.tools) {
      const words = tool.description.trim().split(/\s+/).length;
      expect(words, `Tool '${tool.name}' description has ${words} words`).toBeGreaterThanOrEqual(10);
      expect(words, `Tool '${tool.name}' description has ${words} words`).toBeLessThanOrEqual(30);
    }
  });

  it('every tool property has type and description', () => {
    for (const tool of adapter.tools) {
      for (const [propName, propDef] of Object.entries(tool.inputSchema.properties)) {
        const p = propDef as Record<string, unknown>;
        expect(p.type, `Tool '${tool.name}' property '${propName}' missing type`).toBeTruthy();
        expect(p.description, `Tool '${tool.name}' property '${propName}' missing description`).toBeTruthy();
      }
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns expected fields', () => {
    const cat = OpenTargetsMCPServer.catalog();
    expect(cat.name).toBe('opentargets');
    expect(cat.category).toBe('science');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names match catalog toolNames', () => {
    const catalog = OpenTargetsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name).sort();
    const catalogNames = [...catalog.toolNames].sort();
    expect(toolNames).toEqual(catalogNames);
  });

  it('search_targets_diseases requires q', async () => {
    const result = await adapter.callTool('search_targets_diseases', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q is required');
  });

  it('get_association requires id', async () => {
    const result = await adapter.callTool('get_association', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_evidence requires id', async () => {
    const result = await adapter.callTool('get_evidence', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_disease requires disease', async () => {
    const result = await adapter.callTool('get_disease', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('disease is required');
  });

  it('get_target requires target', async () => {
    const result = await adapter.callTool('get_target', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('target is required');
  });

  it('get_target_expression requires gene', async () => {
    const result = await adapter.callTool('get_target_expression', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('gene is required');
  });

  it('get_drug requires drug_id', async () => {
    const result = await adapter.callTool('get_drug', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('drug_id is required');
  });

  it('get_eco requires eco_id', async () => {
    const result = await adapter.callTool('get_eco', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('eco_id is required');
  });

  it('autocomplete_search requires q', async () => {
    const result = await adapter.callTool('autocomplete_search', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q is required');
  });

  it('quicksearch requires q', async () => {
    const result = await adapter.callTool('quicksearch', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q is required');
  });

  it('filter_associations accepts empty args — no required field validation error', async () => {
    // filter_associations has no required fields — result may be a network error in test env,
    // but should never be a validation/required-field error
    let result;
    try {
      result = await adapter.callTool('filter_associations', {});
    } catch {
      // network unavailable in test environment; that is acceptable
      return;
    }
    expect(result.content[0].text).not.toContain('required');
  });

  it('no tool names are duplicated', () => {
    const names = adapter.tools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
