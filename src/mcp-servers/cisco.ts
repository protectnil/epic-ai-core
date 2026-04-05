/**
 * Cisco PSIRT openVuln MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Cisco PSIRT MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 12 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.cisco.com
// Auth: OAuth 2.0 Bearer token via client_credentials grant
//   Token endpoint: https://cloudsso.cisco.com/as/token.oauth2
//   Register app at: https://apiconsole.cisco.com
//   curl: -d "client_id=<id>&client_secret=<secret>&grant_type=client_credentials"
// Docs: https://developer.cisco.com/site/PSIRT/discover/overview
// Rate limits: Not publicly documented; handle 429 responses with backoff

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CiscoConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CiscoMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CiscoConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.cisco.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_all_advisories_cvrf',
        description: 'Get all Cisco security advisories in CVRF (Common Vulnerability Reporting Framework) format. Includes CVE IDs, CVSS scores, affected products, and remediation details.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_advisory_cvrf',
        description: 'Get a specific Cisco security advisory by advisory ID in CVRF format.',
        inputSchema: {
          type: 'object',
          properties: {
            advisory_id: { type: 'string', description: 'Cisco advisory ID (e.g., "cisco-sa-20200226-fpd-dos")' },
          },
          required: ['advisory_id'],
        },
      },
      {
        name: 'get_advisory_by_cve_cvrf',
        description: 'Get Cisco security advisories matching a specific CVE ID in CVRF format.',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: { type: 'string', description: 'CVE identifier (e.g., "CVE-2020-3153")' },
          },
          required: ['cve_id'],
        },
      },
      {
        name: 'get_latest_advisories_cvrf',
        description: 'Get the most recently published Cisco security advisories in CVRF format.',
        inputSchema: {
          type: 'object',
          properties: {
            number: { type: 'number', description: 'Number of latest advisories to retrieve (e.g., 10)' },
          },
          required: ['number'],
        },
      },
      {
        name: 'get_advisories_by_product_cvrf',
        description: 'Get Cisco security advisories affecting a specific product name in CVRF format.',
        inputSchema: {
          type: 'object',
          properties: {
            product: { type: 'string', description: 'Product name search string (e.g., "Cisco IOS XE")' },
          },
          required: ['product'],
        },
      },
      {
        name: 'get_advisories_by_severity_cvrf',
        description: 'Get Cisco security advisories filtered by CVSS severity level in CVRF format.',
        inputSchema: {
          type: 'object',
          properties: {
            severity: { type: 'string', description: 'CVSS severity level: critical, high, medium, or low' },
          },
          required: ['severity'],
        },
      },
      {
        name: 'get_advisories_by_year_cvrf',
        description: 'Get all Cisco security advisories published in a specific year in CVRF format.',
        inputSchema: {
          type: 'object',
          properties: {
            year: { type: 'string', description: 'Four-digit year (e.g., "2023")' },
          },
          required: ['year'],
        },
      },
      {
        name: 'get_all_advisories_oval',
        description: 'Get all Cisco security advisories in OVAL (Open Vulnerability and Assessment Language) format for automated vulnerability assessment tools.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_advisory_oval',
        description: 'Get a specific Cisco security advisory by advisory ID in OVAL format.',
        inputSchema: {
          type: 'object',
          properties: {
            advisory_id: { type: 'string', description: 'Cisco advisory ID' },
          },
          required: ['advisory_id'],
        },
      },
      {
        name: 'get_advisory_by_cve_oval',
        description: 'Get Cisco security advisories matching a specific CVE ID in OVAL format.',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: { type: 'string', description: 'CVE identifier (e.g., "CVE-2020-3153")' },
          },
          required: ['cve_id'],
        },
      },
      {
        name: 'get_ios_advisories',
        description: 'Get all Cisco security advisories that affect a specific IOS software version. Useful for checking if a running IOS version has known vulnerabilities.',
        inputSchema: {
          type: 'object',
          properties: {
            version: { type: 'string', description: 'Cisco IOS version string (e.g., "15.2(4)M5")' },
          },
          required: ['version'],
        },
      },
      {
        name: 'get_iosxe_advisories',
        description: 'Get all Cisco security advisories that affect a specific IOS XE software version.',
        inputSchema: {
          type: 'object',
          properties: {
            version: { type: 'string', description: 'Cisco IOS XE version string (e.g., "16.9.2")' },
          },
          required: ['version'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_all_advisories_cvrf':
          return await this.getAllAdvisoriesCvrf();
        case 'get_advisory_cvrf':
          return await this.getAdvisoryCvrf(args);
        case 'get_advisory_by_cve_cvrf':
          return await this.getAdvisoryByCveCvrf(args);
        case 'get_latest_advisories_cvrf':
          return await this.getLatestAdvisoriesCvrf(args);
        case 'get_advisories_by_product_cvrf':
          return await this.getAdvisoriesByProductCvrf(args);
        case 'get_advisories_by_severity_cvrf':
          return await this.getAdvisoriesBySeverityCvrf(args);
        case 'get_advisories_by_year_cvrf':
          return await this.getAdvisoriesByYearCvrf(args);
        case 'get_all_advisories_oval':
          return await this.getAllAdvisoriesOval();
        case 'get_advisory_oval':
          return await this.getAdvisoryOval(args);
        case 'get_advisory_by_cve_oval':
          return await this.getAdvisoryByCveOval(args);
        case 'get_ios_advisories':
          return await this.getIosAdvisories(args);
        case 'get_iosxe_advisories':
          return await this.getIosXeAdvisories(args);
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

  private async request(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'EpicAI-Cisco-MCP/1.0',
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Cisco API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cisco API returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getAllAdvisoriesCvrf(): Promise<ToolResult> {
    return this.request('/security/advisories/cvrf/all');
  }

  private async getAdvisoryCvrf(args: Record<string, unknown>): Promise<ToolResult> {
    const advisoryId = args.advisory_id as string;
    if (!advisoryId) return { content: [{ type: 'text', text: 'advisory_id is required' }], isError: true };
    return this.request(`/security/advisories/cvrf/advisory/${encodeURIComponent(advisoryId)}`);
  }

  private async getAdvisoryByCveCvrf(args: Record<string, unknown>): Promise<ToolResult> {
    const cveId = args.cve_id as string;
    if (!cveId) return { content: [{ type: 'text', text: 'cve_id is required' }], isError: true };
    return this.request(`/security/advisories/cvrf/cve/${encodeURIComponent(cveId)}`);
  }

  private async getLatestAdvisoriesCvrf(args: Record<string, unknown>): Promise<ToolResult> {
    const number = args.number as number;
    if (!number) return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    return this.request(`/security/advisories/cvrf/latest/${encodeURIComponent(number)}`);
  }

  private async getAdvisoriesByProductCvrf(args: Record<string, unknown>): Promise<ToolResult> {
    const product = args.product as string;
    if (!product) return { content: [{ type: 'text', text: 'product is required' }], isError: true };
    return this.request(`/security/advisories/cvrf/product?product=${encodeURIComponent(product)}`);
  }

  private async getAdvisoriesBySeverityCvrf(args: Record<string, unknown>): Promise<ToolResult> {
    const severity = args.severity as string;
    if (!severity) return { content: [{ type: 'text', text: 'severity is required' }], isError: true };
    return this.request(`/security/advisories/cvrf/severity/${encodeURIComponent(severity)}`);
  }

  private async getAdvisoriesByYearCvrf(args: Record<string, unknown>): Promise<ToolResult> {
    const year = args.year as string;
    if (!year) return { content: [{ type: 'text', text: 'year is required' }], isError: true };
    return this.request(`/security/advisories/cvrf/year/${encodeURIComponent(year)}`);
  }

  private async getAllAdvisoriesOval(): Promise<ToolResult> {
    return this.request('/security/advisories/oval/all');
  }

  private async getAdvisoryOval(args: Record<string, unknown>): Promise<ToolResult> {
    const advisoryId = args.advisory_id as string;
    if (!advisoryId) return { content: [{ type: 'text', text: 'advisory_id is required' }], isError: true };
    return this.request(`/security/advisories/oval/advisory/${encodeURIComponent(advisoryId)}`);
  }

  private async getAdvisoryByCveOval(args: Record<string, unknown>): Promise<ToolResult> {
    const cveId = args.cve_id as string;
    if (!cveId) return { content: [{ type: 'text', text: 'cve_id is required' }], isError: true };
    return this.request(`/security/advisories/oval/cve/${encodeURIComponent(cveId)}`);
  }

  private async getIosAdvisories(args: Record<string, unknown>): Promise<ToolResult> {
    const version = args.version as string;
    if (!version) return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    return this.request(`/security/advisories/ios?version=${encodeURIComponent(version)}`);
  }

  private async getIosXeAdvisories(args: Record<string, unknown>): Promise<ToolResult> {
    const version = args.version as string;
    if (!version) return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    return this.request(`/security/advisories/iosxe?version=${encodeURIComponent(version)}`);
  }

  static catalog() {
    return {
      name: 'cisco',
      displayName: 'Cisco PSIRT openVuln',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['cisco', 'security', 'vulnerability', 'advisory', 'cve', 'cvss', 'psirt', 'ios', 'iosxe'],
      toolNames: ['get_all_advisories_cvrf', 'get_advisory_cvrf', 'get_advisory_by_cve_cvrf', 'get_latest_advisories_cvrf', 'get_advisories_by_product_cvrf', 'get_advisories_by_severity_cvrf', 'get_advisories_by_year_cvrf', 'get_all_advisories_oval', 'get_advisory_oval', 'get_advisory_by_cve_oval', 'get_ios_advisories', 'get_iosxe_advisories'],
      description: 'Cisco PSIRT openVuln adapter for the Epic AI Intelligence Platform — query Cisco security advisories by CVE, product, severity, year, and IOS version',
      author: 'protectnil' as const,
    };
  }
}
