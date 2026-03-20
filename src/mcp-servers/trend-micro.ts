/**
 * Trend Micro Vision One MCP Server
 * Provides access to Trend Micro Vision One REST API endpoints for detection and analysis
 */

import { ToolDefinition, ToolResult } from './types.js';

interface TrendMicroConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TrendMicroMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TrendMicroConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.xdr.trendmicro.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_detections',
        description: 'List security detections with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of detections to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            status: {
              type: 'string',
              description: 'Filter by status (new, investigating, resolved)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (critical, high, medium, low, info)',
            },
          },
        },
      },
      {
        name: 'get_detection',
        description: 'Get detailed information about a specific detection',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'string',
              description: 'Unique detection identifier',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'list_workloads',
        description: 'List cloud workloads managed by Vision One',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of workloads to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            status: {
              type: 'string',
              description: 'Filter by status (healthy, at-risk, compromised)',
            },
            cloud_provider: {
              type: 'string',
              description: 'Filter by cloud provider (aws, azure, gcp)',
            },
          },
        },
      },
      {
        name: 'search_suspicious_objects',
        description: 'Search for suspicious objects (files, IPs, domains)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (IP, domain, file hash, etc.)',
            },
            type: {
              type: 'string',
              description: 'Object type (ip, domain, file_hash, url)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'submit_for_analysis',
        description: 'Submit a file or URL for malware analysis',
        inputSchema: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              description: 'File hash, URL, or IP address to analyze',
            },
            type: {
              type: 'string',
              description: 'Object type (file_hash, url, ip)',
            },
            analysis_type: {
              type: 'string',
              description: 'Type of analysis (sandbox, static, dynamic)',
            },
          },
          required: ['object', 'type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_detections': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const status = args.status as string | undefined;
          const severity = args.severity as string | undefined;

          let url = `${this.baseUrl}/v3.0/detections?limit=${limit}&offset=${offset}`;
          if (status) {
            url += `&status=${encodeURIComponent(status)}`;
          }
          if (severity) {
            url += `&severity=${encodeURIComponent(severity)}`;
          }

          const response = await fetch(url, { method: 'GET', headers });

          // Finding #21: On 401, throw clear error to caller — token is static with no refresh
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list detections: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Trend Micro returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_detection': {
          const detectionId = args.detection_id as string;
          if (!detectionId) {
            return {
              content: [{ type: 'text', text: 'detection_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v3.0/detections/${encodeURIComponent(detectionId)}`,
            { method: 'GET', headers }
          );

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get detection: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Trend Micro returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_workloads': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const status = args.status as string | undefined;
          const cloudProvider = args.cloud_provider as string | undefined;

          let url = `${this.baseUrl}/v3.0/workloads?limit=${limit}&offset=${offset}`;
          if (status) {
            url += `&status=${encodeURIComponent(status)}`;
          }
          if (cloudProvider) {
            url += `&cloudProvider=${encodeURIComponent(cloudProvider)}`;
          }

          const response = await fetch(url, { method: 'GET', headers });

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workloads: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Trend Micro returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_suspicious_objects': {
          const query = args.query as string;
          const type = (args.type as string) || 'ip';
          const limit = (args.limit as number) || 50;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          // Finding #13: Remove encodeURIComponent from JSON body values.
          // encodeURIComponent is only for URL query params, not JSON body fields.
          const response = await fetch(`${this.baseUrl}/v3.0/search/suspicious-objects`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, type, limit }),
          });

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search suspicious objects: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Trend Micro returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'submit_for_analysis': {
          const object = args.object as string;
          const type = args.type as string;
          const analysisType = (args.analysis_type as string) || 'dynamic';

          if (!object || !type) {
            return {
              content: [{ type: 'text', text: 'object and type are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/v3.0/sandbox/analysis-submissions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ object, type, analysisType }),
          });

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to submit for analysis: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Trend Micro returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`) }],
        isError: true,
      };
    }
  }
}
