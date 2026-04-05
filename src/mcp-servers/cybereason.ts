/**
 * Cybereason MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Cybereason MCP server was found on GitHub, npmjs, or vendor channels.
//
// Base URL: https://{tenant}.cybereason.net:8443  (port 443 for API users, 8443 for GUI users)
// Auth: Session cookie — POST /login.html with username/password (form-encoded), cache JSESSIONID
// Docs: https://nest.cybereason.com/documentation/api-documentation (login required)
// Rate limits: Not publicly documented; session TTL default 24 hours
//
// ENDPOINT PATH NOTE: Official Cybereason API docs are fully gated behind nest.cybereason.com login.
// Community integrations (Demisto/XSOAR, LogicHub) use /rest/visualsearch/query/simple (POST) for
// queries and /rest/... paths for response actions — NOT /api/v2.1/... paths used in this adapter.
// The /api/v2.1/ path structure used here is UNVERIFIED. Review against official docs when available.
// Demisto integration reference: github.com/demisto/content/tree/master/Packs/Cybereason
//
// Our adapter covers: 15 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — No official Cybereason MCP server exists.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CybereasonConfig {
  /** Tenant hostname prefix, e.g. "mycompany" → mycompany.cybereason.net */
  host: string;
  username: string;
  password: string;
  port?: number;
  /** Session cookie TTL in milliseconds. Default: 86400000 (24 hours) */
  sessionTtlMs?: number;
}

export class CybereasonMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly sessionTtlMs: number;
  private sessionCookie: string | null = null;
  private sessionExpiry: number = 0;

  constructor(config: CybereasonConfig) {
    super();
    const port = config.port ?? 8443;
    this.baseUrl = `https://${config.host}.cybereason.net:${port}`;
    this.username = config.username;
    this.password = config.password;
    this.sessionTtlMs = config.sessionTtlMs ?? 86_400_000;
  }

  static catalog() {
    return {
      name: 'cybereason',
      displayName: 'Cybereason',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'cybereason', 'malop', 'edr', 'endpoint', 'detection', 'response',
        'isolate', 'quarantine', 'sensor', 'machine', 'process', 'remediation',
      ],
      toolNames: [
        'list_malops', 'get_malop', 'update_malop_status',
        'get_malop_processes', 'get_malop_affected_machines',
        'list_machines', 'get_machine', 'get_sensor_status',
        'isolate_machine', 'unisolate_machine',
        'kill_process', 'query_processes',
        'list_users', 'get_user',
        'list_sensors',
      ],
      description: 'Cybereason EDR: query and triage MalOps, manage machine isolation, kill processes, inspect sensors and users.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_malops',
        description: 'List active or archived MalOps with optional filters for status, type, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of MalOps to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of MalOps to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by lifecycle status: active, archived, closed',
            },
          },
        },
      },
      {
        name: 'get_malop',
        description: 'Get full details of a single MalOp by its unique ID, including root cause and severity',
        inputSchema: {
          type: 'object',
          properties: {
            malopId: {
              type: 'string',
              description: 'Cybereason MalOp ID (GUID)',
            },
          },
          required: ['malopId'],
        },
      },
      {
        name: 'update_malop_status',
        description: 'Update the lifecycle status of a MalOp to open, todo, closed, or false_positive',
        inputSchema: {
          type: 'object',
          properties: {
            malopId: {
              type: 'string',
              description: 'Cybereason MalOp ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: open, todo, closed, false_positive',
            },
          },
          required: ['malopId', 'status'],
        },
      },
      {
        name: 'get_malop_processes',
        description: 'List all processes associated with a MalOp, including hashes, paths, and parent relationships',
        inputSchema: {
          type: 'object',
          properties: {
            malopId: {
              type: 'string',
              description: 'MalOp ID whose processes to retrieve',
            },
          },
          required: ['malopId'],
        },
      },
      {
        name: 'get_malop_affected_machines',
        description: 'List all machines affected by a specific MalOp with hostname and machine ID',
        inputSchema: {
          type: 'object',
          properties: {
            malopId: {
              type: 'string',
              description: 'MalOp ID whose affected machines to retrieve',
            },
          },
          required: ['malopId'],
        },
      },
      {
        name: 'list_machines',
        description: 'List all machines enrolled in Cybereason with optional pagination and status filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of machines to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of machines to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_machine',
        description: 'Retrieve detailed information about a specific machine by its Cybereason machine ID',
        inputSchema: {
          type: 'object',
          properties: {
            machineId: {
              type: 'string',
              description: 'Cybereason machine ID',
            },
          },
          required: ['machineId'],
        },
      },
      {
        name: 'get_sensor_status',
        description: 'Get the sensor connection and health status for a specific machine by machine ID',
        inputSchema: {
          type: 'object',
          properties: {
            machineId: {
              type: 'string',
              description: 'Machine ID whose sensor status to retrieve',
            },
          },
          required: ['machineId'],
        },
      },
      {
        name: 'isolate_machine',
        description: 'Network-isolate a machine to contain a threat, with optional reason string for audit trail',
        inputSchema: {
          type: 'object',
          properties: {
            machineId: {
              type: 'string',
              description: 'Machine ID to isolate from the network',
            },
            reason: {
              type: 'string',
              description: 'Reason for isolation logged in the audit trail (default: "Security isolation via MCP")',
            },
          },
          required: ['machineId'],
        },
      },
      {
        name: 'unisolate_machine',
        description: 'Remove network isolation from a previously isolated machine and restore connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            machineId: {
              type: 'string',
              description: 'Machine ID to remove from network isolation',
            },
          },
          required: ['machineId'],
        },
      },
      {
        name: 'kill_process',
        description: 'Terminate a running process on a machine by PID as part of active threat remediation',
        inputSchema: {
          type: 'object',
          properties: {
            machineId: {
              type: 'string',
              description: 'Machine ID on which to kill the process',
            },
            processId: {
              type: 'string',
              description: 'Process ID (PID) to terminate',
            },
            malopId: {
              type: 'string',
              description: 'MalOp ID associated with this remediation action (for audit linkage)',
            },
          },
          required: ['machineId', 'processId'],
        },
      },
      {
        name: 'query_processes',
        description: 'Search processes across all machines by name, hash, or command-line arguments',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Process name, SHA-1 hash, or substring of command-line to search for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
          required: ['search'],
        },
      },
      {
        name: 'list_users',
        description: 'List all user accounts observed by Cybereason sensors with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of users to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific user account observed by Cybereason, including machines seen on',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username (e.g., "DOMAIN\\\\user" or "user@domain.com")',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_sensors',
        description: 'List all Cybereason sensors with their version, status, and machine associations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sensors to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of sensors to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by sensor status: online, offline, expired, stale',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      await this.ensureAuthenticated();

      switch (name) {
        case 'list_malops':
          return await this.listMalops(args);
        case 'get_malop':
          return await this.getMalop(args);
        case 'update_malop_status':
          return await this.updateMalopStatus(args);
        case 'get_malop_processes':
          return await this.getMalopProcesses(args);
        case 'get_malop_affected_machines':
          return await this.getMalopAffectedMachines(args);
        case 'list_machines':
          return await this.listMachines(args);
        case 'get_machine':
          return await this.getMachine(args);
        case 'get_sensor_status':
          return await this.getSensorStatus(args);
        case 'isolate_machine':
          return await this.isolateMachine(args);
        case 'unisolate_machine':
          return await this.unisolateMachine(args);
        case 'kill_process':
          return await this.killProcess(args);
        case 'query_processes':
          return await this.queryProcesses(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_sensors':
          return await this.listSensors(args);
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

  // ── Auth helpers ─────────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': this.sessionCookie ?? '',
    };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.sessionCookie && Date.now() < this.sessionExpiry) {
      return;
    }
    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const body = new URLSearchParams({ username: this.username, password: this.password }).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/login.html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Cybereason authentication failed: HTTP ${response.status}`);
    }

    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) {
      throw new Error('Cybereason authentication succeeded but returned no session cookie');
    }

    this.sessionCookie = setCookie.split(';')[0];
    this.sessionExpiry = Date.now() + this.sessionTtlMs;
  }

  private async fetchWithReauth(url: string, options: RequestInit): Promise<Response> {
    const res = await this.fetchWithRetry(url, { ...options, headers: this.authHeaders });
    if (res.status === 401) {
      this.sessionCookie = null;
      this.sessionExpiry = 0;
      await this.authenticate();
      return fetch(url, { ...options, headers: this.authHeaders });
    }
    return res;
  }

  // ── Response helper ──────────────────────────────────────────────────────────


  // ── Tool implementations ─────────────────────────────────────────────────────

  private async listMalops(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const status = args.status as string | undefined;

    const url = new URL(`${this.baseUrl}/api/v2.1/malops`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    if (status) url.searchParams.set('status', status);

    const res = await this.fetchWithReauth(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async getMalop(args: Record<string, unknown>): Promise<ToolResult> {
    const malopId = args.malopId as string;
    if (!malopId) throw new Error('malopId is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/malops/${encodeURIComponent(malopId)}`,
      { method: 'GET' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async updateMalopStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const malopId = args.malopId as string;
    const status = args.status as string;
    if (!malopId) throw new Error('malopId is required');
    if (!status) throw new Error('status is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/malops/${encodeURIComponent(malopId)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async getMalopProcesses(args: Record<string, unknown>): Promise<ToolResult> {
    const malopId = args.malopId as string;
    if (!malopId) throw new Error('malopId is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/malops/${encodeURIComponent(malopId)}/processes`,
      { method: 'GET' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async getMalopAffectedMachines(args: Record<string, unknown>): Promise<ToolResult> {
    const malopId = args.malopId as string;
    if (!malopId) throw new Error('malopId is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/malops/${encodeURIComponent(malopId)}/machines`,
      { method: 'GET' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async listMachines(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;

    const url = new URL(`${this.baseUrl}/api/v2.1/machines`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const res = await this.fetchWithReauth(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async getMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const machineId = args.machineId as string;
    if (!machineId) throw new Error('machineId is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/machines/${encodeURIComponent(machineId)}`,
      { method: 'GET' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async getSensorStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const machineId = args.machineId as string;
    if (!machineId) throw new Error('machineId is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/machines/${encodeURIComponent(machineId)}/sensor_status`,
      { method: 'GET' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async isolateMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const machineId = args.machineId as string;
    if (!machineId) throw new Error('machineId is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/machines/${encodeURIComponent(machineId)}/isolate`,
      {
        method: 'POST',
        body: JSON.stringify({
          machine_id: machineId,
          reason: (args.reason as string) ?? 'Security isolation via MCP',
        }),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async unisolateMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const machineId = args.machineId as string;
    if (!machineId) throw new Error('machineId is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/machines/${encodeURIComponent(machineId)}/unisolate`,
      {
        method: 'POST',
        body: JSON.stringify({ machine_id: machineId }),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async killProcess(args: Record<string, unknown>): Promise<ToolResult> {
    const machineId = args.machineId as string;
    const processId = args.processId as string;
    if (!machineId) throw new Error('machineId is required');
    if (!processId) throw new Error('processId is required');

    const body: Record<string, unknown> = { machine_id: machineId, process_id: processId };
    if (args.malopId) body.malop_id = args.malopId;

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/remediate/kill-process`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async queryProcesses(args: Record<string, unknown>): Promise<ToolResult> {
    const search = args.search as string;
    if (!search) throw new Error('search is required');
    const limit = (args.limit as number) ?? 50;

    const url = new URL(`${this.baseUrl}/api/v2.1/processes/search`);
    url.searchParams.set('search', search);
    url.searchParams.set('limit', String(limit));

    const res = await this.fetchWithReauth(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;

    const url = new URL(`${this.baseUrl}/api/v2.1/users`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const res = await this.fetchWithReauth(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) throw new Error('username is required');

    const res = await this.fetchWithReauth(
      `${this.baseUrl}/api/v2.1/users/${encodeURIComponent(username)}`,
      { method: 'GET' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }

  private async listSensors(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    const status = args.status as string | undefined;

    const url = new URL(`${this.baseUrl}/api/v2.1/sensors`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    if (status) url.searchParams.set('status', status);

    const res = await this.fetchWithReauth(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { content: [{ type: 'text', text: this.truncate(await res.json()) }], isError: false };
  }
}
