/**
 * n8n Workflow Automation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official n8n MCP server was found on GitHub. n8n exposes its own public REST API which this
// adapter wraps. n8n also has a built-in MCP trigger node for making n8n workflows available as an
// MCP server, and a community MCP (czlonkowski/n8n-mcp) for n8n node documentation — but neither
// is an official vendor-published MCP for managing the n8n instance via its public REST API.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools (none found).
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: http://localhost:5678/api/v1 (self-hosted default) — override via baseUrl config
//           For n8n Cloud: https://<your-subdomain>.app.n8n.cloud/api/v1
// Auth: API key in X-N8N-API-KEY header (create in n8n Settings > API)
// Docs: https://docs.n8n.io/api/api-reference/
// Rate limits: Not publicly documented; self-hosted limits depend on infrastructure

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface N8NConfig {
  apiKey: string;
  baseUrl?: string;
}

export class N8NMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: N8NConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:5678/api/v1';
  }

  static catalog() {
    return {
      name: 'n8n',
      displayName: 'n8n',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'n8n', 'workflow', 'automation', 'orchestration', 'no-code', 'low-code', 'execution',
        'pipeline', 'integration', 'trigger', 'webhook', 'job', 'schedule', 'credential',
      ],
      toolNames: [
        'list_workflows', 'get_workflow', 'create_workflow', 'update_workflow', 'delete_workflow',
        'activate_workflow', 'deactivate_workflow',
        'list_executions', 'get_execution', 'delete_execution',
        'list_tags', 'create_tag', 'update_tag', 'delete_tag',
        'list_variables', 'create_variable', 'delete_variable',
        'list_credentials', 'delete_credential',
        'get_audit',
      ],
      description: 'n8n OSS workflow automation: manage workflows, trigger executions, inspect run history, and administer credentials, tags, and variables.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workflows',
        description: 'List all workflows in the n8n instance with optional active-status filter and cursor pagination',
        inputSchema: {
          type: 'object',
          properties: {
            active: {
              type: 'boolean',
              description: 'Filter by active status: true returns only active workflows, false returns inactive (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of workflows to return (default: 10, max: 250)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated tag names to filter workflows',
            },
          },
        },
      },
      {
        name: 'get_workflow',
        description: 'Get the full definition of a single n8n workflow by its ID including nodes and connections',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'n8n workflow ID (numeric string, e.g. "42")',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'create_workflow',
        description: 'Create a new n8n workflow with a JSON definition including nodes and connections',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the workflow',
            },
            nodes: {
              type: 'string',
              description: 'JSON array of node objects defining the workflow steps',
            },
            connections: {
              type: 'string',
              description: 'JSON object defining connections between nodes',
            },
            active: {
              type: 'boolean',
              description: 'Activate the workflow immediately after creation (default: false)',
            },
          },
          required: ['name', 'nodes', 'connections'],
        },
      },
      {
        name: 'update_workflow',
        description: 'Update an existing n8n workflow definition by ID — replaces the full workflow body',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'n8n workflow ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated display name',
            },
            nodes: {
              type: 'string',
              description: 'Updated JSON array of node objects',
            },
            connections: {
              type: 'string',
              description: 'Updated JSON object of node connections',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'delete_workflow',
        description: 'Permanently delete an n8n workflow by ID along with its execution history',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'n8n workflow ID to delete',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'activate_workflow',
        description: 'Activate an n8n workflow so it responds to triggers and schedules',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'n8n workflow ID to activate',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'deactivate_workflow',
        description: 'Deactivate an n8n workflow so it stops responding to triggers and schedules',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'n8n workflow ID to deactivate',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'list_executions',
        description: 'List workflow executions with optional status and workflow filters and cursor pagination',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'Filter executions by workflow ID',
            },
            status: {
              type: 'string',
              description: 'Filter by execution status: success, error, waiting, running',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of executions to return (default: 20, max: 250)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            include_data: {
              type: 'boolean',
              description: 'Include full execution data (input/output) in response — can be large (default: false)',
            },
          },
        },
      },
      {
        name: 'get_execution',
        description: 'Get full details of a single workflow execution by ID including node-level input/output data',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'number',
              description: 'n8n execution ID (numeric)',
            },
            include_data: {
              type: 'boolean',
              description: 'Include full execution data in response (default: false)',
            },
          },
          required: ['execution_id'],
        },
      },
      {
        name: 'delete_execution',
        description: 'Delete a single workflow execution record from n8n by execution ID',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'number',
              description: 'n8n execution ID to delete',
            },
          },
          required: ['execution_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all workflow tags in the n8n instance',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of tags to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new workflow tag in n8n for organizing workflows',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tag name (must be unique)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_tag',
        description: 'Rename an existing n8n workflow tag by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: {
              type: 'string',
              description: 'Tag ID to update',
            },
            name: {
              type: 'string',
              description: 'New tag name',
            },
          },
          required: ['tag_id', 'name'],
        },
      },
      {
        name: 'delete_tag',
        description: 'Delete an n8n workflow tag by ID — does not delete workflows using the tag',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: {
              type: 'string',
              description: 'Tag ID to delete',
            },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'list_variables',
        description: 'List all instance-level variables available across n8n workflows',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of variables to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'create_variable',
        description: 'Create a new instance-level variable accessible across all n8n workflows',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Variable key/name (must be unique)',
            },
            value: {
              type: 'string',
              description: 'Variable value (stored as string)',
            },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'delete_variable',
        description: 'Delete an instance-level variable from n8n by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            variable_id: {
              type: 'string',
              description: 'Variable ID to delete',
            },
          },
          required: ['variable_id'],
        },
      },
      {
        name: 'list_credentials',
        description: 'List all credential entries in n8n (returns metadata only — credential secrets are not exposed)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of credentials to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'delete_credential',
        description: 'Delete an n8n credential entry by ID — affects all workflows using this credential',
        inputSchema: {
          type: 'object',
          properties: {
            credential_id: {
              type: 'string',
              description: 'Credential ID to delete',
            },
          },
          required: ['credential_id'],
        },
      },
      {
        name: 'get_audit',
        description: 'Generate a security audit report for the n8n instance detecting risky configurations',
        inputSchema: {
          type: 'object',
          properties: {
            additional_options: {
              type: 'string',
              description: 'JSON object of additional audit options (e.g. {"daysAbandonedWorkflow": 90})',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workflows':
          return this.listWorkflows(args);
        case 'get_workflow':
          return this.getWorkflow(args);
        case 'create_workflow':
          return this.createWorkflow(args);
        case 'update_workflow':
          return this.updateWorkflow(args);
        case 'delete_workflow':
          return this.deleteWorkflow(args);
        case 'activate_workflow':
          return this.activateWorkflow(args);
        case 'deactivate_workflow':
          return this.deactivateWorkflow(args);
        case 'list_executions':
          return this.listExecutions(args);
        case 'get_execution':
          return this.getExecution(args);
        case 'delete_execution':
          return this.deleteExecution(args);
        case 'list_tags':
          return this.listTags(args);
        case 'create_tag':
          return this.createTag(args);
        case 'update_tag':
          return this.updateTag(args);
        case 'delete_tag':
          return this.deleteTag(args);
        case 'list_variables':
          return this.listVariables(args);
        case 'create_variable':
          return this.createVariable(args);
        case 'delete_variable':
          return this.deleteVariable(args);
        case 'list_credentials':
          return this.listCredentials(args);
        case 'delete_credential':
          return this.deleteCredential(args);
        case 'get_audit':
          return this.getAudit(args);
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

  private get headers(): Record<string, string> {
    return {
      'X-N8N-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async n8nGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async n8nPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async n8nPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async n8nDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ deleted: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (typeof args.active === 'boolean') params.active = String(args.active);
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.tags) params.tags = args.tags as string;
    return this.n8nGet('/workflows', params);
  }

  private async getWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workflow_id) return { content: [{ type: 'text', text: 'workflow_id is required' }], isError: true };
    return this.n8nGet(`/workflows/${encodeURIComponent(args.workflow_id as string)}`);
  }

  private async createWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.nodes || !args.connections) {
      return { content: [{ type: 'text', text: 'name, nodes, and connections are required' }], isError: true };
    }
    let nodes: unknown, connections: unknown;
    try {
      nodes = JSON.parse(args.nodes as string);
      connections = JSON.parse(args.connections as string);
    } catch {
      return { content: [{ type: 'text', text: 'nodes and connections must be valid JSON strings' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, nodes, connections };
    if (typeof args.active === 'boolean') body.active = args.active;
    return this.n8nPost('/workflows', body);
  }

  private async updateWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workflow_id) return { content: [{ type: 'text', text: 'workflow_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.nodes) {
      try { body.nodes = JSON.parse(args.nodes as string); } catch { return { content: [{ type: 'text', text: 'nodes must be a valid JSON string' }], isError: true }; }
    }
    if (args.connections) {
      try { body.connections = JSON.parse(args.connections as string); } catch { return { content: [{ type: 'text', text: 'connections must be a valid JSON string' }], isError: true }; }
    }
    return this.n8nPut(`/workflows/${encodeURIComponent(args.workflow_id as string)}`, body);
  }

  private async deleteWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workflow_id) return { content: [{ type: 'text', text: 'workflow_id is required' }], isError: true };
    return this.n8nDelete(`/workflows/${encodeURIComponent(args.workflow_id as string)}`);
  }

  private async activateWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workflow_id) return { content: [{ type: 'text', text: 'workflow_id is required' }], isError: true };
    return this.n8nPost(`/workflows/${encodeURIComponent(args.workflow_id as string)}/activate`, {});
  }

  private async deactivateWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workflow_id) return { content: [{ type: 'text', text: 'workflow_id is required' }], isError: true };
    return this.n8nPost(`/workflows/${encodeURIComponent(args.workflow_id as string)}/deactivate`, {});
  }

  private async listExecutions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.workflow_id) params.workflowId = args.workflow_id as string;
    if (args.status) params.status = args.status as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    if (typeof args.include_data === 'boolean') params.includeData = String(args.include_data);
    return this.n8nGet('/executions', params);
  }

  private async getExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.execution_id) return { content: [{ type: 'text', text: 'execution_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.include_data === 'boolean') params.includeData = String(args.include_data);
    return this.n8nGet(`/executions/${encodeURIComponent(args.execution_id as string)}`, params);
  }

  private async deleteExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.execution_id) return { content: [{ type: 'text', text: 'execution_id is required' }], isError: true };
    return this.n8nDelete(`/executions/${encodeURIComponent(args.execution_id as string)}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.n8nGet('/tags', params);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.n8nPost('/tags', { name: args.name });
  }

  private async updateTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag_id || !args.name) return { content: [{ type: 'text', text: 'tag_id and name are required' }], isError: true };
    return this.n8nPut(`/tags/${encodeURIComponent(args.tag_id as string)}`, { name: args.name });
  }

  private async deleteTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag_id) return { content: [{ type: 'text', text: 'tag_id is required' }], isError: true };
    return this.n8nDelete(`/tags/${encodeURIComponent(args.tag_id as string)}`);
  }

  private async listVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.n8nGet('/variables', params);
  }

  private async createVariable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.key || !args.value) return { content: [{ type: 'text', text: 'key and value are required' }], isError: true };
    return this.n8nPost('/variables', { key: args.key, value: args.value });
  }

  private async deleteVariable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.variable_id) return { content: [{ type: 'text', text: 'variable_id is required' }], isError: true };
    return this.n8nDelete(`/variables/${encodeURIComponent(args.variable_id as string)}`);
  }

  private async listCredentials(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.n8nGet('/credentials', params);
  }

  private async deleteCredential(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.credential_id) return { content: [{ type: 'text', text: 'credential_id is required' }], isError: true };
    return this.n8nDelete(`/credentials/${encodeURIComponent(args.credential_id as string)}`);
  }

  private async getAudit(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.additional_options) {
      try {
        body.additionalOptions = JSON.parse(args.additional_options as string);
      } catch {
        return { content: [{ type: 'text', text: 'additional_options must be a valid JSON string' }], isError: true };
      }
    }
    return this.n8nPost('/audit', body);
  }
}
