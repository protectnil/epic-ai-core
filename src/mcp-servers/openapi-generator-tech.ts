/**
 * OpenAPI Generator Online MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. OpenAPI Generator has not published an official MCP server.
//
// Base URL: https://api.openapi-generator.tech
// Auth: None — public API, no authentication required
// Docs: https://github.com/OpenAPITools/openapi-generator
//       https://openapi-generator.tech/
// Rate limits: Not documented. Hosted service; heavy automated use discouraged.
// Note: This adapter covers the OpenAPI Generator Online API (v6.2.1) — a hosted service
//   for generating client SDKs and server stubs from OpenAPI specs. Supports 50+ client
//   languages and 40+ server frameworks. Generation returns a fileId; use download_generated_file
//   to retrieve the zip. Each fileId is single-use.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenAPIGeneratorConfig {
  /** Override base URL; defaults to https://api.openapi-generator.tech */
  baseUrl?: string;
}

export class OpenAPIGeneratorTechMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: OpenAPIGeneratorConfig = {}) {
    super();
    this.baseUrl = (config.baseUrl || 'https://api.openapi-generator.tech').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'openapi-generator-tech',
      displayName: 'OpenAPI Generator Online',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'openapi-generator', 'openapi generator', 'swagger codegen', 'code generation',
        'sdk generation', 'client sdk', 'server stub', 'api client',
        'openapi', 'swagger', 'code gen', 'typescript client', 'python client',
        'java client', 'go client', 'kotlin client', 'rust client', 'ruby client',
        'spring server', 'express server', 'flask server', 'fastapi server',
        'developer tools', 'devtools', 'api tooling',
      ],
      toolNames: [
        'list_client_languages',
        'get_client_options',
        'generate_client',
        'list_server_frameworks',
        'get_server_options',
        'generate_server',
        'download_generated_file',
      ],
      description: 'OpenAPI Generator Online: list supported client languages and server frameworks, retrieve generation options, generate client SDKs or server stubs from an OpenAPI spec URL or inline spec, and download the resulting zip.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Clients ───────────────────────────────────────────────────────────
      {
        name: 'list_client_languages',
        description: 'List all client library languages supported by the OpenAPI Generator — returns language identifiers such as typescript-fetch, python, java, go, kotlin, rust, ruby, swift6, and 40+ more',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_client_options',
        description: 'Returns all available generation options (CLI flags) for a specific client library language — includes option names, descriptions, default values, and allowed enum values',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'The target client language identifier (e.g. typescript-fetch, python, java, go, kotlin). Use list_client_languages to get valid values.',
            },
          },
          required: ['language'],
        },
      },
      {
        name: 'generate_client',
        description: 'Generate a client SDK for a given language from an OpenAPI spec. Provide either a public URL to the spec (openapi_url) or the spec object inline. Returns a fileId and download link — use download_generated_file to retrieve the zip.',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'The target client language identifier (e.g. typescript-fetch, python, java, go). Use list_client_languages to get valid values.',
            },
            openapi_url: {
              type: 'string',
              description: 'Public URL to an OpenAPI spec (JSON or YAML), e.g. https://petstore3.swagger.io/api/v3/openapi.json. Either openapi_url or spec is required.',
            },
            spec: {
              type: 'object',
              description: 'Inline OpenAPI spec object (JSON). Use this when the spec is not publicly accessible. Either openapi_url or spec is required.',
            },
            options: {
              type: 'object',
              description: 'Key-value map of generation options for the target language. Use get_client_options to discover available options.',
            },
          },
          required: ['language'],
        },
      },
      // ── Servers ───────────────────────────────────────────────────────────
      {
        name: 'list_server_frameworks',
        description: 'List all server framework stubs supported by the OpenAPI Generator — returns framework identifiers such as spring, nodejs-express-server, python-flask, aspnetcore, go-server, and 30+ more',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_server_options',
        description: 'Returns all available generation options (CLI flags) for a specific server framework — includes option names, descriptions, default values, and allowed enum values',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'The target server framework identifier (e.g. spring, nodejs-express-server, python-flask, aspnetcore). Use list_server_frameworks to get valid values.',
            },
          },
          required: ['framework'],
        },
      },
      {
        name: 'generate_server',
        description: 'Generate a server stub for a given framework from an OpenAPI spec. Provide either a public URL to the spec (openapi_url) or the spec object inline. Returns a fileId and download link — use download_generated_file to retrieve the zip.',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'The target server framework identifier (e.g. spring, nodejs-express-server, python-flask). Use list_server_frameworks to get valid values.',
            },
            openapi_url: {
              type: 'string',
              description: 'Public URL to an OpenAPI spec (JSON or YAML). Either openapi_url or spec is required.',
            },
            spec: {
              type: 'object',
              description: 'Inline OpenAPI spec object (JSON). Use this when the spec is not publicly accessible. Either openapi_url or spec is required.',
            },
            options: {
              type: 'object',
              description: 'Key-value map of generation options for the target framework. Use get_server_options to discover available options.',
            },
          },
          required: ['framework'],
        },
      },
      // ── Download ──────────────────────────────────────────────────────────
      {
        name: 'download_generated_file',
        description: 'Download a previously generated client or server zip file using the fileId returned by generate_client or generate_server. Each fileId is single-use — request a new generation if you need to download again.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The fileId returned by generate_client or generate_server (e.g. d40029be-eda6-4d62-b1ef-d05e2e91a72a).',
            },
          },
          required: ['file_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_client_languages':   return this.listClientLanguages();
        case 'get_client_options':      return this.getClientOptions(args);
        case 'generate_client':         return this.generateClient(args);
        case 'list_server_frameworks':  return this.listServerFrameworks();
        case 'get_server_options':      return this.getServerOptions(args);
        case 'generate_server':         return this.generateServer(args);
        case 'download_generated_file': return this.downloadGeneratedFile(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getJson(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async postJson(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildGeneratorInput(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.openapi_url) body.openAPIUrl = args.openapi_url;
    if (args.spec)        body.spec = args.spec;
    if (args.options)     body.options = args.options;
    return body;
  }

  // ── Client methods ─────────────────────────────────────────────────────────

  private async listClientLanguages(): Promise<ToolResult> {
    return this.getJson('/api/gen/clients');
  }

  private async getClientOptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.language) {
      return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    }
    return this.getJson(`/api/gen/clients/${encodeURIComponent(args.language as string)}`);
  }

  private async generateClient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.language) {
      return { content: [{ type: 'text', text: 'language is required' }], isError: true };
    }
    if (!args.openapi_url && !args.spec) {
      return { content: [{ type: 'text', text: 'Either openapi_url or spec is required' }], isError: true };
    }
    return this.postJson(
      `/api/gen/clients/${encodeURIComponent(args.language as string)}`,
      this.buildGeneratorInput(args),
    );
  }

  // ── Server methods ─────────────────────────────────────────────────────────

  private async listServerFrameworks(): Promise<ToolResult> {
    return this.getJson('/api/gen/servers');
  }

  private async getServerOptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.framework) {
      return { content: [{ type: 'text', text: 'framework is required' }], isError: true };
    }
    return this.getJson(`/api/gen/servers/${encodeURIComponent(args.framework as string)}`);
  }

  private async generateServer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.framework) {
      return { content: [{ type: 'text', text: 'framework is required' }], isError: true };
    }
    if (!args.openapi_url && !args.spec) {
      return { content: [{ type: 'text', text: 'Either openapi_url or spec is required' }], isError: true };
    }
    return this.postJson(
      `/api/gen/servers/${encodeURIComponent(args.framework as string)}`,
      this.buildGeneratorInput(args),
    );
  }

  // ── Download method ────────────────────────────────────────────────────────

  private async downloadGeneratedFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) {
      return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/gen/download/${encodeURIComponent(args.file_id as string)}`,
      { headers: { 'Accept': 'application/octet-stream' } },
    );
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    // Binary response — return metadata only (content is a zip, not suitable for text embedding)
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'File download initiated. Binary content omitted from tool result.',
          file_id: args.file_id,
          content_type: contentType,
          content_length_bytes: contentLength ? parseInt(contentLength, 10) : null,
          download_url: `${this.baseUrl}/api/gen/download/${args.file_id}`,
          note: 'Use the download_url directly in your HTTP client to retrieve the zip file.',
        }, null, 2),
      }],
      isError: false,
    };
  }
}
