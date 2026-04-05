/**
 * PlanGrid MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://io.plangrid.com
// Auth: API key via Authorization header (token {api_key})
// Docs: https://developer.plangrid.com/docs
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PlangridConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PlangridMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PlangridConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://io.plangrid.com';
  }

  static catalog() {
    return {
      name: 'plangrid',
      displayName: 'PlanGrid',
      version: '1.0.0',
      category: 'construction',
      keywords: ['plangrid', 'autodesk', 'construction', 'field management', 'sheets', 'drawings', 'rfi', 'submittals', 'tasks', 'photos', 'annotations'],
      toolNames: [
        'list_projects', 'get_project',
        'list_sheets', 'upload_sheet',
        'list_annotations', 'create_annotation',
        'list_tasks', 'create_task', 'update_task',
        'list_photos', 'upload_photo',
        'list_rfis', 'create_rfi',
        'list_submittals',
      ],
      description: 'PlanGrid construction field management: manage projects, sheets, annotations, tasks, photos, RFIs, and submittals.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all PlanGrid construction projects accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 20, max: 50)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get detailed information for a specific PlanGrid construction project',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID',
            },
          },
          required: ['project_uid'],
        },
      },
      {
        name: 'list_sheets',
        description: 'List drawing sheets for a PlanGrid project with optional version and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to list sheets for',
            },
            version_name: {
              type: 'string',
              description: 'Filter by sheet version name',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sheets to return (default: 20)',
            },
          },
          required: ['project_uid'],
        },
      },
      {
        name: 'upload_sheet',
        description: 'Initiate a sheet (drawing) upload for a PlanGrid project',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to upload the sheet to',
            },
            file_name: {
              type: 'string',
              description: 'Name of the sheet file (PDF)',
            },
            version_name: {
              type: 'string',
              description: 'Version label for this sheet upload',
            },
          },
          required: ['project_uid', 'file_name'],
        },
      },
      {
        name: 'list_annotations',
        description: 'List annotations on sheets for a PlanGrid project',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to list annotations for',
            },
            sheet_uid: {
              type: 'string',
              description: 'Filter annotations by sheet UID',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of annotations to return (default: 20)',
            },
          },
          required: ['project_uid'],
        },
      },
      {
        name: 'create_annotation',
        description: 'Create a new annotation on a drawing sheet in PlanGrid',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to add the annotation to',
            },
            sheet_uid: {
              type: 'string',
              description: 'Sheet UID to place the annotation on',
            },
            annotation_type: {
              type: 'string',
              description: 'Annotation type: text, arrow, cloud, ellipse, rectangle',
            },
            color: {
              type: 'string',
              description: 'Annotation color in hex format (e.g. #FF0000)',
            },
            label: {
              type: 'string',
              description: 'Text label for the annotation',
            },
          },
          required: ['project_uid', 'sheet_uid', 'annotation_type'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List field tasks for a PlanGrid project with optional status and assignee filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to list tasks for',
            },
            status: {
              type: 'string',
              description: 'Filter by task status: open, in_progress, pending, complete',
            },
            assigned_to_uid: {
              type: 'string',
              description: 'Filter tasks by assignee user UID',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (default: 20)',
            },
          },
          required: ['project_uid'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new field task (punch item) in a PlanGrid project',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to create the task in',
            },
            title: {
              type: 'string',
              description: 'Task title or description',
            },
            status: {
              type: 'string',
              description: 'Initial task status: open, in_progress, pending (default: open)',
            },
            assigned_to_uid: {
              type: 'string',
              description: 'User UID to assign the task to',
            },
            due_at: {
              type: 'string',
              description: 'Task due date in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)',
            },
            sheet_uid: {
              type: 'string',
              description: 'Sheet UID to associate the task with',
            },
          },
          required: ['project_uid', 'title'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing field task in PlanGrid',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID containing the task',
            },
            task_uid: {
              type: 'string',
              description: 'Task UID to update',
            },
            title: {
              type: 'string',
              description: 'Updated task title',
            },
            status: {
              type: 'string',
              description: 'Updated task status: open, in_progress, pending, complete',
            },
            assigned_to_uid: {
              type: 'string',
              description: 'Updated assignee user UID',
            },
            due_at: {
              type: 'string',
              description: 'Updated due date in ISO 8601 format',
            },
          },
          required: ['project_uid', 'task_uid'],
        },
      },
      {
        name: 'list_photos',
        description: 'List field photos for a PlanGrid project with optional date filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to list photos for',
            },
            created_after: {
              type: 'string',
              description: 'Filter photos created after this date (ISO 8601)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of photos to return (default: 20)',
            },
          },
          required: ['project_uid'],
        },
      },
      {
        name: 'upload_photo',
        description: 'Upload a field photo to a PlanGrid project',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to upload the photo to',
            },
            file_name: {
              type: 'string',
              description: 'Photo file name (JPEG or PNG)',
            },
            title: {
              type: 'string',
              description: 'Photo title or caption',
            },
          },
          required: ['project_uid', 'file_name'],
        },
      },
      {
        name: 'list_rfis',
        description: 'List Requests for Information (RFIs) for a PlanGrid project',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to list RFIs for',
            },
            status: {
              type: 'string',
              description: 'Filter by RFI status: draft, submitted, in_review, answered, closed',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of RFIs to return (default: 20)',
            },
          },
          required: ['project_uid'],
        },
      },
      {
        name: 'create_rfi',
        description: 'Create a new Request for Information (RFI) in a PlanGrid project',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to create the RFI in',
            },
            title: {
              type: 'string',
              description: 'RFI title or question',
            },
            question: {
              type: 'string',
              description: 'Detailed RFI question or description',
            },
            assigned_to_uid: {
              type: 'string',
              description: 'User UID assigned to answer the RFI',
            },
            due_at: {
              type: 'string',
              description: 'RFI response due date in ISO 8601 format',
            },
          },
          required: ['project_uid', 'title'],
        },
      },
      {
        name: 'list_submittals',
        description: 'List submittals for a PlanGrid project with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_uid: {
              type: 'string',
              description: 'PlanGrid project UID to list submittals for',
            },
            status: {
              type: 'string',
              description: 'Filter by submittal status: draft, submitted, in_review, approved, rejected',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of submittals to return (default: 20)',
            },
          },
          required: ['project_uid'],
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
        case 'list_sheets':
          return this.listSheets(args);
        case 'upload_sheet':
          return this.uploadSheet(args);
        case 'list_annotations':
          return this.listAnnotations(args);
        case 'create_annotation':
          return this.createAnnotation(args);
        case 'list_tasks':
          return this.listTasks(args);
        case 'create_task':
          return this.createTask(args);
        case 'update_task':
          return this.updateTask(args);
        case 'list_photos':
          return this.listPhotos(args);
        case 'upload_photo':
          return this.uploadPhoto(args);
        case 'list_rfis':
          return this.listRfis(args);
        case 'create_rfi':
          return this.createRfi(args);
        case 'list_submittals':
          return this.listSubmittals(args);
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
      'Authorization': `token ${this.apiKey}`,
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
    const params = new URLSearchParams({
      skip: String((args.skip as number) || 0),
      limit: String((args.limit as number) || 20),
    });
    return this.apiGet(`/api/1/projects?${params.toString()}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid) {
      return { content: [{ type: 'text', text: 'project_uid is required' }], isError: true };
    }
    return this.apiGet(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}`);
  }

  private async listSheets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid) {
      return { content: [{ type: 'text', text: 'project_uid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      skip: String((args.skip as number) || 0),
      limit: String((args.limit as number) || 20),
    });
    if (args.version_name) params.set('version_name', args.version_name as string);
    return this.apiGet(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/sheets?${params.toString()}`);
  }

  private async uploadSheet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid || !args.file_name) {
      return { content: [{ type: 'text', text: 'project_uid and file_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { file_name: args.file_name };
    if (args.version_name) body.version_name = args.version_name;
    return this.apiPost(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/sheets/uploads`, body);
  }

  private async listAnnotations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid) {
      return { content: [{ type: 'text', text: 'project_uid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      skip: String((args.skip as number) || 0),
      limit: String((args.limit as number) || 20),
    });
    if (args.sheet_uid) params.set('sheet_uid', args.sheet_uid as string);
    return this.apiGet(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/annotations?${params.toString()}`);
  }

  private async createAnnotation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid || !args.sheet_uid || !args.annotation_type) {
      return { content: [{ type: 'text', text: 'project_uid, sheet_uid, and annotation_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      sheet_uid: args.sheet_uid,
      type: args.annotation_type,
    };
    if (args.color) body.color = args.color;
    if (args.label) body.label = args.label;
    return this.apiPost(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/annotations`, body);
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid) {
      return { content: [{ type: 'text', text: 'project_uid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      skip: String((args.skip as number) || 0),
      limit: String((args.limit as number) || 20),
    });
    if (args.status) params.set('status', args.status as string);
    if (args.assigned_to_uid) params.set('assigned_to_uid', args.assigned_to_uid as string);
    return this.apiGet(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/tasks?${params.toString()}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid || !args.title) {
      return { content: [{ type: 'text', text: 'project_uid and title are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      title: args.title,
      status: (args.status as string) || 'open',
    };
    if (args.assigned_to_uid) body.assigned_to_uid = args.assigned_to_uid;
    if (args.due_at) body.due_at = args.due_at;
    if (args.sheet_uid) body.sheet_uid = args.sheet_uid;
    return this.apiPost(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/tasks`, body);
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid || !args.task_uid) {
      return { content: [{ type: 'text', text: 'project_uid and task_uid are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.status) body.status = args.status;
    if (args.assigned_to_uid) body.assigned_to_uid = args.assigned_to_uid;
    if (args.due_at) body.due_at = args.due_at;
    return this.apiPatch(
      `/api/1/projects/${encodeURIComponent(args.project_uid as string)}/tasks/${encodeURIComponent(args.task_uid as string)}`,
      body,
    );
  }

  private async listPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid) {
      return { content: [{ type: 'text', text: 'project_uid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      skip: String((args.skip as number) || 0),
      limit: String((args.limit as number) || 20),
    });
    if (args.created_after) params.set('created_after', args.created_after as string);
    return this.apiGet(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/photos?${params.toString()}`);
  }

  private async uploadPhoto(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid || !args.file_name) {
      return { content: [{ type: 'text', text: 'project_uid and file_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { file_name: args.file_name };
    if (args.title) body.title = args.title;
    return this.apiPost(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/photos`, body);
  }

  private async listRfis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid) {
      return { content: [{ type: 'text', text: 'project_uid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      skip: String((args.skip as number) || 0),
      limit: String((args.limit as number) || 20),
    });
    if (args.status) params.set('status', args.status as string);
    return this.apiGet(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/rfis?${params.toString()}`);
  }

  private async createRfi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid || !args.title) {
      return { content: [{ type: 'text', text: 'project_uid and title are required' }], isError: true };
    }
    const body: Record<string, unknown> = { title: args.title };
    if (args.question) body.question = args.question;
    if (args.assigned_to_uid) body.assigned_to_uid = args.assigned_to_uid;
    if (args.due_at) body.due_at = args.due_at;
    return this.apiPost(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/rfis`, body);
  }

  private async listSubmittals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_uid) {
      return { content: [{ type: 'text', text: 'project_uid is required' }], isError: true };
    }
    const params = new URLSearchParams({
      skip: String((args.skip as number) || 0),
      limit: String((args.limit as number) || 20),
    });
    if (args.status) params.set('status', args.status as string);
    return this.apiGet(`/api/1/projects/${encodeURIComponent(args.project_uid as string)}/submittals?${params.toString()}`);
  }
}
