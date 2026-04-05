/**
 * Ex Libris Task Lists MCP Adapter (Alma REST API)
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Ex Libris has not published an official MCP server.
//
// Base URL: https://api-na.hosted.exlibrisgroup.com (North America default; also eu, ap, cn, ca)
// Auth: API key passed as query parameter `apikey`
//   Create keys at: https://developers.exlibrisgroup.com/alma/apis/#defining
// Docs: https://developers.exlibrisgroup.com/alma/apis/
// Rate limits: Not publicly documented. Ex Libris enforces per-institution limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ExLibrisTaskListsConfig {
  apiKey: string;
  region?: 'na' | 'eu' | 'ap' | 'cn' | 'ca';
  baseUrl?: string;
}

export class ExLibrisTaskListsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ExLibrisTaskListsConfig) {
    super();
    this.apiKey = config.apiKey;
    const region = config.region ?? 'na';
    const regionMap: Record<string, string> = {
      na: 'https://api-na.hosted.exlibrisgroup.com',
      eu: 'https://api-eu.hosted.exlibrisgroup.com',
      ap: 'https://api-ap.hosted.exlibrisgroup.com',
      cn: 'https://api-cn.hosted.exlibrisgroup.com',
      ca: 'https://api-ca.hosted.exlibrisgroup.com',
    };
    this.baseUrl = config.baseUrl ?? regionMap[region];
  }

  static catalog() {
    return {
      name: 'exlibrisgroup-tasklists',
      displayName: 'Ex Libris Task Lists',
      version: '1.0.0',
      category: 'education' as const,
      keywords: [
        'ex libris', 'alma', 'library', 'tasklist', 'printout',
        'lending', 'resource request', 'circulation', 'interlibrary loan',
        'academic library', 'education',
      ],
      toolNames: [
        'get_printouts',
        'act_on_printouts',
        'get_printout',
        'act_on_printout',
        'get_requested_resources',
        'act_on_requested_resources',
        'get_lending_requests',
        'act_on_lending_requests',
        'test_get',
        'test_post',
      ],
      description: 'Manage Ex Libris Alma library task lists: printouts, requested resources, and resource-sharing lending requests via the Alma REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Printouts ─────────────────────────────────────────────────────────
      {
        name: 'get_printouts',
        description: 'Retrieve a list of Alma printouts, optionally filtered by letter name, status, printer, or specific printout IDs',
        inputSchema: {
          type: 'object',
          properties: {
            letter: { type: 'string', description: 'Printout name filter (default: ALL)' },
            status: { type: 'string', description: 'Printout status: Printed, Pending, or Canceled (default: ALL)' },
            printer_id: { type: 'string', description: 'Printer ID filter (default: ALL)' },
            printout_id: { type: 'string', description: 'Comma-separated list of printout IDs to fetch (overrides other filters)' },
            limit: { type: 'integer', description: 'Max results to return, 0-100 (default: 10)' },
            offset: { type: 'integer', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'act_on_printouts',
        description: 'Perform a bulk action on Alma printouts matching the given filters (e.g. mark as printed)',
        inputSchema: {
          type: 'object',
          properties: {
            op: { type: 'string', description: 'Operation to perform on the printouts' },
            letter: { type: 'string', description: 'Filter by printout name' },
            status: { type: 'string', description: 'Filter by status: Printed, Pending, or Canceled' },
            printer_id: { type: 'string', description: 'Filter by printer ID' },
            printout_id: { type: 'string', description: 'Comma-separated list of printout IDs to act on' },
          },
          required: ['op'],
        },
      },
      {
        name: 'get_printout',
        description: 'Retrieve a single Alma printout by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            printout_id: { type: 'string', description: 'The printout ID' },
          },
          required: ['printout_id'],
        },
      },
      {
        name: 'act_on_printout',
        description: 'Perform an action on a specific Alma printout by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            printout_id: { type: 'string', description: 'The printout ID' },
            op: { type: 'string', description: 'Operation to perform' },
          },
          required: ['printout_id', 'op'],
        },
      },
      // ── Requested Resources ───────────────────────────────────────────────
      {
        name: 'get_requested_resources',
        description: 'Retrieve the list of requested resources at a circulation desk, for picking, transit, or hold-shelf processing',
        inputSchema: {
          type: 'object',
          properties: {
            library: { type: 'string', description: 'Library code (required)' },
            circ_desk: { type: 'string', description: 'Circulation desk code (required)' },
            location: { type: 'string', description: 'Location code filter' },
            order_by: { type: 'string', description: 'Field to sort by' },
            direction: { type: 'string', description: 'Sort direction: asc or desc' },
            pickup_inst: { type: 'string', description: 'Pickup institution filter' },
            reported: { type: 'string', description: 'Filter by reported status' },
            printed: { type: 'string', description: 'Filter by printed status' },
            limit: { type: 'integer', description: 'Max results (default: 10)' },
            offset: { type: 'integer', description: 'Pagination offset (default: 0)' },
          },
          required: ['library', 'circ_desk'],
        },
      },
      {
        name: 'act_on_requested_resources',
        description: 'Perform a bulk action on requested resources at a circulation desk (e.g. mark as printed)',
        inputSchema: {
          type: 'object',
          properties: {
            library: { type: 'string', description: 'Library code' },
            circ_desk: { type: 'string', description: 'Circulation desk code' },
            op: { type: 'string', description: 'Operation to perform' },
            location: { type: 'string', description: 'Location code filter' },
            pickup_inst: { type: 'string', description: 'Pickup institution filter' },
            reported: { type: 'string', description: 'Filter by reported status' },
            printed: { type: 'string', description: 'Filter by printed status' },
          },
        },
      },
      // ── Lending Requests ──────────────────────────────────────────────────
      {
        name: 'get_lending_requests',
        description: 'Retrieve resource-sharing lending requests from the Alma task list, with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            library: { type: 'string', description: 'Library code filter' },
            status: { type: 'string', description: 'Request status filter' },
            printed: { type: 'string', description: 'Filter by printed status' },
            reported: { type: 'string', description: 'Filter by reported status' },
            partner: { type: 'string', description: 'Lending partner filter' },
            requested_format: { type: 'string', description: 'Requested format filter' },
            supplied_format: { type: 'string', description: 'Supplied format filter' },
          },
        },
      },
      {
        name: 'act_on_lending_requests',
        description: 'Perform a bulk action on resource-sharing lending requests matching the given filters',
        inputSchema: {
          type: 'object',
          properties: {
            library: { type: 'string', description: 'Library code filter' },
            op: { type: 'string', description: 'Operation to perform' },
            status: { type: 'string', description: 'Status filter' },
            printed: { type: 'string', description: 'Printed status filter' },
            reported: { type: 'string', description: 'Reported status filter' },
            partner: { type: 'string', description: 'Lending partner filter' },
            requested_format: { type: 'string', description: 'Requested format filter' },
            supplied_format: { type: 'string', description: 'Supplied format filter' },
          },
        },
      },
      // ── Test ──────────────────────────────────────────────────────────────
      {
        name: 'test_get',
        description: 'Test GET connectivity to the Alma Task Lists API — verifies the API key and region configuration',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'test_post',
        description: 'Test POST connectivity to the Alma Task Lists API — verifies write access',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_printouts':
          return await this.getPrintouts(args);
        case 'act_on_printouts':
          return await this.actOnPrintouts(args);
        case 'get_printout':
          return await this.getPrintout(args);
        case 'act_on_printout':
          return await this.actOnPrintout(args);
        case 'get_requested_resources':
          return await this.getRequestedResources(args);
        case 'act_on_requested_resources':
          return await this.actOnRequestedResources(args);
        case 'get_lending_requests':
          return await this.getLendingRequests(args);
        case 'act_on_lending_requests':
          return await this.actOnLendingRequests(args);
        case 'test_get':
          return await this.testGet();
        case 'test_post':
          return await this.testPost();
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error calling ${name}: ${msg}` }], isError: true };
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async request(
    method: 'GET' | 'POST',
    path: string,
    query: Record<string, string | number | undefined> = {},
    body?: unknown,
  ): Promise<ToolResult> {
    const params = new URLSearchParams({ apikey: this.apiKey, format: 'json' });
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && String(v) !== '') {
        params.set(k, String(v));
      }
    }
    const url = `${this.baseUrl}${path}?${params.toString()}`;
    const init: RequestInit = {
      method,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const res = await this.fetchWithRetry(url, init);
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n… [truncated]' : text;
    if (!res.ok) {
      return { content: [{ type: 'text', text: `HTTP ${res.status}: ${truncated}` }], isError: true };
    }
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getPrintouts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/almaws/v1/task-lists/printouts', {
      letter: args.letter as string,
      status: args.status as string,
      printer_id: args.printer_id as string,
      printout_id: args.printout_id as string,
      limit: args.limit as number,
      offset: args.offset as number,
    });
  }

  private async actOnPrintouts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/almaws/v1/task-lists/printouts', {
      op: args.op as string,
      letter: args.letter as string,
      status: args.status as string,
      printer_id: args.printer_id as string,
      printout_id: args.printout_id as string,
    });
  }

  private async getPrintout(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(String(args.printout_id));
    return this.request('GET', `/almaws/v1/task-lists/printouts/${id}`);
  }

  private async actOnPrintout(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(String(args.printout_id));
    return this.request('POST', `/almaws/v1/task-lists/printouts/${id}`, {
      op: args.op as string,
    });
  }

  private async getRequestedResources(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/almaws/v1/task-lists/requested-resources', {
      library: args.library as string,
      circ_desk: args.circ_desk as string,
      location: args.location as string,
      order_by: args.order_by as string,
      direction: args.direction as string,
      pickup_inst: args.pickup_inst as string,
      reported: args.reported as string,
      printed: args.printed as string,
      limit: args.limit as number,
      offset: args.offset as number,
    });
  }

  private async actOnRequestedResources(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/almaws/v1/task-lists/requested-resources', {
      library: args.library as string,
      circ_desk: args.circ_desk as string,
      op: args.op as string,
      location: args.location as string,
      pickup_inst: args.pickup_inst as string,
      reported: args.reported as string,
      printed: args.printed as string,
    });
  }

  private async getLendingRequests(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/almaws/v1/task-lists/rs/lending-requests', {
      library: args.library as string,
      status: args.status as string,
      printed: args.printed as string,
      reported: args.reported as string,
      partner: args.partner as string,
      requested_format: args.requested_format as string,
      supplied_format: args.supplied_format as string,
    });
  }

  private async actOnLendingRequests(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/almaws/v1/task-lists/rs/lending-requests', {
      library: args.library as string,
      op: args.op as string,
      status: args.status as string,
      printed: args.printed as string,
      reported: args.reported as string,
      partner: args.partner as string,
      requested_format: args.requested_format as string,
      supplied_format: args.supplied_format as string,
    });
  }

  private async testGet(): Promise<ToolResult> {
    return this.request('GET', '/almaws/v1/task-lists/test');
  }

  private async testPost(): Promise<ToolResult> {
    return this.request('POST', '/almaws/v1/task-lists/test');
  }
}
