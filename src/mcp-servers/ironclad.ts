/**
 * Ironclad MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Ironclad MCP server was found on GitHub, npmjs.com, or the Ironclad developer hub.
// Our adapter covers: 12 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no MCP server exists.
//
// Base URL: https://{region}.ironcladapp.com/public/api/v1
// Auth: Bearer token (API access token from Ironclad admin settings)
// Docs: https://developer.ironcladapp.com/reference/getting-started-api
// Rate limits: Not publicly documented; Ironclad recommends standard retry-with-backoff
//
// Vendor REST API endpoints (verified from developer.ironcladapp.com/reference):
// Workflows: Create (sync+async), List, Retrieve, Status of async job, List Approvals,
//   Retrieve Approval Requests, Update Approval (PATCH), Retrieve Turn History,
//   Sign Step Status, Send/Cancel Signature Request, Update/Delete/Remind Signer,
//   List Signers, Create Recipient URL, Create Embeddable Recipient URL,
//   Create Signed Document, List Participants, Pause, Cancel, Revert to Review
// Workflow Schemas: List All (GET /workflow-schemas), Retrieve a Schema
// Records: List All, Create, Smart Import, Upload Smart Import, Retrieve, Replace (PUT),
//   Delete, Update Metadata (PATCH), Retrieve Schema, Attachments (create/get/delete),
//   Run an Action, Retrieve XLSX Export
// Entities: Get All Types, List All, Create, Retrieve, Update, Delete
// Obligations: List All, Create, Retrieve, Update
// Webhooks: Create, List All, Retrieve, Update, Delete, Retrieve Verification Key
// Exports: Submit, Check Status, Download (Security & Data Pro add-on required)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IroncladConfig {
  accessToken: string;
  /**
   * Ironclad regional subdomain. Most customers use 'na1'. EU customers use 'eu1'.
   * Also accepts 'demo' or 'preview' for non-production environments.
   * Defaults to 'na1'.
   */
  region?: string;
  baseUrl?: string;
}

export class IroncladMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: IroncladConfig) {
    super();
    this.accessToken = config.accessToken;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      const region = config.region || 'na1';
      this.baseUrl = `https://${region}.ironcladapp.com/public/api/v1`;
    }
  }

  static catalog() {
    return {
      name: 'ironclad',
      displayName: 'Ironclad',
      version: '1.0.0',
      category: 'compliance' as const,
      keywords: ['ironclad', 'contract', 'clm', 'workflow', 'legal', 'agreement', 'record', 'signature', 'approval', 'counterparty'],
      toolNames: [
        'list_workflows',
        'get_workflow',
        'create_workflow',
        'update_workflow_approval',
        'list_workflow_schemas',
        'list_records',
        'get_record',
        'create_record',
        'update_record',
        'list_webhooks',
        'create_webhook',
        'delete_webhook',
      ],
      description: 'Contract lifecycle management: launch and track contract workflows, manage repository records, and configure webhooks for Ironclad CLM.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workflows',
        description: 'List contract workflow records in Ironclad with optional filters for status, template, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by workflow status: in_review, form_complete, waiting_for_counterparty, signing, executed, terminated',
            },
            template_id: {
              type: 'string',
              description: 'Filter by workflow template ID to show only workflows of a specific type',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (max: 20, default: 10)',
            },
          },
        },
      },
      {
        name: 'get_workflow',
        description: 'Retrieve full details of a specific Ironclad contract workflow by its ID, including form fields, approvals, and status',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The Ironclad workflow ID (UUID)',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'create_workflow',
        description: 'Launch a new contract workflow from a template with initial form field values and optional creator',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'The workflow template ID to use for launching the new contract',
            },
            attributes: {
              type: 'object',
              description: 'Key-value map of form field values to populate the workflow (field names from the template schema)',
            },
            creator_email: {
              type: 'string',
              description: 'Email of the Ironclad user to launch the workflow on behalf of (defaults to token owner)',
            },
          },
          required: ['template_id', 'attributes'],
        },
      },
      {
        name: 'update_workflow_approval',
        description: 'Approve or reject a pending approval step on an Ironclad workflow, with optional comment',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The Ironclad workflow ID containing the approval',
            },
            approval_id: {
              type: 'string',
              description: 'The approval group or step ID to act on',
            },
            decision: {
              type: 'string',
              description: 'Approval decision: approved or rejected',
            },
            comment: {
              type: 'string',
              description: 'Optional comment explaining the approval decision',
            },
          },
          required: ['workflow_id', 'approval_id', 'decision'],
        },
      },
      {
        name: 'list_workflow_schemas',
        description: 'List all available workflow template schemas (contract types) in the Ironclad account, including field definitions',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (max: 20, default: 10)',
            },
          },
        },
      },
      {
        name: 'list_records',
        description: 'List executed contract records stored in the Ironclad repository, with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (max: 20, default: 10)',
            },
            type: {
              type: 'string',
              description: 'Filter records by record type (contract category)',
            },
          },
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a specific contract record from the Ironclad repository by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'The Ironclad record ID (UUID)',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new contract record in the Ironclad repository (use for importing existing executed contracts)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'The record type (contract category, must match a configured type in the account)',
            },
            attributes: {
              type: 'object',
              description: 'Key-value map of record field values',
            },
          },
          required: ['type', 'attributes'],
        },
      },
      {
        name: 'update_record',
        description: 'Update metadata fields on an existing contract record in the Ironclad repository',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'The Ironclad record ID to update',
            },
            attributes: {
              type: 'object',
              description: 'Key-value map of record fields to update (only provided fields are changed)',
            },
          },
          required: ['record_id', 'attributes'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all registered webhook endpoints in the Ironclad account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Register a new webhook endpoint to receive Ironclad event notifications for workflow and record changes',
        inputSchema: {
          type: 'object',
          properties: {
            target_url: {
              type: 'string',
              description: 'The HTTPS URL that Ironclad will POST event payloads to',
            },
            event_types: {
              type: 'array',
              description: 'Array of event type strings to subscribe to, e.g. workflow.created, workflow.completed, workflow.approval_status_changed',
              items: { type: 'string' },
            },
          },
          required: ['target_url', 'event_types'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a registered webhook by its ID to stop receiving event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The Ironclad webhook ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workflows':
          return await this.listWorkflows(args);
        case 'get_workflow':
          return await this.getWorkflow(args);
        case 'create_workflow':
          return await this.createWorkflow(args);
        case 'update_workflow_approval':
          return await this.updateWorkflowApproval(args);
        case 'list_workflow_schemas':
          return await this.listWorkflowSchemas(args);
        case 'list_records':
          return await this.listRecords(args);
        case 'get_record':
          return await this.getRecord(args);
        case 'create_record':
          return await this.createRecord(args);
        case 'update_record':
          return await this.updateRecord(args);
        case 'list_webhooks':
          return await this.listWebhooks();
        case 'create_webhook':
          return await this.createWebhook(args);
        case 'delete_webhook':
          return await this.deleteWebhook(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers(), ...options });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Ironclad API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    // Some endpoints (DELETE) return no body
    const text = await response.text();
    if (!text) {
      return { content: [{ type: 'text', text: 'OK' }], isError: false };
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`);
    }
    const out = JSON.stringify(data, null, 2);
    return { content: [{ type: 'text', text: this.truncate(out) }], isError: false };
  }

  private async listWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.template_id) params.set('template', args.template_id as string);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString();
    return this.request(`${this.baseUrl}/workflows${qs ? `?${qs}` : ''}`);
  }

  private async getWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const workflowId = args.workflow_id as string;
    if (!workflowId) {
      return { content: [{ type: 'text', text: 'workflow_id is required' }], isError: true };
    }
    return this.request(`${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}`);
  }

  private async createWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const templateId = args.template_id as string;
    const attributes = args.attributes as Record<string, unknown>;
    if (!templateId || !attributes) {
      return { content: [{ type: 'text', text: 'template_id and attributes are required' }], isError: true };
    }
    const body: Record<string, unknown> = { template: templateId, attributes };
    if (args.creator_email) body.creatorEmail = args.creator_email;
    return this.request(`${this.baseUrl}/workflows`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateWorkflowApproval(args: Record<string, unknown>): Promise<ToolResult> {
    const workflowId = args.workflow_id as string;
    const approvalId = args.approval_id as string;
    const decision = args.decision as string;
    if (!workflowId || !approvalId || !decision) {
      return { content: [{ type: 'text', text: 'workflow_id, approval_id, and decision are required' }], isError: true };
    }
    const body: Record<string, unknown> = { decision };
    if (args.comment) body.comment = args.comment;
    return this.request(
      `${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}/approvals/${encodeURIComponent(approvalId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  private async listWorkflowSchemas(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString();
    return this.request(`${this.baseUrl}/workflow-schemas${qs ? `?${qs}` : ''}`);
  }

  private async listRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    if (args.type) params.set('type', args.type as string);
    const qs = params.toString();
    return this.request(`${this.baseUrl}/records${qs ? `?${qs}` : ''}`);
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const recordId = args.record_id as string;
    if (!recordId) {
      return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
    }
    return this.request(`${this.baseUrl}/records/${encodeURIComponent(recordId)}`);
  }

  private async createRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const type = args.type as string;
    const attributes = args.attributes as Record<string, unknown>;
    if (!type || !attributes) {
      return { content: [{ type: 'text', text: 'type and attributes are required' }], isError: true };
    }
    return this.request(`${this.baseUrl}/records`, {
      method: 'POST',
      body: JSON.stringify({ type, attributes }),
    });
  }

  private async updateRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const recordId = args.record_id as string;
    const attributes = args.attributes as Record<string, unknown>;
    if (!recordId || !attributes) {
      return { content: [{ type: 'text', text: 'record_id and attributes are required' }], isError: true };
    }
    return this.request(`${this.baseUrl}/records/${encodeURIComponent(recordId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ attributes }),
    });
  }

  private async listWebhooks(): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/webhooks`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const targetUrl = args.target_url as string;
    const eventTypes = args.event_types as string[];
    if (!targetUrl || !eventTypes) {
      return { content: [{ type: 'text', text: 'target_url and event_types are required' }], isError: true };
    }
    return this.request(`${this.baseUrl}/webhooks`, {
      method: 'POST',
      body: JSON.stringify({ targetUrl, eventTypes }),
    });
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const webhookId = args.webhook_id as string;
    if (!webhookId) {
      return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    }
    return this.request(`${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`, {
      method: 'DELETE',
    });
  }
}
