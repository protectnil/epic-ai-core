/**
 * Google Vertex AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Google-maintained general-purpose Vertex AI MCP server exists.
// Community implementations: shariqriazz/vertex-ai-mcp-server (not official — focused on coding assistance only).
// GoogleCloudPlatform/vertex-ai-creative-studio exists but is scoped to creative/GenMedia tools only (not official MCP).
// Google's managed remote MCP catalog (Dec 2025) includes BigQuery, Maps, GCE, GKE — not Vertex AI.
//
// Our adapter covers: 13 tools. Vendor MCP covers: 0 tools (no official MCP exists).
// Recommendation: use-rest-api — no official MCP server exists for Vertex AI core APIs.
//
// Base URL: https://{location}-aiplatform.googleapis.com (regional; default: us-central1)
// Auth: OAuth2 Bearer token (Google service account or user credentials)
// Docs: https://cloud.google.com/vertex-ai/docs/reference/rest
// Rate limits: Varies by resource. generateContent: 60 QPM per model per project (default); batch jobs: async.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VertexAIConfig {
  projectId: string;
  accessToken: string;
  location?: string;
  baseUrl?: string;
}

export class GoogleVertexAIMCPServer extends MCPAdapterBase {
  private readonly projectId: string;
  private readonly accessToken: string;
  private readonly location: string;
  private readonly baseUrl: string;

  constructor(config: VertexAIConfig) {
    super();
    this.projectId = config.projectId;
    this.accessToken = config.accessToken;
    this.location = config.location || 'us-central1';
    this.baseUrl = config.baseUrl || `https://${this.location}-aiplatform.googleapis.com`;
  }

  static catalog() {
    return {
      name: 'google-vertex-ai',
      displayName: 'Google Vertex AI',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: [
        'google', 'vertex', 'vertexai', 'gemini', 'gcp', 'ai', 'ml', 'llm',
        'generate', 'predict', 'model', 'endpoint', 'training', 'batch', 'tokens', 'tuning',
      ],
      toolNames: [
        'generate_content', 'count_tokens',
        'list_models', 'get_model', 'delete_model',
        'list_endpoints', 'get_endpoint', 'predict',
        'create_batch_prediction_job', 'list_batch_prediction_jobs', 'get_batch_prediction_job',
        'list_tuning_jobs', 'get_tuning_job',
      ],
      description: 'Generate content with Gemini on Vertex AI, manage model registry and endpoints, run batch predictions, and query tuning jobs.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'generate_content',
        description: 'Generate text or multimodal content using a Gemini model on Vertex AI. Supports text, image parts, system instructions, and generation config.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Gemini model ID (e.g. gemini-2.0-flash-001, gemini-1.5-pro-002, gemini-1.0-pro-002).',
            },
            contents: {
              type: 'array',
              description: 'Array of content objects with role and parts. Each part may be { text } or { inline_data: { mime_type, data } }.',
              items: { type: 'object' },
            },
            system_instruction: {
              type: 'object',
              description: "Optional system instruction: { parts: [{ text: 'You are helpful.' }] }.",
            },
            generation_config: {
              type: 'object',
              description: 'Optional generation parameters: temperature (0-2), maxOutputTokens, topP, topK, candidateCount, stopSequences.',
            },
            publisher: {
              type: 'string',
              description: "Model publisher namespace (default: 'google').",
            },
          },
          required: ['model', 'contents'],
        },
      },
      {
        name: 'count_tokens',
        description: 'Count the number of tokens a prompt would consume for a Gemini model without generating a response.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Gemini model ID (e.g. gemini-2.0-flash-001).',
            },
            contents: {
              type: 'array',
              description: 'Array of content objects identical in structure to generate_content contents.',
              items: { type: 'object' },
            },
            publisher: {
              type: 'string',
              description: "Model publisher namespace (default: 'google').",
            },
          },
          required: ['model', 'contents'],
        },
      },
      {
        name: 'list_models',
        description: 'List models in the Vertex AI Model Registry for the configured project and location. Supports AIP-160 filter expressions.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: "AIP-160 filter expression (e.g. 'display_name=my-model', 'labels.env=prod').",
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of models to return (default: 100).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list_models response.',
            },
            order_by: {
              type: 'string',
              description: "Sort field, e.g. 'createTime desc'.",
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Get full details for a specific model in the Vertex AI Model Registry by model ID.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model resource ID (numeric string or full resource name).',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'delete_model',
        description: 'Delete a model from the Vertex AI Model Registry. Returns a long-running operation.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model resource ID (numeric string) to delete.',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'list_endpoints',
        description: 'List deployed online prediction endpoints in the configured project and location. Supports AIP-160 filters.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'AIP-160 filter expression.',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of endpoints to return (default: 100).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list_endpoints response.',
            },
          },
        },
      },
      {
        name: 'get_endpoint',
        description: 'Get details for a specific Vertex AI online prediction endpoint, including deployed models and traffic splits.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Endpoint resource ID (numeric string).',
            },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'predict',
        description: 'Call a deployed Vertex AI online endpoint for prediction. Supports custom, AutoML, and non-Gemini models.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Deployed endpoint resource ID (numeric string).',
            },
            instances: {
              type: 'array',
              description: 'Array of prediction input instances. Format is model-specific.',
              items: { type: 'object' },
            },
            parameters: {
              type: 'object',
              description: 'Optional model-specific prediction parameters.',
            },
          },
          required: ['endpoint_id', 'instances'],
        },
      },
      {
        name: 'create_batch_prediction_job',
        description: 'Create a Vertex AI batch prediction job. Input from BigQuery or Cloud Storage; output to BigQuery or GCS.',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              description: 'Display name for the batch prediction job.',
            },
            model_name: {
              type: 'string',
              description: 'Full model resource name, e.g. projects/{project}/locations/{location}/models/{model_id}.',
            },
            input_config: {
              type: 'object',
              description: "Input configuration: { instances_format: 'jsonl'|'bigquery', gcs_source?: { uris: [...] }, bigquery_source?: { input_uri: '...' } }.",
            },
            output_config: {
              type: 'object',
              description: "Output configuration: { predictions_format: 'jsonl'|'bigquery', gcs_destination?: { output_uri_prefix: '...' }, bigquery_destination?: { output_uri: '...' } }.",
            },
          },
          required: ['display_name', 'model_name', 'input_config', 'output_config'],
        },
      },
      {
        name: 'list_batch_prediction_jobs',
        description: 'List Vertex AI batch prediction jobs in the configured project and location. Filter by state or display name.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: "AIP-160 filter expression (e.g. 'state=JOB_STATE_SUCCEEDED').",
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of jobs to return (default: 100).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list response.',
            },
          },
        },
      },
      {
        name: 'get_batch_prediction_job',
        description: 'Get details and current status of a specific Vertex AI batch prediction job by job ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Batch prediction job resource ID (numeric string).',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_tuning_jobs',
        description: 'List Vertex AI supervised fine-tuning (tuning) jobs for the configured project and location.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'AIP-160 filter expression to narrow results.',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of tuning jobs to return (default: 100).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list_tuning_jobs response.',
            },
          },
        },
      },
      {
        name: 'get_tuning_job',
        description: 'Get the current state and metadata of a specific Vertex AI tuning job by job ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Tuning job resource ID (numeric string).',
            },
          },
          required: ['job_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'generate_content':
          return await this.generateContent(args);
        case 'count_tokens':
          return await this.countTokens(args);
        case 'list_models':
          return await this.listModels(args);
        case 'get_model':
          return await this.getModel(args);
        case 'delete_model':
          return await this.deleteModel(args);
        case 'list_endpoints':
          return await this.listEndpoints(args);
        case 'get_endpoint':
          return await this.getEndpoint(args);
        case 'predict':
          return await this.predict(args);
        case 'create_batch_prediction_job':
          return await this.createBatchPredictionJob(args);
        case 'list_batch_prediction_jobs':
          return await this.listBatchPredictionJobs(args);
        case 'get_batch_prediction_job':
          return await this.getBatchPredictionJob(args);
        case 'list_tuning_jobs':
          return await this.listTuningJobs(args);
        case 'get_tuning_job':
          return await this.getTuningJob(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private buildListParams(args: Record<string, unknown>): string {
    const params: string[] = [];
    if (args.filter) params.push(`filter=${encodeURIComponent(args.filter as string)}`);
    if (args.page_size) params.push(`pageSize=${encodeURIComponent(args.page_size as string)}`);
    if (args.page_token) params.push(`pageToken=${encodeURIComponent(args.page_token as string)}`);
    if (args.order_by) params.push(`orderBy=${encodeURIComponent(args.order_by as string)}`);
    return params.length > 0 ? `?${params.join('&')}` : '';
  }

  private async generateContent(args: Record<string, unknown>): Promise<ToolResult> {
    const publisher = (args.publisher as string) || 'google';
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/publishers/${publisher}/models/${encodeURIComponent(args.model as string)}:generateContent`;

    const body: Record<string, unknown> = { contents: args.contents };
    if (args.system_instruction) body.systemInstruction = args.system_instruction;
    if (args.generation_config) body.generationConfig = args.generation_config;

    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.authHeaders, body: JSON.stringify(body) });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async countTokens(args: Record<string, unknown>): Promise<ToolResult> {
    const publisher = (args.publisher as string) || 'google';
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/publishers/${publisher}/models/${encodeURIComponent(args.model as string)}:countTokens`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({ contents: args.contents }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/models${this.buildListParams(args)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/models/${encodeURIComponent(args.model_id as string)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async deleteModel(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/models/${encodeURIComponent(args.model_id as string)}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/endpoints${this.buildListParams(args)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/endpoints/${encodeURIComponent(args.endpoint_id as string)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async predict(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/endpoints/${encodeURIComponent(args.endpoint_id as string)}:predict`;
    const body: Record<string, unknown> = { instances: args.instances };
    if (args.parameters) body.parameters = args.parameters;

    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.authHeaders, body: JSON.stringify(body) });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createBatchPredictionJob(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/batchPredictionJobs`;
    const body = {
      displayName: args.display_name,
      model: args.model_name,
      inputConfig: args.input_config,
      outputConfig: args.output_config,
    };

    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.authHeaders, body: JSON.stringify(body) });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listBatchPredictionJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/batchPredictionJobs${this.buildListParams(args)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getBatchPredictionJob(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/batchPredictionJobs/${encodeURIComponent(args.job_id as string)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTuningJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/tuningJobs${this.buildListParams(args)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getTuningJob(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/tuningJobs/${encodeURIComponent(args.job_id as string)}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}
