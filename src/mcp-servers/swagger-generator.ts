/**
 * Swagger Generator MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Swagger Generator REST API — generate client libraries and server stubs
// from OpenAPI/Swagger definitions using the public Swagger Generator service.
//
// Base URL: https://generator.swagger.io/api
// Auth: None required (public API)
// Docs: https://generator.swagger.io/
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SwaggerGeneratorConfig {
  /**
   * Override the base URL (e.g. for a self-hosted swagger-codegen-cli server).
   * Defaults to https://generator.swagger.io/api
   */
  baseUrl?: string;
}

export class SwaggerGeneratorMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: SwaggerGeneratorConfig = {}) {
    super();
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://generator.swagger.io/api';
  }

  private get headers(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Client generation ---
      {
        name: 'list_client_languages',
        description: 'Get the list of programming languages supported by the Swagger client code generator.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_client_options',
        description: 'Get available configuration options for generating a client library in a specific language.',
        inputSchema: {
          type: 'object',
          properties: {
            language: { type: 'string', description: 'Target client language (e.g. "typescript-fetch", "python", "java", "go")' },
          },
          required: ['language'],
        },
      },
      {
        name: 'generate_client',
        description: 'Generate a client library for a given OpenAPI/Swagger spec and target language. Returns a download link.',
        inputSchema: {
          type: 'object',
          properties: {
            language: { type: 'string', description: 'Target client language (e.g. "typescript-fetch", "python", "java")' },
            specUrl: { type: 'string', description: 'URL of the OpenAPI/Swagger spec to generate a client for' },
            specContent: { type: 'object', description: 'Inline OpenAPI/Swagger spec object (use instead of specUrl)' },
            options: { type: 'object', description: 'Generator-specific options (e.g. { "packageName": "my-client" })' },
          },
          required: ['language'],
        },
      },
      // --- Server generation ---
      {
        name: 'list_server_frameworks',
        description: 'Get the list of server frameworks supported by the Swagger server stub generator.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_server_options',
        description: 'Get available configuration options for generating a server stub for a specific framework.',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Target server framework (e.g. "nodejs-express-server", "spring", "flask")' },
          },
          required: ['framework'],
        },
      },
      {
        name: 'generate_server',
        description: 'Generate a server stub for a given OpenAPI/Swagger spec and target framework. Returns a download link.',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Target server framework (e.g. "nodejs-express-server", "spring", "flask")' },
            specUrl: { type: 'string', description: 'URL of the OpenAPI/Swagger spec to generate a server stub for' },
            specContent: { type: 'object', description: 'Inline OpenAPI/Swagger spec object (use instead of specUrl)' },
            options: { type: 'object', description: 'Generator-specific options (e.g. { "artifactId": "my-server" })' },
          },
          required: ['framework'],
        },
      },
      // --- Download ---
      {
        name: 'download_generated_file',
        description: 'Download a previously generated client or server file using the file ID returned by generate_client or generate_server.',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'The file ID returned by generate_client or generate_server' },
          },
          required: ['fileId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_client_languages': return await this.listClientLanguages();
        case 'get_client_options': return await this.getClientOptions(args);
        case 'generate_client': return await this.generateClient(args);
        case 'list_server_frameworks': return await this.listServerFrameworks();
        case 'get_server_options': return await this.getServerOptions(args);
        case 'generate_server': return await this.generateServer(args);
        case 'download_generated_file': return await this.downloadGeneratedFile(args);
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
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

  private buildGenerationBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.specUrl) {
      body.swaggerUrl = args.specUrl;
    } else if (args.specContent) {
      body.spec = args.specContent;
    }
    if (args.options && typeof args.options === 'object') {
      body.options = args.options;
    }
    return body;
  }

  private async listClientLanguages(): Promise<ToolResult> {
    return this.apiGet('/gen/clients');
  }

  private async getClientOptions(args: Record<string, unknown>): Promise<ToolResult> {
    const language = args.language as string;
    if (!language) return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    return this.apiGet(`/gen/clients/${encodeURIComponent(language)}`);
  }

  private async generateClient(args: Record<string, unknown>): Promise<ToolResult> {
    const language = args.language as string;
    if (!language) return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    if (!args.specUrl && !args.specContent) {
      return { content: [{ type: 'text', text: 'Either specUrl or specContent is required' }], isError: true };
    }
    const body = this.buildGenerationBody(args);
    return this.apiPost(`/gen/clients/${encodeURIComponent(language)}`, body);
  }

  private async listServerFrameworks(): Promise<ToolResult> {
    return this.apiGet('/gen/servers');
  }

  private async getServerOptions(args: Record<string, unknown>): Promise<ToolResult> {
    const framework = args.framework as string;
    if (!framework) return { content: [{ type: 'text', text: 'framework is required' }], isError: true };
    return this.apiGet(`/gen/servers/${encodeURIComponent(framework)}`);
  }

  private async generateServer(args: Record<string, unknown>): Promise<ToolResult> {
    const framework = args.framework as string;
    if (!framework) return { content: [{ type: 'text', text: 'framework is required' }], isError: true };
    if (!args.specUrl && !args.specContent) {
      return { content: [{ type: 'text', text: 'Either specUrl or specContent is required' }], isError: true };
    }
    const body = this.buildGenerationBody(args);
    return this.apiPost(`/gen/servers/${encodeURIComponent(framework)}`, body);
  }

  private async downloadGeneratedFile(args: Record<string, unknown>): Promise<ToolResult> {
    const fileId = args.fileId as string;
    if (!fileId) return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/gen/download/${encodeURIComponent(fileId)}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // Response is a binary ZIP file; return metadata only
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const contentLength = response.headers.get('content-length') ?? 'unknown';
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          fileId,
          downloadUrl: `${this.baseUrl}/gen/download/${encodeURIComponent(fileId)}`,
          contentType,
          contentLength,
          message: 'File is ready. Use the downloadUrl to fetch the binary ZIP.',
        }),
      }],
      isError: false,
    };
  }

  static catalog() {
    return {
      name: 'swagger-generator',
      displayName: 'Swagger Generator',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['swagger', 'openapi', 'codegen', 'code-generation', 'client', 'server', 'stub'],
      toolNames: [
        'list_client_languages', 'get_client_options', 'generate_client',
        'list_server_frameworks', 'get_server_options', 'generate_server',
        'download_generated_file',
      ],
      description: 'Swagger Generator adapter for the Epic AI Intelligence Platform — generate client libraries and server stubs from OpenAPI/Swagger definitions.',
      author: 'protectnil' as const,
    };
  }
}
