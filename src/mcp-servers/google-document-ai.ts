/**
 * Google Document AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Google Document AI MCP server was found on GitHub or in Google's remote MCP catalog
// (https://docs.cloud.google.com/mcp/supported-products). Document AI is not listed as a supported
// remote MCP product. googleapis/gcloud-mcp does not include Document AI tooling.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP exists; this adapter is the primary integration.
//
// Base URL: https://documentai.googleapis.com/v1
// Auth: Bearer token (OAuth2 access token or service account token) in Authorization header
// Docs: https://cloud.google.com/document-ai/docs/reference/rest
// Rate limits: 120 requests/min per project per processor (online processing);
//              batch processing is async and limited by quota per region.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleDocumentAIConfig {
  accessToken: string;
  projectId: string;
  location?: string;
  baseUrl?: string;
}

export class GoogleDocumentAIMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly projectId: string;
  private readonly location: string;
  private readonly baseUrl: string;

  constructor(config: GoogleDocumentAIConfig) {
    super();
    this.accessToken = config.accessToken;
    this.projectId = config.projectId;
    this.location = config.location || 'us';
    this.baseUrl = config.baseUrl || 'https://documentai.googleapis.com/v1';
  }

  static catalog() {
    return {
      name: 'google-document-ai',
      displayName: 'Google Document AI',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: [
        'google', 'document ai', 'ocr', 'document processing', 'extraction', 'invoice',
        'receipt', 'form parser', 'id card', 'contract', 'pdf', 'entity extraction',
        'document understanding', 'gcp', 'cloud', 'processor', 'batch process',
      ],
      toolNames: [
        'list_processors', 'get_processor', 'create_processor', 'delete_processor',
        'enable_processor', 'disable_processor', 'set_default_processor_version',
        'list_processor_versions', 'get_processor_version',
        'deploy_processor_version', 'undeploy_processor_version',
        'list_processor_types',
        'process_document', 'batch_process_documents',
        'get_operation', 'list_operations', 'cancel_operation',
      ],
      description: 'Google Document AI: manage processors and versions, process documents (OCR, form parsing, entity extraction), and run batch processing jobs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_processors',
        description: 'List all Document AI processors in a project and location',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Google Cloud project ID (overrides constructor config)',
            },
            location: {
              type: 'string',
              description: 'Processor location: us or eu (default: us)',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of processors to return (default: 50)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_processor',
        description: 'Get details for a specific Document AI processor including type, state, and default version',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name (e.g. projects/my-project/locations/us/processors/abc123)',
            },
          },
          required: ['processor_name'],
        },
      },
      {
        name: 'create_processor',
        description: 'Create a new Document AI processor of a specified type (e.g. OCR, form parser, invoice parser)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Google Cloud project ID (overrides constructor config)',
            },
            location: {
              type: 'string',
              description: 'Region to create the processor in: us or eu (default: us)',
            },
            display_name: {
              type: 'string',
              description: 'Human-readable display name for the processor',
            },
            type: {
              type: 'string',
              description: 'Processor type (e.g. OCR_PROCESSOR, FORM_PARSER_PROCESSOR, INVOICE_PROCESSOR, EXPENSE_PROCESSOR, ID_PROOFING_PROCESSOR)',
            },
          },
          required: ['display_name', 'type'],
        },
      },
      {
        name: 'delete_processor',
        description: 'Delete a Document AI processor and all its versions permanently',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name (e.g. projects/my-project/locations/us/processors/abc123)',
            },
          },
          required: ['processor_name'],
        },
      },
      {
        name: 'enable_processor',
        description: 'Enable a disabled Document AI processor so it can process documents',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name',
            },
          },
          required: ['processor_name'],
        },
      },
      {
        name: 'disable_processor',
        description: 'Disable a Document AI processor to prevent it from processing new documents',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name',
            },
          },
          required: ['processor_name'],
        },
      },
      {
        name: 'list_processor_versions',
        description: 'List all versions of a Document AI processor with their state and create time',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of versions to return (default: 20)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['processor_name'],
        },
      },
      {
        name: 'get_processor_version',
        description: 'Get details for a specific Document AI processor version including model type and state',
        inputSchema: {
          type: 'object',
          properties: {
            processor_version_name: {
              type: 'string',
              description: 'Full processor version resource name (e.g. projects/my-project/locations/us/processors/abc123/processorVersions/pretrained-v1)',
            },
          },
          required: ['processor_version_name'],
        },
      },
      {
        name: 'process_document',
        description: 'Process a single document inline with a Document AI processor to extract text, entities, or form fields',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name (or include /processorVersions/{id} for a specific version)',
            },
            content_base64: {
              type: 'string',
              description: 'Base64-encoded document content (PDF, TIFF, GIF, JPEG, PNG, BMP, WEBP)',
            },
            mime_type: {
              type: 'string',
              description: 'Document MIME type: application/pdf, image/tiff, image/jpeg, image/png, image/gif, image/bmp, image/webp',
            },
            gcs_uri: {
              type: 'string',
              description: 'Google Cloud Storage URI of the document (use instead of content_base64 for large files, e.g. gs://bucket/file.pdf)',
            },
            skip_human_review: {
              type: 'boolean',
              description: 'Skip the human review step for processors with human-in-the-loop review (default: false)',
            },
            field_mask: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. document.text,document.entities) to reduce response size',
            },
          },
          required: ['processor_name', 'mime_type'],
        },
      },
      {
        name: 'batch_process_documents',
        description: 'Start an async batch processing job to process multiple documents from GCS and write results back to GCS',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name',
            },
            input_gcs_prefix: {
              type: 'string',
              description: 'Google Cloud Storage prefix of input documents (e.g. gs://my-bucket/input/)',
            },
            output_gcs_prefix: {
              type: 'string',
              description: 'Google Cloud Storage prefix for output results (e.g. gs://my-bucket/output/)',
            },
            input_mime_type: {
              type: 'string',
              description: 'MIME type of input documents (e.g. application/pdf, image/tiff)',
            },
            skip_human_review: {
              type: 'boolean',
              description: 'Skip human review step (default: false)',
            },
          },
          required: ['processor_name', 'input_gcs_prefix', 'output_gcs_prefix'],
        },
      },
      {
        name: 'get_operation',
        description: 'Get the status and result of a long-running Document AI batch processing operation',
        inputSchema: {
          type: 'object',
          properties: {
            operation_name: {
              type: 'string',
              description: 'Full operation resource name returned by batch_process_documents (e.g. projects/my-project/locations/us/operations/12345)',
            },
          },
          required: ['operation_name'],
        },
      },
      {
        name: 'list_operations',
        description: 'List long-running Document AI operations for a project and location with optional filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Google Cloud project ID (overrides constructor config)',
            },
            location: {
              type: 'string',
              description: 'Location to list operations for: us or eu (default: us)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "done=true" or "metadata.state=SUCCEEDED")',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of operations to return (default: 20)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'cancel_operation',
        description: 'Cancel a long-running Document AI batch processing operation that has not yet completed',
        inputSchema: {
          type: 'object',
          properties: {
            operation_name: {
              type: 'string',
              description: 'Full operation resource name to cancel (e.g. projects/my-project/locations/us/operations/12345)',
            },
          },
          required: ['operation_name'],
        },
      },
      {
        name: 'set_default_processor_version',
        description: 'Set the default (active) version of a Document AI processor used for processing requests',
        inputSchema: {
          type: 'object',
          properties: {
            processor_name: {
              type: 'string',
              description: 'Full processor resource name (e.g. projects/my-project/locations/us/processors/abc123)',
            },
            processor_version: {
              type: 'string',
              description: 'Full processor version resource name to set as default (e.g. projects/my-project/locations/us/processors/abc123/processorVersions/pretrained-v1)',
            },
          },
          required: ['processor_name', 'processor_version'],
        },
      },
      {
        name: 'deploy_processor_version',
        description: 'Deploy a Document AI processor version to make it available for processing requests',
        inputSchema: {
          type: 'object',
          properties: {
            processor_version_name: {
              type: 'string',
              description: 'Full processor version resource name to deploy (e.g. projects/my-project/locations/us/processors/abc123/processorVersions/v1)',
            },
          },
          required: ['processor_version_name'],
        },
      },
      {
        name: 'undeploy_processor_version',
        description: 'Undeploy a Document AI processor version to stop it from serving processing requests',
        inputSchema: {
          type: 'object',
          properties: {
            processor_version_name: {
              type: 'string',
              description: 'Full processor version resource name to undeploy (e.g. projects/my-project/locations/us/processors/abc123/processorVersions/v1)',
            },
          },
          required: ['processor_version_name'],
        },
      },
      {
        name: 'list_processor_types',
        description: 'List available Document AI processor types in a project and location (e.g. OCR_PROCESSOR, INVOICE_PROCESSOR, FORM_PARSER_PROCESSOR)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Google Cloud project ID (overrides constructor config)',
            },
            location: {
              type: 'string',
              description: 'Location to list processor types for: us or eu (default: us)',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of processor types to return (default: 50)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_processors':
          return this.listProcessors(args);
        case 'get_processor':
          return this.getProcessor(args);
        case 'create_processor':
          return this.createProcessor(args);
        case 'delete_processor':
          return this.deleteProcessor(args);
        case 'enable_processor':
          return this.enableProcessor(args);
        case 'disable_processor':
          return this.disableProcessor(args);
        case 'list_processor_versions':
          return this.listProcessorVersions(args);
        case 'get_processor_version':
          return this.getProcessorVersion(args);
        case 'process_document':
          return this.processDocument(args);
        case 'batch_process_documents':
          return this.batchProcessDocuments(args);
        case 'get_operation':
          return this.getOperation(args);
        case 'list_operations':
          return this.listOperations(args);
        case 'cancel_operation':
          return this.cancelOperation(args);
        case 'set_default_processor_version':
          return this.setDefaultProcessorVersion(args);
        case 'deploy_processor_version':
          return this.deployProcessorVersion(args);
        case 'undeploy_processor_version':
          return this.undeployProcessorVersion(args);
        case 'list_processor_types':
          return this.listProcessorTypes(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private resolveProject(args: Record<string, unknown>): string {
    return (args.project_id as string) || this.projectId;
  }

  private resolveLocation(args: Record<string, unknown>): string {
    return (args.location as string) || this.location;
  }

  private async docaiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async docaiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async docaiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = response.status === 204 ? { success: true } : await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data) }], isError: false };
  }

  private async listProcessors(args: Record<string, unknown>): Promise<ToolResult> {
    const project = this.resolveProject(args);
    const location = this.resolveLocation(args);
    const params: Record<string, string> = {
      pageSize: String((args.page_size as number) || 50),
    };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.docaiGet(`/projects/${project}/locations/${location}/processors`, params);
  }

  private async getProcessor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name) return { content: [{ type: 'text', text: 'processor_name is required' }], isError: true };
    return this.docaiGet(`/${encodeURIComponent(args.processor_name as string)}`);
  }

  private async createProcessor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.display_name || !args.type) return { content: [{ type: 'text', text: 'display_name and type are required' }], isError: true };
    const project = this.resolveProject(args);
    const location = this.resolveLocation(args);
    return this.docaiPost(`/projects/${project}/locations/${location}/processors`, {
      displayName: args.display_name,
      type: args.type,
    });
  }

  private async deleteProcessor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name) return { content: [{ type: 'text', text: 'processor_name is required' }], isError: true };
    return this.docaiDelete(`/${encodeURIComponent(args.processor_name as string)}`);
  }

  private async enableProcessor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name) return { content: [{ type: 'text', text: 'processor_name is required' }], isError: true };
    return this.docaiPost(`/${encodeURIComponent(args.processor_name as string)}:enable`, {});
  }

  private async disableProcessor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name) return { content: [{ type: 'text', text: 'processor_name is required' }], isError: true };
    return this.docaiPost(`/${encodeURIComponent(args.processor_name as string)}:disable`, {});
  }

  private async listProcessorVersions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name) return { content: [{ type: 'text', text: 'processor_name is required' }], isError: true };
    const params: Record<string, string> = {
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.docaiGet(`/${encodeURIComponent(args.processor_name as string)}/processorVersions`, params);
  }

  private async getProcessorVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_version_name) return { content: [{ type: 'text', text: 'processor_version_name is required' }], isError: true };
    return this.docaiGet(`/${encodeURIComponent(args.processor_version_name as string)}`);
  }

  private async processDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name || !args.mime_type) {
      return { content: [{ type: 'text', text: 'processor_name and mime_type are required' }], isError: true };
    }
    if (!args.content_base64 && !args.gcs_uri) {
      return { content: [{ type: 'text', text: 'Either content_base64 or gcs_uri is required' }], isError: true };
    }
    const rawDocument: Record<string, unknown> = { mimeType: args.mime_type };
    if (args.content_base64) rawDocument.content = args.content_base64;
    if (args.gcs_uri) rawDocument.gcsUri = args.gcs_uri;

    const body: Record<string, unknown> = { rawDocument };
    if (typeof args.skip_human_review === 'boolean') body.skipHumanReview = args.skip_human_review;
    if (args.field_mask) body.fieldMask = args.field_mask;

    return this.docaiPost(`/${encodeURIComponent(args.processor_name as string)}:process`, body);
  }

  private async batchProcessDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name || !args.input_gcs_prefix || !args.output_gcs_prefix) {
      return { content: [{ type: 'text', text: 'processor_name, input_gcs_prefix, and output_gcs_prefix are required' }], isError: true };
    }
    const inputConfig: Record<string, unknown> = {
      gcsPrefix: { gcsUriPrefix: args.input_gcs_prefix },
    };
    if (args.input_mime_type) inputConfig.mimeType = args.input_mime_type;

    const body: Record<string, unknown> = {
      inputDocuments: inputConfig,
      documentOutputConfig: {
        gcsOutputConfig: { gcsUri: args.output_gcs_prefix },
      },
    };
    if (typeof args.skip_human_review === 'boolean') body.skipHumanReview = args.skip_human_review;

    return this.docaiPost(`/${encodeURIComponent(args.processor_name as string)}:batchProcess`, body);
  }

  private async getOperation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.operation_name) return { content: [{ type: 'text', text: 'operation_name is required' }], isError: true };
    return this.docaiGet(`/${encodeURIComponent(args.operation_name as string)}`);
  }

  private async listOperations(args: Record<string, unknown>): Promise<ToolResult> {
    const project = this.resolveProject(args);
    const location = this.resolveLocation(args);
    const params: Record<string, string> = {
      pageSize: String((args.page_size as number) || 20),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.docaiGet(`/projects/${project}/locations/${location}/operations`, params);
  }

  private async cancelOperation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.operation_name) return { content: [{ type: 'text', text: 'operation_name is required' }], isError: true };
    // POST /v1/{name}:cancel
    return this.docaiPost(`/${encodeURIComponent(args.operation_name as string)}:cancel`, {});
  }

  private async setDefaultProcessorVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_name || !args.processor_version) {
      return { content: [{ type: 'text', text: 'processor_name and processor_version are required' }], isError: true };
    }
    // POST /v1/{processor}:setDefaultProcessorVersion
    return this.docaiPost(`/${encodeURIComponent(args.processor_name as string)}:setDefaultProcessorVersion`, {
      defaultProcessorVersion: args.processor_version,
    });
  }

  private async deployProcessorVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_version_name) return { content: [{ type: 'text', text: 'processor_version_name is required' }], isError: true };
    // POST /v1/{name}:deploy
    return this.docaiPost(`/${encodeURIComponent(args.processor_version_name as string)}:deploy`, {});
  }

  private async undeployProcessorVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.processor_version_name) return { content: [{ type: 'text', text: 'processor_version_name is required' }], isError: true };
    // POST /v1/{name}:undeploy
    return this.docaiPost(`/${encodeURIComponent(args.processor_version_name as string)}:undeploy`, {});
  }

  private async listProcessorTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const project = this.resolveProject(args);
    const location = this.resolveLocation(args);
    const params: Record<string, string> = {
      pageSize: String((args.page_size as number) || 50),
    };
    if (args.page_token) params.pageToken = args.page_token as string;
    // GET /v1/projects/{project}/locations/{location}/processorTypes
    return this.docaiGet(`/projects/${project}/locations/${location}/processorTypes`, params);
  }
}
