/**
 * CyCAT MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official CyCAT MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 10 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.cycat.org
// Auth: None (public API, no authentication required)
// Docs: https://api.cycat.org/swagger.json
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CyCATConfig {
  baseUrl?: string;
}

export class CyCATMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: CyCATConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://api.cycat.org';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_info',
        description: 'Get information about the CyCAT backend services, including current status, overall statistics, and API version.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_uuid',
        description: 'Generate a new UUID version 4 that is RFC 4122-compliant. Useful for proposing new resources to CyCAT.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'lookup_uuid',
        description: 'Look up a UUID registered in the CyCAT cybersecurity resource catalogue. Returns metadata about the resource identified by the UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'The UUID to look up in CyCAT (RFC 4122 format)',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'search',
        description: 'Full-text search across all resources in CyCAT and return matching UUIDs. Search cybersecurity tools, techniques, rules, and other resources by keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (e.g. "lateral movement", "mimikatz", "sigma rule")',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_relationships',
        description: 'Get relationship UUIDs from a specified UUID in CyCAT. Returns all UUIDs that have a relationship with the given UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'The UUID to retrieve relationships for',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'get_relationships_expanded',
        description: 'Get relationship UUIDs from a specified UUID including full relationship meta-information. Returns richer context than get_relationships.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'The UUID to retrieve expanded relationships for',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'get_parent',
        description: 'Get parent UUID(s) from a specified project or item UUID in CyCAT. Useful for navigating the resource hierarchy.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'The UUID to retrieve parent UUID(s) for',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'get_child',
        description: 'Get child UUID(s) from a specified project or publisher UUID in CyCAT. Useful for navigating resource hierarchies.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'The UUID to retrieve child UUID(s) for',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'list_projects',
        description: 'List projects registered in CyCAT with pagination support. Projects represent organized collections of cybersecurity resources.',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Start index for pagination (0-based)',
            },
            end: {
              type: 'number',
              description: 'End index for pagination (exclusive)',
            },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'list_publishers',
        description: 'List publishers registered in CyCAT with pagination support. Publishers are organizations or individuals that publish cybersecurity resources.',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Start index for pagination (0-based)',
            },
            end: {
              type: 'number',
              description: 'End index for pagination (exclusive)',
            },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'get_namespace_all',
        description: 'List all known namespaces in CyCAT. Namespaces organize resources by type (e.g. mitre-attack, sigma, snort).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_namespace_ids',
        description: 'Get all IDs from a given namespace in CyCAT (e.g. all MITRE ATT&CK technique IDs, all Sigma rule IDs).',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'The namespace to retrieve IDs for (e.g. "mitre-attack", "sigma", "snort")',
            },
          },
          required: ['namespace'],
        },
      },
      {
        name: 'find_uuid_by_namespace',
        description: 'Get all known UUIDs for a given namespace and namespace-specific ID (e.g. find the CyCAT UUID for MITRE ATT&CK T1059).',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'The namespace (e.g. "mitre-attack", "sigma")',
            },
            namespaceid: {
              type: 'string',
              description: 'The namespace-specific ID (e.g. "T1059", "proc_creation_win_cmd")',
            },
          },
          required: ['namespace', 'namespaceid'],
        },
      },
      {
        name: 'propose_resource',
        description: 'Propose a new cybersecurity resource to be added to the CyCAT catalogue.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_info':
          return await this.getInfo();
        case 'generate_uuid':
          return await this.generateUuid();
        case 'lookup_uuid':
          return await this.lookupUuid(args);
        case 'search':
          return await this.search(args);
        case 'get_relationships':
          return await this.getRelationships(args);
        case 'get_relationships_expanded':
          return await this.getRelationshipsExpanded(args);
        case 'get_parent':
          return await this.getParent(args);
        case 'get_child':
          return await this.getChild(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'list_publishers':
          return await this.listPublishers(args);
        case 'get_namespace_all':
          return await this.getNamespaceAll();
        case 'get_namespace_ids':
          return await this.getNamespaceIds(args);
        case 'find_uuid_by_namespace':
          return await this.findUuidByNamespace(args);
        case 'propose_resource':
          return await this.proposeResource();
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

  private async request(path: string, method: string = 'GET', body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `CyCAT API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`CyCAT returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getInfo(): Promise<ToolResult> {
    return this.request('/info');
  }

  private async generateUuid(): Promise<ToolResult> {
    return this.request('/generate/uuid');
  }

  private async lookupUuid(args: Record<string, unknown>): Promise<ToolResult> {
    const uuid = args.uuid as string;
    if (!uuid) {
      return { content: [{ type: 'text', text: 'uuid is required' }], isError: true };
    }
    return this.request(`/lookup/${encodeURIComponent(uuid)}`);
  }

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    return this.request(`/search/${encodeURIComponent(query)}`);
  }

  private async getRelationships(args: Record<string, unknown>): Promise<ToolResult> {
    const uuid = args.uuid as string;
    if (!uuid) {
      return { content: [{ type: 'text', text: 'uuid is required' }], isError: true };
    }
    return this.request(`/relationships/${encodeURIComponent(uuid)}`);
  }

  private async getRelationshipsExpanded(args: Record<string, unknown>): Promise<ToolResult> {
    const uuid = args.uuid as string;
    if (!uuid) {
      return { content: [{ type: 'text', text: 'uuid is required' }], isError: true };
    }
    return this.request(`/relationships/expanded/${encodeURIComponent(uuid)}`);
  }

  private async getParent(args: Record<string, unknown>): Promise<ToolResult> {
    const uuid = args.uuid as string;
    if (!uuid) {
      return { content: [{ type: 'text', text: 'uuid is required' }], isError: true };
    }
    return this.request(`/parent/${encodeURIComponent(uuid)}`);
  }

  private async getChild(args: Record<string, unknown>): Promise<ToolResult> {
    const uuid = args.uuid as string;
    if (!uuid) {
      return { content: [{ type: 'text', text: 'uuid is required' }], isError: true };
    }
    return this.request(`/child/${encodeURIComponent(uuid)}`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const start = args.start as number;
    const end = args.end as number;
    if (start === undefined || start === null || end === undefined || end === null) {
      return { content: [{ type: 'text', text: 'start and end are required' }], isError: true };
    }
    return this.request(`/list/project/${encodeURIComponent(String(start))}/${encodeURIComponent(String(end))}`);
  }

  private async listPublishers(args: Record<string, unknown>): Promise<ToolResult> {
    const start = args.start as number;
    const end = args.end as number;
    if (start === undefined || start === null || end === undefined || end === null) {
      return { content: [{ type: 'text', text: 'start and end are required' }], isError: true };
    }
    return this.request(`/list/publisher/${encodeURIComponent(String(start))}/${encodeURIComponent(String(end))}`);
  }

  private async getNamespaceAll(): Promise<ToolResult> {
    return this.request('/namespace/getall');
  }

  private async getNamespaceIds(args: Record<string, unknown>): Promise<ToolResult> {
    const namespace = args.namespace as string;
    if (!namespace) {
      return { content: [{ type: 'text', text: 'namespace is required' }], isError: true };
    }
    return this.request(`/namespace/getid/${encodeURIComponent(namespace)}`);
  }

  private async findUuidByNamespace(args: Record<string, unknown>): Promise<ToolResult> {
    const namespace = args.namespace as string;
    const namespaceid = args.namespaceid as string;
    if (!namespace || !namespaceid) {
      return { content: [{ type: 'text', text: 'namespace and namespaceid are required' }], isError: true };
    }
    return this.request(`/namespace/finduuid/${encodeURIComponent(namespace)}/${encodeURIComponent(namespaceid)}`);
  }

  private async proposeResource(): Promise<ToolResult> {
    return this.request('/propose', 'POST');
  }

  static catalog() {
    return {
      name: 'cycat',
      displayName: 'CyCAT',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['cycat', 'cybersecurity', 'catalogue', 'mitre-attack', 'sigma', 'uuid', 'threat-intelligence', 'namespace'],
      toolNames: [
        'get_info', 'generate_uuid', 'lookup_uuid', 'search', 'get_relationships',
        'get_relationships_expanded', 'get_parent', 'get_child', 'list_projects',
        'list_publishers', 'get_namespace_all', 'get_namespace_ids', 'find_uuid_by_namespace',
        'propose_resource',
      ],
      description: 'CyCAT (Cybersecurity Resource Catalogue) adapter — search, look up, and navigate cybersecurity resources including MITRE ATT&CK techniques, Sigma rules, and threat intelligence by UUID.',
      author: 'protectnil' as const,
    };
  }
}
