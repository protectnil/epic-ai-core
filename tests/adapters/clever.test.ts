import { describe, it, expect } from 'vitest';
import { CleverMCPServer } from '../../src/mcp-servers/clever.js';

describe('CleverMCPServer', () => {
  const adapter = new CleverMCPServer({ accessToken: 'test-token' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    expect(adapter.tools.length).toBeGreaterThan(0);
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
    const cat = CleverMCPServer.catalog();
    expect(cat.name).toBe('clever');
    expect(cat.category).toBe('education');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = CleverMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_contact returns error without id', async () => {
    const result = await adapter.callTool('get_contact', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_contact_district returns error without id', async () => {
    const result = await adapter.callTool('get_contact_district', {});
    expect(result.isError).toBe(true);
  });

  it('get_contact_student returns error without id', async () => {
    const result = await adapter.callTool('get_contact_student', {});
    expect(result.isError).toBe(true);
  });

  it('get_district_admin returns error without id', async () => {
    const result = await adapter.callTool('get_district_admin', {});
    expect(result.isError).toBe(true);
  });

  it('get_district returns error without id', async () => {
    const result = await adapter.callTool('get_district', {});
    expect(result.isError).toBe(true);
  });

  it('get_district_admins returns error without id', async () => {
    const result = await adapter.callTool('get_district_admins', {});
    expect(result.isError).toBe(true);
  });

  it('get_district_schools returns error without id', async () => {
    const result = await adapter.callTool('get_district_schools', {});
    expect(result.isError).toBe(true);
  });

  it('get_district_status returns error without id', async () => {
    const result = await adapter.callTool('get_district_status', {});
    expect(result.isError).toBe(true);
  });

  it('get_district_students returns error without id', async () => {
    const result = await adapter.callTool('get_district_students', {});
    expect(result.isError).toBe(true);
  });

  it('get_district_teachers returns error without id', async () => {
    const result = await adapter.callTool('get_district_teachers', {});
    expect(result.isError).toBe(true);
  });

  it('get_school_admin returns error without id', async () => {
    const result = await adapter.callTool('get_school_admin', {});
    expect(result.isError).toBe(true);
  });

  it('get_school_admin_schools returns error without id', async () => {
    const result = await adapter.callTool('get_school_admin_schools', {});
    expect(result.isError).toBe(true);
  });

  it('get_school returns error without id', async () => {
    const result = await adapter.callTool('get_school', {});
    expect(result.isError).toBe(true);
  });

  it('get_school_district returns error without id', async () => {
    const result = await adapter.callTool('get_school_district', {});
    expect(result.isError).toBe(true);
  });

  it('get_school_sections returns error without id', async () => {
    const result = await adapter.callTool('get_school_sections', {});
    expect(result.isError).toBe(true);
  });

  it('get_school_students returns error without id', async () => {
    const result = await adapter.callTool('get_school_students', {});
    expect(result.isError).toBe(true);
  });

  it('get_school_teachers returns error without id', async () => {
    const result = await adapter.callTool('get_school_teachers', {});
    expect(result.isError).toBe(true);
  });

  it('get_section returns error without id', async () => {
    const result = await adapter.callTool('get_section', {});
    expect(result.isError).toBe(true);
  });

  it('get_section_district returns error without id', async () => {
    const result = await adapter.callTool('get_section_district', {});
    expect(result.isError).toBe(true);
  });

  it('get_section_school returns error without id', async () => {
    const result = await adapter.callTool('get_section_school', {});
    expect(result.isError).toBe(true);
  });

  it('get_section_students returns error without id', async () => {
    const result = await adapter.callTool('get_section_students', {});
    expect(result.isError).toBe(true);
  });

  it('get_section_teacher returns error without id', async () => {
    const result = await adapter.callTool('get_section_teacher', {});
    expect(result.isError).toBe(true);
  });

  it('get_section_teachers returns error without id', async () => {
    const result = await adapter.callTool('get_section_teachers', {});
    expect(result.isError).toBe(true);
  });

  it('get_student returns error without id', async () => {
    const result = await adapter.callTool('get_student', {});
    expect(result.isError).toBe(true);
  });

  it('get_student_contacts returns error without id', async () => {
    const result = await adapter.callTool('get_student_contacts', {});
    expect(result.isError).toBe(true);
  });

  it('get_student_district returns error without id', async () => {
    const result = await adapter.callTool('get_student_district', {});
    expect(result.isError).toBe(true);
  });

  it('get_student_school returns error without id', async () => {
    const result = await adapter.callTool('get_student_school', {});
    expect(result.isError).toBe(true);
  });

  it('get_student_sections returns error without id', async () => {
    const result = await adapter.callTool('get_student_sections', {});
    expect(result.isError).toBe(true);
  });

  it('get_student_teachers returns error without id', async () => {
    const result = await adapter.callTool('get_student_teachers', {});
    expect(result.isError).toBe(true);
  });

  it('get_teacher returns error without id', async () => {
    const result = await adapter.callTool('get_teacher', {});
    expect(result.isError).toBe(true);
  });

  it('get_teacher_district returns error without id', async () => {
    const result = await adapter.callTool('get_teacher_district', {});
    expect(result.isError).toBe(true);
  });

  it('get_teacher_grade_levels returns error without id', async () => {
    const result = await adapter.callTool('get_teacher_grade_levels', {});
    expect(result.isError).toBe(true);
  });

  it('get_teacher_school returns error without id', async () => {
    const result = await adapter.callTool('get_teacher_school', {});
    expect(result.isError).toBe(true);
  });

  it('get_teacher_sections returns error without id', async () => {
    const result = await adapter.callTool('get_teacher_sections', {});
    expect(result.isError).toBe(true);
  });

  it('get_teacher_students returns error without id', async () => {
    const result = await adapter.callTool('get_teacher_students', {});
    expect(result.isError).toBe(true);
  });
});
