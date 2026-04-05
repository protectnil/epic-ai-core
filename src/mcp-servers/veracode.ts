/**
 * Veracode MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Veracode MCP server published by Veracode Inc.
// Community MCP: https://github.com/dipsylala/veracode-mcp — transport: stdio, auth: API ID + key (HMAC)
//   Community-maintained (not official Veracode Inc.). Last commit: Mar 7, 2026. ~3 tools: api-health,
//   get-static-findings, get-dynamic-findings. Does NOT meet 10-tool threshold for use-vendor-mcp.
// Our adapter covers: 14 tools (applications, findings, sandboxes, policies, dynamic analyses,
//   SCA workspaces and projects, pipeline scan findings, identity users/teams, mitigations, reports).
// Recommendation: use-rest-api — no official vendor MCP exists; community MCP has only 3 tools vs our 14.
//
// Base URLs:
//   Commercial (US): https://api.veracode.com  (default)
//   European:        https://api.veracode.eu
// Auth: VERACODE-HMAC-SHA-256 per-request signing using API ID and API key.
//   Signing spec: docs.veracode.com/r/c_hmac_signing_example
// Docs: https://docs.veracode.com/r/Veracode_APIs
// Rate limits: Not publicly documented. Recommend <10 concurrent requests.
//
// Verified REST API endpoint paths (docs.veracode.com):
//   GET  /appsec/v1/applications
//   GET  /appsec/v1/applications/{guid}
//   GET  /appsec/v2/applications/{guid}/findings
//   GET  /appsec/v1/applications/{guid}/sandboxes
//   GET  /appsec/v1/applications/{guid}/policy
//   GET  /appsec/v1/policies
//   GET  /dae/v2/analyses
//   GET  /srcclr/v3/workspaces
//   GET  /srcclr/v3/workspaces/{workspaceGuid}/projects
//   POST /appsec/v2/applications/{guid}/findings/{issueId}/annotations
//   GET  /pipeline_scan/v1/scans/{scan_id}/findings
//   GET  /api/4.0/getreportinfo.do  (Summary Report, XML wrapped in JSON)
//   GET  /appsec/v1/users
//   GET  /appsec/v1/teams

import { createHmac, randomBytes } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VeracodeConfig {
  apiId: string;
  apiKey: string;
  baseUrl?: string;
}

function buildVeracodeAuthHeader(
  apiId: string,
  apiKey: string,
  urlPath: string,
  method: string,
): string {
  const nonce = randomBytes(16).toString('hex').toLowerCase();
  const ts = Date.now().toString();
  const data = `id=${apiId}&host=api.veracode.com&url=${urlPath}&method=${method.toUpperCase()}`;

  const encryptedNonce = createHmac('sha256', Buffer.from(apiKey, 'hex')).update(nonce).digest();
  const encryptedTs = createHmac('sha256', encryptedNonce).update(ts).digest();
  const signingKey = createHmac('sha256', encryptedTs).update('vcode_request_version_1').digest();
  const sig = createHmac('sha256', signingKey).update(data).digest('hex').toLowerCase();

  return `VERACODE-HMAC-SHA-256 id=${apiId},ts=${ts},nonce=${nonce},sig=${sig}`;
}

export class VeracodeMCPServer extends MCPAdapterBase {
  private readonly apiId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VeracodeConfig) {
    super();
    this.apiId = config.apiId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.veracode.com';
  }

  static catalog() {
    return {
      name: 'veracode',
      displayName: 'Veracode',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['veracode', 'sast', 'dast', 'sca', 'appsec', 'finding', 'vulnerability', 'static analysis', 'dynamic analysis', 'software composition', 'pipeline scan', 'sandbox', 'policy', 'mitigation'],
      toolNames: [
        'list_applications', 'get_application', 'get_findings', 'list_sandboxes',
        'get_policy', 'list_policies', 'get_dynamic_analyses', 'submit_mitigation',
        'list_sca_workspaces', 'list_sca_projects', 'get_pipeline_scan_findings',
        'list_users', 'list_teams', 'get_summary_report',
      ],
      description: 'Veracode application security: SAST, DAST, SCA, and manual findings across applications and sandboxes. Manage policies, mitigations, users, and teams.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List all applications in the Veracode portfolio with their policy compliance status, last scan date, and security score.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
            name: { type: 'string', description: 'Filter by application name (partial match)' },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get the full profile and policy compliance details for a specific Veracode application by GUID.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: { type: 'string', description: 'Application GUID (UUID format)' },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'get_findings',
        description: 'Retrieve security findings for a Veracode application. Covers SAST, DAST, Manual Penetration Testing, and SCA. Returns CWE, severity, file, line number, and remediation status.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: { type: 'string', description: 'Application GUID' },
            scan_type: { type: 'string', description: 'Filter by scan type (comma-separated): STATIC, DYNAMIC, MANUAL, SCA' },
            violates_policy: { type: 'boolean', description: 'If true, return only findings that violate the security policy' },
            severity: { type: 'string', description: 'Comma-separated severity levels: 0 (informational) through 5 (very high)' },
            status: { type: 'string', description: 'Filter by status: OPEN, CLOSED' },
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'list_sandboxes',
        description: 'List all development sandboxes for a Veracode application. Sandboxes allow scanning feature branches without affecting production policy evaluation.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: { type: 'string', description: 'Application GUID' },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'get_policy',
        description: 'Retrieve the security policy assigned to a Veracode application, including pass/fail severity thresholds, SCA policy, and grace period settings.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: { type: 'string', description: 'Application GUID' },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'list_policies',
        description: 'List all security policies defined in the Veracode platform with their severity thresholds and grace period configurations.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
            name: { type: 'string', description: 'Filter by policy name (partial match)' },
          },
        },
      },
      {
        name: 'get_dynamic_analyses',
        description: 'List Dynamic Analysis (DAST) scan configurations, URLs under test, schedules, and their current execution status.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
          },
        },
      },
      {
        name: 'submit_mitigation',
        description: 'Submit a mitigation or annotation for a specific finding — accept risk, mark false positive, or mark remediated. Requires Reviewer or Security Lead role.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: { type: 'string', description: 'Application GUID containing the finding' },
            issue_id: { type: 'number', description: 'Numeric issue ID of the finding to annotate' },
            action: { type: 'string', description: 'Mitigation action: APPDESIGN, NETENV, OSENV, LIBRARY, ACCEPTRISK, NOACTIONREQUIRED, REMEDIATED, REJECTED, ACCEPTED' },
            comment: { type: 'string', description: 'Justification comment for the mitigation (required for most actions)' },
          },
          required: ['application_guid', 'issue_id', 'action'],
        },
      },
      {
        name: 'list_sca_workspaces',
        description: 'List Software Composition Analysis (SCA) workspaces for open-source vulnerability tracking, license compliance, and dependency management.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
          },
        },
      },
      {
        name: 'list_sca_projects',
        description: 'List projects within an SCA workspace, showing their last scan date, vulnerability counts, and license issues.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_guid: { type: 'string', description: 'SCA workspace GUID' },
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
          },
          required: ['workspace_guid'],
        },
      },
      {
        name: 'get_pipeline_scan_findings',
        description: 'Retrieve findings from a completed Pipeline Scan (CI/CD static analysis) by scan ID. Returns flaw details and policy compliance results.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_id: { type: 'string', description: 'Pipeline scan ID returned when the scan was initiated' },
          },
          required: ['scan_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the Veracode platform with their roles, teams, and API credentials status.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
            user_name: { type: 'string', description: 'Filter by username (partial match)' },
          },
        },
      },
      {
        name: 'list_teams',
        description: 'List teams configured in the Veracode platform with their members and associated application permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Zero-based page number (default: 0)' },
            size: { type: 'number', description: 'Results per page (default: 50, max: 500)' },
          },
        },
      },
      {
        name: 'get_summary_report',
        description: 'Get the detailed summary report for the latest completed policy scan of an application. Returns flaw categories, severity breakdown, and policy evaluation result.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'string', description: 'Numeric application ID (not GUID) as shown in the Veracode platform' },
          },
          required: ['app_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_applications': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          let path = `/appsec/v1/applications?page=${page}&size=${size}`;
          if (args.name) path += `&name=${encodeURIComponent(args.name as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_application': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          return await this.request(`/appsec/v1/applications/${encodeURIComponent(guid)}`, 'GET');
        }

        case 'get_findings': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          let path = `/appsec/v2/applications/${encodeURIComponent(guid)}/findings?page=${page}&size=${size}`;
          if (args.scan_type) path += `&scan_type=${encodeURIComponent(args.scan_type as string)}`;
          if (typeof args.violates_policy === 'boolean') path += `&violates_policy=${encodeURIComponent(String(args.violates_policy))}`;
          if (args.severity) path += `&severity=${encodeURIComponent(args.severity as string)}`;
          if (args.status) path += `&status=${encodeURIComponent(args.status as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_sandboxes': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          return await this.request(`/appsec/v1/applications/${encodeURIComponent(guid)}/sandboxes`, 'GET');
        }

        case 'get_policy': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          return await this.request(`/appsec/v1/applications/${encodeURIComponent(guid)}/policy`, 'GET');
        }

        case 'list_policies': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          let path = `/appsec/v1/policies?page=${page}&size=${size}`;
          if (args.name) path += `&name=${encodeURIComponent(args.name as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_dynamic_analyses': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          return await this.request(`/dae/v2/analyses?page=${page}&size=${size}`, 'GET');
        }

        case 'submit_mitigation': {
          const guid = args.application_guid as string;
          const issueId = args.issue_id as number;
          const action = args.action as string;
          if (!guid || issueId === undefined || !action) {
            return { content: [{ type: 'text', text: 'application_guid, issue_id, and action are required' }], isError: true };
          }
          const body: Record<string, unknown> = { action };
          if (args.comment) body.comment = args.comment;
          return await this.request(
            `/appsec/v2/applications/${encodeURIComponent(guid)}/findings/${issueId}/annotations`,
            'POST',
            body,
          );
        }

        case 'list_sca_workspaces': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          return await this.request(`/srcclr/v3/workspaces?page=${page}&size=${size}`, 'GET');
        }

        case 'list_sca_projects': {
          const workspaceGuid = args.workspace_guid as string;
          if (!workspaceGuid) {
            return { content: [{ type: 'text', text: 'workspace_guid is required' }], isError: true };
          }
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          return await this.request(`/srcclr/v3/workspaces/${encodeURIComponent(workspaceGuid)}/projects?page=${page}&size=${size}`, 'GET');
        }

        case 'get_pipeline_scan_findings': {
          const scanId = args.scan_id as string;
          if (!scanId) {
            return { content: [{ type: 'text', text: 'scan_id is required' }], isError: true };
          }
          return await this.request(`/pipeline_scan/v1/scans/${encodeURIComponent(scanId)}/findings`, 'GET');
        }

        case 'list_users': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          let path = `/appsec/v1/users?page=${page}&size=${size}`;
          if (args.user_name) path += `&user_name=${encodeURIComponent(args.user_name as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_teams': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          return await this.request(`/appsec/v1/teams?page=${page}&size=${size}`, 'GET');
        }

        case 'get_summary_report': {
          const appId = args.app_id as string;
          if (!appId) {
            return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
          }
          return await this.request(`/api/4.0/getreportinfo.do?app_id=${encodeURIComponent(appId)}`, 'GET');
        }

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
    const authHeader = buildVeracodeAuthHeader(this.apiId, this.apiKey, path, method);

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Veracode API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Veracode returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}
