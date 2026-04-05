/**
 * ServiceNow GRC MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None from ServiceNow Inc. as of 2026-03.
// Community servers exist (michaelbuckner/servicenow-mcp, aartiq/servicenow-mcp, ShunyaAI/snow-mcp) but are not
// official ServiceNow-published servers and vary in maintenance and GRC coverage.
// Our adapter covers: 14 tools (full GRC surface — risks, controls, compliance tasks, audit engagements, policies, issues).
// Recommendation: Use this adapter for production GRC automation. Evaluate community MCPs for lab/dev environments only.
//
// Base URL: https://{instance}.service-now.com/api/now
// Auth: Basic auth (username:password) or Bearer token
// Docs: https://developer.servicenow.com/dev.do#!/reference/api/latest/rest/c_TableAPI
// Rate limits: Default 3,000 req/10min per instance; configurable per instance

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import type { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';

interface ServiceNowGRCConfig {
  instance: string;
  username?: string;
  password?: string;
  bearerToken?: string;
  baseUrl?: string;
}

export class ServiceNowGRCMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: ServiceNowGRCConfig) {
    super();
    this.baseUrl = config.baseUrl || `https://${config.instance}.service-now.com/api/now`;

    if (config.bearerToken) {
      this.authHeader = `Bearer ${config.bearerToken}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      throw new Error(
        'ServiceNowGRCMCPServer: authentication required. Provide either bearerToken or both username and password.',
      );
    }
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'servicenow-grc',
      displayName: 'ServiceNow GRC',
      version: '1.0.0',
      category: 'compliance',
      keywords: [
        'servicenow', 'grc', 'governance', 'risk', 'compliance', 'audit', 'policy',
        'control', 'issue', 'finding', 'framework', 'sox', 'iso27001', 'nist',
        'remediation', 'risk-assessment', 'internal-audit', 'itgc',
      ],
      toolNames: [
        'list_risks', 'get_risk', 'create_risk', 'update_risk',
        'list_controls', 'get_control', 'list_compliance_tasks', 'get_compliance_task',
        'list_audit_engagements', 'get_audit_engagement', 'list_audit_findings',
        'list_policies', 'get_policy', 'list_grc_issues',
      ],
      description: 'Governance, Risk and Compliance: manage risks, controls, compliance tasks, audit engagements and findings, policy records, and GRC issues across frameworks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_risks',
        description: 'List risk records in ServiceNow GRC with optional filters for state, category, and owner; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by risk state: draft, identified, assessed, responded, accepted, mitigated, closed',
            },
            category: {
              type: 'string',
              description: 'Filter by risk category (e.g., operational, financial, compliance)',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering (e.g., "active=true^stateINdraft,identified")',
            },
          },
        },
      },
      {
        name: 'get_risk',
        description: 'Get full details for a specific GRC risk record by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            risk_id: {
              type: 'string',
              description: 'The risk record sys_id (32-character GUID)',
            },
          },
          required: ['risk_id'],
        },
      },
      {
        name: 'create_risk',
        description: 'Create a new risk record in ServiceNow GRC with name, description, category, and initial state',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Short name or title of the risk',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the risk',
            },
            category: {
              type: 'string',
              description: 'Risk category (e.g., operational, financial, compliance, strategic)',
            },
            state: {
              type: 'string',
              description: 'Initial risk state (default: draft)',
            },
            owner: {
              type: 'string',
              description: 'sys_id or username of the risk owner',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_risk',
        description: 'Update fields on an existing GRC risk record by sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            risk_id: {
              type: 'string',
              description: 'The risk record sys_id to update',
            },
            fields: {
              type: 'object',
              description: 'Field names and updated values (e.g., state, residual_risk, treatment)',
              additionalProperties: true,
            },
          },
          required: ['risk_id', 'fields'],
        },
      },
      {
        name: 'list_controls',
        description: 'List GRC control records with optional filters for state, type, and associated policy',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by control state: draft, published, retired',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_control',
        description: 'Get full details for a specific GRC control record by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'The control record sys_id (32-character GUID)',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'list_compliance_tasks',
        description: 'List compliance tasks (attestations, test activities) with optional state and assignment filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by task state: new, in_progress, review, complete, cancelled',
            },
            assigned_to: {
              type: 'string',
              description: 'Filter by assigned user sys_id or username',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_compliance_task',
        description: 'Get full details for a specific compliance task by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The compliance task sys_id (32-character GUID)',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'list_audit_engagements',
        description: 'List audit engagements (audit projects) with optional filters for state and auditor',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of engagements to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by engagement state: draft, planning, fieldwork, review, complete',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_audit_engagement',
        description: 'Get full details for a specific audit engagement by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            engagement_id: {
              type: 'string',
              description: 'The audit engagement sys_id (32-character GUID)',
            },
          },
          required: ['engagement_id'],
        },
      },
      {
        name: 'list_audit_findings',
        description: 'List audit findings from audit engagements with optional filters for state and severity',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of findings to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by finding state: open, in_remediation, closed, accepted',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, informational',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'list_policies',
        description: 'List compliance policies with optional filters for state and framework',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by policy state: draft, published, retired',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get full details for a specific compliance policy by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy record sys_id (32-character GUID)',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'list_grc_issues',
        description: 'List GRC issues (cross-domain findings and deficiencies) with optional filters for state and priority',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            state: {
              type: 'string',
              description: 'Filter by issue state: open, in_remediation, closed, risk_accepted',
            },
            sysparm_query: {
              type: 'string',
              description: 'Raw ServiceNow encoded query string for advanced filtering',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_risks':
          return await this.listRisks(args);
        case 'get_risk':
          return await this.getRisk(args);
        case 'create_risk':
          return await this.createRisk(args);
        case 'update_risk':
          return await this.updateRisk(args);
        case 'list_controls':
          return await this.listControls(args);
        case 'get_control':
          return await this.getControl(args);
        case 'list_compliance_tasks':
          return await this.listComplianceTasks(args);
        case 'get_compliance_task':
          return await this.getComplianceTask(args);
        case 'list_audit_engagements':
          return await this.listAuditEngagements(args);
        case 'get_audit_engagement':
          return await this.getAuditEngagement(args);
        case 'list_audit_findings':
          return await this.listAuditFindings(args);
        case 'list_policies':
          return await this.listPolicies(args);
        case 'get_policy':
          return await this.getPolicy(args);
        case 'list_grc_issues':
          return await this.listGrcIssues(args);
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

  private requestHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchTable(
    table: string,
    args: Record<string, unknown>,
    extraQuery?: string,
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('sysparm_limit', String((args.limit as number) ?? 50));
    params.set('sysparm_offset', String((args.offset as number) ?? 0));

    const queryParts: string[] = [];
    if (args.state) queryParts.push(`state=${encodeURIComponent(String(args.state))}`);
    if (args.category) queryParts.push(`category=${encodeURIComponent(String(args.category))}`);
    if (args.severity) queryParts.push(`severity=${encodeURIComponent(String(args.severity))}`);
    if (args.assigned_to) queryParts.push(`assigned_to=${encodeURIComponent(String(args.assigned_to))}`);
    if (extraQuery) queryParts.push(extraQuery);
    if (args.sysparm_query) queryParts.push(String(args.sysparm_query));
    if (queryParts.length > 0) params.set('sysparm_query', queryParts.join('^'));

    const response = await this.fetchWithRetry(`${this.baseUrl}/table/${table}?${params}`, {
      method: 'GET',
      headers: this.requestHeaders(),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchRecord(table: string, sysId: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/table/${table}/${encodeURIComponent(sysId)}`,
      { method: 'GET', headers: this.requestHeaders() },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRisks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchTable('sn_risk_risk', args);
  }

  private async getRisk(args: Record<string, unknown>): Promise<ToolResult> {
    const riskId = args.risk_id as string;
    if (!riskId) {
      return { content: [{ type: 'text', text: 'risk_id is required' }], isError: true };
    }
    return this.fetchRecord('sn_risk_risk', riskId);
  }

  private async createRisk(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const body: Record<string, unknown> = { name };
    if (args.description) body['description'] = args.description;
    if (args.category) body['category'] = args.category;
    if (args.state) body['state'] = args.state;
    if (args.owner) body['owner'] = args.owner;

    const response = await this.fetchWithRetry(`${this.baseUrl}/table/sn_risk_risk`, {
      method: 'POST',
      headers: this.requestHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateRisk(args: Record<string, unknown>): Promise<ToolResult> {
    const riskId = args.risk_id as string;
    const fields = args.fields as Record<string, unknown>;
    if (!riskId || !fields) {
      return { content: [{ type: 'text', text: 'risk_id and fields are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/table/sn_risk_risk/${encodeURIComponent(riskId)}`,
      { method: 'PATCH', headers: this.requestHeaders(), body: JSON.stringify(fields) },
    );
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listControls(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchTable('sn_compliance_control', args);
  }

  private async getControl(args: Record<string, unknown>): Promise<ToolResult> {
    const controlId = args.control_id as string;
    if (!controlId) {
      return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
    }
    return this.fetchRecord('sn_compliance_control', controlId);
  }

  private async listComplianceTasks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchTable('sn_compliance_task', args);
  }

  private async getComplianceTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.task_id as string;
    if (!taskId) {
      return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };
    }
    return this.fetchRecord('sn_compliance_task', taskId);
  }

  private async listAuditEngagements(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchTable('sn_audit_engagement', args);
  }

  private async getAuditEngagement(args: Record<string, unknown>): Promise<ToolResult> {
    const engagementId = args.engagement_id as string;
    if (!engagementId) {
      return { content: [{ type: 'text', text: 'engagement_id is required' }], isError: true };
    }
    return this.fetchRecord('sn_audit_engagement', engagementId);
  }

  private async listAuditFindings(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchTable('sn_audit_finding', args);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchTable('sn_compliance_policy', args);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string;
    if (!policyId) {
      return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    }
    return this.fetchRecord('sn_compliance_policy', policyId);
  }

  private async listGrcIssues(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchTable('sn_grc_issue', args);
  }
}
