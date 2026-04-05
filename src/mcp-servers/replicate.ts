/**
 * Replicate MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.replicate.com (hosted SSE) + npm:replicate-mcp (stdio) — published by
//   Replicate Inc. Transport: SSE (remote) or stdio (local). Auth: Bearer API token.
//   Actively maintained; covers ALL Replicate HTTP API operations (predictions, models, trainings,
//   deployments, collections, hardware, account, webhooks, search) — 20+ operations.
//   NOTE: https://github.com/deepfates/mcp-replicate is a community repo, explicitly abandoned
//   ("NOT IN ACTIVE DEVELOPMENT — the company now offers an official MCP server").
// Our adapter covers: 14 tools (subset of official MCP). Official MCP is a strict superset.
// Recommendation: use-vendor-mcp — official MCP covers everything our adapter does plus trainings,
//   search, update/delete deployment, account, webhooks, and model management operations.
//   Retain this REST adapter as air-gapped fallback only.
//
// Base URL: https://api.replicate.com/v1
// Auth: Bearer token (token starts with r8_) in Authorization header
// Docs: https://replicate.com/docs/reference/http
// Rate limits: 600 req/min for create prediction; 3000 req/min for all other endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ReplicateConfig {
  apiToken: string;
  baseUrl?: string;
}

export class ReplicateMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ReplicateConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.replicate.com/v1';
  }

  static catalog() {
    return {
      name: 'replicate',
      displayName: 'Replicate',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: ['replicate', 'ai', 'ml', 'model', 'prediction', 'inference', 'image generation', 'stable diffusion', 'llm', 'fine-tuning', 'training', 'deployment'],
      toolNames: [
        'list_models', 'get_model', 'list_model_versions', 'get_model_version',
        'create_prediction', 'get_prediction', 'cancel_prediction', 'list_predictions',
        'list_collections', 'get_collection',
        'list_hardware',
        'create_deployment', 'get_deployment', 'list_deployments',
      ],
      description: 'Run AI models on Replicate: create predictions, manage model versions, browse collections, and deploy custom models.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_models',
        description: 'List public models on Replicate with optional cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response next field',
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific Replicate model by owner and model name',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'The username or organization that owns the model (e.g. stability-ai)',
            },
            model_name: {
              type: 'string',
              description: 'The name of the model (e.g. stable-diffusion)',
            },
          },
          required: ['owner', 'model_name'],
        },
      },
      {
        name: 'list_model_versions',
        description: 'List all published versions of a Replicate model with their schemas and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'The username or organization that owns the model',
            },
            model_name: {
              type: 'string',
              description: 'The name of the model',
            },
          },
          required: ['owner', 'model_name'],
        },
      },
      {
        name: 'get_model_version',
        description: 'Get metadata and input/output schema for a specific version of a Replicate model',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'The username or organization that owns the model',
            },
            model_name: {
              type: 'string',
              description: 'The name of the model',
            },
            version_id: {
              type: 'string',
              description: 'The version ID (SHA256 hash)',
            },
          },
          required: ['owner', 'model_name', 'version_id'],
        },
      },
      {
        name: 'create_prediction',
        description: 'Run a model on Replicate by creating a prediction with the given input. Returns prediction ID and status.',
        inputSchema: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              description: 'Model version ID to run (SHA256 hash). Omit if using model identifier.',
            },
            model: {
              type: 'string',
              description: 'Model identifier in owner/model-name format (alternative to version)',
            },
            input: {
              type: 'object',
              description: 'Input object matching the model version\'s input schema (e.g. {"prompt": "a cat"})',
            },
            webhook: {
              type: 'string',
              description: 'URL to receive webhook notifications when prediction status changes',
            },
            stream: {
              type: 'boolean',
              description: 'Request streaming output if the model supports it (default: false)',
            },
          },
        },
      },
      {
        name: 'get_prediction',
        description: 'Get the current status and output of a Replicate prediction by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            prediction_id: {
              type: 'string',
              description: 'The prediction ID returned by create_prediction',
            },
          },
          required: ['prediction_id'],
        },
      },
      {
        name: 'cancel_prediction',
        description: 'Cancel a running Replicate prediction to stop processing and avoid further billing',
        inputSchema: {
          type: 'object',
          properties: {
            prediction_id: {
              type: 'string',
              description: 'The ID of the prediction to cancel',
            },
          },
          required: ['prediction_id'],
        },
      },
      {
        name: 'list_predictions',
        description: 'List recent predictions for the authenticated account with optional cursor pagination',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response next field',
            },
          },
        },
      },
      {
        name: 'list_collections',
        description: 'List curated model collections on Replicate (e.g. image-to-text, text-to-image)',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_collection',
        description: 'Get models in a specific Replicate collection by its slug',
        inputSchema: {
          type: 'object',
          properties: {
            collection_slug: {
              type: 'string',
              description: 'Collection slug (e.g. text-to-image, image-to-text, audio-generation)',
            },
          },
          required: ['collection_slug'],
        },
      },
      {
        name: 'list_hardware',
        description: 'List available hardware configurations for running predictions on Replicate',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_deployment',
        description: 'Create a new model deployment on Replicate for dedicated, low-latency inference',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the deployment (lowercase alphanumeric and hyphens)',
            },
            model: {
              type: 'string',
              description: 'Model identifier in owner/model-name format',
            },
            version: {
              type: 'string',
              description: 'Model version ID to deploy',
            },
            hardware: {
              type: 'string',
              description: 'Hardware to run the deployment on (e.g. gpu-a40-small)',
            },
            min_instances: {
              type: 'number',
              description: 'Minimum number of instances to keep running (default: 0)',
            },
            max_instances: {
              type: 'number',
              description: 'Maximum number of instances to scale to (default: 1)',
            },
          },
          required: ['name', 'model', 'version', 'hardware'],
        },
      },
      {
        name: 'get_deployment',
        description: 'Get details and current status of a Replicate deployment by owner and deployment name',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_owner: {
              type: 'string',
              description: 'Owner username of the deployment',
            },
            deployment_name: {
              type: 'string',
              description: 'Name of the deployment',
            },
          },
          required: ['deployment_owner', 'deployment_name'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List all model deployments for the authenticated Replicate account',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_models':
          return this.listModels(args);
        case 'get_model':
          return this.getModel(args);
        case 'list_model_versions':
          return this.listModelVersions(args);
        case 'get_model_version':
          return this.getModelVersion(args);
        case 'create_prediction':
          return this.createPrediction(args);
        case 'get_prediction':
          return this.getPrediction(args);
        case 'cancel_prediction':
          return this.cancelPrediction(args);
        case 'list_predictions':
          return this.listPredictions(args);
        case 'list_collections':
          return this.listCollections(args);
        case 'get_collection':
          return this.getCollection(args);
        case 'list_hardware':
          return this.listHardware();
        case 'create_deployment':
          return this.createDeployment(args);
        case 'get_deployment':
          return this.getDeployment(args);
        case 'list_deployments':
          return this.listDeployments(args);
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
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.cursor ? `/models?cursor=${encodeURIComponent(args.cursor as string)}` : '/models';
    return this.apiGet(path);
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.model_name) {
      return { content: [{ type: 'text', text: 'owner and model_name are required' }], isError: true };
    }
    return this.apiGet(`/models/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.model_name as string)}`);
  }

  private async listModelVersions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.model_name) {
      return { content: [{ type: 'text', text: 'owner and model_name are required' }], isError: true };
    }
    return this.apiGet(`/models/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.model_name as string)}/versions`);
  }

  private async getModelVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.model_name || !args.version_id) {
      return { content: [{ type: 'text', text: 'owner, model_name, and version_id are required' }], isError: true };
    }
    return this.apiGet(`/models/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.model_name as string)}/versions/${encodeURIComponent(args.version_id as string)}`);
  }

  private async createPrediction(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.version) body.version = args.version;
    if (args.model) body.model = args.model;
    if (args.input) body.input = args.input;
    if (args.webhook) body.webhook = args.webhook;
    if (typeof args.stream === 'boolean') body.stream = args.stream;
    return this.apiPost('/predictions', body);
  }

  private async getPrediction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.prediction_id) {
      return { content: [{ type: 'text', text: 'prediction_id is required' }], isError: true };
    }
    return this.apiGet(`/predictions/${encodeURIComponent(args.prediction_id as string)}`);
  }

  private async cancelPrediction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.prediction_id) {
      return { content: [{ type: 'text', text: 'prediction_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/predictions/${encodeURIComponent(args.prediction_id as string)}/cancel`, {
      method: 'POST',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPredictions(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.cursor ? `/predictions?cursor=${encodeURIComponent(args.cursor as string)}` : '/predictions';
    return this.apiGet(path);
  }

  private async listCollections(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.cursor ? `/collections?cursor=${encodeURIComponent(args.cursor as string)}` : '/collections';
    return this.apiGet(path);
  }

  private async getCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_slug) {
      return { content: [{ type: 'text', text: 'collection_slug is required' }], isError: true };
    }
    return this.apiGet(`/collections/${encodeURIComponent(args.collection_slug as string)}`);
  }

  private async listHardware(): Promise<ToolResult> {
    return this.apiGet('/hardware');
  }

  private async createDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.model || !args.version || !args.hardware) {
      return { content: [{ type: 'text', text: 'name, model, version, and hardware are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      model: args.model,
      version: args.version,
      hardware: args.hardware,
    };
    if (args.min_instances !== undefined) body.min_instances = args.min_instances;
    if (args.max_instances !== undefined) body.max_instances = args.max_instances;
    return this.apiPost('/deployments', body);
  }

  private async getDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deployment_owner || !args.deployment_name) {
      return { content: [{ type: 'text', text: 'deployment_owner and deployment_name are required' }], isError: true };
    }
    return this.apiGet(`/deployments/${encodeURIComponent(args.deployment_owner as string)}/${encodeURIComponent(args.deployment_name as string)}`);
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.cursor ? `/deployments?cursor=${encodeURIComponent(args.cursor as string)}` : '/deployments';
    return this.apiGet(path);
  }
}
