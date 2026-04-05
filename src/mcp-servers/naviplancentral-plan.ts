/**
 * NaviPlan Central Plan MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official NaviPlan Central MCP server was found on GitHub.
//
// Base URL: https://demo.uat.naviplancentral.com/plan
// Auth: Session-based authentication. Call auth_login with username/password to establish a session.
//   The API uses cookies or a session token returned from the login endpoint.
//   Call auth_resume_session to extend the session duration.
// Rate limits: Not publicly documented. Contact Advicent/NaviPlan for rate limit details.
// Docs: https://demo.uat.naviplancentral.com/plan/swagger/ui/index
// Note: NaviPlan Central is a financial planning platform by Advicent. This API provides access to
//   financial plans including goals, projections, net worth, portfolio accounts, cash flow, and
//   Monte Carlo calculations. Plans are scoped by planId query parameter on most endpoints.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NaviplanCentralPlanConfig {
  baseUrl?: string;
  sessionCookie?: string;
}

export class NaviplanCentralPlanMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private sessionCookie: string;

  constructor(config: NaviplanCentralPlanConfig) {
    super();
    this.baseUrl = (config.baseUrl || 'https://demo.uat.naviplancentral.com/plan').replace(/\/$/, '');
    this.sessionCookie = config.sessionCookie || '';
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }
    return { ...headers, ...extra };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.buildHeaders(),
      credentials: 'include',
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await this.fetchWithRetry(url, init);
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Network error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `NaviPlan API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return { content: [{ type: 'text', text: text.slice(0, 10_000) }], isError: false };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private planQs(planId: string | undefined, extra?: Record<string, string>): string {
    const params = new URLSearchParams();
    if (planId) params.set('planId', planId);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        params.set(k, v);
      }
    }
    return params.toString() ? `?${params.toString()}` : '';
  }

  get tools(): ToolDefinition[] {
    return [
      // Auth
      {
        name: 'auth_login',
        description:
          'Start a session with the NaviPlan Central user store. Returns session credentials used for subsequent API calls. Must be called before other endpoints if no session cookie is configured.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'NaviPlan Central username.' },
            password: { type: 'string', description: 'NaviPlan Central password.' },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'auth_logout',
        description: 'End the current NaviPlan Central session.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'auth_resume_session',
        description: 'Validate and extend the duration of the current session.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_login_configuration',
        description: 'Retrieve login rules and password requirements for the NaviPlan Central instance.',
        inputSchema: { type: 'object', properties: {} },
      },
      // Plan information
      {
        name: 'get_plan_information',
        description: 'Retrieve general information about a financial plan, including plan name, client details, and creation date.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_plan_statuses',
        description: 'Retrieve data completion statuses for various sections of a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_assumptions',
        description: 'Retrieve planning assumptions for a financial plan, including inflation rates, return assumptions, and tax rates.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      // Advisors
      {
        name: 'list_advisors',
        description: 'Retrieve all advisors available in NaviPlan Central.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_advisor',
        description: 'Retrieve a specific advisor by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The advisor ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_advisors_for_client',
        description: 'Retrieve advisors assigned to a specific client within a household.',
        inputSchema: {
          type: 'object',
          properties: {
            household_id: { type: 'string', description: 'The household ID.' },
            client_id: { type: 'string', description: 'The client ID.' },
          },
          required: ['household_id', 'client_id'],
        },
      },
      // Households
      {
        name: 'get_households',
        description: 'Retrieve all households associated with the current user, optionally filtered by householdId.',
        inputSchema: {
          type: 'object',
          properties: {
            household_id: { type: 'string', description: 'Optional household ID filter.' },
          },
        },
      },
      // Family
      {
        name: 'get_family',
        description: 'Retrieve family members (client, co-client, dependants) for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      // Net worth
      {
        name: 'get_net_worth',
        description: 'Retrieve the current net worth summary for a financial plan, including total assets and liabilities.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_projected_net_worth',
        description: 'Retrieve projected net worth over time for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_projected_net_worth_by_year',
        description: 'Retrieve projected net worth for a specific year in a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The year index or ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Portfolio accounts
      {
        name: 'list_portfolio_accounts',
        description: 'Retrieve all portfolio (investment) accounts for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_portfolio_account',
        description: 'Retrieve a specific portfolio account by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The portfolio account ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Liabilities
      {
        name: 'list_liabilities',
        description: 'Retrieve all liabilities (debts, loans, mortgages) for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_liability',
        description: 'Retrieve a specific liability by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The liability ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Lifestyle assets
      {
        name: 'list_lifestyle_assets',
        description: 'Retrieve all lifestyle assets (home, vehicle, etc.) for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_lifestyle_asset',
        description: 'Retrieve a specific lifestyle asset by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The lifestyle asset ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Goals
      {
        name: 'list_goals',
        description: 'Retrieve all financial goals for a plan (retirement, education, major purchase, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_goal',
        description: 'Retrieve a specific financial goal by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The goal ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Goal adjustments
      {
        name: 'get_retirement_goal_adjustments',
        description: 'Retrieve retirement goal adjustment options (e.g. retirement age, savings rate changes) for a plan.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'calculate_retirement_goal_adjustments',
        description: 'Perform calculations for retirement goal adjustments and return updated projections.',
        inputSchema: {
          type: 'object',
          properties: {
            goal_adjustments: {
              type: 'object',
              description: 'The goal adjustment parameters to calculate.',
            },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['goal_adjustments', 'plan_id'],
        },
      },
      {
        name: 'get_education_goal_adjustments',
        description: 'Retrieve education goal adjustment options for a specific education goal.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The education goal ID.' },
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'client_id', 'plan_id'],
        },
      },
      {
        name: 'calculate_education_goal_adjustments',
        description: 'Perform calculations for education goal adjustments.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The education goal ID.' },
            goal_adjustments: {
              type: 'object',
              description: 'The goal adjustment parameters to calculate.',
            },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'goal_adjustments', 'plan_id'],
        },
      },
      {
        name: 'get_major_purchase_goal_adjustments',
        description: 'Retrieve major purchase goal adjustment options.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The major purchase goal ID.' },
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'client_id', 'plan_id'],
        },
      },
      {
        name: 'calculate_major_purchase_goal_adjustments',
        description: 'Perform calculations for major purchase goal adjustments.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The major purchase goal ID.' },
            goal_adjustments: {
              type: 'object',
              description: 'The goal adjustment parameters to calculate.',
            },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'goal_adjustments', 'plan_id'],
        },
      },
      {
        name: 'get_goal_success_rates',
        description: 'Retrieve a list of goals with their success rates (probability of meeting each goal).',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'get_goal_adjustment_restrictions',
        description: 'Retrieve restrictions on what goal adjustments are allowed for a client.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'get_what_are_my_options',
        description: 'Retrieve "What Are My Options" (WAMO) values for a specific goal, showing possible adjustments to meet the goal.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The goal ID.' },
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'client_id', 'plan_id'],
        },
      },
      // Projected goals
      {
        name: 'get_projected_needs_vs_abilities',
        description: 'Retrieve projected needs vs abilities data showing whether plan assets can meet goal requirements over time.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_assets_funding_goals',
        description: 'Retrieve data showing which assets are funding which goals over time.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      // Cash flow
      {
        name: 'get_projected_cash_flow',
        description: 'Retrieve projected cash flow for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_projected_cash_flow_by_year',
        description: 'Retrieve projected cash flow for a specific year.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The year index or ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Annual summary
      {
        name: 'get_projected_annual_summary',
        description: 'Retrieve projected annual summaries for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_projected_annual_summary_by_year',
        description: 'Retrieve projected annual summary for a specific year.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The year index or ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Monte Carlo
      {
        name: 'get_monte_carlo_results',
        description: 'Retrieve Monte Carlo simulation results showing probability distributions of plan outcomes.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      // Defined benefit pensions
      {
        name: 'list_defined_benefit_pensions',
        description: 'Retrieve all defined benefit pension plans for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_defined_benefit_pension',
        description: 'Retrieve a specific defined benefit pension by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The defined benefit pension ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Restricted stocks
      {
        name: 'list_restricted_stocks',
        description: 'Retrieve all restricted stock grants for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_restricted_stock',
        description: 'Retrieve a specific restricted stock grant by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The restricted stock ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Stock options
      {
        name: 'list_stock_options',
        description: 'Retrieve all stock options for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_stock_option',
        description: 'Retrieve a specific stock option by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The stock option ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Business entities
      {
        name: 'list_business_entities',
        description: 'Retrieve all business entities for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_business_entity',
        description: 'Retrieve a specific business entity by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The business entity ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // Holding companies
      {
        name: 'list_holding_companies',
        description: 'Retrieve all holding companies for a financial plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_holding_company',
        description: 'Retrieve a specific holding company by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The holding company ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'plan_id'],
        },
      },
      // LivePlan
      {
        name: 'liveplan_get_goals',
        description: 'Retrieve all goals from the LivePlan (client-facing live financial plan view).',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_goal_funding',
        description: 'Retrieve the list of funding accounts supporting goals in the LivePlan.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_what_are_my_options',
        description: 'Retrieve WAMO (What Are My Options) values for a goal in the LivePlan.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The goal ID.' },
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_accounts',
        description: 'Retrieve portfolio accounts for a plan via the LivePlan API.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_liabilities',
        description: 'Retrieve liabilities for a plan via the LivePlan API.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_lifestyle_assets',
        description: 'Retrieve lifestyle assets for a plan via the LivePlan API.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_real_estate',
        description: 'Retrieve real estate accounts for a plan via the LivePlan API.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_projected_net_worth',
        description: 'Retrieve projected net worth data via the LivePlan API.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['client_id', 'plan_id'],
        },
      },
      {
        name: 'liveplan_get_needs_vs_abilities',
        description: 'Retrieve needs vs abilities projections for a goal via the LivePlan API.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The goal ID.' },
            client_id: { type: 'string', description: 'The client ID.' },
            plan_id: { type: 'string', description: 'The identifier of the financial plan.' },
          },
          required: ['id', 'client_id', 'plan_id'],
        },
      },
      // Service info
      {
        name: 'get_service_statistics',
        description: 'Retrieve NaviPlan Central service health statistics. Useful for checking if the service is operational.',
        inputSchema: { type: 'object', properties: {} },
      },
      // Password
      {
        name: 'get_password_requirements',
        description: 'Retrieve password complexity requirements for NaviPlan Central.',
        inputSchema: { type: 'object', properties: {} },
      },
      // EULA
      {
        name: 'accept_eula',
        description: 'Accept the NaviPlan Central End User License Agreement (EULA) for the current user.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'auth_login':
          return await this.authLogin(args);
        case 'auth_logout':
          return await this.request('POST', '/api/auth/Logout');
        case 'auth_resume_session':
          return await this.request('POST', '/api/auth/ResumeSession');
        case 'get_login_configuration':
          return await this.request('GET', '/api/auth/LoginConfiguration');
        case 'get_plan_information':
          return await this.planGet('/api/PlanInformation', args);
        case 'get_plan_statuses':
          return await this.planGet('/api/PlanStatuses', args);
        case 'get_assumptions':
          return await this.planGet('/api/Assumptions', args);
        case 'list_advisors':
          return await this.request('GET', '/api/Advisors');
        case 'get_advisor':
          return await this.getById('/api/Advisors', args);
        case 'get_advisors_for_client':
          return await this.getAdvisorsForClient(args);
        case 'get_households':
          return await this.getHouseholds(args);
        case 'get_family':
          return await this.planGet('/api/Family', args);
        case 'get_net_worth':
          return await this.planGet('/api/NetWorth', args);
        case 'get_projected_net_worth':
          return await this.planGet('/api/ProjectedNetWorth', args);
        case 'get_projected_net_worth_by_year':
          return await this.getByIdAndPlan('/api/ProjectedNetWorth', args);
        case 'list_portfolio_accounts':
          return await this.planGet('/api/PortfolioAccounts', args);
        case 'get_portfolio_account':
          return await this.getByIdAndPlan('/api/PortfolioAccounts', args);
        case 'list_liabilities':
          return await this.planGet('/api/Liabilities', args);
        case 'get_liability':
          return await this.getByIdAndPlan('/api/Liabilities', args);
        case 'list_lifestyle_assets':
          return await this.planGet('/api/LifestyleAssets', args);
        case 'get_lifestyle_asset':
          return await this.getByIdAndPlan('/api/LifestyleAssets', args);
        case 'list_goals':
          return await this.planGet('/api/Goals', args);
        case 'get_goal':
          return await this.getByIdAndPlan('/api/Goals', args);
        case 'get_retirement_goal_adjustments':
          return await this.getRetirementAdjustments(args);
        case 'calculate_retirement_goal_adjustments':
          return await this.calcRetirementAdjustments(args);
        case 'get_education_goal_adjustments':
          return await this.getEducationAdjustments(args);
        case 'calculate_education_goal_adjustments':
          return await this.calcEducationAdjustments(args);
        case 'get_major_purchase_goal_adjustments':
          return await this.getMajorPurchaseAdjustments(args);
        case 'calculate_major_purchase_goal_adjustments':
          return await this.calcMajorPurchaseAdjustments(args);
        case 'get_goal_success_rates':
          return await this.getGoalSuccessRates(args);
        case 'get_goal_adjustment_restrictions':
          return await this.getGoalAdjustmentRestrictions(args);
        case 'get_what_are_my_options':
          return await this.getWamo(args);
        case 'get_projected_needs_vs_abilities':
          return await this.planGet('/api/ProjectedGoals/NeedsVsAbilities', args);
        case 'get_assets_funding_goals':
          return await this.planGet('/api/ProjectedGoals/AssetsFundingGoals', args);
        case 'get_projected_cash_flow':
          return await this.planGet('/api/ProjectedCashFlow', args);
        case 'get_projected_cash_flow_by_year':
          return await this.getByIdAndPlan('/api/ProjectedCashFlow', args);
        case 'get_projected_annual_summary':
          return await this.planGet('/api/ProjectedAnnualSummary', args);
        case 'get_projected_annual_summary_by_year':
          return await this.getByIdAndPlan('/api/ProjectedAnnualSummary', args);
        case 'get_monte_carlo_results':
          return await this.planGet('/api/Calculations/MonteCarlo', args);
        case 'list_defined_benefit_pensions':
          return await this.planGet('/api/DefinedBenefitPensions', args);
        case 'get_defined_benefit_pension':
          return await this.getByIdAndPlan('/api/DefinedBenefitPensions', args);
        case 'list_restricted_stocks':
          return await this.planGet('/api/RestrictedStocks', args);
        case 'get_restricted_stock':
          return await this.getByIdAndPlan('/api/RestrictedStocks', args);
        case 'list_stock_options':
          return await this.planGet('/api/StockOptions', args);
        case 'get_stock_option':
          return await this.getByIdAndPlan('/api/StockOptions', args);
        case 'list_business_entities':
          return await this.planGet('/api/BusinessEntities', args);
        case 'get_business_entity':
          return await this.getByIdAndPlan('/api/BusinessEntities', args);
        case 'list_holding_companies':
          return await this.planGet('/api/HoldingCompanies', args);
        case 'get_holding_company':
          return await this.getByIdAndPlan('/api/HoldingCompanies', args);
        case 'liveplan_get_goals':
          return await this.liveplanClientPlanGet('/api/LivePlan/Goals', args);
        case 'liveplan_get_goal_funding':
          return await this.liveplanClientPlanGet('/api/LivePlan/Goals/Funding', args);
        case 'liveplan_get_what_are_my_options':
          return await this.liveplanWamo(args);
        case 'liveplan_get_accounts':
          return await this.liveplanClientPlanGet('/api/LivePlan/NetWorth/Accounts', args);
        case 'liveplan_get_liabilities':
          return await this.liveplanClientPlanGet('/api/LivePlan/NetWorth/Liabilities', args);
        case 'liveplan_get_lifestyle_assets':
          return await this.liveplanClientPlanGet('/api/LivePlan/NetWorth/LifestyleAssets', args);
        case 'liveplan_get_real_estate':
          return await this.liveplanClientPlanGet('/api/LivePlan/NetWorth/RealEstate', args);
        case 'liveplan_get_projected_net_worth':
          return await this.liveplanClientPlanGet('/api/LivePlan/Projections/NetWorth', args);
        case 'liveplan_get_needs_vs_abilities':
          return await this.liveplanNeedsVsAbilities(args);
        case 'get_service_statistics':
          return await this.request('GET', '/api/ServiceInformation/Statistics');
        case 'get_password_requirements':
          return await this.request('GET', '/api/Password/PasswordRequirements');
        case 'accept_eula':
          return await this.request('POST', '/api/Eula/Accept');
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async authLogin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.password) {
      return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
    }
    return this.request('POST', '/api/auth/Login', { username: args.username, password: args.password });
  }

  private async planGet(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.plan_id) {
      return { content: [{ type: 'text', text: 'plan_id is required' }], isError: true };
    }
    return this.request('GET', `${basePath}${this.planQs(args.plan_id as string)}`);
  }

  private async getById(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `${basePath}/${args.id}`);
  }

  private async getByIdAndPlan(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id and plan_id are required' }], isError: true };
    }
    return this.request('GET', `${basePath}/${args.id}${this.planQs(args.plan_id as string)}`);
  }

  private async getAdvisorsForClient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.household_id || !args.client_id) {
      return { content: [{ type: 'text', text: 'household_id and client_id are required' }], isError: true };
    }
    return this.request('GET', `/api/Advisors/${args.household_id}/${args.client_id}`);
  }

  private async getHouseholds(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = args.household_id ? `?householdId=${args.household_id}` : '';
    return this.request('GET', `/api/Households${qs}`);
  }

  private async getRetirementAdjustments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'client_id and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/GoalAdjustments/Retirement/Adjustments${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async calcRetirementAdjustments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.goal_adjustments || !args.plan_id) {
      return { content: [{ type: 'text', text: 'goal_adjustments and plan_id are required' }], isError: true };
    }
    return this.request('POST', `/api/GoalAdjustments/Retirement/Calculations${this.planQs(args.plan_id as string)}`, args.goal_adjustments);
  }

  private async getEducationAdjustments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id, client_id, and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/GoalAdjustments/Education/${args.id}/Adjustments${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async calcEducationAdjustments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.goal_adjustments || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id, goal_adjustments, and plan_id are required' }], isError: true };
    }
    return this.request('POST', `/api/GoalAdjustments/Education/${args.id}/Calculations${this.planQs(args.plan_id as string)}`, args.goal_adjustments);
  }

  private async getMajorPurchaseAdjustments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id, client_id, and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/GoalAdjustments/MajorPurchase/${args.id}/Adjustments${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async calcMajorPurchaseAdjustments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.goal_adjustments || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id, goal_adjustments, and plan_id are required' }], isError: true };
    }
    return this.request('POST', `/api/GoalAdjustments/MajorPurchase/${args.id}/Calculations${this.planQs(args.plan_id as string)}`, args.goal_adjustments);
  }

  private async getGoalSuccessRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'client_id and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/GoalAdjustments/GoalSuccessRates${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async getGoalAdjustmentRestrictions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'client_id and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/GoalAdjustments/Restrictions${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async getWamo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id, client_id, and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/GoalAdjustments/${args.id}/WhatAreMyOptions${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async liveplanClientPlanGet(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'client_id and plan_id are required' }], isError: true };
    }
    return this.request('GET', `${basePath}${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async liveplanWamo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id, client_id, and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/LivePlan/Goals/${args.id}/WhatAreMyOptions${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  private async liveplanNeedsVsAbilities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.client_id || !args.plan_id) {
      return { content: [{ type: 'text', text: 'id, client_id, and plan_id are required' }], isError: true };
    }
    return this.request('GET', `/api/LivePlan/Projections/${args.id}/NeedsVsAbilities${this.planQs(args.plan_id as string, { clientId: args.client_id as string })}`);
  }

  static catalog() {
    return {
      name: 'naviplancentral-plan',
      displayName: 'NaviPlan Central — Financial Planning',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'naviplancentral', 'naviplan', 'advicent', 'financial-planning', 'retirement',
        'goals', 'net-worth', 'cash-flow', 'monte-carlo', 'portfolio', 'investment',
        'projection', 'plan', 'wealth', 'advisor', 'finance',
      ],
      toolNames: [
        'auth_login',
        'auth_logout',
        'auth_resume_session',
        'get_login_configuration',
        'get_plan_information',
        'get_plan_statuses',
        'get_assumptions',
        'list_advisors',
        'get_advisor',
        'get_advisors_for_client',
        'get_households',
        'get_family',
        'get_net_worth',
        'get_projected_net_worth',
        'get_projected_net_worth_by_year',
        'list_portfolio_accounts',
        'get_portfolio_account',
        'list_liabilities',
        'get_liability',
        'list_lifestyle_assets',
        'get_lifestyle_asset',
        'list_goals',
        'get_goal',
        'get_retirement_goal_adjustments',
        'calculate_retirement_goal_adjustments',
        'get_education_goal_adjustments',
        'calculate_education_goal_adjustments',
        'get_major_purchase_goal_adjustments',
        'calculate_major_purchase_goal_adjustments',
        'get_goal_success_rates',
        'get_goal_adjustment_restrictions',
        'get_what_are_my_options',
        'get_projected_needs_vs_abilities',
        'get_assets_funding_goals',
        'get_projected_cash_flow',
        'get_projected_cash_flow_by_year',
        'get_projected_annual_summary',
        'get_projected_annual_summary_by_year',
        'get_monte_carlo_results',
        'list_defined_benefit_pensions',
        'get_defined_benefit_pension',
        'list_restricted_stocks',
        'get_restricted_stock',
        'list_stock_options',
        'get_stock_option',
        'list_business_entities',
        'get_business_entity',
        'list_holding_companies',
        'get_holding_company',
        'liveplan_get_goals',
        'liveplan_get_goal_funding',
        'liveplan_get_what_are_my_options',
        'liveplan_get_accounts',
        'liveplan_get_liabilities',
        'liveplan_get_lifestyle_assets',
        'liveplan_get_real_estate',
        'liveplan_get_projected_net_worth',
        'liveplan_get_needs_vs_abilities',
        'get_service_statistics',
        'get_password_requirements',
        'accept_eula',
      ],
      description:
        'NaviPlan Central financial planning API: access and calculate financial plans including goals (retirement, education, major purchase), net worth projections, cash flow, portfolio accounts, liabilities, Monte Carlo simulations, defined benefit pensions, stock options, and the LivePlan client-facing view.',
      author: 'protectnil' as const,
    };
  }
}
