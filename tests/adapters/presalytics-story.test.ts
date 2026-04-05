import { describe, it, expect } from 'vitest';
import { PresalyticsStoryMCPServer } from '../../src/mcp-servers/presalytics-story.js';

describe('PresalyticsStoryMCPServer', () => {
  const adapter = new PresalyticsStoryMCPServer({ accessToken: 'test-token' });

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

  it('catalog returns expected metadata', () => {
    const catalog = PresalyticsStoryMCPServer.catalog();
    expect(catalog.name).toBe('presalytics-story');
    expect(catalog.category).toBe('productivity');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool list matches catalog toolNames', () => {
    const catalog = PresalyticsStoryMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('story tools require story_id', () => {
    const storyTools = ['get_story', 'update_story', 'delete_story', 'get_story_outline',
      'post_story_outline', 'get_story_status', 'get_story_analytics',
      'list_collaborators', 'list_sessions', 'list_events', 'list_messages',
      'get_story_reveal', 'get_story_public'];
    for (const toolName of storyTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('story_id');
    }
  });

  it('session tools require session_id', () => {
    const sessionTools = ['get_session', 'delete_session', 'list_session_views', 'create_session_view'];
    for (const toolName of sessionTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('session_id');
    }
  });

  it('view tools require view_id', () => {
    const viewTools = ['get_view', 'delete_view'];
    for (const toolName of viewTools) {
      const tool = adapter.tools.find((t) => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('view_id');
    }
  });

  it('cache subdocument tool requires document_data', () => {
    const tool = adapter.tools.find((t) => t.name === 'cache_subdocument');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('document_data');
  });

  it('get_cached_subdocument requires nonce', () => {
    const tool = adapter.tools.find((t) => t.name === 'get_cached_subdocument');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('nonce');
  });

  it('create_story requires outline', () => {
    const tool = adapter.tools.find((t) => t.name === 'create_story');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('outline');
  });
});
