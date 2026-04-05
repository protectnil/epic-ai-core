import { describe, it, expect } from 'vitest';
import { OnSchedSetupMCPServer } from '../../src/mcp-servers/onsched-setup.js';

describe('OnSchedSetupMCPServer', () => {
  const adapter = new OnSchedSetupMCPServer({ clientId: 'test-client', clientSecret: 'test-secret' });

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

  it('exposes at least 30 tools', () => {
    expect(adapter.tools.length).toBeGreaterThanOrEqual(30);
  });

  it('tools include core location operations', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_locations');
    expect(names).toContain('get_location');
    expect(names).toContain('create_location');
    expect(names).toContain('update_location');
    expect(names).toContain('delete_location');
  });

  it('tools include core service operations', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_services');
    expect(names).toContain('get_service');
    expect(names).toContain('create_service');
  });

  it('tools include core resource operations', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_resources');
    expect(names).toContain('get_resource');
    expect(names).toContain('get_resource_availability');
  });

  it('tools include appointment and customer operations', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_appointments');
    expect(names).toContain('get_appointment');
    expect(names).toContain('list_customers');
    expect(names).toContain('get_customer');
  });

  it('id-based tools require id parameter', () => {
    const idTools = ['get_location', 'get_service', 'get_resource', 'get_appointment', 'get_customer', 'get_business_user'];
    for (const toolName of idTools) {
      const tool = adapter.tools.find(t => t.name === toolName)!;
      expect(tool, `Tool ${toolName} not found`).toBeDefined();
      expect(tool.inputSchema.required).toContain('id');
    }
  });

  it('create tools require body parameter', () => {
    const createTools = ['create_location', 'create_service', 'create_resource', 'create_service_group', 'create_resource_group'];
    for (const toolName of createTools) {
      const tool = adapter.tools.find(t => t.name === toolName)!;
      expect(tool, `Tool ${toolName} not found`).toBeDefined();
      expect(tool.inputSchema.required).toContain('body');
    }
  });

  it('static catalog returns correct metadata', () => {
    const catalog = OnSchedSetupMCPServer.catalog();
    expect(catalog.name).toBe('onsched-setup');
    expect(catalog.category).toBe('productivity');
    expect(catalog.toolNames.length).toBeGreaterThanOrEqual(30);
    expect(catalog.author).toBe('protectnil');
  });
});
