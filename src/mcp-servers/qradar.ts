/**
 * IBM QRadar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official IBM QRadar MCP server was found on GitHub or npm.
//
// Base URL: https://{your-qradar-host}/api  (on-premises — no default host)
// Auth: SEC header — QRadar API token (generated in Admin > Authorized Services)
//   Optionally: Basic auth with username:password (less common for automation)
// Docs: https://ibmsecuritydocs.github.io/qradar_api_overview/
//       https://www.ibm.com/docs/en/qradar-common?topic=api-endpoint-documentation-supported-versions
// Rate limits: Not publicly documented; determined by deployment configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface QRadarConfig {
  /** QRadar hostname or IP (without protocol). Example: qradar.example.com */
  host: string;
  /** QRadar API token from Admin > Authorized Services. Sent as the SEC header. */
  secToken: string;
  /**
   * Override the API version prefix in the Accept header (default: 20.0).
   * Use the highest version supported by your QRadar deployment.
   */
  apiVersion?: string;
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

export class QRadarMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly headers: Record<string, string>;

  constructor(config: QRadarConfig) {
    super();
    this.baseUrl = `https://${config.host}/api`;
    this.apiVersion = config.apiVersion ?? '20.0';
    this.headers = {
      'SEC': config.secToken,
      'Content-Type': 'application/json',
      'Accept': `application/json`,
      'Version': this.apiVersion,
    };
  }

  static catalog() {
    return {
      name: 'qradar',
      displayName: 'IBM QRadar',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'qradar', 'ibm', 'siem', 'offense', 'aql', 'ariel', 'event', 'flow',
        'log source', 'reference set', 'rule', 'network', 'threat', 'incident',
        'correlation', 'forensic', 'asset', 'vulnerability',
      ],
      toolNames: [
        'list_offenses',
        'get_offense',
        'update_offense',
        'close_offense',
        'list_offense_notes',
        'add_offense_note',
        'list_offense_closing_reasons',
        'search_events',
        'get_flows',
        'list_log_sources',
        'list_reference_sets',
        'get_reference_set',
        'add_reference_set_element',
        'list_rules',
        'get_rule',
      ],
      description:
        'IBM QRadar SIEM: query offenses, manage offense lifecycle (close, update, annotate), run AQL event searches, inspect network flows, manage reference sets and rules, and query log sources.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_offenses',
        description:
          'List QRadar SIEM offenses with optional AQL filter, sort, and pagination range. Returns offense IDs, severity, status, and description.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description:
                'AQL filter expression (e.g. "status=OPEN and severity>=5"). Supports field comparisons and logical operators.',
            },
            sort: {
              type: 'string',
              description: 'Sort field with direction prefix: +start_time (ascending) or -severity (descending).',
            },
            range: {
              type: 'string',
              description:
                'HTTP Range header value for pagination (e.g. items=0-49 for first 50 results).',
            },
            fields: {
              type: 'string',
              description:
                'Comma-separated field list to include in response (default: id,status,severity,description,start_time,offense_type,magnitude,assigned_to).',
            },
          },
        },
      },
      {
        name: 'get_offense',
        description:
          'Retrieve full details of a single QRadar offense by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            offense_id: {
              type: 'number',
              description: 'Numeric offense ID.',
            },
          },
          required: ['offense_id'],
        },
      },
      {
        name: 'update_offense',
        description:
          'Update a QRadar offense — assign to a user, change status (OPEN or HIDDEN), or add a follow-up flag.',
        inputSchema: {
          type: 'object',
          properties: {
            offense_id: {
              type: 'number',
              description: 'Numeric offense ID to update.',
            },
            assigned_to: {
              type: 'string',
              description: 'Username to assign the offense to.',
            },
            status: {
              type: 'string',
              description: 'New offense status: OPEN or HIDDEN.',
            },
            follow_up: {
              type: 'boolean',
              description: 'Set or clear the follow-up flag on the offense.',
            },
          },
          required: ['offense_id'],
        },
      },
      {
        name: 'close_offense',
        description:
          'Close a QRadar offense by setting its status to CLOSED with a required closing reason.',
        inputSchema: {
          type: 'object',
          properties: {
            offense_id: {
              type: 'number',
              description: 'Numeric offense ID to close.',
            },
            closing_reason_id: {
              type: 'number',
              description:
                'ID of the closing reason (use list_offense_closing_reasons to discover valid IDs).',
            },
          },
          required: ['offense_id', 'closing_reason_id'],
        },
      },
      {
        name: 'list_offense_notes',
        description:
          'List all analyst notes attached to a QRadar offense.',
        inputSchema: {
          type: 'object',
          properties: {
            offense_id: {
              type: 'number',
              description: 'Numeric offense ID.',
            },
            range: {
              type: 'string',
              description: 'HTTP Range header for pagination (e.g. items=0-49).',
            },
          },
          required: ['offense_id'],
        },
      },
      {
        name: 'add_offense_note',
        description:
          'Add an analyst note to an existing QRadar offense.',
        inputSchema: {
          type: 'object',
          properties: {
            offense_id: {
              type: 'number',
              description: 'Numeric offense ID to annotate.',
            },
            note_text: {
              type: 'string',
              description: 'Free-text note content to attach to the offense.',
            },
          },
          required: ['offense_id', 'note_text'],
        },
      },
      {
        name: 'list_offense_closing_reasons',
        description:
          'List all available offense closing reasons in QRadar, returning their IDs and labels. Use before calling close_offense.',
        inputSchema: {
          type: 'object',
          properties: {
            include_reserved: {
              type: 'boolean',
              description: 'If true, include system-reserved closing reasons (default: false).',
            },
            include_deleted: {
              type: 'boolean',
              description: 'If true, include previously deleted reasons (default: false).',
            },
          },
        },
      },
      {
        name: 'search_events',
        description:
          'Execute an AQL query against QRadar Ariel event storage. Async: creates the search, polls until complete (up to 2 minutes), and returns results.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'AQL query string (e.g. SELECT * FROM events WHERE logsourceid=5 LAST 60 MINUTES).',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_flows',
        description:
          'Execute an AQL query against QRadar Ariel flow storage. Async: creates the search, polls until complete (up to 2 minutes), and returns results. Use AQL SELECT from flows.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'AQL query against the flows database (e.g. SELECT sourceip, destinationip, sourceport, destinationport, protocol FROM flows WHERE sourceip = \'192.168.1.1\' LAST 60 MINUTES).',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_log_sources',
        description:
          'List all configured log sources in QRadar with their type, status, and last event time.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "enabled=true").',
            },
            range: {
              type: 'string',
              description: 'HTTP Range header for pagination (e.g. items=0-49).',
            },
            fields: {
              type: 'string',
              description:
                'Comma-separated fields to return (default: id,name,type_id,status,last_event_time,enabled).',
            },
          },
        },
      },
      {
        name: 'list_reference_sets',
        description:
          'List all reference sets in QRadar — the threat intelligence lookup tables used by correlation rules.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "element_type=IP").',
            },
            range: {
              type: 'string',
              description: 'HTTP Range header for pagination.',
            },
          },
        },
      },
      {
        name: 'get_reference_set',
        description:
          'Get the contents of a QRadar reference set by name, including all stored elements.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Reference set name (URL-encoded internally).',
            },
            range: {
              type: 'string',
              description: 'HTTP Range header for pagination of elements.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'add_reference_set_element',
        description:
          'Add an element (IP, domain, hash, etc.) to a QRadar reference set.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Reference set name.',
            },
            value: {
              type: 'string',
              description: 'Value to add (must match the reference set element type).',
            },
          },
          required: ['name', 'value'],
        },
      },
      {
        name: 'list_rules',
        description:
          'List QRadar correlation rules with optional filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "enabled=true and type=EVENT").',
            },
            range: {
              type: 'string',
              description: 'HTTP Range header for pagination.',
            },
            fields: {
              type: 'string',
              description:
                'Comma-separated fields to return (default: id,name,description,enabled,type,creation_date,modification_date).',
            },
          },
        },
      },
      {
        name: 'get_rule',
        description:
          'Retrieve full details of a single QRadar correlation rule by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'number',
              description: 'Numeric rule ID.',
            },
          },
          required: ['rule_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_offenses':
          return await this.listOffenses(args);
        case 'get_offense':
          return await this.getOffense(args);
        case 'update_offense':
          return await this.updateOffense(args);
        case 'close_offense':
          return await this.closeOffense(args);
        case 'list_offense_notes':
          return await this.listOffenseNotes(args);
        case 'add_offense_note':
          return await this.addOffenseNote(args);
        case 'list_offense_closing_reasons':
          return await this.listOffenseClosingReasons(args);
        case 'search_events':
          return await this.searchEvents(args);
        case 'get_flows':
          return await this.getFlows(args);
        case 'list_log_sources':
          return await this.listLogSources(args);
        case 'list_reference_sets':
          return await this.listReferenceSets(args);
        case 'get_reference_set':
          return await this.getReferenceSet(args);
        case 'add_reference_set_element':
          return await this.addReferenceSetElement(args);
        case 'list_rules':
          return await this.listRules(args);
        case 'get_rule':
          return await this.getRule(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async apiFetch(path: string, init?: RequestInit): Promise<Response> {
    const extraHeaders = init?.headers as Record<string, string> | undefined;
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...extraHeaders },
    });
  }

  private rangeHeaders(range?: string): Record<string, string> {
    return range ? { 'Range': range } : {};
  }

  private truncatedResult(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async jsonResult(response: Response, label: string): Promise<ToolResult> {
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `QRadar API error (${label}): ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`${label}: non-JSON response (HTTP ${response.status})`);
    }
    return this.truncatedResult(data);
  }

  private async listOffenses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const fields = (args.fields as string) ??
      'id,status,severity,description,start_time,offense_type,magnitude,assigned_to';
    params.set('fields', fields);
    if (args.filter) params.set('filter', args.filter as string);
    if (args.sort) params.set('sort', args.sort as string);
    const response = await this.apiFetch(
      `/siem/offenses?${params.toString()}`,
      { headers: this.rangeHeaders(args.range as string | undefined) },
    );
    return this.jsonResult(response, 'list_offenses');
  }

  private async getOffense(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.offense_id as number;
    const response = await this.apiFetch(`/siem/offenses/${id}`);
    return this.jsonResult(response, 'get_offense');
  }

  private async updateOffense(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.offense_id as number;
    const params = new URLSearchParams();
    if (args.assigned_to) params.set('assigned_to', args.assigned_to as string);
    if (args.status) params.set('status', args.status as string);
    if (args.follow_up !== undefined) params.set('follow_up', String(args.follow_up));
    const response = await this.apiFetch(
      `/siem/offenses/${id}?${params.toString()}`,
      { method: 'POST' },
    );
    return this.jsonResult(response, 'update_offense');
  }

  private async closeOffense(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.offense_id as number;
    const reasonId = args.closing_reason_id as number;
    const params = new URLSearchParams({
      status: 'CLOSED',
      closing_reason_id: String(reasonId),
    });
    const response = await this.apiFetch(
      `/siem/offenses/${id}?${params.toString()}`,
      { method: 'POST' },
    );
    return this.jsonResult(response, 'close_offense');
  }

  private async listOffenseNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.offense_id as number;
    const response = await this.apiFetch(
      `/siem/offenses/${id}/notes`,
      { headers: this.rangeHeaders(args.range as string | undefined) },
    );
    return this.jsonResult(response, 'list_offense_notes');
  }

  private async addOffenseNote(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.offense_id as number;
    const noteText = args.note_text as string;
    if (!noteText) {
      return { content: [{ type: 'text', text: 'note_text is required' }], isError: true };
    }
    const params = new URLSearchParams({ note_text: noteText });
    const response = await this.apiFetch(
      `/siem/offenses/${id}/notes?${params.toString()}`,
      { method: 'POST' },
    );
    return this.jsonResult(response, 'add_offense_note');
  }

  private async listOffenseClosingReasons(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include_reserved) params.set('include_reserved', 'true');
    if (args.include_deleted) params.set('include_deleted', 'true');
    const qs = params.toString();
    const response = await this.apiFetch(
      `/siem/offense_closing_reasons${qs ? `?${qs}` : ''}`,
    );
    return this.jsonResult(response, 'list_offense_closing_reasons');
  }

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }

    // Step 1: Create async Ariel search
    const createResponse = await this.apiFetch('/ariel/searches', {
      method: 'POST',
      body: JSON.stringify({ query_expression: query }),
    });

    if (!createResponse.ok) {
      return {
        content: [{ type: 'text', text: `QRadar search create error: ${createResponse.status} ${createResponse.statusText}` }],
        isError: true,
      };
    }

    let createData: { search_id?: string; status?: string };
    try {
      createData = await createResponse.json() as { search_id?: string; status?: string };
    } catch {
      throw new Error(`search_events: non-JSON response on search create (HTTP ${createResponse.status})`);
    }

    const searchId = createData.search_id;
    if (!searchId) {
      throw new Error('QRadar did not return a search_id');
    }

    // Step 2: Poll until COMPLETED, CANCELED, or ERROR
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let status = createData.status ?? 'WAIT';

    while (status !== 'COMPLETED' && status !== 'CANCELED' && status !== 'ERROR') {
      if (Date.now() > deadline) {
        throw new Error(`QRadar search ${searchId} did not complete within ${POLL_TIMEOUT_MS / 1000}s`);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const statusResponse = await this.apiFetch(`/ariel/searches/${encodeURIComponent(searchId)}`);
      if (!statusResponse.ok) {
        throw new Error(`QRadar search status error: ${statusResponse.status} ${statusResponse.statusText}`);
      }
      let statusData: { status?: string };
      try {
        statusData = await statusResponse.json() as { status?: string };
      } catch {
        throw new Error(`search_events: non-JSON status poll response (HTTP ${statusResponse.status})`);
      }
      status = statusData.status ?? status;
    }

    if (status === 'CANCELED') {
      throw new Error(`QRadar search ${searchId} was canceled`);
    }
    if (status === 'ERROR') {
      throw new Error(`QRadar search ${searchId} completed with ERROR status`);
    }

    // Step 3: Fetch results
    const resultsResponse = await this.apiFetch(
      `/ariel/searches/${encodeURIComponent(searchId)}/results`,
    );
    if (!resultsResponse.ok) {
      throw new Error(`QRadar search results error: ${resultsResponse.status} ${resultsResponse.statusText}`);
    }

    let results: unknown;
    try {
      results = await resultsResponse.json();
    } catch {
      throw new Error(`search_events: non-JSON results response (HTTP ${resultsResponse.status})`);
    }
    return this.truncatedResult(results);
  }

  private async getFlows(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required (AQL SELECT ... FROM flows ...)' }], isError: true };
    }

    // Step 1: Create async Ariel search against flows database
    const createResponse = await this.apiFetch('/ariel/searches', {
      method: 'POST',
      body: JSON.stringify({ query_expression: query }),
    });

    if (!createResponse.ok) {
      return {
        content: [{ type: 'text', text: `QRadar flow search create error: ${createResponse.status} ${createResponse.statusText}` }],
        isError: true,
      };
    }

    let createData: { search_id?: string; status?: string };
    try {
      createData = await createResponse.json() as { search_id?: string; status?: string };
    } catch {
      throw new Error(`get_flows: non-JSON response on search create (HTTP ${createResponse.status})`);
    }

    const searchId = createData.search_id;
    if (!searchId) {
      throw new Error('QRadar did not return a search_id for flow query');
    }

    // Step 2: Poll until COMPLETED, CANCELED, or ERROR
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let status = createData.status ?? 'WAIT';

    while (status !== 'COMPLETED' && status !== 'CANCELED' && status !== 'ERROR') {
      if (Date.now() > deadline) {
        throw new Error(`QRadar flow search ${searchId} did not complete within ${POLL_TIMEOUT_MS / 1000}s`);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const statusResponse = await this.apiFetch(`/ariel/searches/${encodeURIComponent(searchId)}`);
      if (!statusResponse.ok) {
        throw new Error(`QRadar flow search status error: ${statusResponse.status} ${statusResponse.statusText}`);
      }
      let statusData: { status?: string };
      try {
        statusData = await statusResponse.json() as { status?: string };
      } catch {
        throw new Error(`get_flows: non-JSON status poll response (HTTP ${statusResponse.status})`);
      }
      status = statusData.status ?? status;
    }

    if (status === 'CANCELED') {
      throw new Error(`QRadar flow search ${searchId} was canceled`);
    }
    if (status === 'ERROR') {
      throw new Error(`QRadar flow search ${searchId} completed with ERROR status`);
    }

    // Step 3: Fetch results
    const resultsResponse = await this.apiFetch(
      `/ariel/searches/${encodeURIComponent(searchId)}/results`,
    );
    if (!resultsResponse.ok) {
      throw new Error(`QRadar flow search results error: ${resultsResponse.status} ${resultsResponse.statusText}`);
    }

    let results: unknown;
    try {
      results = await resultsResponse.json();
    } catch {
      throw new Error(`get_flows: non-JSON results response (HTTP ${resultsResponse.status})`);
    }
    return this.truncatedResult(results);
  }

  private async listLogSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const fields = (args.fields as string) ??
      'id,name,type_id,status,last_event_time,enabled';
    params.set('fields', fields);
    if (args.filter) params.set('filter', args.filter as string);
    const response = await this.apiFetch(
      `/config/event_sources/log_source_management/log_sources?${params.toString()}`,
      { headers: this.rangeHeaders(args.range as string | undefined) },
    );
    return this.jsonResult(response, 'list_log_sources');
  }

  private async listReferenceSets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('fields', 'id,name,data_type,element_type,time_to_live,number_of_elements');
    if (args.filter) params.set('filter', args.filter as string);
    const response = await this.apiFetch(
      `/reference_data/sets?${params.toString()}`,
      { headers: this.rangeHeaders(args.range as string | undefined) },
    );
    return this.jsonResult(response, 'list_reference_sets');
  }

  private async getReferenceSet(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const response = await this.apiFetch(
      `/reference_data/sets/${encodeURIComponent(name)}`,
      { headers: this.rangeHeaders(args.range as string | undefined) },
    );
    return this.jsonResult(response, 'get_reference_set');
  }

  private async addReferenceSetElement(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const value = args.value as string;
    if (!name || !value) {
      return { content: [{ type: 'text', text: 'name and value are required' }], isError: true };
    }
    const params = new URLSearchParams({ value });
    const response = await this.apiFetch(
      `/reference_data/sets/${encodeURIComponent(name)}?${params.toString()}`,
      { method: 'POST' },
    );
    return this.jsonResult(response, 'add_reference_set_element');
  }

  private async listRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const fields = (args.fields as string) ??
      'id,name,description,enabled,type,creation_date,modification_date';
    params.set('fields', fields);
    if (args.filter) params.set('filter', args.filter as string);
    const response = await this.apiFetch(
      `/analytics/rules?${params.toString()}`,
      { headers: this.rangeHeaders(args.range as string | undefined) },
    );
    return this.jsonResult(response, 'list_rules');
  }

  private async getRule(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.rule_id as number;
    const response = await this.apiFetch(`/analytics/rules/${id}`);
    return this.jsonResult(response, 'get_rule');
  }
}
