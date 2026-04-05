import { describe, it, expect } from 'vitest';
import { CitrixonlineGotomeetingMCPServer } from '../../src/mcp-servers/citrixonline-gotomeeting.js';

describe('CitrixonlineGotomeetingMCPServer', () => {
  const adapter = new CitrixonlineGotomeetingMCPServer({ accessToken: 'test-token' });

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

  it('exposes all 23 GoToMeeting tools', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = [
      'create_meeting', 'get_meeting', 'update_meeting', 'delete_meeting',
      'start_meeting', 'get_meeting_attendees', 'get_upcoming_meetings', 'get_historical_meetings',
      'get_organizers', 'create_organizer', 'delete_organizer_by_email',
      'get_organizer', 'update_organizer', 'delete_organizer',
      'get_organizer_upcoming_meetings', 'get_organizer_historical_meetings', 'get_organizer_attendees',
      'get_groups', 'get_group_organizers', 'create_organizer_in_group',
      'get_group_upcoming_meetings', 'get_group_historical_meetings', 'get_group_attendees',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
    expect(adapter.tools.length).toBe(23);
  });

  it('create_meeting has all required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'create_meeting');
    const required = tool?.inputSchema.required ?? [];
    expect(required).toContain('subject');
    expect(required).toContain('starttime');
    expect(required).toContain('endtime');
    expect(required).toContain('passwordrequired');
    expect(required).toContain('conferencecallinfo');
    expect(required).toContain('meetingtype');
  });

  it('create_organizer has all required fields', () => {
    const tool = adapter.tools.find(t => t.name === 'create_organizer');
    const required = tool?.inputSchema.required ?? [];
    expect(required).toContain('organizerEmail');
    expect(required).toContain('firstName');
    expect(required).toContain('lastName');
    expect(required).toContain('productType');
  });

  it('historical meeting tools require date range', () => {
    const historical = adapter.tools.find(t => t.name === 'get_historical_meetings');
    expect(historical?.inputSchema.required).toContain('startDate');
    expect(historical?.inputSchema.required).toContain('endDate');

    const orgHistorical = adapter.tools.find(t => t.name === 'get_organizer_historical_meetings');
    expect(orgHistorical?.inputSchema.required).toContain('organizerKey');
    expect(orgHistorical?.inputSchema.required).toContain('startDate');
    expect(orgHistorical?.inputSchema.required).toContain('endDate');
  });

  it('respects custom baseUrl', () => {
    const custom = new CitrixonlineGotomeetingMCPServer({
      accessToken: 'tok',
      baseUrl: 'https://custom.example.com/G2M/rest',
    });
    expect(custom).toBeDefined();
    expect(custom.tools.length).toBe(23);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
