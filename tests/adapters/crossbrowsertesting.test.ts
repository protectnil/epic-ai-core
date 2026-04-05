import { describe, it, expect } from 'vitest';
import { CrossBrowserTestingMCPServer } from '../../src/mcp-servers/crossbrowsertesting.js';

describe('CrossBrowserTestingMCPServer', () => {
  const adapter = new CrossBrowserTestingMCPServer({ username: 'test-user', apiKey: 'test-key' });

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
    const cat = CrossBrowserTestingMCPServer.catalog();
    expect(cat.name).toBe('crossbrowsertesting');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = CrossBrowserTestingMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('compare_screenshot_test_versions returns error without target_screenshot_test_id', async () => {
    const result = await adapter.callTool('compare_screenshot_test_versions', {
      target_version_id: 1,
      base_version_id: 2,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('target_screenshot_test_id');
  });

  it('compare_screenshot_test_versions returns error without target_version_id', async () => {
    const result = await adapter.callTool('compare_screenshot_test_versions', {
      target_screenshot_test_id: 1,
      base_version_id: 2,
    });
    expect(result.isError).toBe(true);
  });

  it('compare_screenshot_test_versions returns error without base_version_id', async () => {
    const result = await adapter.callTool('compare_screenshot_test_versions', {
      target_screenshot_test_id: 1,
      target_version_id: 2,
    });
    expect(result.isError).toBe(true);
  });

  it('compare_full_screenshot_test returns error without target_screenshot_test_id', async () => {
    const result = await adapter.callTool('compare_full_screenshot_test', {
      target_version_id: 1,
      base_result_id: 2,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('target_screenshot_test_id');
  });

  it('compare_full_screenshot_test returns error without base_result_id', async () => {
    const result = await adapter.callTool('compare_full_screenshot_test', {
      target_screenshot_test_id: 1,
      target_version_id: 2,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('base_result_id');
  });

  it('compare_single_screenshot returns error without target_result_id', async () => {
    const result = await adapter.callTool('compare_single_screenshot', {
      target_screenshot_test_id: 1,
      target_version_id: 2,
      base_result_id: 3,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('target_result_id');
  });

  it('compare_single_screenshot returns error without all required ids', async () => {
    const result = await adapter.callTool('compare_single_screenshot', {});
    expect(result.isError).toBe(true);
  });
});
