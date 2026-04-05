/**
 * Sauce Labs MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/saucelabs/sauce-api-mcp — transport: stdio, auth: username + access key
// Our adapter covers: 16 tools (jobs, builds, tunnels, devices, storage, accounts).
// Vendor MCP covers: 22 tools (get_account_info, lookup_users, get_user, lookup_teams, get_team,
//   list_team_members, get_devices_status, get_specific_device, get_private_devices,
//   get_recent_jobs, get_job_details, get_real_device_jobs, get_specific_real_device_job,
//   get_specific_real_device_job_asset, lookup_builds, get_build, lookup_jobs_in_build,
//   get_storage_files, get_storage_groups, get_storage_groups_settings,
//   get_tunnels_for_user, get_tunnel_information).
// Maintained: yes — v1.1.0 released 2026-03-05. Official vendor repo.
// Recommendation: use-both — vendor MCP is read-only (no update_job, delete_job, delete_tunnel,
//   upload_storage_file, delete_storage_file). Our REST adapter adds those write operations.
//   MCP-sourced tools (22): account info, device listing, job read, build read, storage read, tunnel read.
//   REST-sourced tools (7): update_job, delete_job, delete_tunnel, upload_storage_file,
//     delete_storage_file, get_account_usage, list_teams.
//   Combined coverage: ~29 tools (22 MCP + 16 REST - ~9 shared read operations).
//
// Base URL: https://api.us-west-1.saucelabs.com (US West); https://api.eu-central-1.saucelabs.com (EU)
// Auth: HTTP Basic Auth — username:access_key
// Docs: https://docs.saucelabs.com/dev/api/
// Rate limits: Per-endpoint; 429 with X-Ratelimit-Remaining, X-Ratelimit-Limit, X-Ratelimit-Reset headers

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SauceLabsConfig {
  username: string;
  accessKey: string;
  region?: string;
  baseUrl?: string;
}

export class SauceLabsMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly accessKey: string;
  private readonly baseUrl: string;

  constructor(config: SauceLabsConfig) {
    super();
    this.username = config.username;
    this.accessKey = config.accessKey;
    const region = config.region || 'us-west-1';
    this.baseUrl = config.baseUrl || `https://api.${region}.saucelabs.com`;
  }

  static catalog() {
    return {
      name: 'sauce-labs',
      displayName: 'Sauce Labs',
      version: '1.0.0',
      category: 'devops',
      keywords: ['sauce labs', 'testing', 'selenium', 'appium', 'browser testing', 'mobile testing', 'test automation', 'ci', 'real device', 'virtual device', 'test job', 'build'],
      toolNames: [
        'list_jobs', 'get_job', 'update_job', 'delete_job',
        'list_builds', 'get_build',
        'list_tunnels', 'get_tunnel', 'delete_tunnel',
        'list_devices', 'get_device',
        'list_storage_files', 'upload_storage_file', 'delete_storage_file',
        'get_account_usage', 'list_teams',
      ],
      description: 'Sauce Labs test automation: manage test jobs, builds, tunnels, real/virtual devices, file storage, and account usage.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_jobs',
        description: 'List test jobs for the authenticated Sauce Labs account with optional status, build, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by job status: passed, failed, error, complete (default: all)',
            },
            build: {
              type: 'string',
              description: 'Filter by build name or ID',
            },
            from: {
              type: 'number',
              description: 'Start time filter as Unix timestamp (default: 24 hours ago)',
            },
            to: {
              type: 'number',
              description: 'End time filter as Unix timestamp (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return (default: 20, max: 500)',
            },
            skip: {
              type: 'number',
              description: 'Number of jobs to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get details for a specific Sauce Labs test job by its job ID including status, commands, and assets',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Test job ID to retrieve',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'update_job',
        description: 'Update metadata for a Sauce Labs test job — set name, build, tags, and pass/fail status',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Job ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated name for the job',
            },
            passed: {
              type: 'boolean',
              description: 'Set job pass/fail result: true (passed) or false (failed)',
            },
            build: {
              type: 'string',
              description: 'Build name to associate the job with',
            },
            tags: {
              type: 'array',
              description: 'Array of string tags to apply to the job',
            },
            custom_data: {
              type: 'object',
              description: 'Custom key-value metadata to attach to the job',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'delete_job',
        description: 'Delete a Sauce Labs test job and its assets by job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Job ID to delete',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_builds',
        description: 'List test builds in the Sauce Labs account for a device source (rdc or vdc) with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            build_source: {
              type: 'string',
              description: 'Device type for the build: rdc (real device) or vdc (emulator/simulator). Required.',
            },
            status: {
              type: 'string',
              description: 'Filter by build status: running, error, failed, passed, complete (default: all)',
            },
            from: {
              type: 'number',
              description: 'Start time filter as Unix timestamp',
            },
            to: {
              type: 'number',
              description: 'End time filter as Unix timestamp',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of builds (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of builds to skip for pagination (default: 0)',
            },
          },
          required: ['build_source'],
        },
      },
      {
        name: 'get_build',
        description: 'Get details for a specific Sauce Labs build by device source and build ID, including associated jobs and status summary',
        inputSchema: {
          type: 'object',
          properties: {
            build_source: {
              type: 'string',
              description: 'Device type for the build: rdc (real device) or vdc (emulator/simulator). Required.',
            },
            build_id: {
              type: 'string',
              description: 'Build ID to retrieve',
            },
          },
          required: ['build_source', 'build_id'],
        },
      },
      {
        name: 'list_tunnels',
        description: 'List active Sauce Connect tunnels for the authenticated account',
        inputSchema: {
          type: 'object',
          properties: {
            full: {
              type: 'boolean',
              description: 'Return full tunnel metadata including configuration details (default: false)',
            },
          },
        },
      },
      {
        name: 'get_tunnel',
        description: 'Get details and status for a specific Sauce Connect tunnel by its tunnel ID',
        inputSchema: {
          type: 'object',
          properties: {
            tunnel_id: {
              type: 'string',
              description: 'Tunnel ID to retrieve',
            },
          },
          required: ['tunnel_id'],
        },
      },
      {
        name: 'delete_tunnel',
        description: 'Shut down and delete a Sauce Connect tunnel by its tunnel ID',
        inputSchema: {
          type: 'object',
          properties: {
            tunnel_id: {
              type: 'string',
              description: 'Tunnel ID to shut down',
            },
          },
          required: ['tunnel_id'],
        },
      },
      {
        name: 'list_devices',
        description: 'List available real devices in the Sauce Labs device cloud with optional platform and OS filters',
        inputSchema: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              description: 'Device type: ios or android (default: all)',
            },
            availability: {
              type: 'string',
              description: 'Filter by availability: available or busy',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get details for a specific real device by its device ID including capabilities and current status',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to retrieve',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_storage_files',
        description: 'List files uploaded to Sauce Labs app storage for use in mobile testing',
        inputSchema: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              description: 'Filter by file type: ios or android (default: all)',
            },
            q: {
              type: 'string',
              description: 'Search query to filter by file name',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'upload_storage_file',
        description: 'Upload an app file (APK, IPA, ZIP) to Sauce Labs storage from a public URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Public URL of the app file to upload',
            },
            name: {
              type: 'string',
              description: 'Filename to use in Sauce Labs storage (e.g. MyApp.apk)',
            },
            description: {
              type: 'string',
              description: 'Optional description for the file',
            },
          },
          required: ['url', 'name'],
        },
      },
      {
        name: 'delete_storage_file',
        description: 'Delete a file from Sauce Labs app storage by its file ID',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'File ID to delete from Sauce Labs storage',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'get_account_usage',
        description: 'Get real-time and historical concurrency usage stats for the Sauce Labs account',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to query usage for (default: authenticated user)',
            },
          },
        },
      },
      {
        name: 'list_teams',
        description: 'List teams in the Sauce Labs organization with member counts and concurrency limits',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_jobs':
          return this.listJobs(args);
        case 'get_job':
          return this.getJob(args);
        case 'update_job':
          return this.updateJob(args);
        case 'delete_job':
          return this.deleteJob(args);
        case 'list_builds':
          return this.listBuilds(args);
        case 'get_build':
          return this.getBuild(args);
        case 'list_tunnels':
          return this.listTunnels(args);
        case 'get_tunnel':
          return this.getTunnel(args);
        case 'delete_tunnel':
          return this.deleteTunnel(args);
        case 'list_devices':
          return this.listDevices(args);
        case 'get_device':
          return this.getDevice(args);
        case 'list_storage_files':
          return this.listStorageFiles(args);
        case 'upload_storage_file':
          return this.uploadStorageFile(args);
        case 'delete_storage_file':
          return this.deleteStorageFile(args);
        case 'get_account_usage':
          return this.getAccountUsage(args);
        case 'list_teams':
          return this.listTeams(args);
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Basic ${btoa(`${this.username}:${this.accessKey}`)}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQs(params: Record<string, string | number | boolean | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? '?' + s : '';
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/rest/v1/${this.username}/jobs` + this.buildQs({
      full: true,
      status: args.status as string,
      build: args.build as string,
      from: args.from as number,
      to: args.to as number,
      limit: (args.limit as number) || 20,
      skip: (args.skip as number) || 0,
    }));
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.apiGet(`/rest/v1/${this.username}/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async updateJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (typeof args.passed === 'boolean') body.passed = args.passed;
    if (args.build) body.build = args.build;
    if (args.tags) body.tags = args.tags;
    if (args.custom_data) body.custom_data = args.custom_data;
    return this.apiPut(`/rest/v1/${this.username}/jobs/${encodeURIComponent(args.job_id as string)}`, body);
  }

  private async deleteJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.apiDelete(`/rest/v1/${this.username}/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async listBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_source) return { content: [{ type: 'text', text: 'build_source is required (rdc or vdc)' }], isError: true };
    return this.apiGet(`/v2/builds/${encodeURIComponent(args.build_source as string)}/` + this.buildQs({
      status: args.status as string,
      from: args.from as number,
      to: args.to as number,
      limit: (args.limit as number) || 20,
      skip: (args.skip as number) || 0,
    }));
  }

  private async getBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_source || !args.build_id) return { content: [{ type: 'text', text: 'build_source and build_id are required' }], isError: true };
    return this.apiGet(`/v2/builds/${encodeURIComponent(args.build_source as string)}/${encodeURIComponent(args.build_id as string)}/`);
  }

  private async listTunnels(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = args.full ? '?full=true' : '';
    return this.apiGet(`/rest/v1/${this.username}/tunnels${qs}`);
  }

  private async getTunnel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tunnel_id) return { content: [{ type: 'text', text: 'tunnel_id is required' }], isError: true };
    return this.apiGet(`/rest/v1/${this.username}/tunnels/${encodeURIComponent(args.tunnel_id as string)}`);
  }

  private async deleteTunnel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tunnel_id) return { content: [{ type: 'text', text: 'tunnel_id is required' }], isError: true };
    return this.apiDelete(`/rest/v1/${this.username}/tunnels/${encodeURIComponent(args.tunnel_id as string)}`);
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/v1/rdc/devices' + this.buildQs({ kind: args.kind as string, availability: args.availability as string }));
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/v1/rdc/devices/${encodeURIComponent(args.device_id as string)}`);
  }

  private async listStorageFiles(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/v1/storage/files' + this.buildQs({
      kind: args.kind as string,
      q: args.q as string,
      page_size: (args.page_size as number) || 25,
      page: (args.page as number) || 1,
    }));
  }

  private async uploadStorageFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url || !args.name) return { content: [{ type: 'text', text: 'url and name are required' }], isError: true };
    const body: Record<string, unknown> = { item: { url: args.url, name: args.name } };
    if (args.description) (body.item as Record<string, unknown>).description = args.description;
    return this.apiPost('/v1/storage/upload', body);
  }

  private async deleteStorageFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_id) return { content: [{ type: 'text', text: 'file_id is required' }], isError: true };
    return this.apiDelete(`/v1/storage/files/${encodeURIComponent(args.file_id as string)}`);
  }

  private async getAccountUsage(args: Record<string, unknown>): Promise<ToolResult> {
    const user = (args.username as string) || this.username;
    return this.apiGet(`/rest/v1.2/users/${user}/concurrency`);
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/rest/v1/teams' + this.buildQs({
      page_size: (args.page_size as number) || 25,
      page: (args.page as number) || 1,
    }));
  }
}
