/**
 * WSO2 API Store Transform MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None as of 2026-03. WSO2 has not published an official MCP server.
//
// Base URL: https://gateway.wso2apistore.com/transform/1.0.0
// Auth: OAuth2 implicit — Authorization: Bearer <access_token>
//   Authorization endpoint: https://gateway.api.cloud.wso2.com/authorize
// Spec: https://api.apis.guru/v2/specs/wso2apistore.com/transform/1.0.0/openapi.json
// Category: devops
// Docs: https://wso2apistore.com

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Wso2ApistoreTransformConfig {
  accessToken: string;
  baseUrl?: string;
}

export class Wso2ApistoreTransformMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: Wso2ApistoreTransformConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://gateway.wso2apistore.com/transform/1.0.0';
  }

  static catalog() {
    return {
      name: 'wso2apistore-transform',
      displayName: 'WSO2 API Store Transform',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['wso2', 'transform', 'json', 'xml', 'convert', 'api', 'devops', 'integration'],
      toolNames: [
        'convert_json_to_xml',
        'convert_xml_to_json',
        'transform_payload',
        'batch_transform',
      ],
      description: 'Convert between XML and JSON formats using the WSO2 API Store Transform API. Supports single-payload and batch transformation workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'convert_json_to_xml',
        description: 'Convert a JSON payload to XML format using the WSO2 Transform API',
        inputSchema: {
          type: 'object',
          properties: {
            json_payload: {
              type: 'string',
              description: 'The JSON string to convert to XML (e.g. {"foo":"bar"})',
            },
          },
          required: ['json_payload'],
        },
      },
      {
        name: 'convert_xml_to_json',
        description: 'Convert an XML payload to JSON format using the WSO2 Transform API',
        inputSchema: {
          type: 'object',
          properties: {
            xml_payload: {
              type: 'string',
              description: 'The XML string to convert to JSON (e.g. <foo>bar</foo>)',
            },
          },
          required: ['xml_payload'],
        },
      },
      {
        name: 'transform_payload',
        description: 'Auto-detect payload format (JSON or XML) and convert to the opposite format',
        inputSchema: {
          type: 'object',
          properties: {
            payload: {
              type: 'string',
              description: 'The payload to transform — JSON string or XML string; format is auto-detected',
            },
          },
          required: ['payload'],
        },
      },
      {
        name: 'batch_transform',
        description: 'Transform multiple payloads in sequence — each item specifies direction (json_to_xml or xml_to_json) and content',
        inputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of transform requests',
              items: {
                type: 'object',
                properties: {
                  direction: {
                    type: 'string',
                    description: 'Transform direction: "json_to_xml" or "xml_to_json"',
                  },
                  payload: {
                    type: 'string',
                    description: 'The payload to transform',
                  },
                },
              },
            },
          },
          required: ['items'],
        },
      },
    ];
  }

  private async fetch(path: string, options: RequestInit): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await this.fetchWithRetry(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...(options.headers as Record<string, string> || {}),
        },
      });
      const text = await res.text();
      const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n…[truncated]' : text;
      if (!res.ok) {
        return {
          content: [{ type: 'text', text: `HTTP ${res.status} ${res.statusText}: ${truncated}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: truncated }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Request failed: ${String(err)}` }],
        isError: true,
      };
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'convert_json_to_xml': {
          const payload = String(args.json_payload ?? '');
          return await this.fetch('/jsontoxml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
        }

        case 'convert_xml_to_json': {
          const payload = String(args.xml_payload ?? '');
          return await this.fetch('/xmltojson', {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml' },
            body: payload,
          });
        }

        case 'transform_payload': {
          const payload = String(args.payload ?? '').trim();
          const isXml = payload.startsWith('<');
          if (isXml) {
            return await this.fetch('/xmltojson', {
              method: 'POST',
              headers: { 'Content-Type': 'text/xml' },
              body: payload,
            });
          } else {
            return await this.fetch('/jsontoxml', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
            });
          }
        }

        case 'batch_transform': {
          const items = args.items as Array<{ direction: string; payload: string }>;
          if (!Array.isArray(items) || items.length === 0) {
            return { content: [{ type: 'text', text: 'items must be a non-empty array' }], isError: true };
          }
          const results: string[] = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let r: ToolResult;
            if (item.direction === 'xml_to_json') {
              r = await this.fetch('/xmltojson', {
                method: 'POST',
                headers: { 'Content-Type': 'text/xml' },
                body: item.payload,
              });
            } else {
              r = await this.fetch('/jsontoxml', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: item.payload,
              });
            }
            results.push(`[item ${i + 1}] ${r.isError ? 'ERROR: ' : ''}${r.content[0]?.text ?? ''}`);
          }
          return { content: [{ type: 'text', text: results.join('\n') }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Tool execution error: ${String(err)}` }],
        isError: true,
      };
    }
  }
}
