/**
 * GSMtasks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official GSMtasks MCP server was found on GitHub.
//
// Base URL: https://gsmtasks.com (API paths are at root, no versioned prefix)
// Auth: Token-based — Authorization header with "Token <apitoken>" prefix
// Docs: https://gsmtasks.com/docs/api/
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GSMTasksConfig {
  apiToken: string;
  /** Optional base URL override (default: https://gsmtasks.com) */
  baseUrl?: string;
}

export class GSMTasksMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: GSMTasksConfig) {
    super();
    this.token = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://gsmtasks.com';
  }

  static catalog() {
    return {
      name: 'gsmtasks',
      displayName: 'GSMtasks',
      version: '1.0.0',
      category: 'logistics',
      keywords: [
        'gsmtasks', 'task', 'dispatch', 'field service', 'logistics', 'route',
        'worker', 'driver', 'order', 'delivery', 'tracking', 'assignment',
        'mobile workforce', 'fleet', 'optimization',
      ],
      toolNames: [
        'list_tasks', 'get_task', 'create_task', 'update_task',
        'assign_task', 'complete_task', 'cancel_task', 'accept_task',
        'list_orders', 'get_order', 'create_order',
        'list_routes', 'get_route', 'create_route',
        'list_workers', 'list_documents',
        'get_task_events', 'get_task_signatures',
      ],
      description: 'GSMtasks field service management: create and dispatch tasks to workers, manage delivery orders, optimize routes, and track worker assignments and completions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tasks',
        description: 'List all tasks with optional filtering by status, assignee, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page (default: 20, max: 100)' },
            state: { type: 'string', description: 'Filter by task state: unassigned, assigned, accepted, transit, completed, failed, cancelled' },
            assignee: { type: 'string', description: 'Filter by assignee user UUID' },
            order: { type: 'string', description: 'Filter by parent order UUID' },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Get a single task by its UUID including address, assignee, and state details',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new field service task with address, contact, and time window details',
        inputSchema: {
          type: 'object',
          properties: {
            order: { type: 'string', description: 'Parent order UUID to associate this task with' },
            address: { type: 'object', description: 'Task location address object with raw_address or structured fields' },
            contact: { type: 'object', description: 'Contact person object with name, phone, email' },
            scheduled_time: { type: 'string', description: 'ISO 8601 scheduled start time (e.g. 2026-03-28T09:00:00Z)' },
            duration: { type: 'number', description: 'Expected task duration in seconds' },
            notes: { type: 'string', description: 'Internal notes for the worker' },
          },
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing task fields such as address, contact, scheduled time, or notes',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID to update' },
            address: { type: 'object', description: 'Updated address object' },
            contact: { type: 'object', description: 'Updated contact object' },
            scheduled_time: { type: 'string', description: 'Updated ISO 8601 scheduled time' },
            notes: { type: 'string', description: 'Updated internal notes' },
          },
          required: ['id'],
        },
      },
      {
        name: 'assign_task',
        description: 'Assign a task to a specific worker by their UUID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID to assign' },
            assignee: { type: 'string', description: 'Worker UUID to assign the task to' },
          },
          required: ['id', 'assignee'],
        },
      },
      {
        name: 'complete_task',
        description: 'Mark a task as completed — worker has finished the job',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID to mark as complete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'cancel_task',
        description: 'Cancel a task that is no longer needed',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID to cancel' },
          },
          required: ['id'],
        },
      },
      {
        name: 'accept_task',
        description: 'Mark a task as accepted by the assigned worker',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID to accept' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_orders',
        description: 'List all orders with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get a single order by UUID including its associated tasks',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Order UUID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new delivery order grouping multiple tasks',
        inputSchema: {
          type: 'object',
          properties: {
            external_id: { type: 'string', description: 'Your system reference ID for this order' },
            notes: { type: 'string', description: 'Order-level notes' },
          },
        },
      },
      {
        name: 'list_routes',
        description: 'List optimized worker routes with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_route',
        description: 'Get a specific route by UUID including assigned tasks and waypoints',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Route UUID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_route',
        description: 'Create a route for a worker for a given date',
        inputSchema: {
          type: 'object',
          properties: {
            assignee: { type: 'string', description: 'Worker UUID for this route' },
            date: { type: 'string', description: 'Route date in YYYY-MM-DD format' },
          },
          required: ['assignee', 'date'],
        },
      },
      {
        name: 'list_workers',
        description: 'List all workers (drivers/field agents) in the account with their current status',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'list_documents',
        description: 'List all task-related documents such as delivery photos and signatures',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Results per page' },
            task: { type: 'string', description: 'Filter by task UUID' },
          },
        },
      },
      {
        name: 'get_task_events',
        description: 'Get the event timeline for a specific task showing state transitions and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID to retrieve events for' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_task_signatures',
        description: 'Get signature images captured for a specific completed task',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task UUID to retrieve signatures for' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tasks': return this.listTasks(args);
        case 'get_task': return this.getTask(args);
        case 'create_task': return this.createTask(args);
        case 'update_task': return this.updateTask(args);
        case 'assign_task': return this.assignTask(args);
        case 'complete_task': return this.taskAction(args, 'complete');
        case 'cancel_task': return this.taskAction(args, 'cancel');
        case 'accept_task': return this.taskAction(args, 'accept');
        case 'list_orders': return this.listOrders(args);
        case 'get_order': return this.getOrder(args);
        case 'create_order': return this.createOrder(args);
        case 'list_routes': return this.listRoutes(args);
        case 'get_route': return this.getRoute(args);
        case 'create_route': return this.createRoute(args);
        case 'list_workers': return this.listWorkers(args);
        case 'list_documents': return this.listDocuments(args);
        case 'get_task_events': return this.getTaskEvents(args);
        case 'get_task_signatures': return this.getTaskSignatures(args);
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

  private headers(): Record<string, string> {
    return {
      'Authorization': `Token ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string, params: Record<string, unknown> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const q = qs.toString();
    return `${this.baseUrl}${path}${q ? '?' + q : ''}`;
  }

  private async get(path: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path, params), { headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.page !== undefined) params['page'] = args.page;
    if (args.page_size !== undefined) params['page_size'] = args.page_size;
    if (args.state) params['state'] = args.state;
    if (args.assignee) params['assignee'] = args.assignee;
    if (args.order) params['order'] = args.order;
    return this.get('/tasks/', params);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/tasks/${encodeURIComponent(args.id as string)}/`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.order) body['order'] = args.order;
    if (args.address) body['address'] = args.address;
    if (args.contact) body['contact'] = args.contact;
    if (args.scheduled_time) body['scheduled_time'] = args.scheduled_time;
    if (args.duration) body['duration'] = args.duration;
    if (args.notes) body['notes'] = args.notes;
    return this.post('/tasks/', body);
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.address) body['address'] = args.address;
    if (args.contact) body['contact'] = args.contact;
    if (args.scheduled_time) body['scheduled_time'] = args.scheduled_time;
    if (args.notes) body['notes'] = args.notes;
    return this.patch(`/tasks/${encodeURIComponent(args.id as string)}/`, body);
  }

  private async assignTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    if (!args.assignee) return { content: [{ type: 'text', text: 'assignee is required' }], isError: true };
    return this.post(`/tasks/${encodeURIComponent(args.id as string)}/assign/`, { assignee: args.assignee });
  }

  private async taskAction(args: Record<string, unknown>, action: string): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.post(`/tasks/${encodeURIComponent(args.id as string)}/${action}/`);
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.page !== undefined) params['page'] = args.page;
    if (args.page_size !== undefined) params['page_size'] = args.page_size;
    return this.get('/orders/', params);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/orders/${encodeURIComponent(args.id as string)}/`);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.external_id) body['external_id'] = args.external_id;
    if (args.notes) body['notes'] = args.notes;
    return this.post('/orders/', body);
  }

  private async listRoutes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.page !== undefined) params['page'] = args.page;
    if (args.page_size !== undefined) params['page_size'] = args.page_size;
    return this.get('/routes/', params);
  }

  private async getRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/routes/${encodeURIComponent(args.id as string)}/`);
  }

  private async createRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.assignee) return { content: [{ type: 'text', text: 'assignee is required' }], isError: true };
    if (!args.date) return { content: [{ type: 'text', text: 'date is required' }], isError: true };
    return this.post('/routes/', { assignee: args.assignee, date: args.date });
  }

  private async listWorkers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.page !== undefined) params['page'] = args.page;
    if (args.page_size !== undefined) params['page_size'] = args.page_size;
    return this.get('/account_roles/', params);
  }

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.page !== undefined) params['page'] = args.page;
    if (args.page_size !== undefined) params['page_size'] = args.page_size;
    if (args.task) params['task'] = args.task;
    return this.get('/documents/', params);
  }

  private async getTaskEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/tasks/${encodeURIComponent(args.id as string)}/events/`);
  }

  private async getTaskSignatures(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/tasks/${encodeURIComponent(args.id as string)}/signatures/`);
  }
}
