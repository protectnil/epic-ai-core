/**
 * Autodesk Construction Cloud (ACC) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://developer.api.autodesk.com
// Auth: OAuth2 Bearer token (3-legged or 2-legged)
// Docs: https://aps.autodesk.com/developer/overview/autodesk-construction-cloud
// Rate limits: Not publicly documented; varies by API and plan tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AutodeskConstructionConfig {
  accessToken: string;
  baseUrl?: string;
}

export class AutodeskConstructionMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AutodeskConstructionConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://developer.api.autodesk.com';
  }

  static catalog() {
    return {
      name: 'autodesk-construction',
      displayName: 'Autodesk Construction Cloud',
      version: '1.0.0',
      category: 'construction',
      keywords: ['autodesk', 'acc', 'bim360', 'construction', 'issues', 'rfi', 'submittals', 'cost', 'documents', 'sheets', 'project management'],
      toolNames: [
        'list_projects', 'get_project',
        'list_issues', 'create_issue', 'update_issue',
        'list_rfis', 'create_rfi',
        'list_submittals', 'get_submittal',
        'list_cost_items', 'get_cost_summary',
        'list_documents', 'upload_document', 'list_sheets',
      ],
      description: 'Autodesk Construction Cloud (ACC): manage construction projects, issues, RFIs, submittals, cost items, documents, and sheets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Autodesk Construction Cloud projects accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'ACC account (hub) ID to list projects for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_project',
        description: 'Get detailed information for a specific Autodesk Construction Cloud project',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'ACC account (hub) ID',
            },
            project_id: {
              type: 'string',
              description: 'ACC project ID',
            },
          },
          required: ['account_id', 'project_id'],
        },
      },
      {
        name: 'list_issues',
        description: 'List construction issues for a project with optional filters for status and type',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to list issues for',
            },
            status: {
              type: 'string',
              description: 'Filter by issue status: open, in_progress, pending, closed',
            },
            issue_type_id: {
              type: 'string',
              description: 'Filter by issue type ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new construction issue in an Autodesk Construction Cloud project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to create the issue in',
            },
            title: {
              type: 'string',
              description: 'Issue title or summary',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the issue',
            },
            issue_type_id: {
              type: 'string',
              description: 'Issue type ID (retrieve from issue types list)',
            },
            status: {
              type: 'string',
              description: 'Initial status: open, in_progress, pending (default: open)',
            },
            assigned_to: {
              type: 'string',
              description: 'User ID of the person assigned to the issue',
            },
            due_date: {
              type: 'string',
              description: 'Due date for the issue (YYYY-MM-DD)',
            },
          },
          required: ['project_id', 'title', 'issue_type_id'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an existing construction issue in Autodesk Construction Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID containing the issue',
            },
            issue_id: {
              type: 'string',
              description: 'Issue ID to update',
            },
            title: {
              type: 'string',
              description: 'Updated issue title',
            },
            description: {
              type: 'string',
              description: 'Updated issue description',
            },
            status: {
              type: 'string',
              description: 'Updated status: open, in_progress, pending, closed',
            },
            assigned_to: {
              type: 'string',
              description: 'Updated assignee user ID',
            },
            due_date: {
              type: 'string',
              description: 'Updated due date (YYYY-MM-DD)',
            },
          },
          required: ['project_id', 'issue_id'],
        },
      },
      {
        name: 'list_rfis',
        description: 'List Requests for Information (RFIs) for a construction project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to list RFIs for',
            },
            status: {
              type: 'string',
              description: 'Filter by RFI status: draft, submitted, in_review, answered, closed',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of RFIs to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_rfi',
        description: 'Create a new Request for Information (RFI) in an Autodesk Construction Cloud project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to create the RFI in',
            },
            title: {
              type: 'string',
              description: 'RFI title or subject',
            },
            description: {
              type: 'string',
              description: 'Detailed question or information request',
            },
            assigned_to: {
              type: 'string',
              description: 'User ID of the person assigned to answer the RFI',
            },
            due_date: {
              type: 'string',
              description: 'Response due date (YYYY-MM-DD)',
            },
          },
          required: ['project_id', 'title'],
        },
      },
      {
        name: 'list_submittals',
        description: 'List submittals for a construction project with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to list submittals for',
            },
            status: {
              type: 'string',
              description: 'Filter by submittal status: draft, submitted, in_review, approved, rejected',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of submittals to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_submittal',
        description: 'Get detailed information for a specific submittal in a construction project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID containing the submittal',
            },
            submittal_id: {
              type: 'string',
              description: 'Submittal ID to retrieve',
            },
          },
          required: ['project_id', 'submittal_id'],
        },
      },
      {
        name: 'list_cost_items',
        description: 'List cost items or budget line items for a construction project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to list cost items for',
            },
            budget_code: {
              type: 'string',
              description: 'Filter by budget code',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of cost items to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_cost_summary',
        description: 'Get a cost summary including budget, committed costs, and variance for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to retrieve cost summary for',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_documents',
        description: 'List documents in a project folder within Autodesk Construction Cloud Document Management',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to list documents for',
            },
            folder_id: {
              type: 'string',
              description: 'Folder ID to list documents in (root folder if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of documents to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'upload_document',
        description: 'Initiate a document upload to Autodesk Construction Cloud Document Management',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to upload the document to',
            },
            folder_id: {
              type: 'string',
              description: 'Target folder ID for the upload',
            },
            file_name: {
              type: 'string',
              description: 'Name of the file to upload',
            },
            file_size: {
              type: 'number',
              description: 'Size of the file in bytes',
            },
          },
          required: ['project_id', 'folder_id', 'file_name', 'file_size'],
        },
      },
      {
        name: 'list_sheets',
        description: 'List drawing sheets for a construction project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ACC project ID to list sheets for',
            },
            sheet_set_id: {
              type: 'string',
              description: 'Filter by sheet set ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sheets to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['project_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return this.listProjects(args);
        case 'get_project':
          return this.getProject(args);
        case 'list_issues':
          return this.listIssues(args);
        case 'create_issue':
          return this.createIssue(args);
        case 'update_issue':
          return this.updateIssue(args);
        case 'list_rfis':
          return this.listRfis(args);
        case 'create_rfi':
          return this.createRfi(args);
        case 'list_submittals':
          return this.listSubmittals(args);
        case 'get_submittal':
          return this.getSubmittal(args);
        case 'list_cost_items':
          return this.listCostItems(args);
        case 'get_cost_summary':
          return this.getCostSummary(args);
        case 'list_documents':
          return this.listDocuments(args);
        case 'upload_document':
          return this.uploadDocument(args);
        case 'list_sheets':
          return this.listSheets(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    });
    return this.apiGet(`/project/v1/hubs/b.${args.account_id}/projects?${params.toString()}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id || !args.project_id) {
      return { content: [{ type: 'text', text: 'account_id and project_id are required' }], isError: true };
    }
    return this.apiGet(`/project/v1/hubs/b.${args.account_id}/projects/b.${args.project_id}`);
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    });
    if (args.status) params.set('filter[status]', args.status as string);
    if (args.issue_type_id) params.set('filter[issueTypeId]', args.issue_type_id as string);
    return this.apiGet(`/construction/issues/v1/projects/${args.project_id}/issues?${params.toString()}`);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.title || !args.issue_type_id) {
      return { content: [{ type: 'text', text: 'project_id, title, and issue_type_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      title: args.title,
      issueTypeId: args.issue_type_id,
      status: (args.status as string) || 'open',
    };
    if (args.description) body.description = args.description;
    if (args.assigned_to) body.assignedTo = args.assigned_to;
    if (args.due_date) body.dueDate = args.due_date;
    return this.apiPost(`/construction/issues/v1/projects/${args.project_id}/issues`, body);
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.issue_id) {
      return { content: [{ type: 'text', text: 'project_id and issue_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.assigned_to) body.assignedTo = args.assigned_to;
    if (args.due_date) body.dueDate = args.due_date;
    return this.apiPatch(`/construction/issues/v1/projects/${args.project_id}/issues/${args.issue_id}`, body);
  }

  private async listRfis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    });
    if (args.status) params.set('filter[status]', args.status as string);
    return this.apiGet(`/construction/rfis/v1/projects/${args.project_id}/rfis?${params.toString()}`);
  }

  private async createRfi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.title) {
      return { content: [{ type: 'text', text: 'project_id and title are required' }], isError: true };
    }
    const body: Record<string, unknown> = { title: args.title };
    if (args.description) body.description = args.description;
    if (args.assigned_to) body.assignedTo = args.assigned_to;
    if (args.due_date) body.dueDate = args.due_date;
    return this.apiPost(`/construction/rfis/v1/projects/${args.project_id}/rfis`, body);
  }

  private async listSubmittals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    });
    if (args.status) params.set('filter[status]', args.status as string);
    return this.apiGet(`/construction/submittals/v1/projects/${args.project_id}/items?${params.toString()}`);
  }

  private async getSubmittal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.submittal_id) {
      return { content: [{ type: 'text', text: 'project_id and submittal_id are required' }], isError: true };
    }
    return this.apiGet(`/construction/submittals/v1/projects/${args.project_id}/items/${args.submittal_id}`);
  }

  private async listCostItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    });
    if (args.budget_code) params.set('filter[budgetCode]', args.budget_code as string);
    return this.apiGet(`/cost/v1/containers/${args.project_id}/budget-code-templates?${params.toString()}`);
  }

  private async getCostSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    return this.apiGet(`/cost/v1/containers/${args.project_id}/summary`);
  }

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    });
    const folderId = args.folder_id as string | undefined;
    const path = folderId
      ? `/data/v1/projects/b.${args.project_id}/folders/${folderId}/contents?${params.toString()}`
      : `/project/v1/hubs/projects/b.${args.project_id}/topFolders?${params.toString()}`;
    return this.apiGet(path);
  }

  private async uploadDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.folder_id || !args.file_name || args.file_size === undefined) {
      return { content: [{ type: 'text', text: 'project_id, folder_id, file_name, and file_size are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      jsonapi: { version: '1.0' },
      data: {
        type: 'objects',
        attributes: {
          name: args.file_name,
          extension: { type: 'items:autodesk.core:File', version: '1.0' },
        },
      },
    };
    return this.apiPost(`/data/v1/projects/b.${args.project_id}/folders/${args.folder_id}/contents`, body);
  }

  private async listSheets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    });
    if (args.sheet_set_id) params.set('filter[sheetSetId]', args.sheet_set_id as string);
    return this.apiGet(`/construction/sheets/v1/projects/${args.project_id}/sheets?${params.toString()}`);
  }
}
