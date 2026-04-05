import { describe, it, expect } from 'vitest';
import { VisualCrossingWeatherMCPServer } from '../../src/mcp-servers/visualcrossing-weather.js';

describe('VisualCrossingWeatherMCPServer', () => {
  const adapter = new VisualCrossingWeatherMCPServer({ apiKey: 'test-api-key' });

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
    const cat = VisualCrossingWeatherMCPServer.catalog();
    expect(cat.name).toBe('visualcrossing-weather');
    expect(cat.category).toBe('data');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('all catalog toolNames match tools getter', () => {
    const cat = VisualCrossingWeatherMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_timeline_weather returns error when location missing', async () => {
    const result = await adapter.callTool('get_timeline_weather', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('location');
  });

  it('get_timeline_weather_from_date returns error when location missing', async () => {
    const result = await adapter.callTool('get_timeline_weather_from_date', { startdate: '2024-01-01' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('location');
  });

  it('get_timeline_weather_from_date returns error when startdate missing', async () => {
    const result = await adapter.callTool('get_timeline_weather_from_date', { location: 'London,UK' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('startdate');
  });

  it('get_timeline_weather_date_range returns error when location missing', async () => {
    const result = await adapter.callTool('get_timeline_weather_date_range', {
      startdate: '2024-01-01',
      enddate: '2024-01-31',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('location');
  });

  it('get_timeline_weather_date_range returns error when startdate missing', async () => {
    const result = await adapter.callTool('get_timeline_weather_date_range', {
      location: 'Paris, France',
      enddate: '2024-01-31',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('startdate');
  });

  it('get_timeline_weather_date_range returns error when enddate missing', async () => {
    const result = await adapter.callTool('get_timeline_weather_date_range', {
      location: 'Paris, France',
      startdate: '2024-01-01',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('enddate');
  });

  it('get_weather_forecast does not throw with empty args', async () => {
    // No required fields — should attempt a network call and fail gracefully or succeed
    const result = await adapter.callTool('get_weather_forecast', {});
    // Either succeeds or returns isError — must not throw
    expect(result.content).toBeDefined();
  });

  it('get_weather_history does not throw with empty args', async () => {
    const result = await adapter.callTool('get_weather_history', {});
    expect(result.content).toBeDefined();
  });
});
