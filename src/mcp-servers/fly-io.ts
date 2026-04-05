/**
 * Fly.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/superfly/flymcp — wraps flyctl CLI (not REST); ~30 stars,
//   last commit 2024. Transport: stdio. Only 2 tools: fly-logs, fly-status. Fails 10-tool criterion.
//   Decision: use-rest-api. Our adapter covers 20 tools via the Machines REST API directly
//   for headless/CI use cases; the MCP is CLI-only and covers minimal surface.
// Our adapter covers: 20 tools. Vendor MCP covers: 2 tools.
// Recommendation: use-rest-api — flymcp has only 2 tools (fly-logs, fly-status); fails 10+ tool
//   criterion. Our REST adapter provides complete Machines API coverage.
//
// Base URL: https://api.machines.dev  (internal: http://_api.internal:4280)
// Auth: Bearer token — Authorization: Bearer <FLY_API_TOKEN>
// Docs: https://fly.io/docs/machines/api/
// Rate limits: Not publicly documented; Fly.io enforces per-org rate limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FlyioConfig {
  token: string;
  baseUrl?: string;
}

export class FlyioMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: FlyioConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.machines.dev';
  }

  static catalog() {
    return {
      name: 'fly-io',
      displayName: 'Fly.io',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['fly', 'fly.io', 'machines', 'apps', 'volumes', 'deploy', 'vm', 'container', 'edge', 'serverless'],
      toolNames: [
        'list_apps', 'create_app', 'get_app', 'delete_app',
        'list_machines', 'get_machine', 'create_machine', 'update_machine',
        'start_machine', 'stop_machine', 'suspend_machine',
        'delete_machine', 'wait_for_machine',
        'list_volumes', 'get_volume', 'create_volume', 'update_volume',
        'delete_volume', 'extend_volume', 'list_volume_snapshots',
      ],
      description: 'Manage Fly.io apps, Machines (VMs), and persistent volumes via the Machines REST API. Supports full lifecycle: create, update, start, stop, suspend, delete.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Apps ────────────────────────────────────────────────────────────
      {
        name: 'list_apps',
        description: 'List all Fly.io apps in an organization, with optional org_slug filter',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'Organization slug to scope the listing (e.g. personal). Omit to list all accessible apps.',
            },
          },
        },
      },
      {
        name: 'create_app',
        description: 'Create a new Fly.io app within an organization',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the app to create (must be globally unique on fly.io)',
            },
            org_slug: {
              type: 'string',
              description: 'Slug of the org in which to create the app (e.g. personal)',
            },
            network: {
              type: 'string',
              description: 'Name for an IPv6 private network to segment the app onto (optional)',
            },
          },
          required: ['app_name', 'org_slug'],
        },
      },
      {
        name: 'get_app',
        description: 'Get details for a specific Fly.io app by name, including org slug and status',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'delete_app',
        description: 'Delete a Fly.io app and all its Machines permanently. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app to delete',
            },
          },
          required: ['app_name'],
        },
      },
      // ── Machines ─────────────────────────────────────────────────────────
      {
        name: 'list_machines',
        description: 'List all Machines (VMs) in a Fly.io app, with optional region and metadata filters',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            include_deleted: {
              type: 'boolean',
              description: 'Include deleted machines in the response (default: false)',
            },
            region: {
              type: 'string',
              description: 'Filter by region code, e.g. yyz, ord, lhr (optional)',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'get_machine',
        description: 'Get full details for a specific Machine by ID, including config, state, and events',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      {
        name: 'create_machine',
        description: 'Create and launch a new Machine in a Fly.io app with specified image, CPU, memory, and environment config',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            image: {
              type: 'string',
              description: 'Docker image reference to run, e.g. registry.fly.io/my-app:latest',
            },
            region: {
              type: 'string',
              description: 'Region to create the Machine in, e.g. ord, lhr (optional, defaults to app primary region)',
            },
            name: {
              type: 'string',
              description: 'Optional name for the Machine',
            },
            env: {
              type: 'object',
              description: 'Key-value environment variables to set on the Machine',
            },
            cpus: {
              type: 'number',
              description: 'Number of vCPUs (default: 1)',
            },
            memory_mb: {
              type: 'number',
              description: 'Memory in MB (default: 256)',
            },
          },
          required: ['app_name', 'image'],
        },
      },
      {
        name: 'update_machine',
        description: 'Update a Machine config (image, CPU, memory, env). Replaces the entire config; fetch current config first.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to update',
            },
            image: {
              type: 'string',
              description: 'New Docker image reference',
            },
            env: {
              type: 'object',
              description: 'Updated environment variables (replaces existing env)',
            },
            cpus: {
              type: 'number',
              description: 'Number of vCPUs',
            },
            memory_mb: {
              type: 'number',
              description: 'Memory in MB',
            },
          },
          required: ['app_name', 'machine_id', 'image'],
        },
      },
      {
        name: 'start_machine',
        description: 'Start a stopped Machine in a Fly.io app',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to start',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      {
        name: 'stop_machine',
        description: 'Stop a running Machine in a Fly.io app. The Machine is preserved and can be restarted.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to stop',
            },
            signal: {
              type: 'string',
              description: 'Signal to send to the process (e.g. SIGTERM, SIGINT — default: SIGINT)',
            },
            timeout: {
              type: 'number',
              description: 'Seconds to wait for the Machine to stop gracefully before killing (default: 5)',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      {
        name: 'suspend_machine',
        description: 'Suspend a running Machine, pausing it in memory to resume later with minimal cold-start latency',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to suspend',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      {
        name: 'delete_machine',
        description: 'Permanently delete a Machine from a Fly.io app. Machine must be stopped first unless force=true.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to delete',
            },
            force: {
              type: 'boolean',
              description: 'Force deletion even if the Machine is still running (default: false)',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      {
        name: 'wait_for_machine',
        description: 'Poll until a Machine reaches a target state (started, stopped, destroyed). Useful after create or update.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to wait on',
            },
            state: {
              type: 'string',
              description: 'Target state to wait for: started, stopped, suspended, destroyed (default: started)',
            },
            timeout: {
              type: 'number',
              description: 'Maximum seconds to wait (default: 60)',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      // ── Volumes ──────────────────────────────────────────────────────────
      {
        name: 'list_volumes',
        description: 'List all persistent volumes in a Fly.io app',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'get_volume',
        description: 'Get details for a specific volume by ID, including size, state, and attached Machine',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            volume_id: {
              type: 'string',
              description: 'ID of the volume (e.g. vol_6r7ye90k98ynwk1r)',
            },
          },
          required: ['app_name', 'volume_id'],
        },
      },
      {
        name: 'create_volume',
        description: 'Create a new persistent volume for a Fly.io app in a specified region',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            name: {
              type: 'string',
              description: 'Name for the new volume (e.g. data)',
            },
            size_gb: {
              type: 'number',
              description: 'Size of the volume in GB (default: 3)',
            },
            region: {
              type: 'string',
              description: 'Region where the volume will be created (e.g. ord). Defaults to app primary region.',
            },
            encrypted: {
              type: 'boolean',
              description: 'Whether to encrypt the volume (default: true)',
            },
            require_unique_zone: {
              type: 'boolean',
              description: 'Place volume on unique hardware zone for HA (default: true). Set false if all zones used.',
            },
            snapshot_id: {
              type: 'string',
              description: 'ID of a snapshot to restore this volume from (optional)',
            },
          },
          required: ['app_name', 'name'],
        },
      },
      {
        name: 'update_volume',
        description: 'Update mutable properties of a volume, such as its scheduled snapshot retention',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            volume_id: {
              type: 'string',
              description: 'ID of the volume to update',
            },
            snapshot_retention: {
              type: 'number',
              description: 'Number of days to retain automatic volume snapshots (default: 5)',
            },
          },
          required: ['app_name', 'volume_id'],
        },
      },
      {
        name: 'delete_volume',
        description: 'Permanently delete a volume from a Fly.io app. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            volume_id: {
              type: 'string',
              description: 'ID of the volume to delete',
            },
          },
          required: ['app_name', 'volume_id'],
        },
      },
      {
        name: 'extend_volume',
        description: 'Increase the size of a volume. Volumes can only be extended (increased), not shrunk.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            volume_id: {
              type: 'string',
              description: 'ID of the volume to extend',
            },
            size_gb: {
              type: 'number',
              description: 'New size in GB — must be larger than the current size',
            },
          },
          required: ['app_name', 'volume_id', 'size_gb'],
        },
      },
      {
        name: 'list_volume_snapshots',
        description: 'List all snapshots for a specific volume, including creation time and size',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            volume_id: {
              type: 'string',
              description: 'ID of the volume to list snapshots for',
            },
          },
          required: ['app_name', 'volume_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_apps':         return await this.listApps(args);
        case 'create_app':        return await this.createApp(args);
        case 'get_app':           return await this.getApp(args);
        case 'delete_app':        return await this.deleteApp(args);
        case 'list_machines':     return await this.listMachines(args);
        case 'get_machine':       return await this.getMachine(args);
        case 'create_machine':    return await this.createMachine(args);
        case 'update_machine':    return await this.updateMachine(args);
        case 'start_machine':     return await this.startMachine(args);
        case 'stop_machine':      return await this.stopMachine(args);
        case 'suspend_machine':   return await this.suspendMachine(args);
        case 'delete_machine':    return await this.deleteMachine(args);
        case 'wait_for_machine':  return await this.waitForMachine(args);
        case 'list_volumes':      return await this.listVolumes(args);
        case 'get_volume':        return await this.getVolume(args);
        case 'create_volume':     return await this.createVolume(args);
        case 'update_volume':     return await this.updateVolume(args);
        case 'delete_volume':     return await this.deleteVolume(args);
        case 'extend_volume':     return await this.extendVolume(args);
        case 'list_volume_snapshots': return await this.listVolumeSnapshots(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...options, headers: { ...this.headers(), ...(options.headers as Record<string, string> ?? {}) } });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : { ok: true };
    } catch {
      return { content: [{ type: 'text', text: `Fly.io returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Apps ─────────────────────────────────────────────────────────────────

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/v1/apps`;
    if (args.org_slug) url += `?org_slug=${encodeURIComponent(args.org_slug as string)}`;
    return this.fetchJSON(url);
  }

  private async createApp(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      app_name: args.app_name,
      org_slug: args.org_slug,
    };
    if (args.network) body.network = args.network;
    return this.fetchJSON(`${this.baseUrl}/v1/apps`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async getApp(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}`);
  }

  private async deleteApp(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}`, { method: 'DELETE' });
  }

  // ── Machines ─────────────────────────────────────────────────────────────

  private async listMachines(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const params = new URLSearchParams();
    if (args.include_deleted) params.set('include_deleted', 'true');
    if (args.region) params.set('region', args.region as string);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines${qs ? '?' + qs : ''}`);
  }

  private async getMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const mid = encodeURIComponent(args.machine_id as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines/${mid}`);
  }

  private async createMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const config: Record<string, unknown> = { image: args.image };
    if (args.env) config.env = args.env;
    if (args.cpus || args.memory_mb) {
      config.guest = {
        ...(args.cpus ? { cpus: args.cpus } : {}),
        ...(args.memory_mb ? { memory_mb: args.memory_mb } : {}),
      };
    }
    const body: Record<string, unknown> = { config };
    if (args.name) body.name = args.name;
    if (args.region) body.region = args.region;
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const mid = encodeURIComponent(args.machine_id as string);
    const config: Record<string, unknown> = { image: args.image };
    if (args.env) config.env = args.env;
    if (args.cpus || args.memory_mb) {
      config.guest = {
        ...(args.cpus ? { cpus: args.cpus } : {}),
        ...(args.memory_mb ? { memory_mb: args.memory_mb } : {}),
      };
    }
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines/${mid}`, { method: 'POST', body: JSON.stringify({ config }) });
  }

  private async startMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const mid = encodeURIComponent(args.machine_id as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines/${mid}/start`, { method: 'POST' });
  }

  private async stopMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const mid = encodeURIComponent(args.machine_id as string);
    const body: Record<string, unknown> = {};
    if (args.signal) body.signal = args.signal;
    if (args.timeout) body.timeout = args.timeout;
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines/${mid}/stop`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async suspendMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const mid = encodeURIComponent(args.machine_id as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines/${mid}/suspend`, { method: 'POST' });
  }

  private async deleteMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const mid = encodeURIComponent(args.machine_id as string);
    const url = `${this.baseUrl}/v1/apps/${app}/machines/${mid}${args.force ? '?force=true' : ''}`;
    return this.fetchJSON(url, { method: 'DELETE' });
  }

  private async waitForMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const mid = encodeURIComponent(args.machine_id as string);
    const state = (args.state as string) ?? 'started';
    const timeout = (args.timeout as number) ?? 60;
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/machines/${mid}/wait?state=${encodeURIComponent(state)}&timeout=${timeout}`);
  }

  // ── Volumes ───────────────────────────────────────────────────────────────

  private async listVolumes(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/volumes`);
  }

  private async getVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const vid = encodeURIComponent(args.volume_id as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/volumes/${vid}`);
  }

  private async createVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const body: Record<string, unknown> = { name: args.name };
    if (args.size_gb !== undefined) body.size_gb = args.size_gb;
    if (args.region) body.region = args.region;
    if (args.encrypted !== undefined) body.encrypted = args.encrypted;
    if (args.require_unique_zone !== undefined) body.require_unique_zone = args.require_unique_zone;
    if (args.snapshot_id) body.snapshot_id = args.snapshot_id;
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/volumes`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const vid = encodeURIComponent(args.volume_id as string);
    const body: Record<string, unknown> = {};
    if (args.snapshot_retention !== undefined) body.snapshot_retention = args.snapshot_retention;
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/volumes/${vid}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async deleteVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const vid = encodeURIComponent(args.volume_id as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/volumes/${vid}`, { method: 'DELETE' });
  }

  private async extendVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const vid = encodeURIComponent(args.volume_id as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/volumes/${vid}/extend`, { method: 'PUT', body: JSON.stringify({ size_gb: args.size_gb }) });
  }

  private async listVolumeSnapshots(args: Record<string, unknown>): Promise<ToolResult> {
    const app = encodeURIComponent(args.app_name as string);
    const vid = encodeURIComponent(args.volume_id as string);
    return this.fetchJSON(`${this.baseUrl}/v1/apps/${app}/volumes/${vid}/snapshots`);
  }
}
