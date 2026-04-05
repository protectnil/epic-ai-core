import { describe, it, expect } from 'vitest';
import { OnSchedConsumerMCPServer } from '../../src/mcp-servers/onsched-consumer.js';

describe('OnSchedConsumerMCPServer', () => {
  const adapter = new OnSchedConsumerMCPServer({ accessToken: 'test-token' });

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

  it('exposes the expected 27 tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_appointments');
    expect(names).toContain('create_appointment');
    expect(names).toContain('get_appointment');
    expect(names).toContain('book_appointment');
    expect(names).toContain('cancel_appointment');
    expect(names).toContain('confirm_appointment');
    expect(names).toContain('reschedule_appointment');
    expect(names).toContain('reserve_appointment');
    expect(names).toContain('set_noshow');
    expect(names).toContain('delete_appointment');
    expect(names).toContain('get_appointment_booking_fields');
    expect(names).toContain('get_appointment_custom_fields');
    expect(names).toContain('get_available_times');
    expect(names).toContain('get_available_days');
    expect(names).toContain('get_unavailable_times');
    expect(names).toContain('list_customers');
    expect(names).toContain('create_customer');
    expect(names).toContain('get_customer');
    expect(names).toContain('update_customer');
    expect(names).toContain('delete_customer');
    expect(names).toContain('list_locations');
    expect(names).toContain('get_location');
    expect(names).toContain('list_resources');
    expect(names).toContain('get_resource');
    expect(names).toContain('list_services');
    expect(names).toContain('get_service');
    expect(names).toContain('list_service_groups');
    expect(adapter.tools.length).toBe(27);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_appointment requires id', async () => {
    const result = await adapter.callTool('get_appointment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('create_appointment requires body', async () => {
    const result = await adapter.callTool('create_appointment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('body is required');
  });

  it('get_available_times requires serviceId, startDate, endDate', async () => {
    const r1 = await adapter.callTool('get_available_times', {});
    expect(r1.isError).toBe(true);
    expect(r1.content[0].text).toContain('serviceId is required');

    const r2 = await adapter.callTool('get_available_times', { serviceId: 'svc1' });
    expect(r2.isError).toBe(true);
    expect(r2.content[0].text).toContain('startDate is required');

    const r3 = await adapter.callTool('get_available_times', { serviceId: 'svc1', startDate: '2026-04-01' });
    expect(r3.isError).toBe(true);
    expect(r3.content[0].text).toContain('endDate is required');
  });

  it('reschedule_appointment requires id and body', async () => {
    const r1 = await adapter.callTool('reschedule_appointment', {});
    expect(r1.isError).toBe(true);
    expect(r1.content[0].text).toContain('id is required');

    const r2 = await adapter.callTool('reschedule_appointment', { id: 'appt1' });
    expect(r2.isError).toBe(true);
    expect(r2.content[0].text).toContain('body is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = OnSchedConsumerMCPServer.catalog();
    expect(cat.name).toBe('onsched-consumer');
    expect(cat.category).toBe('productivity');
    expect(cat.toolNames.length).toBe(27);
    expect(cat.author).toBe('protectnil');
  });
});
