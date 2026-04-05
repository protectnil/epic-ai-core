/**
 * Hyperproof MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Hyperproof MCP server was found on GitHub, npm, or the Hyperproof Developer Portal.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no vendor MCP exists; REST adapter is the only integration path.
//
// Base URL: https://api.hyperproof.app/v1
// Auth: OAuth2 client credentials flow — POST https://accounts.hyperproof.app/oauth/token
//   with grant_type=client_credentials, client_id, client_secret (form-encoded).
//   Returns Bearer access token. Refresh 60 seconds before expiry.
// Docs: https://developer.hyperproof.app/hyperproof-api
// Rate limits: Not publicly documented; implement exponential backoff on 429 responses
//
// NOTE: add_proof_to_control — the Controls API POST /{controlId}/proof endpoint accepts
//   multipart/form-data (file upload), not a JSON proofId body. This tool implements a
//   best-effort JSON link that may not match the actual API. Uploading binary proof files
//   requires multipart/form-data which is outside the scope of this text-only adapter.
//   UNVERIFIED — this tool may not function as expected against live API.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HyperproofConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class HyperproofMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HyperproofConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.hyperproof.app/v1';
    this.tokenUrl = config.tokenUrl ?? 'https://accounts.hyperproof.app/oauth/token';
  }

  static catalog() {
    return {
      name: 'hyperproof',
      displayName: 'Hyperproof',
      version: '1.0.0',
      category: 'compliance' as const,
      keywords: [
        'hyperproof', 'compliance', 'grc', 'risk', 'control', 'audit', 'evidence',
        'proof', 'program', 'framework', 'soc2', 'iso27001', 'task', 'label',
        'risk management', 'compliance automation',
      ],
      toolNames: [
        'list_programs',
        'get_program',
        'create_program',
        'list_controls',
        'get_control',
        'create_control',
        'update_control',
        'list_control_proof',
        'add_proof_to_control',
        'list_risks',
        'get_risk',
        'create_risk',
        'update_risk',
        'list_tasks',
        'get_task',
        'create_task',
        'update_task',
        'list_labels',
        'get_label',
        'create_label',
      ],
      description: 'Hyperproof compliance and risk management: manage programs, controls, evidence/proof, risks, tasks, and labels for GRC workflows.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_programs',
        description: 'List compliance and risk programs in the Hyperproof organization with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by program status: active, inactive, archived (default: active)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of programs to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_program',
        description: 'Get full details for a specific Hyperproof compliance program including framework, owner, and control count',
        inputSchema: {
          type: 'object',
          properties: {
            program_id: {
              type: 'string',
              description: 'Unique identifier of the compliance program',
            },
          },
          required: ['program_id'],
        },
      },
      {
        name: 'create_program',
        description: 'Create a new compliance or risk program in Hyperproof with a name, framework, and owner',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the compliance program',
            },
            description: {
              type: 'string',
              description: 'Description of the program scope and objectives',
            },
            framework: {
              type: 'string',
              description: 'Compliance framework: SOC2, ISO27001, HIPAA, PCI-DSS, NIST-CSF, GDPR, etc.',
            },
            ownerId: {
              type: 'string',
              description: 'User ID of the program owner responsible for compliance',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_controls',
        description: 'List controls in a Hyperproof program with optional status and label filters',
        inputSchema: {
          type: 'object',
          properties: {
            program_id: {
              type: 'string',
              description: 'Filter controls by program ID (returns all org controls if omitted)',
            },
            status: {
              type: 'string',
              description: 'Filter by control status: active, inactive, not_started, in_progress, compliant, non_compliant (default: all)',
            },
            label_id: {
              type: 'string',
              description: 'Filter controls associated with a specific label ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of controls to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_control',
        description: 'Get full details for a specific Hyperproof control including description, owner, evidence requirements, and status',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Unique identifier of the control',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'create_control',
        description: 'Create a new control in Hyperproof and optionally assign it to a program and owner',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the control (e.g. "Access Control Policy")',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the control objective and implementation guidance',
            },
            program_id: {
              type: 'string',
              description: 'Program ID to associate this control with',
            },
            ownerId: {
              type: 'string',
              description: 'User ID of the control owner responsible for compliance',
            },
            frequencyType: {
              type: 'string',
              description: 'Evidence collection frequency: monthly, quarterly, annually, one_time (default: annually)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_control',
        description: 'Update an existing Hyperproof control name, description, owner, or status',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Unique identifier of the control to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the control',
            },
            description: {
              type: 'string',
              description: 'Updated control description',
            },
            ownerId: {
              type: 'string',
              description: 'User ID of the new control owner',
            },
            status: {
              type: 'string',
              description: 'New control status: active, inactive, not_started, in_progress, compliant, non_compliant',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'list_control_proof',
        description: 'List evidence (proof files) attached to a Hyperproof control with upload dates and file metadata',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Unique identifier of the control',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of proof items to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'add_proof_to_control',
        description: 'Link an existing proof file (by proof ID) to a Hyperproof control as evidence',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Unique identifier of the control to attach proof to',
            },
            proof_id: {
              type: 'string',
              description: 'Unique identifier of the proof file to link to this control',
            },
          },
          required: ['control_id', 'proof_id'],
        },
      },
      {
        name: 'list_risks',
        description: 'List risks in the Hyperproof organization with optional severity, status, and program filters',
        inputSchema: {
          type: 'object',
          properties: {
            program_id: {
              type: 'string',
              description: 'Filter risks associated with a specific program ID',
            },
            status: {
              type: 'string',
              description: 'Filter by risk status: open, accepted, mitigated, closed (default: all)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of risks to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_risk',
        description: 'Get full details for a specific Hyperproof risk including likelihood, impact, score, and mitigation plan',
        inputSchema: {
          type: 'object',
          properties: {
            risk_id: {
              type: 'string',
              description: 'Unique identifier of the risk',
            },
          },
          required: ['risk_id'],
        },
      },
      {
        name: 'create_risk',
        description: 'Create a new risk record in Hyperproof with name, description, severity, and likelihood scores',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the risk (e.g. "Unauthorized data access")',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the risk and its potential impact',
            },
            likelihoodLevel: {
              type: 'number',
              description: 'Likelihood score from 1 (rare) to 5 (almost certain)',
            },
            impactLevel: {
              type: 'number',
              description: 'Impact score from 1 (insignificant) to 5 (catastrophic)',
            },
            ownerId: {
              type: 'string',
              description: 'User ID of the risk owner responsible for mitigation',
            },
            program_id: {
              type: 'string',
              description: 'Program ID to associate this risk with',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_risk',
        description: 'Update a Hyperproof risk record — change status, scores, owner, or mitigation plan',
        inputSchema: {
          type: 'object',
          properties: {
            risk_id: {
              type: 'string',
              description: 'Unique identifier of the risk to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the risk',
            },
            description: {
              type: 'string',
              description: 'Updated risk description',
            },
            status: {
              type: 'string',
              description: 'New risk status: open, accepted, mitigated, closed',
            },
            likelihoodLevel: {
              type: 'number',
              description: 'Updated likelihood score from 1 to 5',
            },
            impactLevel: {
              type: 'number',
              description: 'Updated impact score from 1 to 5',
            },
            mitigationPlan: {
              type: 'string',
              description: 'Description of the risk mitigation approach',
            },
          },
          required: ['risk_id'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks in the Hyperproof organization with optional status, assignee, and program filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by task status: open, in_progress, completed, overdue (default: all)',
            },
            assignee_id: {
              type: 'string',
              description: 'Filter tasks assigned to a specific user ID',
            },
            program_id: {
              type: 'string',
              description: 'Filter tasks associated with a specific program ID',
            },
            due_before: {
              type: 'string',
              description: 'Return tasks due before this ISO 8601 date (e.g. 2026-06-30)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Get details for a specific Hyperproof task including due date, assignee, and linked controls',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Unique identifier of the task',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in Hyperproof with title, due date, and optional control or risk association',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Title of the task',
            },
            description: {
              type: 'string',
              description: 'Detailed description of what needs to be done',
            },
            dueDate: {
              type: 'string',
              description: 'Task due date in ISO 8601 format (e.g. 2026-05-01)',
            },
            assigneeId: {
              type: 'string',
              description: 'User ID of the person assigned to complete this task',
            },
            control_id: {
              type: 'string',
              description: 'Control ID to link this task to (optional)',
            },
            risk_id: {
              type: 'string',
              description: 'Risk ID to link this task to (optional)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_task',
        description: 'Update a Hyperproof task status, due date, assignee, or description',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Unique identifier of the task to update',
            },
            name: {
              type: 'string',
              description: 'Updated task title',
            },
            status: {
              type: 'string',
              description: 'New task status: open, in_progress, completed',
            },
            dueDate: {
              type: 'string',
              description: 'Updated due date in ISO 8601 format',
            },
            assigneeId: {
              type: 'string',
              description: 'User ID of the new task assignee',
            },
            description: {
              type: 'string',
              description: 'Updated task description',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'list_labels',
        description: 'List labels in the Hyperproof organization used to categorize and organize controls and evidence',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of labels to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_label',
        description: 'Get details for a specific Hyperproof label including its name, color, and associated object count',
        inputSchema: {
          type: 'object',
          properties: {
            label_id: {
              type: 'string',
              description: 'Unique identifier of the label',
            },
          },
          required: ['label_id'],
        },
      },
      {
        name: 'create_label',
        description: 'Create a new label in Hyperproof for organizing controls, risks, and evidence by category or domain',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the label (e.g. "Access Control", "Encryption")',
            },
            description: {
              type: 'string',
              description: 'Description of what this label categorizes',
            },
            color: {
              type: 'string',
              description: 'Hex color code for the label badge in the UI (e.g. #3B82F6)',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_programs': return this.listPrograms(args);
        case 'get_program': return this.getProgram(args);
        case 'create_program': return this.createProgram(args);
        case 'list_controls': return this.listControls(args);
        case 'get_control': return this.getControl(args);
        case 'create_control': return this.createControl(args);
        case 'update_control': return this.updateControl(args);
        case 'list_control_proof': return this.listControlProof(args);
        case 'add_proof_to_control': return this.addProofToControl(args);
        case 'list_risks': return this.listRisks(args);
        case 'get_risk': return this.getRisk(args);
        case 'create_risk': return this.createRisk(args);
        case 'update_risk': return this.updateRisk(args);
        case 'list_tasks': return this.listTasks(args);
        case 'get_task': return this.getTask(args);
        case 'create_task': return this.createTask(args);
        case 'update_task': return this.updateTask(args);
        case 'list_labels': return this.listLabels(args);
        case 'get_label': return this.getLabel(args);
        case 'create_label': return this.createLabel(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPrograms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.status) params.status = args.status as string;
    return this.apiGet('/programs', params);
  }

  private async getProgram(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.program_id) return { content: [{ type: 'text', text: 'program_id is required' }], isError: true };
    return this.apiGet(`/programs/${encodeURIComponent(args.program_id as string)}`);
  }

  private async createProgram(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.framework) body.framework = args.framework;
    if (args.ownerId) body.ownerId = args.ownerId;
    return this.apiPost('/programs', body);
  }

  private async listControls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.program_id) params.programId = args.program_id as string;
    if (args.status) params.status = args.status as string;
    if (args.label_id) params.labelId = args.label_id as string;
    return this.apiGet('/controls', params);
  }

  private async getControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.control_id) return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
    return this.apiGet(`/controls/${encodeURIComponent(args.control_id as string)}`);
  }

  private async createControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.program_id) body.programId = args.program_id;
    if (args.ownerId) body.ownerId = args.ownerId;
    if (args.frequencyType) body.frequencyType = args.frequencyType;
    return this.apiPost('/controls', body);
  }

  private async updateControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.control_id) return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.ownerId) body.ownerId = args.ownerId;
    if (args.status) body.status = args.status;
    return this.apiPatch(`/controls/${encodeURIComponent(args.control_id as string)}`, body);
  }

  private async listControlProof(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.control_id) return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet(`/controls/${encodeURIComponent(args.control_id as string)}/proof`, params);
  }

  private async addProofToControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.control_id || !args.proof_id) {
      return { content: [{ type: 'text', text: 'control_id and proof_id are required' }], isError: true };
    }
    return this.apiPost(`/controls/${encodeURIComponent(args.control_id as string)}/proof`, { proofId: args.proof_id });
  }

  private async listRisks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.program_id) params.programId = args.program_id as string;
    if (args.status) params.status = args.status as string;
    if (args.severity) params.severity = args.severity as string;
    return this.apiGet('/risks', params);
  }

  private async getRisk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.risk_id) return { content: [{ type: 'text', text: 'risk_id is required' }], isError: true };
    return this.apiGet(`/risks/${encodeURIComponent(args.risk_id as string)}`);
  }

  private async createRisk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.likelihoodLevel) body.likelihoodLevel = args.likelihoodLevel;
    if (args.impactLevel) body.impactLevel = args.impactLevel;
    if (args.ownerId) body.ownerId = args.ownerId;
    if (args.program_id) body.programId = args.program_id;
    return this.apiPost('/risks', body);
  }

  private async updateRisk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.risk_id) return { content: [{ type: 'text', text: 'risk_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.likelihoodLevel) body.likelihoodLevel = args.likelihoodLevel;
    if (args.impactLevel) body.impactLevel = args.impactLevel;
    if (args.mitigationPlan) body.mitigationPlan = args.mitigationPlan;
    return this.apiPatch(`/risks/${encodeURIComponent(args.risk_id as string)}`, body);
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.status) params.status = args.status as string;
    if (args.assignee_id) params.assigneeId = args.assignee_id as string;
    if (args.program_id) params.programId = args.program_id as string;
    if (args.due_before) params.dueBefore = args.due_before as string;
    return this.apiGet('/tasks', params);
  }

  private async getTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.task_id) return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };
    return this.apiGet(`/tasks/${encodeURIComponent(args.task_id as string)}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.dueDate) body.dueDate = args.dueDate;
    if (args.assigneeId) body.assigneeId = args.assigneeId;
    if (args.control_id) body.controlId = args.control_id;
    if (args.risk_id) body.riskId = args.risk_id;
    return this.apiPost('/tasks', body);
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.task_id) return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    if (args.dueDate) body.dueDate = args.dueDate;
    if (args.assigneeId) body.assigneeId = args.assigneeId;
    if (args.description) body.description = args.description;
    return this.apiPatch(`/tasks/${encodeURIComponent(args.task_id as string)}`, body);
  }

  private async listLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.apiGet('/labels', params);
  }

  private async getLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.label_id) return { content: [{ type: 'text', text: 'label_id is required' }], isError: true };
    return this.apiGet(`/labels/${encodeURIComponent(args.label_id as string)}`);
  }

  private async createLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.color) body.color = args.color;
    return this.apiPost('/labels', body);
  }
}
