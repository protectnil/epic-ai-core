import { describe, it, expect } from 'vitest';
import { FaceCheckIdMCPServer } from '../../src/mcp-servers/facecheck-id.js';

describe('FaceCheckIdMCPServer', () => {
  const adapter = new FaceCheckIdMCPServer({ apiToken: 'test-token' });

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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('get_account_info');
    expect(names).toContain('upload_face_image');
    expect(names).toContain('search_by_face');
    expect(names).toContain('delete_face_image');
  });

  it('upload_face_image returns error when images_base64 missing', async () => {
    const result = await adapter.callTool('upload_face_image', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('images_base64');
  });

  it('upload_face_image returns error when images_base64 is empty array', async () => {
    const result = await adapter.callTool('upload_face_image', { images_base64: [] });
    expect(result.isError).toBe(true);
  });

  it('upload_face_image returns error when more than 3 images provided', async () => {
    const result = await adapter.callTool('upload_face_image', {
      images_base64: ['a', 'b', 'c', 'd'],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Maximum 3');
  });

  it('search_by_face returns error when id_search missing', async () => {
    const result = await adapter.callTool('search_by_face', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id_search');
  });

  it('delete_face_image returns error when id_search missing', async () => {
    const result = await adapter.callTool('delete_face_image', { id_pic: 'pic123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id_search');
  });

  it('delete_face_image returns error when id_pic missing', async () => {
    const result = await adapter.callTool('delete_face_image', { id_search: 'srch123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id_pic');
  });

  it('static catalog returns correct metadata', () => {
    const cat = FaceCheckIdMCPServer.catalog();
    expect(cat.name).toBe('facecheck-id');
    expect(cat.category).toBe('identity');
    expect(cat.author).toBe('protectnil');
    expect(cat.keywords).toContain('facial');
    expect(cat.keywords).toContain('face');
  });
});
