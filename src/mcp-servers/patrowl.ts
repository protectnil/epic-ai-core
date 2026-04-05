/**
 * Patrowl MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: configurable (self-hosted Patrowl engine; default http://patrowl.local)
// Auth: None specified in spec — engines use local network access control
// Docs: https://github.com/Patrowl/PatrowlDocs
// Patrowl is a self-hosted security assessment platform with multiple scan engines:
//   nmap, ssllabs, arachni, owl_dns, virustotal, urlvoid, cortex, owl_leaks, owl_code, sslscan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PatrowlConfig {
  /** Base URL of the Patrowl engine (default: http://patrowl.local) */
  baseUrl?: string;
  /** Optional API key for engines that require authentication */
  apiKey?: string;
}

export class PatrowlMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: PatrowlConfig) {
    super();
    this.baseUrl = (config.baseUrl || 'http://patrowl.local').replace(/\/$/, '');
    this.apiKey = config.apiKey || '';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_engine_info',
        description: 'Get information about the Patrowl scan engine including version, status, and supported scan types.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'start_scan',
        description: 'Start a new security scan on a Patrowl engine. Submits assets and options to the engine and returns a scan ID.',
        inputSchema: {
          type: 'object',
          properties: {
            assets: {
              type: 'array',
              description: 'Array of asset objects to scan. Each asset should have id, value, criticity, and datatype fields.',
            },
            options: {
              type: 'object',
              description: 'Scan options specific to the engine (e.g., ports, intensity, timeout)',
            },
            scan_id: {
              type: 'number',
              description: 'Optional scan ID to assign to this scan',
            },
          },
          required: ['assets'],
        },
      },
      {
        name: 'get_scan_status',
        description: 'Get the current status of a running or completed Patrowl scan by scan ID.',
        inputSchema: {
          type: 'object',
          properties: {
            scanId: {
              type: 'number',
              description: 'Numeric ID of the scan to check status for',
            },
          },
          required: ['scanId'],
        },
      },
      {
        name: 'get_scan_findings',
        description: 'Get security findings and vulnerabilities from a completed Patrowl scan by scan ID.',
        inputSchema: {
          type: 'object',
          properties: {
            scanId: {
              type: 'number',
              description: 'Numeric ID of the completed scan to retrieve findings for',
            },
          },
          required: ['scanId'],
        },
      },
      {
        name: 'stop_scan',
        description: 'Stop a running Patrowl scan by scan ID.',
        inputSchema: {
          type: 'object',
          properties: {
            scanId: {
              type: 'number',
              description: 'Numeric ID of the scan to stop',
            },
          },
          required: ['scanId'],
        },
      },
      {
        name: 'stop_all_scans',
        description: 'Stop all currently running scans on the Patrowl engine.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'clean_scan',
        description: 'Clean up scan data for a specific scan ID from the Patrowl engine.',
        inputSchema: {
          type: 'object',
          properties: {
            scanId: {
              type: 'number',
              description: 'Numeric ID of the scan to clean',
            },
          },
          required: ['scanId'],
        },
      },
      {
        name: 'clean_all_scans',
        description: 'Clean all scan data from the Patrowl engine.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'reload_config',
        description: 'Reload the Patrowl engine configuration without restarting the service.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'test_engine',
        description: 'Run a connectivity and health test on the Patrowl engine to verify it is operational.',
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
        case 'get_engine_info':
          return await this.getEngineInfo();
        case 'start_scan':
          return await this.startScan(args);
        case 'get_scan_status':
          return await this.getScanStatus(args);
        case 'get_scan_findings':
          return await this.getScanFindings(args);
        case 'stop_scan':
          return await this.stopScan(args);
        case 'stop_all_scans':
          return await this.stopAllScans();
        case 'clean_scan':
          return await this.cleanScan(args);
        case 'clean_all_scans':
          return await this.cleanAllScans();
        case 'reload_config':
          return await this.reloadConfig();
        case 'test_engine':
          return await this.testEngine();
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    return headers;
  }

  private async apiFetch(path: string, method: string = 'GET', body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders();
    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(url, init);

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Patrowl API error HTTP ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Patrowl returned non-JSON response (HTTP ${response.status})`); }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getEngineInfo(): Promise<ToolResult> {
    return this.apiFetch('/info');
  }

  private async startScan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.assets) return { content: [{ type: 'text', text: 'assets is required' }], isError: true };
    const body: Record<string, unknown> = { assets: args.assets };
    if (args.options) body.options = args.options;
    if (args.scan_id !== undefined) body.scan_id = args.scan_id;
    return this.apiFetch('/startscan', 'POST', body);
  }

  private async getScanStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scanId as number;
    if (scanId === undefined || scanId === null) return { content: [{ type: 'text', text: 'scanId is required' }], isError: true };
    return this.apiFetch(`/status/${encodeURIComponent(String(scanId))}`);
  }

  private async getScanFindings(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scanId as number;
    if (scanId === undefined || scanId === null) return { content: [{ type: 'text', text: 'scanId is required' }], isError: true };
    return this.apiFetch(`/getfindings/${encodeURIComponent(String(scanId))}`);
  }

  private async stopScan(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scanId as number;
    if (scanId === undefined || scanId === null) return { content: [{ type: 'text', text: 'scanId is required' }], isError: true };
    return this.apiFetch(`/stop/${encodeURIComponent(String(scanId))}`);
  }

  private async stopAllScans(): Promise<ToolResult> {
    return this.apiFetch('/stopscans');
  }

  private async cleanScan(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scanId as number;
    if (scanId === undefined || scanId === null) return { content: [{ type: 'text', text: 'scanId is required' }], isError: true };
    return this.apiFetch(`/clean/${encodeURIComponent(String(scanId))}`);
  }

  private async cleanAllScans(): Promise<ToolResult> {
    return this.apiFetch('/clean');
  }

  private async reloadConfig(): Promise<ToolResult> {
    return this.apiFetch('/reloadconfig');
  }

  private async testEngine(): Promise<ToolResult> {
    return this.apiFetch('/test');
  }

  static catalog() {
    return {
      name: 'patrowl',
      displayName: 'Patrowl',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['patrowl', 'cybersecurity', 'security', 'scanning', 'vulnerability', 'pentest'],
      toolNames: [
        'get_engine_info',
        'start_scan',
        'get_scan_status',
        'get_scan_findings',
        'stop_scan',
        'stop_all_scans',
        'clean_scan',
        'clean_all_scans',
        'reload_config',
        'test_engine',
      ],
      description: 'Patrowl security scan engine adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
