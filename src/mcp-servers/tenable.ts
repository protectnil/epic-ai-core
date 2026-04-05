/**
 * Tenable MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// Tenable publishes an FAQ about MCP integrations (blog post) and has a tenable/mcp-blog repo
// containing configuration examples only — not a published MCP server with tools.
// Community servers exist (rajagrawal104/tenablemcp, Cyreslab-AI/nessus-mcp-server) but are
// unofficial and unmaintained. This adapter provides REST wrapper coverage.
//
// Base URL: https://cloud.tenable.com
// Auth: Dual API key — X-ApiKeys: accessKey={key};secretKey={key}
// Docs: https://developer.tenable.com/reference/navigate
// Rate limits: 200 req/min for most endpoints; export/bulk endpoints have separate job quotas

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TenableConfig {
  accessKey: string;
  secretKey: string;
  /** Override API base URL (default: https://cloud.tenable.com) */
  baseUrl?: string;
}

export class TenableMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKeys: string;

  constructor(config: TenableConfig) {
    super();
    this.baseUrl = (config.baseUrl ?? 'https://cloud.tenable.com').replace(/\/$/, '');
    this.apiKeys = `accessKey=${config.accessKey};secretKey=${config.secretKey}`;
  }

  static catalog() {
    return {
      name: 'tenable',
      displayName: 'Tenable',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['tenable', 'vulnerability', 'scan', 'asset', 'cve', 'plugin', 'nessus', 'cvss', 'patch', 'risk', 'compliance', 'audit', 'exposure', 'tag', 'network'],
      toolNames: [
        'list_vulnerabilities', 'get_vulnerability_info',
        'list_assets', 'get_asset', 'get_asset_vulnerabilities', 'delete_asset',
        'list_scans', 'get_scan', 'launch_scan', 'stop_scan', 'get_scan_history',
        'list_scan_policies', 'list_scanners',
        'list_tags', 'list_tag_values',
        'export_vulnerabilities', 'get_export_status', 'download_export_chunk',
        'list_networks',
      ],
      description: 'Tenable Vulnerability Management: vulnerability workbench, asset management, scan lifecycle, tags, export jobs, scanners, and networks.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Vulnerabilities ──────────────────────────────────────────────────────
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities from the Tenable workbench with optional severity, state, and plugin filters.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum vulnerabilities to return (default: 50, max: 5000)' },
            offset: { type: 'number', description: 'Number of vulnerabilities to skip for pagination (default: 0)' },
            severity: { type: 'string', description: 'Filter by severity: critical, high, medium, low, info (comma-separated for multiple)' },
            state: { type: 'string', description: 'Filter by state: open, reopened, fixed (default: open,reopened)' },
            plugin_id: { type: 'number', description: 'Filter to a specific vulnerability plugin ID' },
          },
        },
      },
      {
        name: 'get_vulnerability_info',
        description: 'Get full details of a specific vulnerability plugin from the Tenable workbench, including CVEs, CVSS score, and solution.',
        inputSchema: {
          type: 'object',
          properties: {
            plugin_id: { type: 'number', description: 'Tenable vulnerability plugin ID' },
          },
          required: ['plugin_id'],
        },
      },
      // ── Assets ───────────────────────────────────────────────────────────────
      {
        name: 'list_assets',
        description: 'List assets in the Tenable workbench with optional filters for source, network, and last seen time.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum assets to return (default: 50, max: 5000)' },
            offset: { type: 'number', description: 'Number of assets to skip for pagination (default: 0)' },
            filter_type: { type: 'string', description: 'Combine filters with and or or (default: and)' },
            network_id: { type: 'string', description: 'Filter assets by network UUID' },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get full details of a specific Tenable asset by UUID, including hostnames, IP addresses, OS, and agent status.',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: { type: 'string', description: 'Asset UUID' },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'get_asset_vulnerabilities',
        description: 'List all vulnerabilities associated with a specific Tenable asset, with severity and state details.',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: { type: 'string', description: 'Asset UUID' },
            limit: { type: 'number', description: 'Maximum vulnerabilities to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'delete_asset',
        description: 'Delete a Tenable asset record by UUID. This removes the asset from the workbench — use with caution.',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: { type: 'string', description: 'Asset UUID to delete' },
          },
          required: ['asset_id'],
        },
      },
      // ── Scans ────────────────────────────────────────────────────────────────
      {
        name: 'list_scans',
        description: 'List configured Tenable scans with their current status, schedule, and last run time.',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'number', description: 'Filter scans by folder ID (optional)' },
          },
        },
      },
      {
        name: 'get_scan',
        description: 'Get details of a specific Tenable scan including configuration, targets, and last run results.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_id: { type: 'string', description: 'Scan ID' },
            history_id: { type: 'string', description: 'Optional history ID for a specific past run' },
          },
          required: ['scan_id'],
        },
      },
      {
        name: 'launch_scan',
        description: 'Launch an existing Tenable scan immediately. Returns a scan_uuid to track the run.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_id: { type: 'string', description: 'Scan ID to launch' },
            alt_targets: { type: 'array', items: { type: 'string' }, description: 'Optional list of IP addresses or hostnames to override the scan target list' },
          },
          required: ['scan_id'],
        },
      },
      {
        name: 'stop_scan',
        description: 'Stop a currently running Tenable scan.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_id: { type: 'string', description: 'Scan ID to stop' },
          },
          required: ['scan_id'],
        },
      },
      {
        name: 'get_scan_history',
        description: 'Get the run history of a Tenable scan, listing past executions with status and timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_id: { type: 'string', description: 'Scan ID' },
            limit: { type: 'number', description: 'Maximum history entries to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['scan_id'],
        },
      },
      // ── Policies and Scanners ────────────────────────────────────────────────
      {
        name: 'list_scan_policies',
        description: 'List scan policies (scan templates/configurations) available in the Tenable account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_scanners',
        description: 'List scanners registered to the Tenable account, including cloud scanners and managed on-premise scanners.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Tags ─────────────────────────────────────────────────────────────────
      {
        name: 'list_tags',
        description: 'List tag categories defined in Tenable for asset classification.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum tags to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'list_tag_values',
        description: 'List all values defined under a specific Tenable tag category.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_category_uuid: { type: 'string', description: 'Tag category UUID' },
            limit: { type: 'number', description: 'Maximum values to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['tag_category_uuid'],
        },
      },
      // ── Bulk Export ──────────────────────────────────────────────────────────
      {
        name: 'export_vulnerabilities',
        description: 'Start an async bulk vulnerability export job from Tenable. Returns an export_uuid; poll get_export_status, then download chunks with download_export_chunk.',
        inputSchema: {
          type: 'object',
          properties: {
            chunk_size: { type: 'number', description: 'Records per export chunk (default: 1000, max: 5000)' },
            filters: {
              type: 'object',
              description: 'Export filters object (e.g. {"severity": ["critical","high"], "state": ["open"]}) — see Tenable export API docs',
            },
          },
        },
      },
      {
        name: 'get_export_status',
        description: 'Check the status of a Tenable bulk export job. Returns status (QUEUED, PROCESSING, FINISHED, CANCELLED) and list of ready chunk IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            export_uuid: { type: 'string', description: 'Export job UUID returned by export_vulnerabilities' },
          },
          required: ['export_uuid'],
        },
      },
      {
        name: 'download_export_chunk',
        description: 'Download a specific chunk from a finished Tenable bulk export job.',
        inputSchema: {
          type: 'object',
          properties: {
            export_uuid: { type: 'string', description: 'Export job UUID' },
            chunk_id: { type: 'number', description: 'Chunk ID from get_export_status response' },
          },
          required: ['export_uuid', 'chunk_id'],
        },
      },
      // ── Networks ─────────────────────────────────────────────────────────────
      {
        name: 'list_networks',
        description: 'List networks defined in Tenable, used to segment scanners and assets by network boundary.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum networks to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'get_vulnerability_info':
          return await this.getVulnerabilityInfo(args);
        case 'list_assets':
          return await this.listAssets(args);
        case 'get_asset':
          return await this.getAsset(args);
        case 'get_asset_vulnerabilities':
          return await this.getAssetVulnerabilities(args);
        case 'delete_asset':
          return await this.deleteAsset(args);
        case 'list_scans':
          return await this.listScans(args);
        case 'get_scan':
          return await this.getScan(args);
        case 'launch_scan':
          return await this.launchScan(args);
        case 'stop_scan':
          return await this.stopScan(args);
        case 'get_scan_history':
          return await this.getScanHistory(args);
        case 'list_scan_policies':
          return await this.listScanPolicies();
        case 'list_scanners':
          return await this.listScanners();
        case 'list_tags':
          return await this.listTags(args);
        case 'list_tag_values':
          return await this.listTagValues(args);
        case 'export_vulnerabilities':
          return await this.exportVulnerabilities(args);
        case 'get_export_status':
          return await this.getExportStatus(args);
        case 'download_export_chunk':
          return await this.downloadExportChunk(args);
        case 'list_networks':
          return await this.listNetworks(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      'X-ApiKeys': this.apiKeys,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Non-JSON response (HTTP ${response.status})` }], isError: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Non-JSON response (HTTP ${response.status})` }], isError: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, status: response.status }) }], isError: false };
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.severity) params.set('filter.0.quality', 'eq');
    if (args.state) params.set('state', args.state as string);
    if (args.plugin_id) params.set('plugin.id', String(args.plugin_id));
    return this.apiGet(`/workbenches/vulnerabilities?${params}`);
  }

  private async getVulnerabilityInfo(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/workbenches/vulnerabilities/${encodeURIComponent(String(args.plugin_id))}/info`);
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.network_id) params.set('network_id', args.network_id as string);
    if (args.filter_type) params.set('filter.type', args.filter_type as string);
    return this.apiGet(`/workbenches/assets?${params}`);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/workbenches/assets/${encodeURIComponent(args.asset_id as string)}/info`);
  }

  private async getAssetVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    return this.apiGet(`/workbenches/assets/${encodeURIComponent(args.asset_id as string)}/vulnerabilities?${params}`);
  }

  private async deleteAsset(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiDelete(`/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async listScans(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.folder_id) params.set('folder_id', String(args.folder_id));
    const query = params.toString() ? `?${params}` : '';
    return this.apiGet(`/scans${query}`);
  }

  private async getScan(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.history_id) params.set('history_id', args.history_id as string);
    const query = params.toString() ? `?${params}` : '';
    return this.apiGet(`/scans/${encodeURIComponent(args.scan_id as string)}${query}`);
  }

  private async launchScan(args: Record<string, unknown>): Promise<ToolResult> {
    const altTargets = args.alt_targets as string[] | undefined;
    const body = altTargets && altTargets.length > 0 ? { alt_targets: altTargets } : {};
    return this.apiPost(`/scans/${encodeURIComponent(args.scan_id as string)}/launch`, body);
  }

  private async stopScan(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiPost(`/scans/${encodeURIComponent(args.scan_id as string)}/stop`, {});
  }

  private async getScanHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    });
    return this.apiGet(`/scans/${encodeURIComponent(args.scan_id as string)}/history?${params}`);
  }

  private async listScanPolicies(): Promise<ToolResult> {
    return this.apiGet('/policies');
  }

  private async listScanners(): Promise<ToolResult> {
    return this.apiGet('/scanners');
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    return this.apiGet(`/tags/categories?${params}`);
  }

  private async listTagValues(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    return this.apiGet(`/tags/categories/${encodeURIComponent(args.tag_category_uuid as string)}/values?${params}`);
  }

  private async exportVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiPost('/vulns/export', {
      num_assets: (args.chunk_size as number) ?? 1000,
      filters: args.filters ?? {},
    });
  }

  private async getExportStatus(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/vulns/export/${encodeURIComponent(args.export_uuid as string)}/status`);
  }

  private async downloadExportChunk(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/vulns/export/${encodeURIComponent(args.export_uuid as string)}/chunks/${encodeURIComponent(String(args.chunk_id))}`);
  }

  private async listNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    return this.apiGet(`/networks?${params}`);
  }
}
