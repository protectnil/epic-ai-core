import { describe, it, expect } from 'vitest';
import { AuthentiqMCPServer } from '../../src/mcp-servers/6-dot-authentiqio-appspot.js';

describe('AuthentiqMCPServer', () => {
  const adapter = new AuthentiqMCPServer();

  it('instantiates with default config', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new AuthentiqMCPServer({ baseUrl: 'https://custom.authentiq.example.com' });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes all 12 expected tools', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('register_key');
    expect(names).toContain('get_key');
    expect(names).toContain('update_key');
    expect(names).toContain('bind_key');
    expect(names).toContain('revoke_key');
    expect(names).toContain('revoke_key_by_email');
    expect(names).toContain('push_login_request');
    expect(names).toContain('create_scope_verification');
    expect(names).toContain('get_scope_verification');
    expect(names).toContain('confirm_scope_verification');
    expect(names).toContain('update_scope_verification');
    expect(names).toContain('delete_scope_verification');
    expect(names.length).toBe(12);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('every tool description is 10+ words', () => {
    for (const tool of adapter.tools) {
      const wordCount = tool.description.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(10);
    }
  });

  it('every tool inputSchema property has type and description', () => {
    for (const tool of adapter.tools) {
      const props = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
      for (const [propName, propDef] of Object.entries(props)) {
        expect(propDef.type, `tool ${tool.name} prop ${propName} missing type`).toBeTruthy();
        expect(propDef.description, `tool ${tool.name} prop ${propName} missing description`).toBeTruthy();
      }
    }
  });

  it('unknown tool returns isError: true, does not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('callTool returns ToolResult shape for all tools on network error', async () => {
    // Use an unreachable baseUrl so fetch fails; result must be a ToolResult, not a throw
    const offline = new AuthentiqMCPServer({ baseUrl: 'http://localhost:19999' });
    const result = await offline.callTool('get_key', { pk: 'test-pk' });
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('isError');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    expect(result.isError).toBe(true);
  });

  it('static catalog returns correct category and required fields', () => {
    const catalog = AuthentiqMCPServer.catalog();
    expect(catalog.category).toBe('identity');
    expect(catalog.name).toBe('6-dot-authentiqio-appspot');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.keywords.length).toBeGreaterThan(0);
    expect(catalog.toolNames.length).toBe(12);
  });
});
