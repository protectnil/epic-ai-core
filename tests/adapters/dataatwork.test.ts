import { describe, it, expect } from 'vitest';
import { DataatworkMCPServer } from '../../src/mcp-servers/dataatwork.js';

describe('DataatworkMCPServer', () => {
  const adapter = new DataatworkMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new DataatworkMCPServer({ baseUrl: 'http://localhost:9000/v1' });
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

  it('exposes all expected tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_jobs');
    expect(names).toContain('get_job');
    expect(names).toContain('autocomplete_jobs');
    expect(names).toContain('normalize_job_title');
    expect(names).toContain('get_unusual_job_titles');
    expect(names).toContain('get_jobs_related_to_job');
    expect(names).toContain('get_skills_for_job');
    expect(names).toContain('list_skills');
    expect(names).toContain('get_skill');
    expect(names).toContain('autocomplete_skills');
    expect(names).toContain('normalize_skill_name');
    expect(names).toContain('get_jobs_related_to_skill');
    expect(names).toContain('get_skills_related_to_skill');
  });

  it('get_job requires id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_job');
    expect(tool?.inputSchema.required).toContain('id');
  });

  it('normalize_job_title requires job_title', () => {
    const tool = adapter.tools.find(t => t.name === 'normalize_job_title');
    expect(tool?.inputSchema.required).toContain('job_title');
  });

  it('normalize_skill_name requires skill_name', () => {
    const tool = adapter.tools.find(t => t.name === 'normalize_skill_name');
    expect(tool?.inputSchema.required).toContain('skill_name');
  });

  it('get_skill requires id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_skill');
    expect(tool?.inputSchema.required).toContain('id');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_job returns error when id is missing', async () => {
    const result = await adapter.callTool('get_job', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('normalize_job_title returns error when job_title is missing', async () => {
    const result = await adapter.callTool('normalize_job_title', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('job_title is required');
  });

  it('normalize_skill_name returns error when skill_name is missing', async () => {
    const result = await adapter.callTool('normalize_skill_name', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('skill_name is required');
  });

  it('get_jobs_related_to_skill returns error when id is missing', async () => {
    const result = await adapter.callTool('get_jobs_related_to_skill', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_skills_related_to_skill returns error when id is missing', async () => {
    const result = await adapter.callTool('get_skills_related_to_skill', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('catalog() returns correct metadata', () => {
    const catalog = DataatworkMCPServer.catalog();
    expect(catalog.name).toBe('dataatwork');
    expect(catalog.category).toBe('data');
    expect(catalog.toolNames).toContain('list_jobs');
    expect(catalog.toolNames).toContain('normalize_skill_name');
    expect(catalog.description).toBeTruthy();
  });
});
