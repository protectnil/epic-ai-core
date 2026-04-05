import { describe, it, expect } from 'vitest';
import { DrChronoMCPServer } from '../../src/mcp-servers/drchrono.js';

describe('DrChronoMCPServer', () => {
  const adapter = new DrChronoMCPServer({ accessToken: 'test-oauth2-token' });

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

  it('catalog returns correct metadata', () => {
    const catalog = DrChronoMCPServer.catalog();
    expect(catalog.name).toBe('drchrono');
    expect(catalog.category).toBe('healthcare');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names in catalog match actual tools', () => {
    const catalog = DrChronoMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('create_patient requires clinical required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'create_patient');
    expect(tool).toBeDefined();
    const req = tool!.inputSchema.required as string[];
    expect(req).toContain('first_name');
    expect(req).toContain('last_name');
    expect(req).toContain('date_of_birth');
    expect(req).toContain('gender');
    expect(req).toContain('doctor');
  });

  it('create_appointment requires scheduling fields', () => {
    const tool = adapter.tools.find(t => t.name === 'create_appointment');
    expect(tool).toBeDefined();
    const req = tool!.inputSchema.required as string[];
    expect(req).toContain('doctor');
    expect(req).toContain('patient');
    expect(req).toContain('scheduled_time');
    expect(req).toContain('duration');
  });

  it('list_patients supports pagination and filter params', () => {
    const tool = adapter.tools.find(t => t.name === 'list_patients');
    expect(tool).toBeDefined();
    const props = Object.keys(tool!.inputSchema.properties as object);
    expect(props).toContain('doctor');
    expect(props).toContain('page');
    expect(props).toContain('first_name');
    expect(props).toContain('last_name');
  });

  it('create_medication requires patient, doctor, and name', () => {
    const tool = adapter.tools.find(t => t.name === 'create_medication');
    expect(tool).toBeDefined();
    const req = tool!.inputSchema.required as string[];
    expect(req).toContain('patient');
    expect(req).toContain('doctor');
    expect(req).toContain('name');
  });

  it('create_problem requires patient, doctor, and name', () => {
    const tool = adapter.tools.find(t => t.name === 'create_problem');
    expect(tool).toBeDefined();
    const req = tool!.inputSchema.required as string[];
    expect(req).toContain('patient');
    expect(req).toContain('doctor');
    expect(req).toContain('name');
  });

  it('covers all major EHR domains', () => {
    const toolNames = adapter.tools.map(t => t.name);
    // Patients
    expect(toolNames).toContain('list_patients');
    expect(toolNames).toContain('create_patient');
    // Appointments
    expect(toolNames).toContain('list_appointments');
    expect(toolNames).toContain('create_appointment');
    // Clinical
    expect(toolNames).toContain('list_clinical_notes');
    expect(toolNames).toContain('list_medications');
    expect(toolNames).toContain('list_allergies');
    expect(toolNames).toContain('list_problems');
    // Labs
    expect(toolNames).toContain('list_lab_orders');
    expect(toolNames).toContain('list_lab_results');
    // Billing
    expect(toolNames).toContain('list_line_items');
    expect(toolNames).toContain('list_insurances');
    // Admin
    expect(toolNames).toContain('list_doctors');
    expect(toolNames).toContain('list_offices');
  });
});
