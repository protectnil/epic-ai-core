/**
 * CIRCL Hashlookup MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official CIRCL Hashlookup MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 11 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://hashlookup.circl.lu
// Auth: None — public API, no authentication required
// Docs: https://www.circl.lu/services/hashlookup/
// Spec: https://hashlookup.circl.lu/swagger.json
// Rate limits: Not publicly documented; avoid abuse of the public service

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CirclHashlookupConfig {
  baseUrl?: string;
}

export class CirclLuHashlookupMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: CirclHashlookupConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://hashlookup.circl.lu';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_info',
        description: 'Get information about the CIRCL hashlookup database — total number of known hashes, dataset sources, and service status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'lookup_md5',
        description: 'Look up a single MD5 hash against the CIRCL hashlookup database. Returns file metadata including SHA-1, SHA-256, filename, file size, and known dataset sources if found.',
        inputSchema: {
          type: 'object',
          properties: {
            md5: {
              type: 'string',
              description: 'MD5 hash value in hex format (32 hex characters)',
            },
          },
          required: ['md5'],
        },
      },
      {
        name: 'lookup_sha1',
        description: 'Look up a single SHA-1 hash against the CIRCL hashlookup database. Returns file metadata including MD5, SHA-256, filename, file size, and known dataset sources if found.',
        inputSchema: {
          type: 'object',
          properties: {
            sha1: {
              type: 'string',
              description: 'SHA-1 hash value in hex format (40 hex characters)',
            },
          },
          required: ['sha1'],
        },
      },
      {
        name: 'lookup_sha256',
        description: 'Look up a single SHA-256 hash against the CIRCL hashlookup database. Returns file metadata including MD5, SHA-1, filename, file size, and known dataset sources if found.',
        inputSchema: {
          type: 'object',
          properties: {
            sha256: {
              type: 'string',
              description: 'SHA-256 hash value in hex format (64 hex characters)',
            },
          },
          required: ['sha256'],
        },
      },
      {
        name: 'bulk_lookup_md5',
        description: 'Bulk look up multiple MD5 hashes in a single request against the CIRCL hashlookup database. Submit arrays of hashes for efficient threat hunting across large file sets.',
        inputSchema: {
          type: 'object',
          properties: {
            hashes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of MD5 hash values in hex format to look up',
            },
          },
          required: ['hashes'],
        },
      },
      {
        name: 'bulk_lookup_sha1',
        description: 'Bulk look up multiple SHA-1 hashes in a single request against the CIRCL hashlookup database. Submit arrays of hashes for efficient threat hunting across large file sets.',
        inputSchema: {
          type: 'object',
          properties: {
            hashes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of SHA-1 hash values in hex format to look up',
            },
          },
          required: ['hashes'],
        },
      },
      {
        name: 'get_children',
        description: 'Return child files contained within a parent archive or package, identified by parent SHA-1. Useful for analyzing installer packages, ZIP archives, or compound files. Paginates via a cursor — start with cursor "0".',
        inputSchema: {
          type: 'object',
          properties: {
            sha1: {
              type: 'string',
              description: 'SHA-1 hash of the parent file (40 hex characters)',
            },
            count: {
              type: 'number',
              description: 'Number of children to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor — use "0" to start from the beginning',
            },
          },
          required: ['sha1', 'count', 'cursor'],
        },
      },
      {
        name: 'get_parents',
        description: 'Return parent archives or packages that contain a given file, identified by child SHA-1. Useful for provenance analysis — finding which installers or packages included a suspicious file. Paginates via a cursor — start with cursor "0".',
        inputSchema: {
          type: 'object',
          properties: {
            sha1: {
              type: 'string',
              description: 'SHA-1 hash of the child file (40 hex characters)',
            },
            count: {
              type: 'number',
              description: 'Number of parents to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor — use "0" to start from the beginning',
            },
          },
          required: ['sha1', 'count', 'cursor'],
        },
      },
      {
        name: 'get_top_stats',
        description: 'Get top statistics from the CIRCL hashlookup database — the most frequently appearing file names, software vendors, and other aggregate metrics across all indexed datasets.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_session',
        description: 'Create a named lookup session in CIRCL hashlookup. Sessions allow grouping multiple hash lookups together for later retrieval and batch tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the session',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_session',
        description: 'Retrieve all hash lookups recorded within a named CIRCL hashlookup session.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the session to retrieve',
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
        case 'get_info':
          return await this.getInfo();
        case 'lookup_md5':
          return await this.lookupMd5(args);
        case 'lookup_sha1':
          return await this.lookupSha1(args);
        case 'lookup_sha256':
          return await this.lookupSha256(args);
        case 'bulk_lookup_md5':
          return await this.bulkLookupMd5(args);
        case 'bulk_lookup_sha1':
          return await this.bulkLookupSha1(args);
        case 'get_children':
          return await this.getChildren(args);
        case 'get_parents':
          return await this.getParents(args);
        case 'get_top_stats':
          return await this.getTopStats();
        case 'create_session':
          return await this.createSession(args);
        case 'get_session':
          return await this.getSession(args);
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

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `CIRCL Hashlookup API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`CIRCL Hashlookup returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getInfo(): Promise<ToolResult> {
    return this.request('/info', 'GET');
  }

  private async lookupMd5(args: Record<string, unknown>): Promise<ToolResult> {
    const md5 = args.md5 as string;
    if (!md5) {
      return { content: [{ type: 'text', text: 'md5 is required' }], isError: true };
    }
    return this.request(`/lookup/md5/${encodeURIComponent(md5)}`, 'GET');
  }

  private async lookupSha1(args: Record<string, unknown>): Promise<ToolResult> {
    const sha1 = args.sha1 as string;
    if (!sha1) {
      return { content: [{ type: 'text', text: 'sha1 is required' }], isError: true };
    }
    return this.request(`/lookup/sha1/${encodeURIComponent(sha1)}`, 'GET');
  }

  private async lookupSha256(args: Record<string, unknown>): Promise<ToolResult> {
    const sha256 = args.sha256 as string;
    if (!sha256) {
      return { content: [{ type: 'text', text: 'sha256 is required' }], isError: true };
    }
    return this.request(`/lookup/sha256/${encodeURIComponent(sha256)}`, 'GET');
  }

  private async bulkLookupMd5(args: Record<string, unknown>): Promise<ToolResult> {
    const hashes = args.hashes as string[];
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return { content: [{ type: 'text', text: 'hashes array is required and must not be empty' }], isError: true };
    }
    return this.request('/bulk/md5', 'POST', { hashes });
  }

  private async bulkLookupSha1(args: Record<string, unknown>): Promise<ToolResult> {
    const hashes = args.hashes as string[];
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return { content: [{ type: 'text', text: 'hashes array is required and must not be empty' }], isError: true };
    }
    return this.request('/bulk/sha1', 'POST', { hashes });
  }

  private async getChildren(args: Record<string, unknown>): Promise<ToolResult> {
    const sha1 = args.sha1 as string;
    const count = (args.count as number) ?? 100;
    const cursor = (args.cursor as string) ?? '0';
    if (!sha1) {
      return { content: [{ type: 'text', text: 'sha1 is required' }], isError: true };
    }
    return this.request(`/children/${encodeURIComponent(sha1)}/${count}/${encodeURIComponent(cursor)}`, 'GET');
  }

  private async getParents(args: Record<string, unknown>): Promise<ToolResult> {
    const sha1 = args.sha1 as string;
    const count = (args.count as number) ?? 100;
    const cursor = (args.cursor as string) ?? '0';
    if (!sha1) {
      return { content: [{ type: 'text', text: 'sha1 is required' }], isError: true };
    }
    return this.request(`/parents/${encodeURIComponent(sha1)}/${count}/${encodeURIComponent(cursor)}`, 'GET');
  }

  private async getTopStats(): Promise<ToolResult> {
    return this.request('/stats/top', 'GET');
  }

  private async createSession(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request(`/session/create/${encodeURIComponent(name)}`, 'GET');
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request(`/session/get/${encodeURIComponent(name)}`, 'GET');
  }

  static catalog() {
    return {
      name: 'circl-lu-hashlookup',
      displayName: 'CIRCL Hashlookup',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['circl', 'hashlookup', 'hash', 'md5', 'sha1', 'sha256', 'cybersecurity', 'threat-hunting', 'file-reputation', 'malware', 'known-good', 'known-bad', 'lookup'],
      toolNames: ['get_info', 'lookup_md5', 'lookup_sha1', 'lookup_sha256', 'bulk_lookup_md5', 'bulk_lookup_sha1', 'get_children', 'get_parents', 'get_top_stats', 'create_session', 'get_session'],
      description: 'CIRCL Hashlookup adapter — public API to look up MD5, SHA-1, and SHA-256 file hashes against a large database of known files for threat intelligence and file reputation checks.',
      author: 'protectnil' as const,
    };
  }
}
