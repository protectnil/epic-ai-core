/**
 * Drata GRC MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://drata.com/mcp (cloud-hosted, remotely managed) — transport: streamable-HTTP, auth: Bearer token
//   Drata MCP is officially published by Drata Inc. (listed at modelcontextprotocol.io/servers and developers.drata.com).
//   The MCP is a cloud-hosted managed server (no self-hosted option). Tool names are not publicly enumerated.
//   Maintenance status: active as of 2026-03 (launched June 2025, continuously updated per vendor).
//   Tool count: Not publicly documented — vendor states it provides compliance, risk, and monitoring data.
//   Because exact tool names are not enumerable without an authenticated session, we cannot perform a
//   complete overlap analysis. Our REST adapter is kept as an air-gapped fallback and for environments
//   where the managed MCP endpoint is not accessible.
// Our adapter covers: 18 tools (controls, evidence, personnel, vendors, risks,
//   monitors, workspaces, users). Targets the Drata public REST API v1.
// Recommendation: For customers with Drata MCP access, prefer the vendor MCP for natural-language GRC workflows.
//   Use this REST adapter for air-gapped deployments, CI/CD automation, or when the managed MCP is unavailable.
//
// Base URL: https://public-api.drata.com/public/v1
// Auth: Bearer token — Authorization: Bearer {apiKey} (generate in Drata Settings > API Keys)
// Docs: https://developers.drata.com/openapi/reference/v1/overview/
// Rate limits: 500 requests per minute per source IP.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DrataConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DrataMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DrataConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://public-api.drata.com/public/v1';
  }

  static catalog() {
    return {
      name: 'drata',
      displayName: 'Drata',
      version: '1.0.0',
      category: 'compliance' as const,
      keywords: [
        'drata', 'compliance', 'grc', 'soc2', 'iso27001', 'hipaa', 'gdpr',
        'controls', 'evidence', 'audit', 'risk', 'vendor', 'monitor', 'personnel',
      ],
      toolNames: [
        'list_controls', 'get_control', 'get_compliance_status',
        'list_evidence', 'upload_evidence',
        'list_personnel', 'get_personnel',
        'list_vendors', 'get_vendor',
        'list_risks', 'get_risk',
        'list_monitors', 'get_monitor',
        'list_workspaces',
        'list_users', 'get_user',
        'list_policies', 'get_policy',
      ],
      description: 'Drata GRC operations: manage compliance controls, evidence, personnel, vendors, risks, monitors, and workspaces via the Drata public REST API v1.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_controls',
        description: 'List all compliance controls in Drata with optional filters for status and framework',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of controls to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of controls to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by control status: compliant, non-compliant, not-applicable',
            },
            framework: {
              type: 'string',
              description: 'Filter by compliance framework (e.g. SOC2, ISO27001, HIPAA)',
            },
          },
        },
      },
      {
        name: 'get_control',
        description: 'Get details for a specific compliance control by ID including status, evidence, and owner',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'The control ID',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'get_compliance_status',
        description: 'Get a summary of overall compliance status showing counts by control status, optionally filtered by framework',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Summarize compliance status for a specific framework (e.g. SOC2, ISO27001)',
            },
          },
        },
      },
      {
        name: 'list_evidence',
        description: 'List evidence items in Drata with optional filters for status and associated control',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of evidence items to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of evidence items to skip for pagination (default: 0)',
            },
            control_id: {
              type: 'string',
              description: 'Filter evidence by associated control ID',
            },
            status: {
              type: 'string',
              description: 'Filter by evidence status: pending, approved, rejected',
            },
          },
        },
      },
      {
        name: 'upload_evidence',
        description: 'Upload a new evidence item for a specific control in Drata',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'The control ID to associate the evidence with',
            },
            name: {
              type: 'string',
              description: 'Display name for the evidence item',
            },
            description: {
              type: 'string',
              description: 'Description of what the evidence demonstrates',
            },
            type: {
              type: 'string',
              description: 'Evidence type (e.g. document, screenshot, url)',
            },
          },
          required: ['control_id', 'name'],
        },
      },
      {
        name: 'list_personnel',
        description: 'List personnel and team members in Drata with optional role filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of personnel to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of personnel to skip for pagination (default: 0)',
            },
            role: {
              type: 'string',
              description: 'Filter by personnel role',
            },
          },
        },
      },
      {
        name: 'get_personnel',
        description: 'Get details for a specific personnel member by ID including assigned policies and device status',
        inputSchema: {
          type: 'object',
          properties: {
            personnel_id: {
              type: 'string',
              description: 'The personnel member ID',
            },
          },
          required: ['personnel_id'],
        },
      },
      {
        name: 'list_vendors',
        description: 'List third-party vendors in Drata with optional risk level filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of vendors to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of vendors to skip for pagination (default: 0)',
            },
            risk_level: {
              type: 'string',
              description: 'Filter by risk level: low, medium, high, critical',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get details for a specific third-party vendor by ID including risk assessment and review status',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'The vendor ID',
            },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'list_risks',
        description: 'List risks in the Drata risk register with optional filters for status and severity',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of risks to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of risks to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by risk status: open, mitigated, accepted, closed',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: low, medium, high, critical',
            },
          },
        },
      },
      {
        name: 'get_risk',
        description: 'Get details for a specific risk by ID including likelihood, impact, and mitigation plan',
        inputSchema: {
          type: 'object',
          properties: {
            risk_id: {
              type: 'string',
              description: 'The risk ID',
            },
          },
          required: ['risk_id'],
        },
      },
      {
        name: 'list_monitors',
        description: 'List automated monitoring tests (continuous control monitoring) in Drata with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of monitors to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of monitors to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by monitor status: passing, failing, warning, disabled',
            },
          },
        },
      },
      {
        name: 'get_monitor',
        description: 'Get details for a specific automated monitor by ID including last run result and linked controls',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: {
              type: 'string',
              description: 'The monitor ID',
            },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'list_workspaces',
        description: 'List Drata workspaces (organizations or sub-entities) accessible with the current API key',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of workspaces to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of workspaces to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Drata account with their roles and status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of users to skip for pagination (default: 0)',
            },
            role: {
              type: 'string',
              description: 'Filter by user role (e.g. admin, auditor, employee)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and role details for a specific Drata user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Drata user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List security and compliance policies in Drata with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of policies to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by policy status: published, draft, archived',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get details for a specific policy by ID including content, owner, and acknowledgment status',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID',
            },
          },
          required: ['policy_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_controls':
          return await this.listControls(args);
        case 'get_control':
          return await this.getControl(args);
        case 'get_compliance_status':
          return await this.getComplianceStatus(args);
        case 'list_evidence':
          return await this.listEvidence(args);
        case 'upload_evidence':
          return await this.uploadEvidence(args);
        case 'list_personnel':
          return await this.listPersonnel(args);
        case 'get_personnel':
          return await this.getPersonnel(args);
        case 'list_vendors':
          return await this.listVendors(args);
        case 'get_vendor':
          return await this.getVendor(args);
        case 'list_risks':
          return await this.listRisks(args);
        case 'get_risk':
          return await this.getRisk(args);
        case 'list_monitors':
          return await this.listMonitors(args);
        case 'get_monitor':
          return await this.getMonitor(args);
        case 'list_workspaces':
          return await this.listWorkspaces(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_policies':
          return await this.listPolicies(args);
        case 'get_policy':
          return await this.getPolicy(args);
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

  private async request(path: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers, ...(options?.headers as Record<string, string> ?? {}) },
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Drata API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Drata returned non-JSON response (HTTP ${response.status})`);
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listControls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.status) params.set('status', args.status as string);
    if (args.framework) params.set('framework', args.framework as string);
    return this.request(`/controls?${params}`);
  }

  private async getControl(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/controls/${encodeURIComponent(args.control_id as string)}`);
  }

  private async getComplianceStatus(args: Record<string, unknown>): Promise<ToolResult> {
    // Aggregate from controls list — no standalone /compliance-status endpoint in v1
    const params = new URLSearchParams({ limit: '500', offset: '0' });
    if (args.framework) params.set('framework', args.framework as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/controls?${params}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Drata API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Drata returned non-JSON response (HTTP ${response.status})`);
    }
    const controls = (data as { data?: Array<{ status?: string }> }).data
      ?? (Array.isArray(data) ? (data as Array<{ status?: string }>) : []);

    const summary: Record<string, number> = {};
    for (const control of controls) {
      const status = (control.status as string) ?? 'unknown';
      summary[status] = (summary[status] ?? 0) + 1;
    }
    const result = {
      framework: args.framework ?? 'all',
      total: controls.length,
      summary,
    };
    const text = JSON.stringify(result, null, 2);
    return { content: [{ type: 'text', text: text }], isError: false };
  }

  private async listEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.control_id) params.set('controlId', args.control_id as string);
    if (args.status) params.set('status', args.status as string);
    return this.request(`/evidence?${params}`);
  }

  private async uploadEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      controlId: args.control_id,
      name: args.name,
    };
    if (args.description) body.description = args.description;
    if (args.type) body.type = args.type;
    return this.request('/evidence', { method: 'POST', body: JSON.stringify(body) });
  }

  private async listPersonnel(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.role) params.set('role', args.role as string);
    return this.request(`/personnel?${params}`);
  }

  private async getPersonnel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/personnel/${encodeURIComponent(args.personnel_id as string)}`);
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.risk_level) params.set('riskLevel', args.risk_level as string);
    return this.request(`/vendors?${params}`);
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/vendors/${encodeURIComponent(args.vendor_id as string)}`);
  }

  private async listRisks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.status) params.set('status', args.status as string);
    if (args.severity) params.set('severity', args.severity as string);
    return this.request(`/risks?${params}`);
  }

  private async getRisk(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/risks/${encodeURIComponent(args.risk_id as string)}`);
  }

  private async listMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.status) params.set('status', args.status as string);
    return this.request(`/monitors?${params}`);
  }

  private async getMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/monitors/${encodeURIComponent(args.monitor_id as string)}`);
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    return this.request(`/workspaces?${params}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.role) params.set('role', args.role as string);
    return this.request(`/users?${params}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.status) params.set('status', args.status as string);
    return this.request(`/policies?${params}`);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/policies/${encodeURIComponent(args.policy_id as string)}`);
  }
}
