import { describe, it, expect } from 'vitest';
import { EbiAcUkMCPServer } from '../../src/mcp-servers/ebi-ac-uk.js';

describe('EbiAcUkMCPServer', () => {
  const adapter = new EbiAcUkMCPServer();

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

  it('instantiates with custom baseUrl', () => {
    const custom = new EbiAcUkMCPServer({ baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });

  it('exposes catalog metadata', () => {
    const catalog = EbiAcUkMCPServer.catalog();
    expect(catalog.name).toBe('ebi-ac-uk');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.keywords).toContain('bioinformatics');
  });

  it('all 13 expected tools are present', () => {
    const toolNames = adapter.tools.map((t) => t.name);
    const expected = [
      'get_activities',
      'get_assays',
      'get_drugs',
      'get_efo_terms',
      'get_hpo_terms',
      'get_intact_interactions',
      'get_molecules',
      'get_proteins',
      'get_pubchem_bioassays',
      'get_pubchem_bioassay_sids',
      'get_pubchem_compounds',
      'get_pubchem_substances',
      'get_targets',
    ];
    for (const name of expected) {
      expect(toolNames).toContain(name);
    }
  });
});
