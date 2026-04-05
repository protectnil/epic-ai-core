/**
 * Abnormal Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Abnormal Security MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 13 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.abnormalplatform.com (default; may vary by tenant region)
// Auth: Authorization: Bearer {access_token}
//   Token retrieved from Abnormal portal: Settings > Integrations > Abnormal REST API
//   Verified from: abnormalsecurity.my.site.com/knowledgebase, app.swaggerhub.com/apis/abnormal-security/abx
// Docs: https://app.swaggerhub.com/apis-docs/abnormal-security/abx/1.4.1
// Rate limits: Not publicly documented; use pagination and avoid polling

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AbnormalSecurityConfig {
  accessToken: string;
  baseUrl?: string;
}

export class AbnormalSecurityMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AbnormalSecurityConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.abnormalplatform.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List email threats detected by Abnormal Security AI with optional OData filter. Returns attack type, sender, recipients, and remediation status.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter string (e.g., "receivedTime gte 2024-01-01T00:00:00Z")',
            },
            page_size: {
              type: 'number',
              description: 'Number of threats per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Get detailed information about a specific email threat by ID, including message metadata, attack indicators, and AI analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'The unique threat ID (UUID format)',
            },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'take_threat_action',
        description: 'Remediate or unremediate a threat: remove detected messages from inboxes or restore previously removed messages.',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'The threat ID to take action on',
            },
            action: {
              type: 'string',
              description: 'Action to take: remediate (remove from inbox) or unremediate (restore)',
            },
          },
          required: ['threat_id', 'action'],
        },
      },
      {
        name: 'list_cases',
        description: 'List Abnormal Security Cases — groups of related threats and behavioral signals associated with a specific attacker or campaign.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter string (e.g., "lastModifiedTime gte 2024-01-01T00:00:00Z")',
            },
            page_size: {
              type: 'number',
              description: 'Number of cases per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'get_case',
        description: 'Get full details for a specific Abnormal Security case, including associated threats, affected users, and timeline.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The unique case ID',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'take_case_action',
        description: 'Take an action on a case: acknowledge (mark as reviewed) or close (mark as resolved).',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The case ID to take action on',
            },
            action: {
              type: 'string',
              description: 'Action to take: acknowledge or close',
            },
          },
          required: ['case_id', 'action'],
        },
      },
      {
        name: 'get_audit_logs',
        description: 'Retrieve Abnormal Security portal audit logs — API calls, message actions, and administrative activity with optional OData filter.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter string (e.g., "eventTime gte 2024-01-01T00:00:00Z")',
            },
            page_size: {
              type: 'number',
              description: 'Number of log entries per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'list_employees',
        description: 'List employees and their email security risk profiles from the Abnormal Security identity graph.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of employees per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Get the email security risk profile and identity details for a specific employee by email address.',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'The employee email address to look up',
            },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'list_vendor_cases',
        description: 'List vendor email compromise (VEC) cases — suspicious vendor communications flagged by Abnormal Security AI.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter string (e.g., "lastModifiedTime gte 2024-01-01T00:00:00Z")',
            },
            page_size: {
              type: 'number',
              description: 'Number of vendor cases per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'get_vendor_case',
        description: 'Get full details for a specific vendor email compromise (VEC) case by case ID.',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The unique vendor case ID',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'list_detection_rules',
        description: 'List custom detection rules configured in Abnormal Security for tuning threat detection behavior.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of rules per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'list_abuse_mailbox',
        description: 'List AI Security Mailbox (formerly Abuse Mailbox) submissions — user-reported suspicious emails analyzed by Abnormal AI, with attack type and reporter details. Pass not_analyzed=true to list submissions that were skipped with reasons.',
        inputSchema: {
          type: 'object',
          properties: {
            not_analyzed: {
              type: 'boolean',
              description: 'If true, returns unprocessed submissions that Abnormal did not analyze, including the reason why (default: false)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_threats':
          return await this.listThreats(args);
        case 'get_threat':
          return await this.getThreat(args);
        case 'take_threat_action':
          return await this.takeThreatAction(args);
        case 'list_cases':
          return await this.listCases(args);
        case 'get_case':
          return await this.getCase(args);
        case 'take_case_action':
          return await this.takeCaseAction(args);
        case 'get_audit_logs':
          return await this.getAuditLogs(args);
        case 'list_employees':
          return await this.listEmployees(args);
        case 'get_employee':
          return await this.getEmployee(args);
        case 'list_vendor_cases':
          return await this.listVendorCases(args);
        case 'get_vendor_case':
          return await this.getVendorCase(args);
        case 'list_detection_rules':
          return await this.listDetectionRules(args);
        case 'list_abuse_mailbox':
          return await this.listAbuseMailbox(args);
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

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Abnormal Security API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Abnormal Security returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    let path = `/v1/threats?pageSize=${pageSize}&pageNumber=${pageNumber}`;
    if (args.filter) path += `&filter=${encodeURIComponent(args.filter as string)}`;
    return this.request(path, 'GET');
  }

  private async getThreat(args: Record<string, unknown>): Promise<ToolResult> {
    const threatId = args.threat_id as string;
    if (!threatId) {
      return { content: [{ type: 'text', text: 'threat_id is required' }], isError: true };
    }
    return this.request(`/v1/threats/${encodeURIComponent(threatId)}`, 'GET');
  }

  private async takeThreatAction(args: Record<string, unknown>): Promise<ToolResult> {
    const threatId = args.threat_id as string;
    const action = args.action as string;
    if (!threatId || !action) {
      return { content: [{ type: 'text', text: 'threat_id and action are required' }], isError: true };
    }
    return this.request(`/v1/threats/${encodeURIComponent(threatId)}/actions`, 'POST', { action });
  }

  private async listCases(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    let path = `/v1/cases?pageSize=${pageSize}&pageNumber=${pageNumber}`;
    if (args.filter) path += `&filter=${encodeURIComponent(args.filter as string)}`;
    return this.request(path, 'GET');
  }

  private async getCase(args: Record<string, unknown>): Promise<ToolResult> {
    const caseId = args.case_id as string;
    if (!caseId) {
      return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    }
    return this.request(`/v1/cases/${encodeURIComponent(caseId)}`, 'GET');
  }

  private async takeCaseAction(args: Record<string, unknown>): Promise<ToolResult> {
    const caseId = args.case_id as string;
    const action = args.action as string;
    if (!caseId || !action) {
      return { content: [{ type: 'text', text: 'case_id and action are required' }], isError: true };
    }
    return this.request(`/v1/cases/${encodeURIComponent(caseId)}/actions`, 'POST', { action });
  }

  private async getAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    let path = `/v1/audit-logs?pageSize=${pageSize}&pageNumber=${pageNumber}`;
    if (args.filter) path += `&filter=${encodeURIComponent(args.filter as string)}`;
    return this.request(path, 'GET');
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    return this.request(`/v1/employees?pageSize=${pageSize}&pageNumber=${pageNumber}`, 'GET');
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const email = args.email_address as string;
    if (!email) {
      return { content: [{ type: 'text', text: 'email_address is required' }], isError: true };
    }
    return this.request(`/v1/employees/${encodeURIComponent(email)}`, 'GET');
  }

  private async listVendorCases(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    let path = `/v1/vendor-cases?pageSize=${pageSize}&pageNumber=${pageNumber}`;
    if (args.filter) path += `&filter=${encodeURIComponent(args.filter as string)}`;
    return this.request(path, 'GET');
  }

  private async getVendorCase(args: Record<string, unknown>): Promise<ToolResult> {
    const caseId = args.case_id as string;
    if (!caseId) {
      return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    }
    return this.request(`/v1/vendor-cases/${encodeURIComponent(caseId)}`, 'GET');
  }

  private async listDetectionRules(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    return this.request(`/v1/detection-rules?pageSize=${pageSize}&pageNumber=${pageNumber}`, 'GET');
  }

  private async listAbuseMailbox(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    const path = args.not_analyzed
      ? `/v1/abuse_mailbox/not_analyzed?pageSize=${pageSize}&pageNumber=${pageNumber}`
      : `/v1/abuse_mailbox?pageSize=${pageSize}&pageNumber=${pageNumber}`;
    return this.request(path, 'GET');
  }

  static catalog() {
    return {
      name: 'abnormal-security',
      displayName: 'Abnormal Security',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['abnormal-security', 'abnormal', 'security'],
      toolNames: ['list_threats', 'get_threat', 'take_threat_action', 'list_cases', 'get_case', 'take_case_action', 'get_audit_logs', 'list_employees', 'get_employee', 'list_vendor_cases', 'get_vendor_case', 'list_detection_rules', 'list_abuse_mailbox'],
      description: 'Abnormal Security adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
