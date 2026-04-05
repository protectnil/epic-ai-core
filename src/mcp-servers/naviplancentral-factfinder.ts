/**
 * NaviPlan Central Fact Finder MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official NaviPlan Central MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://demo.uat.naviplancentral.com/factfinder
// Auth: No securityDefinitions in spec; consult NaviPlan portal for API credentials.
//   Typically passed as Authorization Bearer token per tenant configuration.
// Docs: https://demo.uat.naviplancentral.com/factfinder/swagger/docs/v1
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NaviPlanCentralFactFinderConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class NaviPlanCentralFactFinderMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: NaviPlanCentralFactFinderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://demo.uat.naviplancentral.com/factfinder';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_fact_finders',
        description: 'List Fact Finders for a given household. Returns plan status, creation dates, and associated client data.',
        inputSchema: {
          type: 'object',
          properties: {
            householdId: {
              type: 'number',
              description: 'Optional household ID to filter Fact Finders.',
            },
          },
        },
      },
      {
        name: 'create_fact_finder',
        description: 'Create a new Fact Finder for a household.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'object',
              description: 'Fact Finder creation payload (see NaviPlan API docs for schema details).',
            },
          },
          required: ['model'],
        },
      },
      {
        name: 'get_fact_finder',
        description: 'Get a specific Fact Finder by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_fact_finder_snapshots',
        description: 'List all snapshots (historical versions) of a specific Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_accounts',
        description: 'Get all financial accounts associated with a Fact Finder, optionally filtered by external source ID.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
            externalSourceId: {
              type: 'string',
              description: 'Optional external source identifier to filter accounts.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_account',
        description: 'Get a specific account by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The account ID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_demographics',
        description: 'Get demographic information (client and spouse details) for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_incomes',
        description: 'Get all income entries for a Fact Finder, including employment, self-employment, and other income sources.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_expenses',
        description: 'Get all expense entries for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_liabilities',
        description: 'Get all liabilities (debts, loans, mortgages) for a Fact Finder, optionally filtered by external source ID.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
            externalSourceId: {
              type: 'string',
              description: 'Optional external source identifier to filter liabilities.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_real_estate_assets',
        description: 'Get all real estate assets for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_lifestyle_assets',
        description: 'Get all lifestyle assets (vehicles, collectibles, personal property) for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_life_insurance_policies',
        description: 'Get all life insurance policies for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_disability_insurance_policies',
        description: 'Get all disability insurance policies for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_long_term_care_insurance_policies',
        description: 'Get all long-term care insurance policies for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_retirement_goals',
        description: 'Get retirement goals and associated retirement expenses for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_education_goals',
        description: 'Get education funding goals and associated education expenses for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_major_purchase_goals',
        description: 'Get major purchase goals (e.g., vacation, home purchase) for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_defined_benefit_pensions',
        description: 'Get all defined benefit pension entries for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
          },
          required: ['factFinderId'],
        },
      },
      {
        name: 'get_presentation_summary',
        description: 'Get a combined presentation-ready summary of accounts, incomes, liabilities, life insurance policies, and pensions for a Fact Finder.',
        inputSchema: {
          type: 'object',
          properties: {
            factFinderId: {
              type: 'number',
              description: 'The Fact Finder ID.',
            },
            externalSourceId: {
              type: 'string',
              description: 'Optional external source identifier for filtering accounts and liabilities.',
            },
          },
          required: ['factFinderId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_fact_finders':
          return await this.getFactFinders(args);
        case 'create_fact_finder':
          return await this.createFactFinder(args);
        case 'get_fact_finder':
          return await this.getFactFinder(args);
        case 'get_fact_finder_snapshots':
          return await this.getFactFinderSnapshots(args);
        case 'get_accounts':
          return await this.getAccounts(args);
        case 'get_account':
          return await this.getAccount(args);
        case 'get_demographics':
          return await this.getDemographics(args);
        case 'get_incomes':
          return await this.getIncomes(args);
        case 'get_expenses':
          return await this.getExpenses(args);
        case 'get_liabilities':
          return await this.getLiabilities(args);
        case 'get_real_estate_assets':
          return await this.getRealEstateAssets(args);
        case 'get_lifestyle_assets':
          return await this.getLifestyleAssets(args);
        case 'get_life_insurance_policies':
          return await this.getLifeInsurancePolicies(args);
        case 'get_disability_insurance_policies':
          return await this.getDisabilityInsurancePolicies(args);
        case 'get_long_term_care_insurance_policies':
          return await this.getLongTermCareInsurancePolicies(args);
        case 'get_retirement_goals':
          return await this.getRetirementGoals(args);
        case 'get_education_goals':
          return await this.getEducationGoals(args);
        case 'get_major_purchase_goals':
          return await this.getMajorPurchaseGoals(args);
        case 'get_defined_benefit_pensions':
          return await this.getDefinedBenefitPensions(args);
        case 'get_presentation_summary':
          return await this.getPresentationSummary(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method,
      headers: this.buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `NaviPlan Central API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`NaviPlan Central returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated =
      text.length > 10_000
        ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
        : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getFactFinders(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/api/FactFinders';
    if (args.householdId !== undefined) {
      path += `?householdId=${encodeURIComponent(String(args.householdId))}`;
    }
    return this.request(path, 'GET');
  }

  private async createFactFinder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model) {
      return { content: [{ type: 'text', text: 'model is required' }], isError: true };
    }
    return this.request('/api/FactFinders', 'POST', args.model);
  }

  private async getFactFinder(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined || args.id === null) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request(`/api/FactFinders/${encodeURIComponent(String(args.id))}`, 'GET');
  }

  private async getFactFinderSnapshots(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/FactFinders/${encodeURIComponent(String(args.factFinderId))}/Snapshots`, 'GET');
  }

  private async getAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    let path = `/api/Accounts?factFinderId=${encodeURIComponent(String(args.factFinderId))}`;
    if (args.externalSourceId) {
      path += `&externalSourceId=${encodeURIComponent(String(args.externalSourceId))}`;
    }
    return this.request(path, 'GET');
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined || args.id === null) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request(`/api/Accounts/${encodeURIComponent(String(args.id))}`, 'GET');
  }

  private async getDemographics(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/Demographics?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getIncomes(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/Incomes?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getExpenses(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/Expenses?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getLiabilities(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    let path = `/api/Liabilities?factFinderId=${encodeURIComponent(String(args.factFinderId))}`;
    if (args.externalSourceId) {
      path += `&externalSourceId=${encodeURIComponent(String(args.externalSourceId))}`;
    }
    return this.request(path, 'GET');
  }

  private async getRealEstateAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/RealEstateAssets?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getLifestyleAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/LifestyleAssets?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getLifeInsurancePolicies(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/LifeInsurancePolicies?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getDisabilityInsurancePolicies(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/DisabilityInsurancePolicies?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getLongTermCareInsurancePolicies(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/LongTermCareInsurancePolicies?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getRetirementGoals(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/RetirementGoals?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getEducationGoals(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/EducationGoals?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getMajorPurchaseGoals(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/MajorPurchaseGoals?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getDefinedBenefitPensions(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    return this.request(`/api/DefinedBenefitPensions?factFinderId=${encodeURIComponent(String(args.factFinderId))}`, 'GET');
  }

  private async getPresentationSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.factFinderId === undefined || args.factFinderId === null) {
      return { content: [{ type: 'text', text: 'factFinderId is required' }], isError: true };
    }
    const qs = `?factFinderId=${encodeURIComponent(String(args.factFinderId))}${args.externalSourceId ? `&externalSourceId=${encodeURIComponent(String(args.externalSourceId))}` : ''}`;

    const [accounts, incomes, liabilities, lifeInsurance, pensions] = await Promise.all([
      this.request(`/api/Presentation/Accounts${qs}`, 'GET'),
      this.request(`/api/Presentation/Incomes${qs}`, 'GET'),
      this.request(`/api/Presentation/Liabilities${qs}`, 'GET'),
      this.request(`/api/Presentation/LifeInsurancePolicies${qs}`, 'GET'),
      this.request(`/api/Presentation/Pensions${qs}`, 'GET'),
    ]);

    const tryParse = (r: ToolResult) => {
      if (r.isError) return { error: r.content[0]?.text };
      try { return JSON.parse(r.content[0]?.text || 'null'); } catch { return r.content[0]?.text; }
    };

    const summary = {
      accounts: tryParse(accounts),
      incomes: tryParse(incomes),
      liabilities: tryParse(liabilities),
      lifeInsurance: tryParse(lifeInsurance),
      pensions: tryParse(pensions),
    };

    const text = JSON.stringify(summary, null, 2);
    const truncated =
      text.length > 10_000
        ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
        : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  static catalog() {
    return {
      name: 'naviplancentral-factfinder',
      displayName: 'NaviPlan Central Fact Finder',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'naviplancentral',
        'naviplan',
        'factfinder',
        'fact-finder',
        'financial planning',
        'wealth management',
        'retirement',
        'insurance',
        'assets',
        'liabilities',
        'demographics',
        'income',
        'expenses',
        'education goals',
        'advicent',
      ],
      toolNames: [
        'get_fact_finders',
        'create_fact_finder',
        'get_fact_finder',
        'get_fact_finder_snapshots',
        'get_accounts',
        'get_account',
        'get_demographics',
        'get_incomes',
        'get_expenses',
        'get_liabilities',
        'get_real_estate_assets',
        'get_lifestyle_assets',
        'get_life_insurance_policies',
        'get_disability_insurance_policies',
        'get_long_term_care_insurance_policies',
        'get_retirement_goals',
        'get_education_goals',
        'get_major_purchase_goals',
        'get_defined_benefit_pensions',
        'get_presentation_summary',
      ],
      description:
        'NaviPlan Central Fact Finder adapter — financial planning data including accounts, incomes, liabilities, insurance policies, and retirement/education goals.',
      author: 'protectnil' as const,
    };
  }
}
