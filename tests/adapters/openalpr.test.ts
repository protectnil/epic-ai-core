import { describe, it, expect } from 'vitest';
import { OpenALPRMCPServer } from '../../src/mcp-servers/openalpr.js';

describe('OpenALPRMCPServer', () => {
  const adapter = new OpenALPRMCPServer({ secretKey: 'test-secret-key' });

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

  it('exposes exactly 4 tools', () => {
    expect(adapter.tools).toHaveLength(4);
  });

  it('tools include all expected names', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_config');
    expect(names).toContain('recognize_plate_from_url');
    expect(names).toContain('recognize_plate_from_bytes');
    expect(names).toContain('recognize_plate_from_file');
  });

  it('recognize_plate_from_url requires image_url and country', () => {
    const tool = adapter.tools.find(t => t.name === 'recognize_plate_from_url')!;
    expect(tool.inputSchema.required).toContain('image_url');
    expect(tool.inputSchema.required).toContain('country');
  });

  it('recognize_plate_from_bytes requires image_bytes and country', () => {
    const tool = adapter.tools.find(t => t.name === 'recognize_plate_from_bytes')!;
    expect(tool.inputSchema.required).toContain('image_bytes');
    expect(tool.inputSchema.required).toContain('country');
  });

  it('static catalog returns correct metadata', () => {
    const catalog = OpenALPRMCPServer.catalog();
    expect(catalog.name).toBe('openalpr');
    expect(catalog.category).toBe('misc');
    expect(catalog.toolNames).toHaveLength(4);
    expect(catalog.author).toBe('protectnil');
  });
});
