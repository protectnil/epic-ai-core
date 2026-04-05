/**
 * APIMatic API Transformer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official APIMatic MCP server was found on GitHub. We build a full REST wrapper
// for complete API Transformer coverage.
//
// Base URL: https://apimatic.io/api/transform
// Auth: HTTP Basic (email:password) or API key header (X-Auth-Key)
// Docs: https://docs.apimatic.io/api-editor/overview/
// Spec: https://api.apis.guru/v2/specs/apimatic.io/1.0/openapi.json
// Category: devops
// Rate limits: See APIMatic docs — depends on plan tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface APIMAtICConfig {
  /** API key for X-Auth-Key header auth, OR provide email+password for Basic auth */
  apiKey?: string;
  email?: string;
  password?: string;
  baseUrl?: string;
}

export class APIMAtICMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly email: string | undefined;
  private readonly password: string | undefined;
  private readonly baseUrl: string;

  constructor(config: APIMAtICConfig) {
    super();
    this.apiKey = config.apiKey;
    this.email = config.email;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://apimatic.io/api/transform';
  }

  static catalog() {
    return {
      name: 'apimatic',
      displayName: 'APIMatic API Transformer',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'apimatic', 'api transformer', 'api conversion', 'openapi', 'swagger',
        'raml', 'api blueprint', 'postman', 'sdk generation', 'api format',
        'api specification', 'rest api', 'wsdl', 'api documentation',
      ],
      toolNames: ['transform_api'],
      description: 'APIMatic API Transformer: convert API descriptions between formats including OpenAPI, Swagger, RAML, API Blueprint, Postman collections, WSDL, and more.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'transform_api',
        description: 'Transform an API description from one format to another (e.g., Swagger 2.0 → OpenAPI 3.0, RAML → Postman Collection). Provide either a URL or file content as the API spec input.',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Target output format. Supported: OpenApi3Json, OpenApi3Yaml, SwaggerJson, SwaggerYaml, RAML, RAML10, Postman10, Postman20, APIBluePrint, WSDL, OpenApi3Yaml, MashapeYaml',
            },
            url: {
              type: 'string',
              description: 'URL of the API specification to transform (use this OR file_content)',
            },
            file_content: {
              type: 'string',
              description: 'Raw content of the API specification file to transform (use this OR url)',
            },
            file_name: {
              type: 'string',
              description: 'Filename hint for the uploaded spec content (e.g., swagger.json, openapi.yaml)',
            },
          },
          required: ['format'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'transform_api': return this.transformApi(args);
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

  private get authHeaders(): Record<string, string> {
    if (this.apiKey) {
      return { 'X-Auth-Key': this.apiKey };
    }
    if (this.email && this.password) {
      const encoded = Buffer.from(`${this.email}:${this.password}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
    return {};
  }

  private async transformApi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.format) {
      return { content: [{ type: 'text', text: 'format is required' }], isError: true };
    }
    if (!args.url && !args.file_content) {
      return { content: [{ type: 'text', text: 'Either url or file_content is required' }], isError: true };
    }

    const url = `${this.baseUrl}/transform?format=${encodeURIComponent(args.format as string)}`;

    let init: RequestInit;

    if (args.url) {
      // URL-based transform: pass as JSON body
      init = {
        method: 'POST',
        headers: {
          ...this.authHeaders,
          'Content-Type': 'application/json',
          Accept: 'application/octet-stream, application/json',
        },
        body: JSON.stringify({ url: args.url }),
      };
    } else {
      // File-based transform: send as form data
      const formData = new FormData();
      const fileName = (args.file_name as string) || 'spec.json';
      const blob = new Blob([args.file_content as string], { type: 'application/octet-stream' });
      formData.append('file', blob, fileName);
      init = {
        method: 'POST',
        headers: {
          ...this.authHeaders,
          Accept: 'application/octet-stream, application/json',
        },
        body: formData,
      };
    }

    const response = await this.fetchWithRetry(url, init);

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    let resultText: string;
    if (contentType.includes('application/json')) {
      const data = await response.json();
      resultText = this.truncate(data);
    } else {
      resultText = this.truncate(await response.text());
    }

    return { content: [{ type: 'text', text: resultText }], isError: false };
  }
}
