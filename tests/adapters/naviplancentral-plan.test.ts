import { describe, it, expect } from 'vitest';
import { NaviplanCentralPlanMCPServer } from '../../src/mcp-servers/naviplancentral-plan.js';

describe('NaviplanCentralPlanMCPServer', () => {
  const adapter = new NaviplanCentralPlanMCPServer({
    baseUrl: 'https://demo.uat.naviplancentral.com/plan',
    sessionCookie: 'session=test-session-cookie-abc123',
  });

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
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns correct metadata', () => {
    const cat = NaviplanCentralPlanMCPServer.catalog();
    expect(cat.name).toBe('naviplancentral-plan');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = NaviplanCentralPlanMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolNames).toContain(n);
    }
  });

  it('auth_login returns error when credentials missing', async () => {
    const result = await adapter.callTool('auth_login', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('username and password are required');
  });

  it('get_plan_information returns error when plan_id missing', async () => {
    const result = await adapter.callTool('get_plan_information', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('get_plan_statuses returns error when plan_id missing', async () => {
    const result = await adapter.callTool('get_plan_statuses', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('get_assumptions returns error when plan_id missing', async () => {
    const result = await adapter.callTool('get_assumptions', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('get_advisor returns error when id missing', async () => {
    const result = await adapter.callTool('get_advisor', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_advisors_for_client returns error when params missing', async () => {
    const result = await adapter.callTool('get_advisors_for_client', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('household_id and client_id are required');
  });

  it('get_family returns error when plan_id missing', async () => {
    const result = await adapter.callTool('get_family', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('get_net_worth returns error when plan_id missing', async () => {
    const result = await adapter.callTool('get_net_worth', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('get_projected_net_worth_by_year returns error when id or plan_id missing', async () => {
    const result = await adapter.callTool('get_projected_net_worth_by_year', { plan_id: 'p1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id and plan_id are required');
  });

  it('list_portfolio_accounts returns error when plan_id missing', async () => {
    const result = await adapter.callTool('list_portfolio_accounts', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('list_liabilities returns error when plan_id missing', async () => {
    const result = await adapter.callTool('list_liabilities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('list_goals returns error when plan_id missing', async () => {
    const result = await adapter.callTool('list_goals', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('get_retirement_goal_adjustments returns error when params missing', async () => {
    const result = await adapter.callTool('get_retirement_goal_adjustments', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('client_id and plan_id are required');
  });

  it('calculate_retirement_goal_adjustments returns error when params missing', async () => {
    const result = await adapter.callTool('calculate_retirement_goal_adjustments', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('goal_adjustments and plan_id are required');
  });

  it('get_education_goal_adjustments returns error when params missing', async () => {
    const result = await adapter.callTool('get_education_goal_adjustments', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id, client_id, and plan_id are required');
  });

  it('get_goal_success_rates returns error when params missing', async () => {
    const result = await adapter.callTool('get_goal_success_rates', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('client_id and plan_id are required');
  });

  it('get_what_are_my_options returns error when params missing', async () => {
    const result = await adapter.callTool('get_what_are_my_options', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id, client_id, and plan_id are required');
  });

  it('get_monte_carlo_results returns error when plan_id missing', async () => {
    const result = await adapter.callTool('get_monte_carlo_results', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('plan_id is required');
  });

  it('liveplan_get_goals returns error when params missing', async () => {
    const result = await adapter.callTool('liveplan_get_goals', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('client_id and plan_id are required');
  });

  it('liveplan_get_what_are_my_options returns error when params missing', async () => {
    const result = await adapter.callTool('liveplan_get_what_are_my_options', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id, client_id, and plan_id are required');
  });

  it('liveplan_get_needs_vs_abilities returns error when params missing', async () => {
    const result = await adapter.callTool('liveplan_get_needs_vs_abilities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id, client_id, and plan_id are required');
  });

  it('instantiates without session cookie', () => {
    const bare = new NaviplanCentralPlanMCPServer({});
    expect(bare).toBeDefined();
  });

  it('catalog displayName is set', () => {
    const cat = NaviplanCentralPlanMCPServer.catalog();
    expect(cat.displayName).toBeTruthy();
  });

  it('catalog keywords include finance-related terms', () => {
    const cat = NaviplanCentralPlanMCPServer.catalog();
    expect(cat.keywords).toContain('financial-planning');
    expect(cat.keywords).toContain('retirement');
  });
});
