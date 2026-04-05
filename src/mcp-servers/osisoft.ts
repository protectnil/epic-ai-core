/**
 * OSIsoft PI Web API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. OSIsoft/AVEVA has not published an official MCP server.
//
// Base URL: https://{server}/piwebapi  (user-supplied; default: https://devdata.osisoft.com/piwebapi)
// Auth: Basic or Kerberos. This adapter uses Basic: Authorization: Basic <base64(user:pass)>
//   Windows Integrated auth (Kerberos/NTLM) requires a reverse proxy or native client.
// Docs: https://docs.osisoft.com/bundle/pi-web-api-reference/
// Spec: https://api.apis.guru/v2/specs/osisoft.com/1.11.1.5383/swagger.json
// Rate limits: Not publicly documented; governed by PI server configuration.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OsisoftConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class OsisoftMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: OsisoftConfig) {
    super();
    const encoded = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.authHeader = `Basic ${encoded}`;
    this.baseUrl = config.baseUrl || 'https://devdata.osisoft.com/piwebapi';
  }

  static catalog() {
    return {
      name: 'osisoft',
      displayName: 'OSIsoft PI Web API',
      version: '1.0.0',
      category: 'iot' as const,
      keywords: [
        'osisoft', 'pi system', 'pi web api', 'iot', 'industrial', 'historian',
        'time series', 'sensor', 'scada', 'process data', 'dataserver', 'streams',
        'points', 'asset framework', 'elements', 'attributes',
      ],
      toolNames: [
        'get_home',
        'list_data_servers',
        'get_data_server',
        'list_points',
        'create_point',
        'get_point',
        'get_stream_value',
        'update_stream_value',
        'get_stream_recorded',
        'get_stream_summary',
        'list_asset_servers',
        'list_elements',
      ],
      description: 'Access OSIsoft PI System data: browse data servers, manage PI points, read/write real-time and historical stream values, retrieve summaries, and navigate asset framework elements via the PI Web API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Home -------------------------------------------------------------
      {
        name: 'get_home',
        description: 'Get the top-level links for this PI Web API instance, including available servers and navigation roots',
        inputSchema: { type: 'object', properties: {} },
      },
      // -- Data Servers (PI Data Archive) -----------------------------------
      {
        name: 'list_data_servers',
        description: 'Retrieve a list of all PI Data Archive servers known to this PI Web API instance',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_data_server',
        description: 'Retrieve details for a specific PI Data Archive server by its Web ID',
        inputSchema: {
          type: 'object',
          properties: {
            web_id: { type: 'string', description: 'The Web ID of the PI Data Archive server' },
          },
          required: ['web_id'],
        },
      },
      // -- Points -----------------------------------------------------------
      {
        name: 'list_points',
        description: 'Retrieve a list of PI points on the specified Data Archive server, with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            server_web_id: { type: 'string', description: 'Web ID of the PI Data Archive server' },
            name_filter: { type: 'string', description: 'Wildcard name filter (e.g. "Temp*")' },
            max_count: { type: 'integer', description: 'Maximum number of points to return (default: 1000)' },
          },
          required: ['server_web_id'],
        },
      },
      {
        name: 'create_point',
        description: 'Create a new PI point on the specified Data Archive server',
        inputSchema: {
          type: 'object',
          properties: {
            server_web_id: { type: 'string', description: 'Web ID of the PI Data Archive server' },
            name: { type: 'string', description: 'Name for the new PI point' },
            point_type: {
              type: 'string',
              description: 'Data type of the point: Float32, Float64, Int16, Int32, Digital, String, Timestamp (default: Float32)',
            },
            description: { type: 'string', description: 'Description of the PI point' },
            eng_units: { type: 'string', description: 'Engineering units (e.g. "degC", "bar", "rpm")' },
          },
          required: ['server_web_id', 'name'],
        },
      },
      {
        name: 'get_point',
        description: 'Retrieve metadata for a specific PI point by its Web ID',
        inputSchema: {
          type: 'object',
          properties: {
            web_id: { type: 'string', description: 'Web ID of the PI point' },
          },
          required: ['web_id'],
        },
      },
      // -- Stream (real-time and historical values) --------------------------
      {
        name: 'get_stream_value',
        description: 'Get the current or snapshot value of a PI point stream',
        inputSchema: {
          type: 'object',
          properties: {
            web_id: { type: 'string', description: 'Web ID of the PI point or attribute' },
            time: { type: 'string', description: 'Optional timestamp for historical lookup (ISO 8601 or PI time expression like "*-1h")' },
          },
          required: ['web_id'],
        },
      },
      {
        name: 'update_stream_value',
        description: 'Write a new value to a PI point stream',
        inputSchema: {
          type: 'object',
          properties: {
            web_id: { type: 'string', description: 'Web ID of the PI point or attribute' },
            value: { description: 'The value to write (number, string, or boolean depending on point type)' },
            timestamp: { type: 'string', description: 'Timestamp for the value (ISO 8601; default: current time)' },
          },
          required: ['web_id', 'value'],
        },
      },
      {
        name: 'get_stream_recorded',
        description: 'Retrieve compressed (archived) values for a PI point stream over a specified time range',
        inputSchema: {
          type: 'object',
          properties: {
            web_id: { type: 'string', description: 'Web ID of the PI point or attribute' },
            start_time: { type: 'string', description: 'Start of the time range (ISO 8601 or PI time like "*-8h")' },
            end_time: { type: 'string', description: 'End of the time range (ISO 8601 or PI time like "*"; default: *)' },
            max_count: { type: 'integer', description: 'Maximum number of values to return (default: 1000)' },
          },
          required: ['web_id', 'start_time'],
        },
      },
      {
        name: 'get_stream_summary',
        description: 'Retrieve statistical summary (min, max, mean, std dev, count, etc.) for a PI point stream over a time range',
        inputSchema: {
          type: 'object',
          properties: {
            web_id: { type: 'string', description: 'Web ID of the PI point or attribute' },
            start_time: { type: 'string', description: 'Start of the time range (ISO 8601 or PI time expression)' },
            end_time: { type: 'string', description: 'End of the time range (default: *)' },
            summary_type: {
              type: 'string',
              description: 'Comma-separated summary types: All, Total, Average, Minimum, Maximum, Range, StdDev, PopulationStdDev, Count, PercentGood (default: All)',
            },
          },
          required: ['web_id', 'start_time'],
        },
      },
      // -- Asset Framework --------------------------------------------------
      {
        name: 'list_asset_servers',
        description: 'Retrieve a list of all PI Asset Framework (AF) servers known to this PI Web API instance',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_elements',
        description: 'Retrieve elements from a PI Asset Framework database, supporting search by name or path',
        inputSchema: {
          type: 'object',
          properties: {
            database_web_id: { type: 'string', description: 'Web ID of the AF Asset Database to search' },
            name_filter: { type: 'string', description: 'Wildcard filter on element names (e.g. "Pump*")' },
            max_count: { type: 'integer', description: 'Maximum number of elements to return (default: 1000)' },
          },
          required: ['database_web_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_home':
          return await this.getHome();
        case 'list_data_servers':
          return await this.listDataServers();
        case 'get_data_server':
          return await this.getDataServer(args);
        case 'list_points':
          return await this.listPoints(args);
        case 'create_point':
          return await this.createPoint(args);
        case 'get_point':
          return await this.getPoint(args);
        case 'get_stream_value':
          return await this.getStreamValue(args);
        case 'update_stream_value':
          return await this.updateStreamValue(args);
        case 'get_stream_recorded':
          return await this.getStreamRecorded(args);
        case 'get_stream_summary':
          return await this.getStreamSummary(args);
        case 'list_asset_servers':
          return await this.listAssetServers();
        case 'list_elements':
          return await this.listElements(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${message}` }],
        isError: true,
      };
    }
  }

  // -- Private helpers ------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') {
          params.set(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const init: RequestInit = { method, headers: this.headers() };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await this.fetchWithRetry(url, init);
    let text = await res.text();
    text = this.truncate(text);

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${res.status} ${res.statusText}: ${text}` }],
        isError: true,
      };
    }

    return { content: [{ type: 'text', text }], isError: false };
  }

  private async getHome(): Promise<ToolResult> {
    return this.request('GET', '/');
  }

  private async listDataServers(): Promise<ToolResult> {
    return this.request('GET', '/dataservers');
  }

  private async getDataServer(args: Record<string, unknown>): Promise<ToolResult> {
    const { web_id } = args;
    if (!web_id) {
      return { content: [{ type: 'text', text: 'web_id is required' }], isError: true };
    }
    return this.request('GET', `/dataservers/${encodeURIComponent(String(web_id))}`);
  }

  private async listPoints(args: Record<string, unknown>): Promise<ToolResult> {
    const { server_web_id, name_filter, max_count } = args;
    if (!server_web_id) {
      return { content: [{ type: 'text', text: 'server_web_id is required' }], isError: true };
    }
    const query: Record<string, string | number | boolean> = {};
    if (name_filter) query.nameFilter = String(name_filter);
    if (typeof max_count === 'number') query.maxCount = max_count;
    return this.request('GET', `/dataservers/${encodeURIComponent(String(server_web_id))}/points`, undefined, query);
  }

  private async createPoint(args: Record<string, unknown>): Promise<ToolResult> {
    const { server_web_id, name, point_type, description, eng_units } = args;
    if (!server_web_id || !name) {
      return { content: [{ type: 'text', text: 'server_web_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      Name: name,
      PointType: point_type || 'Float32',
    };
    if (description) body.Descriptor = description;
    if (eng_units) body.EngineeringUnits = eng_units;
    return this.request('POST', `/dataservers/${encodeURIComponent(String(server_web_id))}/points`, body);
  }

  private async getPoint(args: Record<string, unknown>): Promise<ToolResult> {
    const { web_id } = args;
    if (!web_id) {
      return { content: [{ type: 'text', text: 'web_id is required' }], isError: true };
    }
    return this.request('GET', `/points/${encodeURIComponent(String(web_id))}`);
  }

  private async getStreamValue(args: Record<string, unknown>): Promise<ToolResult> {
    const { web_id, time } = args;
    if (!web_id) {
      return { content: [{ type: 'text', text: 'web_id is required' }], isError: true };
    }
    const query: Record<string, string | number | boolean> = {};
    if (time) query.time = String(time);
    return this.request('GET', `/streams/${encodeURIComponent(String(web_id))}/value`, undefined, query);
  }

  private async updateStreamValue(args: Record<string, unknown>): Promise<ToolResult> {
    const { web_id, value, timestamp } = args;
    if (!web_id || value === undefined) {
      return { content: [{ type: 'text', text: 'web_id and value are required' }], isError: true };
    }
    const body: Record<string, unknown> = { Value: value };
    if (timestamp) body.Timestamp = timestamp;
    return this.request('POST', `/streams/${encodeURIComponent(String(web_id))}/value`, body);
  }

  private async getStreamRecorded(args: Record<string, unknown>): Promise<ToolResult> {
    const { web_id, start_time, end_time, max_count } = args;
    if (!web_id || !start_time) {
      return { content: [{ type: 'text', text: 'web_id and start_time are required' }], isError: true };
    }
    const query: Record<string, string | number | boolean> = {
      startTime: String(start_time),
      endTime: end_time ? String(end_time) : '*',
    };
    if (typeof max_count === 'number') query.maxCount = max_count;
    return this.request('GET', `/streams/${encodeURIComponent(String(web_id))}/recorded`, undefined, query);
  }

  private async getStreamSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const { web_id, start_time, end_time, summary_type } = args;
    if (!web_id || !start_time) {
      return { content: [{ type: 'text', text: 'web_id and start_time are required' }], isError: true };
    }
    const query: Record<string, string | number | boolean> = {
      startTime: String(start_time),
      endTime: end_time ? String(end_time) : '*',
    };
    if (summary_type) query.summaryType = String(summary_type);
    return this.request('GET', `/streams/${encodeURIComponent(String(web_id))}/summary`, undefined, query);
  }

  private async listAssetServers(): Promise<ToolResult> {
    return this.request('GET', '/assetservers');
  }

  private async listElements(args: Record<string, unknown>): Promise<ToolResult> {
    const { database_web_id, name_filter, max_count } = args;
    if (!database_web_id) {
      return { content: [{ type: 'text', text: 'database_web_id is required' }], isError: true };
    }
    const query: Record<string, string | number | boolean> = {};
    if (name_filter) query.nameFilter = String(name_filter);
    if (typeof max_count === 'number') query.maxCount = max_count;
    return this.request('GET', `/assetdatabases/${encodeURIComponent(String(database_web_id))}/elements`, undefined, query);
  }
}
