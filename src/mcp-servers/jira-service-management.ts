/**
 * Jira Service Management MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/atlassian/atlassian-mcp-server (Atlassian Rovo MCP Server)
//   Remote cloud-hosted endpoint: https://mcp.atlassian.com/v1/sse — transport: streamable-HTTP,
//   auth: OAuth 2.1 (3LO) or org-admin-enabled API token. Covers Jira, Confluence, Compass.
//   Actively maintained by Atlassian (2025–2026). The official Rovo MCP server exposes Jira-level
//   tools (issues, projects, transitions, worklogs, comments) but does NOT expose JSM-specific
//   servicedeskapi endpoints (service desks, request types, queues, SLA, approvals, organizations).
//
// Integration: use-rest-api
// The Atlassian Rovo MCP server covers Jira issues, projects, and Confluence — but exposes zero
// JSM-specific servicedeskapi tools (no service desks, request types, queues, SLA, approvals, or
// organizations). Our REST adapter is the sole integration for all JSM portal operations.
// REST-sourced tools (16): list_service_desks, list_request_types, create_request, get_request,
//   list_requests, add_comment, get_comments, add_attachment, get_request_sla, get_request_status,
//   list_queues, get_queue_issues, get_approvals, answer_approval, list_organizations,
//   transition_request
//
// Decision: use-rest-api — the official Rovo MCP has no JSM servicedeskapi tools; REST adapter
// provides full JSM coverage. The Rovo MCP is documented here as it covers related Jira operations.
//
// Base URL: https://{domain} (e.g. https://mycompany.atlassian.net)
// Auth: HTTP Basic — email:api_token (Base64-encoded). Tokens at id.atlassian.com.
// Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/
// Rate limits: Not publicly documented; governed by Atlassian tenant-level throttling

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JiraServiceManagementConfig {
  /** Atlassian account email address */
  email: string;
  /** Atlassian API token (generate at https://id.atlassian.com/manage-profile/security/api-tokens) */
  apiToken: string;
  /** Your Atlassian Cloud domain, e.g. "mycompany.atlassian.net" */
  domain: string;
}

export class JiraServiceManagementMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: JiraServiceManagementConfig) {
    super();
    this.baseUrl = `https://${config.domain}`;
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'jira-service-management',
      displayName: 'Jira Service Management',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['jira', 'jsm', 'service management', 'service desk', 'itsm', 'helpdesk', 'ticket', 'request', 'sla', 'approval', 'queue', 'incident', 'atlassian'],
      toolNames: [
        'list_service_desks',
        'list_request_types',
        'create_request',
        'get_request',
        'list_requests',
        'add_comment',
        'get_comments',
        'add_attachment',
        'get_request_sla',
        'get_request_status',
        'list_queues',
        'get_queue_issues',
        'get_approvals',
        'answer_approval',
        'list_organizations',
        'transition_request',
      ],
      description: 'ITSM service desk management: create and track customer requests, manage queues, monitor SLAs, handle approvals, and manage organizations in Jira Service Management.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_service_desks',
        description: 'List all Jira Service Management service desk projects accessible with current credentials',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Zero-based index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_request_types',
        description: 'List all request types available in a service desk, showing available ticket categories customers can submit',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The numeric ID of the service desk (required)',
            },
            start: {
              type: 'number',
              description: 'Zero-based index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
          required: ['serviceDeskId'],
        },
      },
      {
        name: 'create_request',
        description: 'Create a new customer support request (ticket) in a Jira Service Management service desk',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The numeric ID of the service desk to create the request in (required)',
            },
            requestTypeId: {
              type: 'string',
              description: 'The ID of the request type to use — use list_request_types to discover available IDs (required)',
            },
            summary: {
              type: 'string',
              description: 'Brief one-line summary of the customer request (required)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the issue or request',
            },
            raiseOnBehalfOf: {
              type: 'string',
              description: 'Email address of the customer to raise the request on behalf of (defaults to authenticated user)',
            },
          },
          required: ['serviceDeskId', 'requestTypeId', 'summary'],
        },
      },
      {
        name: 'get_request',
        description: 'Get full details of a specific customer request by issue ID or key, including status, SLA, and participants',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request, e.g. IT-123',
            },
          },
          required: ['issueIdOrKey'],
        },
      },
      {
        name: 'list_requests',
        description: 'List customer requests with optional filtering by service desk, status category, or search term',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'Filter by service desk ID',
            },
            requestStatus: {
              type: 'string',
              description: 'Filter by status category: OPEN_REQUESTS, CLOSED_REQUESTS, or ALL_REQUESTS (default: ALL_REQUESTS)',
            },
            searchTerm: {
              type: 'string',
              description: 'Text string to filter requests by summary content',
            },
            start: {
              type: 'number',
              description: 'Zero-based index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'add_comment',
        description: 'Add a comment to a customer request, with option to make it internal (agent-only) or public (visible to customer)',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
            body: {
              type: 'string',
              description: 'Comment text to add (required)',
            },
            public: {
              type: 'boolean',
              description: 'Whether the comment is visible to the customer (default: true; set false for internal agent notes)',
            },
          },
          required: ['issueIdOrKey', 'body'],
        },
      },
      {
        name: 'get_comments',
        description: 'Retrieve all comments on a customer request, including public and internal comments',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
            public: {
              type: 'boolean',
              description: 'Filter to only public (true) or only internal (false) comments (omit for all)',
            },
            start: {
              type: 'number',
              description: 'Zero-based index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
          required: ['issueIdOrKey'],
        },
      },
      {
        name: 'add_attachment',
        description: 'Create a temporary attachment on a service desk and link it to a customer request as a permanent attachment',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The numeric ID of the service desk (required)',
            },
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request to attach the file to (required)',
            },
            temporaryAttachmentId: {
              type: 'string',
              description: 'Temporary attachment ID returned by the service desk attachment upload endpoint (required)',
            },
            public: {
              type: 'boolean',
              description: 'Whether the attachment is visible to the customer (default: true)',
            },
          },
          required: ['serviceDeskId', 'issueIdOrKey', 'temporaryAttachmentId'],
        },
      },
      {
        name: 'get_request_sla',
        description: 'Retrieve SLA records for a customer request including time remaining, breach status, and completed cycles',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
          },
          required: ['issueIdOrKey'],
        },
      },
      {
        name: 'get_request_status',
        description: 'Get the status history of a customer request, showing all status transitions in chronological order',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
          },
          required: ['issueIdOrKey'],
        },
      },
      {
        name: 'list_queues',
        description: 'List all agent queues for a service desk, optionally including the issue count per queue',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The numeric ID of the service desk (required)',
            },
            includeCount: {
              type: 'boolean',
              description: 'Include the number of issues in each queue (default: false)',
            },
            start: {
              type: 'number',
              description: 'Zero-based index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
          required: ['serviceDeskId'],
        },
      },
      {
        name: 'get_queue_issues',
        description: 'Retrieve the issues currently in a specific agent queue within a service desk',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The numeric ID of the service desk (required)',
            },
            queueId: {
              type: 'string',
              description: 'The numeric ID of the queue (required) — use list_queues to discover queue IDs',
            },
            start: {
              type: 'number',
              description: 'Zero-based index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
          required: ['serviceDeskId', 'queueId'],
        },
      },
      {
        name: 'get_approvals',
        description: 'Get all pending and completed approvals on a customer request, including approver names and decisions',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
          },
          required: ['issueIdOrKey'],
        },
      },
      {
        name: 'answer_approval',
        description: 'Approve or decline a pending approval on a customer request (user must be an assigned approver)',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
            approvalId: {
              type: 'string',
              description: 'The numeric approval ID to answer — use get_approvals to find pending approval IDs (required)',
            },
            decision: {
              type: 'string',
              description: 'Approval decision: approve or decline (required)',
            },
          },
          required: ['issueIdOrKey', 'approvalId', 'decision'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List all organizations associated with a service desk or the entire Jira Service Management instance',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'Filter organizations by service desk ID (omit to list all organizations in the instance)',
            },
            start: {
              type: 'number',
              description: 'Zero-based index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'transition_request',
        description: 'Transition a customer request to a new workflow status using a transition ID, with optional comment',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
            transitionId: {
              type: 'string',
              description: 'The numeric ID of the workflow transition to apply (required)',
            },
            comment: {
              type: 'string',
              description: 'Optional comment to attach to the transition explaining the status change',
            },
          },
          required: ['issueIdOrKey', 'transitionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_service_desks':
          return await this.listServiceDesks(args);
        case 'list_request_types':
          return await this.listRequestTypes(args);
        case 'create_request':
          return await this.createRequest(args);
        case 'get_request':
          return await this.getRequest(args);
        case 'list_requests':
          return await this.listRequests(args);
        case 'add_comment':
          return await this.addComment(args);
        case 'get_comments':
          return await this.getComments(args);
        case 'add_attachment':
          return await this.addAttachment(args);
        case 'get_request_sla':
          return await this.getRequestSla(args);
        case 'get_request_status':
          return await this.getRequestStatus(args);
        case 'list_queues':
          return await this.listQueues(args);
        case 'get_queue_issues':
          return await this.getQueueIssues(args);
        case 'get_approvals':
          return await this.getApprovals(args);
        case 'answer_approval':
          return await this.answerApproval(args);
        case 'list_organizations':
          return await this.listOrganizations(args);
        case 'transition_request':
          return await this.transitionRequest(args);
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

  private headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers(), ...options });
    if (!response.ok) {
      let errBody: unknown;
      try { errBody = await response.json(); } catch { errBody = response.statusText; }
      return {
        content: [{ type: 'text', text: `JSM API error: ${response.status} — ${JSON.stringify(errBody)}` }],
        isError: true,
      };
    }
    const text = await response.text();
    if (!text) {
      return { content: [{ type: 'text', text: 'OK' }], isError: false };
    }
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private sdApiUrl(path: string): string {
    return `${this.baseUrl}/rest/servicedeskapi${path}`;
  }

  private async listServiceDesks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJson(this.sdApiUrl(`/servicedesk${qs ? `?${qs}` : ''}`));
  }

  private async listRequestTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceDeskId = args.serviceDeskId as string;
    if (!serviceDeskId) {
      return { content: [{ type: 'text', text: 'serviceDeskId is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJson(this.sdApiUrl(`/servicedesk/${encodeURIComponent(serviceDeskId)}/requesttype${qs ? `?${qs}` : ''}`));
  }

  private async createRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceDeskId = args.serviceDeskId as string;
    const requestTypeId = args.requestTypeId as string;
    const summary = args.summary as string;
    if (!serviceDeskId || !requestTypeId || !summary) {
      return { content: [{ type: 'text', text: 'serviceDeskId, requestTypeId, and summary are required' }], isError: true };
    }
    const requestFieldValues: Record<string, string> = { summary };
    if (args.description) requestFieldValues.description = args.description as string;
    const body: Record<string, unknown> = { serviceDeskId, requestTypeId, requestFieldValues };
    if (args.raiseOnBehalfOf) body.raiseOnBehalfOf = args.raiseOnBehalfOf;
    return this.fetchJson(this.sdApiUrl('/request'), { method: 'POST', body: JSON.stringify(body) });
  }

  private async getRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    if (!issueIdOrKey) {
      return { content: [{ type: 'text', text: 'issueIdOrKey is required' }], isError: true };
    }
    return this.fetchJson(this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}`));
  }

  private async listRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.serviceDeskId) params.set('serviceDeskId', args.serviceDeskId as string);
    if (args.requestStatus) params.set('requestStatus', args.requestStatus as string);
    if (args.searchTerm) params.set('searchTerm', args.searchTerm as string);
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJson(this.sdApiUrl(`/request${qs ? `?${qs}` : ''}`));
  }

  private async addComment(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    const bodyText = args.body as string;
    if (!issueIdOrKey || !bodyText) {
      return { content: [{ type: 'text', text: 'issueIdOrKey and body are required' }], isError: true };
    }
    const payload: Record<string, unknown> = { body: bodyText };
    if (typeof args.public === 'boolean') payload.public = args.public;
    return this.fetchJson(
      this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}/comment`),
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    if (!issueIdOrKey) {
      return { content: [{ type: 'text', text: 'issueIdOrKey is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (typeof args.public === 'boolean') params.set('public', String(args.public));
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJson(this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}/comment${qs ? `?${qs}` : ''}`));
  }

  private async addAttachment(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceDeskId = args.serviceDeskId as string;
    const issueIdOrKey = args.issueIdOrKey as string;
    const temporaryAttachmentId = args.temporaryAttachmentId as string;
    if (!serviceDeskId || !issueIdOrKey || !temporaryAttachmentId) {
      return { content: [{ type: 'text', text: 'serviceDeskId, issueIdOrKey, and temporaryAttachmentId are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      temporaryAttachmentIds: [temporaryAttachmentId],
      public: typeof args.public === 'boolean' ? args.public : true,
    };
    return this.fetchJson(
      this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}/attachment`),
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }

  private async getRequestSla(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    if (!issueIdOrKey) {
      return { content: [{ type: 'text', text: 'issueIdOrKey is required' }], isError: true };
    }
    return this.fetchJson(this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}/sla`));
  }

  private async getRequestStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    if (!issueIdOrKey) {
      return { content: [{ type: 'text', text: 'issueIdOrKey is required' }], isError: true };
    }
    return this.fetchJson(this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}/status`));
  }

  private async listQueues(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceDeskId = args.serviceDeskId as string;
    if (!serviceDeskId) {
      return { content: [{ type: 'text', text: 'serviceDeskId is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (typeof args.includeCount === 'boolean') params.set('includeCount', String(args.includeCount));
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJson(this.sdApiUrl(`/servicedesk/${encodeURIComponent(serviceDeskId)}/queue${qs ? `?${qs}` : ''}`));
  }

  private async getQueueIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceDeskId = args.serviceDeskId as string;
    const queueId = args.queueId as string;
    if (!serviceDeskId || !queueId) {
      return { content: [{ type: 'text', text: 'serviceDeskId and queueId are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.fetchJson(
      this.sdApiUrl(`/servicedesk/${encodeURIComponent(serviceDeskId)}/queue/${encodeURIComponent(queueId)}/issue${qs ? `?${qs}` : ''}`),
    );
  }

  private async getApprovals(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    if (!issueIdOrKey) {
      return { content: [{ type: 'text', text: 'issueIdOrKey is required' }], isError: true };
    }
    return this.fetchJson(this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}/approval`));
  }

  private async answerApproval(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    const approvalId = args.approvalId as string;
    const decision = args.decision as string;
    if (!issueIdOrKey || !approvalId || !decision) {
      return { content: [{ type: 'text', text: 'issueIdOrKey, approvalId, and decision are required' }], isError: true };
    }
    return this.fetchJson(
      this.sdApiUrl(`/request/${encodeURIComponent(issueIdOrKey)}/approval/${encodeURIComponent(approvalId)}`),
      { method: 'POST', body: JSON.stringify({ decision }) },
    );
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    if (args.serviceDeskId) {
      return this.fetchJson(
        this.sdApiUrl(`/servicedesk/${encodeURIComponent(args.serviceDeskId as string)}/organization${qs ? `?${qs}` : ''}`),
      );
    }
    return this.fetchJson(this.sdApiUrl(`/organization${qs ? `?${qs}` : ''}`));
  }

  private async transitionRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const issueIdOrKey = args.issueIdOrKey as string;
    const transitionId = args.transitionId as string;
    if (!issueIdOrKey || !transitionId) {
      return { content: [{ type: 'text', text: 'issueIdOrKey and transitionId are required' }], isError: true };
    }
    const body: Record<string, unknown> = { transition: { id: transitionId } };
    if (args.comment) {
      body.update = { comment: [{ add: { body: args.comment } }] };
    }
    // Transitions on JSM requests use the Jira REST API v3 endpoint
    const url = `${this.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/transitions`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    if (!response.ok) {
      let errBody: unknown;
      try { errBody = await response.json(); } catch { errBody = response.statusText; }
      return { content: [{ type: 'text', text: `Transition failed: ${response.status} — ${JSON.stringify(errBody)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Request ${issueIdOrKey} transitioned successfully` }], isError: false };
  }
}
