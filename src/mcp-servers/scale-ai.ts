/**
 * Scale AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Scale AI MCP server for the data labeling/annotation platform was found on GitHub.
// The scaleapi/mcp-atlas repo is an unrelated MCP registry utility, not a labeling-platform MCP server.
// Recommendation: use-rest-api
//
// Base URL: https://api.scale.com/v1
// Auth: HTTP Basic — API key as username, empty password: Authorization: Basic base64(apiKey:)
// Docs: https://scale.com/docs/api-reference
// Rate limits: Varies by plan; no globally documented rate limit. Respect HTTP 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ScaleAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ScaleAIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ScaleAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.scale.com/v1';
  }

  // Scale AI uses HTTP Basic auth: API key as username, empty password.
  private get authHeader(): string {
    const encoded = Buffer.from(`${this.apiKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'scale-ai',
      displayName: 'Scale AI',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: [
        'scale', 'scaleai', 'data labeling', 'annotation', 'task', 'batch',
        'project', 'training data', 'RLHF', 'evaluation', 'generative AI',
      ],
      toolNames: [
        'list_tasks', 'get_task', 'cancel_task',
        'create_batch', 'get_batch', 'finalize_batch', 'list_batches',
        'get_project', 'list_projects', 'create_project',
        'upload_file', 'list_files',
        'create_text_collection_task', 'create_document_transcription_task',
      ],
      description:
        'Manage Scale AI data labeling tasks, batches, and projects. Create annotation tasks, track batch status, upload files, and manage projects for ML training data pipelines.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tasks',
        description:
          'List Scale AI data labeling tasks with optional filters for project, batch, status, and type. Returns paginated task list.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter tasks by project name',
            },
            batch: {
              type: 'string',
              description: 'Filter tasks by batch name',
            },
            status: {
              type: 'string',
              description: 'Filter by task status: pending, completed, canceled, error',
            },
            type: {
              type: 'string',
              description:
                'Filter by task type: imageannotation, textcollection, documenttranscription, etc.',
            },
            limit: {
              type: 'number',
              description: 'Number of tasks per page (max 100, default: 20)',
            },
            next_token: {
              type: 'string',
              description: 'Pagination cursor from a previous response to fetch the next page',
            },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve a single Scale AI task by its task ID, including its response and audit trail.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the task',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'cancel_task',
        description: 'Cancel a pending Scale AI task that has not yet been completed or sent to a worker.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the task to cancel',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'create_batch',
        description:
          'Create a new batch to group labeling tasks in a project. Batches must be finalized before work begins.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The project name to associate the batch with',
            },
            name: {
              type: 'string',
              description: 'A unique name for this batch within the project',
            },
            calibration_batch: {
              type: 'boolean',
              description:
                'If true, tasks in this batch are used for worker calibration (default: false)',
            },
            self_label_batch: {
              type: 'boolean',
              description:
                'If true, the batch will be labeled by the requesting organization (default: false)',
            },
          },
          required: ['project', 'name'],
        },
      },
      {
        name: 'get_batch',
        description: 'Retrieve status, metadata, and task counts for a batch by name.',
        inputSchema: {
          type: 'object',
          properties: {
            batch_name: {
              type: 'string',
              description: 'The unique name of the batch',
            },
          },
          required: ['batch_name'],
        },
      },
      {
        name: 'finalize_batch',
        description:
          'Finalize a batch to signal that all tasks have been submitted. Work begins after finalization.',
        inputSchema: {
          type: 'object',
          properties: {
            batch_name: {
              type: 'string',
              description: 'The unique name of the batch to finalize',
            },
          },
          required: ['batch_name'],
        },
      },
      {
        name: 'list_batches',
        description:
          'List all batches for a project with optional status filter and pagination cursor.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter batches by project name',
            },
            status: {
              type: 'string',
              description:
                'Filter by batch status: staging, in_progress, completed, canceled',
            },
            limit: {
              type: 'number',
              description: 'Number of batches per page (default: 20)',
            },
            next_token: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_project',
        description:
          'Retrieve configuration, instructions, and rapid settings for a Scale AI project by name.',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'The unique name of the project',
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all Scale AI projects accessible with this API key.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_project',
        description:
          'Create a new Scale AI project with a specified type, name, and labeling instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description:
                'Project type: imageannotation, textcollection, documenttranscription, videoplaybackannotation, etc.',
            },
            name: {
              type: 'string',
              description: 'Unique name for the project',
            },
            params: {
              type: 'object',
              description:
                'Project-specific parameters such as instruction, geometries, taxonomy, or other configuration fields',
            },
          },
          required: ['type', 'name'],
        },
      },
      {
        name: 'upload_file',
        description:
          'Upload a file (up to 80 MB) to Scale AI storage by URL for use in labeling tasks.',
        inputSchema: {
          type: 'object',
          properties: {
            file_url: {
              type: 'string',
              description: 'Publicly accessible URL of the file to import into Scale storage',
            },
            project_name: {
              type: 'string',
              description: 'Associate the file with a project name',
            },
          },
          required: ['file_url'],
        },
      },
      {
        name: 'list_files',
        description:
          'List files uploaded to Scale AI storage, optionally filtered by project name.',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Filter files by associated project name',
            },
            limit: {
              type: 'number',
              description: 'Number of files per page (default: 20)',
            },
            next_token: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'create_text_collection_task',
        description:
          'Create a text collection or RLHF annotation task for generative AI training data with prompt and instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project name to associate the task with',
            },
            batch: {
              type: 'string',
              description: 'Batch name to group this task into',
            },
            instruction: {
              type: 'string',
              description: 'Instructions for the labeling worker (supports Markdown)',
            },
            text: {
              type: 'string',
              description: 'Prompt or text content to annotate or evaluate',
            },
            attachments: {
              type: 'array',
              description:
                'Array of attachment objects with type and content fields for additional context',
              items: { type: 'object' },
            },
            metadata: {
              type: 'object',
              description: 'Optional key-value metadata to associate with this task',
            },
            unique_id: {
              type: 'string',
              description:
                'Optional unique identifier to prevent duplicate task creation (idempotency key)',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'create_document_transcription_task',
        description:
          'Create a document transcription task where workers extract structured data from documents or images.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project name to associate the task with',
            },
            batch: {
              type: 'string',
              description: 'Batch name to group this task into',
            },
            attachment: {
              type: 'string',
              description: 'URL of the document or image to transcribe',
            },
            instruction: {
              type: 'string',
              description: 'Instructions for the transcription worker',
            },
            fields: {
              type: 'array',
              description:
                'Array of field definition objects specifying what data to extract from the document',
              items: { type: 'object' },
            },
            metadata: {
              type: 'object',
              description: 'Optional key-value metadata',
            },
            unique_id: {
              type: 'string',
              description: 'Optional idempotency key to prevent duplicate task creation',
            },
          },
          required: ['project', 'attachment'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tasks':
          return await this.listTasks(args);
        case 'get_task':
          return await this.getTask(args);
        case 'cancel_task':
          return await this.cancelTask(args);
        case 'create_batch':
          return await this.createBatch(args);
        case 'get_batch':
          return await this.getBatch(args);
        case 'finalize_batch':
          return await this.finalizeBatch(args);
        case 'list_batches':
          return await this.listBatches(args);
        case 'get_project':
          return await this.getProject(args);
        case 'list_projects':
          return await this.listProjects();
        case 'create_project':
          return await this.createProject(args);
        case 'upload_file':
          return await this.uploadFile(args);
        case 'list_files':
          return await this.listFiles(args);
        case 'create_text_collection_task':
          return await this.createTextCollectionTask(args);
        case 'create_document_transcription_task':
          return await this.createDocumentTranscriptionTask(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: URLSearchParams,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Scale AI API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project) params.set('project', args.project as string);
    if (args.batch) params.set('batch', args.batch as string);
    if (args.status) params.set('status', args.status as string);
    if (args.type) params.set('type', args.type as string);
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.next_token) params.set('next_token', args.next_token as string);
    return this.request('GET', '/tasks', undefined, params);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.task_id as string;
    if (!taskId) {
      return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };
    }
    return this.request('GET', `/task/${encodeURIComponent(taskId)}`);
  }

  private async cancelTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.task_id as string;
    if (!taskId) {
      return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };
    }
    return this.request('POST', `/task/${encodeURIComponent(taskId)}/cancel`);
  }

  private async createBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const name = args.name as string;
    if (!project || !name) {
      return { content: [{ type: 'text', text: 'project and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { project, name };
    if (typeof args.calibration_batch === 'boolean') body.calibration_batch = args.calibration_batch;
    if (typeof args.self_label_batch === 'boolean') body.self_label_batch = args.self_label_batch;
    return this.request('POST', '/batches', body);
  }

  private async getBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const batchName = args.batch_name as string;
    if (!batchName) {
      return { content: [{ type: 'text', text: 'batch_name is required' }], isError: true };
    }
    return this.request('GET', `/batches/${encodeURIComponent(batchName)}/status`);
  }

  private async finalizeBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const batchName = args.batch_name as string;
    if (!batchName) {
      return { content: [{ type: 'text', text: 'batch_name is required' }], isError: true };
    }
    return this.request('POST', `/batches/${encodeURIComponent(batchName)}/finalize`);
  }

  private async listBatches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project) params.set('project', args.project as string);
    if (args.status) params.set('status', args.status as string);
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.next_token) params.set('next_token', args.next_token as string);
    return this.request('GET', '/batches', undefined, params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectName = args.project_name as string;
    if (!projectName) {
      return { content: [{ type: 'text', text: 'project_name is required' }], isError: true };
    }
    return this.request('GET', `/projects/${encodeURIComponent(projectName)}`);
  }

  private async listProjects(): Promise<ToolResult> {
    return this.request('GET', '/projects');
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const type = args.type as string;
    const name = args.name as string;
    if (!type || !name) {
      return { content: [{ type: 'text', text: 'type and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { type, name };
    if (args.params && typeof args.params === 'object') {
      Object.assign(body, args.params as Record<string, unknown>);
    }
    return this.request('POST', '/projects', body);
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    const fileUrl = args.file_url as string;
    if (!fileUrl) {
      return { content: [{ type: 'text', text: 'file_url is required' }], isError: true };
    }
    const body: Record<string, unknown> = { file_url: fileUrl };
    if (args.project_name) body.project_name = args.project_name;
    return this.request('POST', '/files/import', body);
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project_name) params.set('project_name', args.project_name as string);
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.next_token) params.set('next_token', args.next_token as string);
    return this.request('GET', '/files', undefined, params);
  }

  private async createTextCollectionTask(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    if (!project) {
      return { content: [{ type: 'text', text: 'project is required' }], isError: true };
    }
    const body: Record<string, unknown> = { project };
    if (args.batch) body.batch = args.batch;
    if (args.instruction) body.instruction = args.instruction;
    if (args.text) body.text = args.text;
    if (args.attachments) body.attachments = args.attachments;
    if (args.metadata) body.metadata = args.metadata;
    if (args.unique_id) body.unique_id = args.unique_id;
    return this.request('POST', '/task/textcollection', body);
  }

  private async createDocumentTranscriptionTask(
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const project = args.project as string;
    const attachment = args.attachment as string;
    if (!project || !attachment) {
      return {
        content: [{ type: 'text', text: 'project and attachment are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { project, attachment };
    if (args.batch) body.batch = args.batch;
    if (args.instruction) body.instruction = args.instruction;
    if (args.fields) body.fields = args.fields;
    if (args.metadata) body.metadata = args.metadata;
    if (args.unique_id) body.unique_id = args.unique_id;
    return this.request('POST', '/task/documenttranscription', body);
  }
}
