/**
 * Rapid7 InsightVM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03 — no official Rapid7 InsightVM MCP server exists on GitHub.
// No official Rapid7 MCP server was found for InsightVM/Nexpose on GitHub or npm as of March 2026.
//
// Base URL: https://{host}:{port}/api/3  (self-hosted InsightVM console, default port 3780)
// Auth: HTTP Basic — username:password per local console user account (global administrator recommended)
// Docs: https://help.rapid7.com/insightvm/en-us/api/index.html
// Rate limits: Not publicly documented; InsightVM is self-hosted, limits depend on instance configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Rapid7Config {
  host: string;
  username: string;
  password: string;
  port?: number;
}

export class Rapid7MCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: Rapid7Config) {
    super();
    const port = config.port ?? 3780;
    this.baseUrl = `https://${config.host}:${port}/api/3`;
    this.authHeader = `Basic ${btoa(`${config.username}:${config.password}`)}`;
  }

  static catalog() {
    return {
      name: 'rapid7',
      displayName: 'Rapid7 InsightVM',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: ['rapid7', 'insightvm', 'nexpose', 'vulnerability', 'vulnerability management', 'asset', 'scan', 'site', 'risk', 'remediation', 'cve', 'patch', 'compliance'],
      toolNames: [
        'list_vulnerabilities', 'get_vulnerability', 'get_vulnerability_solutions',
        'list_assets', 'get_asset', 'get_asset_vulnerabilities', 'search_assets',
        'list_scans', 'get_scan', 'start_scan',
        'list_sites', 'get_site',
        'list_reports', 'get_report',
        'list_asset_groups', 'get_asset_group',
        'list_tags', 'get_tag',
      ],
      description: 'Vulnerability management with Rapid7 InsightVM: scan assets, query vulnerabilities and CVEs, review remediation solutions, manage sites and reports.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities from the InsightVM vulnerability database with optional pagination and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size, number of vulnerabilities per page (default: 50, max: 500)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. "severity,DESC" or "cvssScore,DESC")',
            },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get full details for a specific vulnerability by ID, including CVSS score, description, and references',
        inputSchema: {
          type: 'object',
          properties: {
            vulnerability_id: {
              type: 'string',
              description: 'The vulnerability ID (e.g. "cve-2021-44228" for Log4Shell)',
            },
          },
          required: ['vulnerability_id'],
        },
      },
      {
        name: 'get_vulnerability_solutions',
        description: 'Get remediation solutions for a specific vulnerability, including patches, workarounds, and configuration changes',
        inputSchema: {
          type: 'object',
          properties: {
            vulnerability_id: {
              type: 'string',
              description: 'The vulnerability ID to get remediation solutions for',
            },
          },
          required: ['vulnerability_id'],
        },
      },
      {
        name: 'list_assets',
        description: 'List all assets (hosts) tracked in InsightVM with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. "riskScore,DESC" or "ip,ASC")',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get full details for a specific asset by ID, including OS, IP, hostname, and risk score',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'The asset (host) ID',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'get_asset_vulnerabilities',
        description: 'List all vulnerabilities found on a specific asset with severity and status details',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'The asset ID to get vulnerabilities for',
            },
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'search_assets',
        description: 'Search for assets using InsightVM filter criteria such as IP range, OS, hostname, or risk score',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter objects: [{ "field": "ip-address", "operator": "in-range", "lower": "10.0.0.1", "upper": "10.0.0.255" }]',
            },
            match: {
              type: 'string',
              description: 'How to combine filters: "all" (AND) or "any" (OR, default: all)',
            },
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
          },
          required: ['filters'],
        },
      },
      {
        name: 'list_scans',
        description: 'List all scans in the InsightVM console with status, start time, and site information',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
            active: {
              type: 'boolean',
              description: 'If true, return only currently active (running) scans',
            },
          },
        },
      },
      {
        name: 'get_scan',
        description: 'Get details for a specific scan by ID, including status, duration, and assets scanned',
        inputSchema: {
          type: 'object',
          properties: {
            scan_id: {
              type: 'string',
              description: 'The scan ID',
            },
          },
          required: ['scan_id'],
        },
      },
      {
        name: 'start_scan',
        description: 'Start a new scan for a specific site using its configured scan template',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'The site ID to scan',
            },
            scan_template_id: {
              type: 'string',
              description: 'Scan template ID to use (optional, defaults to site default template)',
            },
            name: {
              type: 'string',
              description: 'Optional name for this scan run',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_sites',
        description: 'List all InsightVM sites (logical groupings of assets for scanning) with name and asset count',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Get details for a specific site by ID, including scan targets, credentials, and last scan time',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'The site ID',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_reports',
        description: 'List all configured reports in InsightVM with name, format, and last generated time',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
          },
        },
      },
      {
        name: 'get_report',
        description: 'Get details for a specific report configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The report ID',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_asset_groups',
        description: 'List all asset groups in InsightVM with name, type (static/dynamic), and asset count',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
            type: {
              type: 'string',
              description: 'Filter by group type: "static" or "dynamic"',
            },
          },
        },
      },
      {
        name: 'get_asset_group',
        description: 'Get details for a specific asset group by ID, including member assets and search criteria',
        inputSchema: {
          type: 'object',
          properties: {
            asset_group_id: {
              type: 'string',
              description: 'The asset group ID',
            },
          },
          required: ['asset_group_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags in InsightVM used for categorizing and filtering assets',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Page size (default: 50, max: 500)',
            },
            type: {
              type: 'string',
              description: 'Filter by tag type: "custom", "location", "owner", "criticality"',
            },
          },
        },
      },
      {
        name: 'get_tag',
        description: 'Get details for a specific tag by ID, including associated assets',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: {
              type: 'string',
              description: 'The tag ID',
            },
          },
          required: ['tag_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'get_vulnerability':
          return await this.getVulnerability(args);
        case 'get_vulnerability_solutions':
          return await this.getVulnerabilitySolutions(args);
        case 'list_assets':
          return await this.listAssets(args);
        case 'get_asset':
          return await this.getAsset(args);
        case 'get_asset_vulnerabilities':
          return await this.getAssetVulnerabilities(args);
        case 'search_assets':
          return await this.searchAssets(args);
        case 'list_scans':
          return await this.listScans(args);
        case 'get_scan':
          return await this.getScan(args);
        case 'start_scan':
          return await this.startScan(args);
        case 'list_sites':
          return await this.listSites(args);
        case 'get_site':
          return await this.getSite(args);
        case 'list_reports':
          return await this.listReports(args);
        case 'get_report':
          return await this.getReport(args);
        case 'list_asset_groups':
          return await this.listAssetGroups(args);
        case 'get_asset_group':
          return await this.getAssetGroup(args);
        case 'list_tags':
          return await this.listTags(args);
        case 'get_tag':
          return await this.getTag(args);
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

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const sort = (args.sort as string) ?? 'severity,DESC';
    const url = new URL(`${this.baseUrl}/vulnerabilities`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    url.searchParams.set('sort', sort);
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list vulnerabilities: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const vulnId = args.vulnerability_id as string;
    if (!vulnId) return { content: [{ type: 'text', text: 'vulnerability_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/vulnerabilities/${encodeURIComponent(vulnId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get vulnerability: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getVulnerabilitySolutions(args: Record<string, unknown>): Promise<ToolResult> {
    const vulnId = args.vulnerability_id as string;
    if (!vulnId) return { content: [{ type: 'text', text: 'vulnerability_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/vulnerabilities/${encodeURIComponent(vulnId)}/solutions`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get vulnerability solutions: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/assets`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    if (args.sort) url.searchParams.set('sort', args.sort as string);
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list assets: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.asset_id as string;
    if (!assetId) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/assets/${encodeURIComponent(assetId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get asset: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAssetVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.asset_id as string;
    if (!assetId) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/assets/${encodeURIComponent(assetId)}/vulnerabilities`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get asset vulnerabilities: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async searchAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const filters = args.filters;
    if (!filters) return { content: [{ type: 'text', text: 'filters is required' }], isError: true };
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/assets/search`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    const body = {
      filters,
      match: (args.match as string) ?? 'all',
    };
    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search assets: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listScans(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/scans`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    if (args.active !== undefined) url.searchParams.set('active', String(args.active));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list scans: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getScan(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scan_id as string;
    if (!scanId) return { content: [{ type: 'text', text: 'scan_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/scans/${encodeURIComponent(scanId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get scan: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async startScan(args: Record<string, unknown>): Promise<ToolResult> {
    const siteId = args.site_id as string;
    if (!siteId) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.scan_template_id) body.templateId = args.scan_template_id;
    if (args.name) body.name = args.name;
    const response = await this.fetchWithRetry(`${this.baseUrl}/sites/${encodeURIComponent(siteId)}/scans`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to start scan: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSites(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/sites`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list sites: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    const siteId = args.site_id as string;
    if (!siteId) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/sites/${encodeURIComponent(siteId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get site: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/reports`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list reports: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    const reportId = args.report_id as string;
    if (!reportId) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/reports/${encodeURIComponent(reportId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get report: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAssetGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/asset_groups`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    if (args.type) url.searchParams.set('type', args.type as string);
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list asset groups: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAssetGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.asset_group_id as string;
    if (!id) return { content: [{ type: 'text', text: 'asset_group_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/asset_groups/${encodeURIComponent(id)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get asset group: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const page = (args.page as number) ?? 0;
    const size = (args.size as number) ?? 50;
    const url = new URL(`${this.baseUrl}/tags`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(size));
    if (args.type) url.searchParams.set('type', args.type as string);
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list tags: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getTag(args: Record<string, unknown>): Promise<ToolResult> {
    const tagId = args.tag_id as string;
    if (!tagId) return { content: [{ type: 'text', text: 'tag_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/tags/${encodeURIComponent(tagId)}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get tag: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
