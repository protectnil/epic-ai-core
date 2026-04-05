import { describe, it, expect } from 'vitest';
import { IQualifyMCPServer } from '../../src/mcp-servers/iqualify.js';

describe('IQualifyMCPServer', () => {
  const adapter = new IQualifyMCPServer({ apiKey: 'Bearer test-token-123' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes 25 tools', () => {
    expect(adapter.tools.length).toBe(25);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns expected shape', () => {
    const cat = IQualifyMCPServer.catalog();
    expect(cat.name).toBe('iqualify');
    expect(cat.category).toBe('education');
    expect(cat.version).toBe('1.0.0');
    expect(cat.author).toBe('protectnil');
    expect(Array.isArray(cat.keywords)).toBe(true);
    expect(cat.keywords.length).toBeGreaterThan(0);
    expect(Array.isArray(cat.toolNames)).toBe(true);
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('catalog toolNames match tools getter', () => {
    const cat = IQualifyMCPServer.catalog();
    const toolGetterNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolGetterNames).toContain(n);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('get_course requires content_id', async () => {
    const result = await adapter.callTool('get_course', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('content_id');
  });

  it('get_offering requires offering_id', async () => {
    const result = await adapter.callTool('get_offering', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('create_offering requires content_id, label, starts, ends', async () => {
    const result1 = await adapter.callTool('create_offering', {});
    expect(result1.isError).toBe(true);
    expect(result1.content[0].text).toContain('content_id');

    const result2 = await adapter.callTool('create_offering', { content_id: 'abc' });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('label');

    const result3 = await adapter.callTool('create_offering', { content_id: 'abc', label: 'Test' });
    expect(result3.isError).toBe(true);
    expect(result3.content[0].text).toContain('starts');

    const result4 = await adapter.callTool('create_offering', { content_id: 'abc', label: 'Test', starts: '2026-01-01T00:00:00Z' });
    expect(result4.isError).toBe(true);
    expect(result4.content[0].text).toContain('ends');
  });

  it('update_offering requires offering_id', async () => {
    const result = await adapter.callTool('update_offering', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('get_offering_users requires offering_id', async () => {
    const result = await adapter.callTool('get_offering_users', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('add_user_to_offering requires offering_id and user_email', async () => {
    const result1 = await adapter.callTool('add_user_to_offering', {});
    expect(result1.isError).toBe(true);
    expect(result1.content[0].text).toContain('offering_id');

    const result2 = await adapter.callTool('add_user_to_offering', { offering_id: 'off-1' });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('user_email');
  });

  it('remove_user_from_offering requires offering_id and user_email', async () => {
    const result = await adapter.callTool('remove_user_from_offering', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('get_learner_progress requires offering_id and user_email', async () => {
    const result1 = await adapter.callTool('get_learner_progress', {});
    expect(result1.isError).toBe(true);
    expect(result1.content[0].text).toContain('offering_id');

    const result2 = await adapter.callTool('get_learner_progress', { offering_id: 'off-1' });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('user_email');
  });

  it('get_all_learners_progress requires offering_id', async () => {
    const result = await adapter.callTool('get_all_learners_progress', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('get_offering_assessments requires offering_id', async () => {
    const result = await adapter.callTool('get_offering_assessments', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('get_quiz_marks requires offering_id', async () => {
    const result = await adapter.callTool('get_quiz_marks', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('get_assignment_marks requires offering_id', async () => {
    const result = await adapter.callTool('get_assignment_marks', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('get_open_response_activities requires offering_id', async () => {
    const result = await adapter.callTool('get_open_response_activities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('offering_id');
  });

  it('get_user requires user_email', async () => {
    const result = await adapter.callTool('get_user', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('user_email');
  });

  it('create_user requires email, first_name, last_name', async () => {
    const result1 = await adapter.callTool('create_user', {});
    expect(result1.isError).toBe(true);
    expect(result1.content[0].text).toContain('email');

    const result2 = await adapter.callTool('create_user', { email: 'user@example.com' });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('first_name');

    const result3 = await adapter.callTool('create_user', { email: 'user@example.com', first_name: 'Jane' });
    expect(result3.isError).toBe(true);
    expect(result3.content[0].text).toContain('last_name');
  });

  it('update_user requires user_email', async () => {
    const result = await adapter.callTool('update_user', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('user_email');
  });

  it('suspend_user requires user_email', async () => {
    const result = await adapter.callTool('suspend_user', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('user_email');
  });

  it('award_badge requires offering_id, user_email, badge_id', async () => {
    const result1 = await adapter.callTool('award_badge', {});
    expect(result1.isError).toBe(true);
    expect(result1.content[0].text).toContain('offering_id');

    const result2 = await adapter.callTool('award_badge', { offering_id: 'off-1' });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('user_email');

    const result3 = await adapter.callTool('award_badge', { offering_id: 'off-1', user_email: 'u@x.com' });
    expect(result3.isError).toBe(true);
    expect(result3.content[0].text).toContain('badge_id');
  });

  it('accepts custom baseUrl', () => {
    const custom = new IQualifyMCPServer({ apiKey: 'key', baseUrl: 'https://custom.iqualify.com/v1' });
    expect(custom).toBeDefined();
  });
});
