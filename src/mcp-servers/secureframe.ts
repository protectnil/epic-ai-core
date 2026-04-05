/**
 * Secureframe MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/secureframe/secureframe-mcp-server — transport: stdio, auth: API Key + Secret
// Our adapter covers: 12 tools. Vendor MCP covers: 11 read-only tools.
// Recommendation: use-both — each side has unique tools the other does not cover.
//
// Integration: use-both
// MCP-sourced tools (7): list_users, list_devices, list_user_accounts, list_tprm_vendors,
//   list_repositories, list_integration_connections, list_repository_framework_scopes
// REST-sourced tools (8): get_control, get_test, get_vendor, get_personnel_member,
//   list_evidence, list_integrations, get_compliance_summary, list_personnel
// Shared tools (4): list_controls, list_tests, list_vendors, list_frameworks
// Combined coverage: 19 tools (MCP: 11 + REST: 12 - shared: 4)
//
// Base URL: https://api.secureframe.com
// Auth: API Key + Secret — Authorization header: "API_KEY API_SECRET"
// Docs: https://developer.secureframe.com/
// Rate limits: Not publicly documented; standard enterprise limits apply.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SecureframeConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export class SecureframeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor(config: SecureframeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://api.secureframe.com';
  }

  static catalog() {
    return {
      name: 'secureframe',
      displayName: 'Secureframe',
      version: '1.0.0',
      category: 'compliance',
      keywords: [
        'secureframe', 'compliance', 'soc2', 'iso27001', 'hipaa', 'gdpr', 'cmmc', 'fedramp',
        'controls', 'audit', 'evidence', 'vendor', 'risk', 'personnel', 'test', 'framework',
      ],
      toolNames: [
        'list_controls', 'get_control', 'list_tests', 'get_test',
        'list_vendors', 'get_vendor', 'list_personnel', 'get_personnel_member',
        'list_evidence', 'list_frameworks', 'list_integrations', 'get_compliance_summary',
      ],
      description: 'Secureframe compliance automation: query security controls, audit tests, vendor assessments, personnel records, evidence, and framework status across SOC 2, ISO 27001, HIPAA, and more.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_controls',
        description: 'List security controls with optional filters for status, framework, and owner',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by control status: passing, failing, in_progress, not_applicable (optional)',
            },
            framework: {
              type: 'string',
              description: 'Filter by compliance framework: soc2, iso27001, hipaa, gdpr, cmmc, fedramp (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_control',
        description: 'Get detailed information about a specific security control by its ID including tests and evidence',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Control ID from list_controls',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'list_tests',
        description: 'List compliance tests (automated checks) with optional filters for status and control',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by test status: passing, failing, error, pending (optional)',
            },
            control_id: {
              type: 'string',
              description: 'Filter tests by parent control ID (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_test',
        description: 'Get detailed results for a specific compliance test by test ID',
        inputSchema: {
          type: 'object',
          properties: {
            test_id: {
              type: 'string',
              description: 'Test ID from list_tests',
            },
          },
          required: ['test_id'],
        },
      },
      {
        name: 'list_vendors',
        description: 'List third-party vendors in the vendor risk management program with optional risk tier filter',
        inputSchema: {
          type: 'object',
          properties: {
            risk_tier: {
              type: 'string',
              description: 'Filter by risk tier: critical, high, medium, low (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by review status: approved, pending_review, rejected (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get detailed vendor risk assessment information for a specific vendor by ID',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'Vendor ID from list_vendors',
            },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'list_personnel',
        description: 'List personnel records in the compliance program including onboarding and training status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by onboarding status: complete, incomplete, pending (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_personnel_member',
        description: 'Get compliance and training status details for a specific personnel member by ID',
        inputSchema: {
          type: 'object',
          properties: {
            personnel_id: {
              type: 'string',
              description: 'Personnel member ID from list_personnel',
            },
          },
          required: ['personnel_id'],
        },
      },
      {
        name: 'list_evidence',
        description: 'List evidence items collected for compliance controls with optional control and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Filter evidence by parent control ID (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by evidence status: accepted, rejected, pending (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_frameworks',
        description: 'List all compliance frameworks configured in the Secureframe account with overall readiness scores',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_integrations',
        description: 'List all connected integrations and their sync status in the Secureframe account',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by integration status: active, inactive, error (optional)',
            },
          },
        },
      },
      {
        name: 'get_compliance_summary',
        description: 'Get a high-level compliance readiness summary showing passing, failing, and total controls per framework',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Specific framework to summarize: soc2, iso27001, hipaa, gdpr (optional — all frameworks if omitted)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_controls':
          return this.listControls(args);
        case 'get_control':
          return this.getControl(args);
        case 'list_tests':
          return this.listTests(args);
        case 'get_test':
          return this.getTest(args);
        case 'list_vendors':
          return this.listVendors(args);
        case 'get_vendor':
          return this.getVendor(args);
        case 'list_personnel':
          return this.listPersonnel(args);
        case 'get_personnel_member':
          return this.getPersonnelMember(args);
        case 'list_evidence':
          return this.listEvidence(args);
        case 'list_frameworks':
          return this.listFrameworks();
        case 'list_integrations':
          return this.listIntegrations(args);
        case 'get_compliance_summary':
          return this.getComplianceSummary(args);
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `${this.apiKey} ${this.apiSecret}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listControls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 25),
    };
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.framework) params['filter[framework]'] = args.framework as string;
    return this.get('/v1/controls', params);
  }

  private async getControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.control_id) return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
    return this.get(`/v1/controls/${encodeURIComponent(args.control_id as string)}`);
  }

  private async listTests(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 25),
    };
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.control_id) params['filter[control_id]'] = args.control_id as string;
    return this.get('/v1/tests', params);
  }

  private async getTest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.test_id) return { content: [{ type: 'text', text: 'test_id is required' }], isError: true };
    return this.get(`/v1/tests/${encodeURIComponent(args.test_id as string)}`);
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { page: String((args.page as number) || 1) };
    if (args.risk_tier) params['filter[risk_tier]'] = args.risk_tier as string;
    if (args.status) params['filter[status]'] = args.status as string;
    return this.get('/v1/vendors', params);
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vendor_id) return { content: [{ type: 'text', text: 'vendor_id is required' }], isError: true };
    return this.get(`/v1/vendors/${encodeURIComponent(args.vendor_id as string)}`);
  }

  private async listPersonnel(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 25),
    };
    if (args.status) params['filter[status]'] = args.status as string;
    return this.get('/v1/personnel', params);
  }

  private async getPersonnelMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.personnel_id) return { content: [{ type: 'text', text: 'personnel_id is required' }], isError: true };
    return this.get(`/v1/personnel/${encodeURIComponent(args.personnel_id as string)}`);
  }

  private async listEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { page: String((args.page as number) || 1) };
    if (args.control_id) params['filter[control_id]'] = args.control_id as string;
    if (args.status) params['filter[status]'] = args.status as string;
    return this.get('/v1/evidence', params);
  }

  private async listFrameworks(): Promise<ToolResult> {
    return this.get('/v1/frameworks');
  }

  private async listIntegrations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.status) params['filter[status]'] = args.status as string;
    return this.get('/v1/integrations', params);
  }

  private async getComplianceSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.framework) params.framework = args.framework as string;
    return this.get('/v1/compliance/summary', params);
  }
}
