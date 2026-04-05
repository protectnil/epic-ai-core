import { describe, it, expect } from 'vitest';
import { OpenSuseObsMCPServer } from '../../src/mcp-servers/opensuse-obs.js';

describe('OpenSuseObsMCPServer', () => {
  const adapter = new OpenSuseObsMCPServer({ username: 'testuser', password: 'testpass' });

  it('instantiates', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new OpenSuseObsMCPServer({
      username: 'user',
      password: 'pass',
      baseUrl: 'https://obs.example.com',
    });
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
    const cat = OpenSuseObsMCPServer.catalog();
    expect(cat.name).toBe('opensuse-obs');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names match catalog toolNames', () => {
    const catalog = OpenSuseObsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name).sort();
    const catalogNames = [...catalog.toolNames].sort();
    expect(toolNames).toEqual(catalogNames);
  });

  it('get_architecture requires architecture_name', async () => {
    const result = await adapter.callTool('get_architecture', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('architecture_name is required');
  });

  it('get_attribute requires namespace', async () => {
    const result = await adapter.callTool('get_attribute', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('namespace is required');
  });

  it('get_project_build requires project_name', async () => {
    const result = await adapter.callTool('get_project_build', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('project_name is required');
  });

  it('get_build_results requires project_name', async () => {
    const result = await adapter.callTool('get_build_results', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('project_name is required');
  });

  it('get_repository_build requires project_name and repository_name', async () => {
    const result = await adapter.callTool('get_repository_build', { project_name: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('repository_name');
  });

  it('get_package_build_files requires all four path params', async () => {
    const result = await adapter.callTool('get_package_build_files', {
      project_name: 'test',
      repository_name: 'repo',
      architecture_name: 'x86_64',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('package_name');
  });

  it('get_distribution requires distribution_id', async () => {
    const result = await adapter.callTool('get_distribution', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('distribution_id is required');
  });

  it('get_group requires group_title', async () => {
    const result = await adapter.callTool('get_group', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('group_title is required');
  });

  it('get_issue_tracker requires issue_tracker_name', async () => {
    const result = await adapter.callTool('get_issue_tracker', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('issue_tracker_name is required');
  });

  it('get_issue requires issue_tracker_name and issue_name', async () => {
    const result = await adapter.callTool('get_issue', { issue_tracker_name: 'bnc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('issue_name');
  });

  it('get_person requires login', async () => {
    const result = await adapter.callTool('get_person', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('login is required');
  });

  it('get_request requires id', async () => {
    const result = await adapter.callTool('get_request', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('create_request requires body', async () => {
    const result = await adapter.callTool('create_request', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('body is required');
  });

  it('update_request requires id', async () => {
    const result = await adapter.callTool('update_request', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_worker requires architecture_name and worker_id', async () => {
    const result = await adapter.callTool('get_worker', { architecture_name: 'x86_64' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('worker_id');
  });

  it('no tool names are duplicated', () => {
    const names = adapter.tools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('list_requests accepts empty args', async () => {
    // No required fields — should attempt the fetch, failing at network not validation
    const result = await adapter.callTool('list_requests', {});
    expect(result.content[0].text).not.toContain('required');
  });
});
