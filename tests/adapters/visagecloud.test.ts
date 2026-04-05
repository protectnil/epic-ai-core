import { describe, it, expect } from 'vitest';
import { VisageCloudMCPServer } from '../../src/mcp-servers/visagecloud.js';

describe('VisageCloudMCPServer', () => {
  const adapter = new VisageCloudMCPServer({ accessKey: 'test-access-key', secretKey: 'test-secret-key' });

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
    const cat = VisageCloudMCPServer.catalog();
    expect(cat.name).toBe('visagecloud');
    expect(cat.category).toBe('ai');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = VisageCloudMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('detect_faces tool exists with picture_url param', () => {
    const tool = adapter.tools.find(t => t.name === 'detect_faces');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('picture_url');
  });

  it('recognize_faces tool exists with collection_id param', () => {
    const tool = adapter.tools.find(t => t.name === 'recognize_faces');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('collection_id');
  });

  it('compare_faces tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'compare_faces');
    expect(tool).toBeDefined();
  });

  it('create_collection tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'create_collection');
    expect(tool).toBeDefined();
  });

  it('create_profile tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'create_profile');
    expect(tool).toBeDefined();
  });

  it('delete_collection tool exists with collection_id param', () => {
    const tool = adapter.tools.find(t => t.name === 'delete_collection');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('collection_id');
  });

  it('map_faces_to_profile tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'map_faces_to_profile');
    expect(tool).toBeDefined();
  });

  it('get_account tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'get_account');
    expect(tool).toBeDefined();
  });
});
