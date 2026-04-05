/**
 * Mandiant MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 (google/mcp-security provides GTI MCP at github.com/google/mcp-security,
//   transport: stdio, auth: VirusTotal API key — but this targets the Google Threat Intelligence API, not the legacy
//   MATI v4 API. It is not a Mandiant MCP server and does not cover the same endpoints. MCP tool count: ~20+ tools
//   across files, domains, IPs, URLs, collections, threat profiles, and intelligence search — but uses GTI/VirusTotal
//   object model, not Mandiant v4 object model. Not a direct substitute for MATI v4.)
// Our adapter covers: 12 tools. Vendor MCP (GTI): ~20+ tools but different API surface (GTI, not MATI v4).
// Recommendation: use-rest-api — GTI MCP is a different product/API; our adapter targets the MATI v4 endpoint
//   for existing Mandiant customers. No official Mandiant MATI MCP server exists as of 2026-03-28.
// Note: Mandiant Advantage Threat Intelligence has been migrated to Google Threat Intelligence (GTI). The MATI API v4
//   (api.intelligence.mandiant.com) remains accessible for existing customers. New customers should use the GTI API.
//
// Base URL: https://api.intelligence.mandiant.com/v4
// Auth: OAuth2 client_credentials — POST /token with Authorization: Basic base64(clientId:clientSecret) header
//       and grant_type=client_credentials in the form body. Bearer token is short-lived (~1 hour).
//       Adapter caches and refreshes automatically. Set X-App-Name header on all requests.
// Docs: https://docs.mandiant.com/home/mati-threat-intelligence-api-v4
// Rate limits: Not publicly documented; varies by subscription tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MandiantConfig {
  /** OAuth2 client ID from the Mandiant Advantage portal. */
  clientId: string;
  /** OAuth2 client secret from the Mandiant Advantage portal. */
  clientSecret: string;
  /** Application name sent in the X-App-Name header (identifies your integration). */
  appName: string;
  /** API base URL including version path. Default: https://api.intelligence.mandiant.com/v4 */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.intelligence.mandiant.com/v4';

export class MandiantMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly appName: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: MandiantConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.appName = config.appName;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    // Token URL: strip versioned path, append /token
    const base = this.baseUrl.replace(/\/v\d+\/?$/, '');
    this.tokenUrl = `${base}/token`;
  }

  static catalog() {
    return {
      name: 'mandiant',
      displayName: 'Mandiant',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: ['mandiant', 'threat-intelligence', 'ioc', 'indicator', 'apt', 'threat-actor', 'malware', 'vulnerability', 'cve', 'campaign', 'report', 'intel', 'google-threat-intelligence'],
      toolNames: [
        'list_indicators', 'get_indicator',
        'list_threat_actors', 'get_threat_actor',
        'list_malware', 'get_malware',
        'list_vulnerabilities', 'get_vulnerability',
        'list_campaigns', 'get_campaign',
        'search_reports', 'get_report',
      ],
      description: 'Mandiant Threat Intelligence (MATI v4): query indicators of compromise, threat actors, malware families, vulnerabilities, campaigns, and intelligence reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Indicators ─────────────────────────────────────────────────────────
      {
        name: 'list_indicators',
        description: 'List threat indicators (IPs, domains, URLs, file hashes) from Mandiant with optional type and score filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of indicators to return (default: 50, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            indicator_type: { type: 'string', description: 'Filter by indicator type: ipv4, ipv6, fqdn, url, md5, sha1, sha256' },
            min_mscore: { type: 'number', description: 'Minimum Mandiant threat score (0–100) to include (default: 0)' },
            last_updated: { type: 'string', description: 'Return indicators updated after this ISO 8601 date (e.g. 2026-01-01T00:00:00.000Z)' },
          },
        },
      },
      {
        name: 'get_indicator',
        description: 'Get detailed threat intelligence for a specific indicator value (IP, domain, URL, or hash)',
        inputSchema: {
          type: 'object',
          properties: {
            indicator_value: { type: 'string', description: 'The indicator value to look up (e.g. 1.2.3.4, evil.com, abc123...hash)' },
          },
          required: ['indicator_value'],
        },
      },
      // ── Threat Actors ──────────────────────────────────────────────────────
      {
        name: 'list_threat_actors',
        description: 'List threat actor profiles in Mandiant with optional pagination and keyword filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of threat actors to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            last_updated: { type: 'string', description: 'Return actors updated after this ISO 8601 date' },
          },
        },
      },
      {
        name: 'get_threat_actor',
        description: 'Get detailed profile for a specific Mandiant threat actor by name or ID (e.g. APT28, UNC3782)',
        inputSchema: {
          type: 'object',
          properties: {
            actor_id: { type: 'string', description: 'Threat actor name or Mandiant ID (e.g. APT28, threat-actor--abc123)' },
          },
          required: ['actor_id'],
        },
      },
      // ── Malware ────────────────────────────────────────────────────────────
      {
        name: 'list_malware',
        description: 'List malware family profiles tracked by Mandiant with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of malware families to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            last_updated: { type: 'string', description: 'Return malware updated after this ISO 8601 date' },
          },
        },
      },
      {
        name: 'get_malware',
        description: 'Get detailed profile for a specific Mandiant malware family by name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            malware_id: { type: 'string', description: 'Malware family name or Mandiant ID (e.g. SUNBURST, malware--abc123)' },
          },
          required: ['malware_id'],
        },
      },
      // ── Vulnerabilities ────────────────────────────────────────────────────
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerability records (CVEs) from Mandiant with optional severity and exploitation filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of vulnerabilities to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            last_updated: { type: 'string', description: 'Return CVEs updated after this ISO 8601 date' },
            exploit_rating: { type: 'string', description: 'Filter by exploitation rating: CONFIRMED, AVAILABLE, UNPROVEN' },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get detailed Mandiant intelligence for a specific vulnerability by CVE ID',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: { type: 'string', description: 'CVE identifier (e.g. CVE-2024-1234)' },
          },
          required: ['cve_id'],
        },
      },
      // ── Campaigns ──────────────────────────────────────────────────────────
      {
        name: 'list_campaigns',
        description: 'List threat campaigns tracked by Mandiant with optional actor and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of campaigns to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            actor_id: { type: 'string', description: 'Filter campaigns associated with a specific threat actor ID' },
            last_updated: { type: 'string', description: 'Return campaigns updated after this ISO 8601 date' },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get detailed profile for a specific Mandiant threat campaign by ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'string', description: 'Mandiant campaign ID (e.g. campaign--abc123)' },
          },
          required: ['campaign_id'],
        },
      },
      // ── Reports ────────────────────────────────────────────────────────────
      {
        name: 'search_reports',
        description: 'Search Mandiant threat intelligence reports by keyword with optional type and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keyword search query for intelligence reports' },
            report_type: { type: 'string', description: 'Filter by report type: campaign, vulnerability, malware, threat-actor, country, industry, network' },
            limit: { type: 'number', description: 'Maximum number of reports to return (default: 25)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            start_date: { type: 'string', description: 'Filter reports published after this ISO 8601 date' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_report',
        description: 'Get full text and metadata of a specific Mandiant intelligence report by report ID',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: { type: 'string', description: 'Mandiant report ID (e.g. 21-00007280)' },
          },
          required: ['report_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_indicators':      return await this.listIndicators(args);
        case 'get_indicator':        return await this.getIndicator(args);
        case 'list_threat_actors':   return await this.listThreatActors(args);
        case 'get_threat_actor':     return await this.getThreatActor(args);
        case 'list_malware':         return await this.listMalware(args);
        case 'get_malware':          return await this.getMalware(args);
        case 'list_vulnerabilities': return await this.listVulnerabilities(args);
        case 'get_vulnerability':    return await this.getVulnerability(args);
        case 'list_campaigns':       return await this.listCampaigns(args);
        case 'get_campaign':         return await this.getCampaign(args);
        case 'search_reports':       return await this.searchReports(args);
        case 'get_report':           return await this.getReport(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }
    const basicCredential = btoa(`${this.clientId}:${this.clientSecret}`);
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicCredential}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-App-Name': this.appName,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Mandiant OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async reqHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-App-Name': this.appName,
    };
  }

  private async request(path: string): Promise<unknown> {
    const h = await this.reqHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: h });
    if (!response.ok) {
      throw new Error(`Mandiant API error: ${response.status} ${response.statusText} — ${path}`);
    }
    return response.json();
  }

  private ok(data: unknown): ToolResult {
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIndicators(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.indicator_type) params.set('type', args.indicator_type as string);
    if (args.min_mscore !== undefined) params.set('minimum_mscore', String(args.min_mscore));
    if (args.last_updated) params.set('last_updated', args.last_updated as string);
    return this.ok(await this.request(`/indicators?${params.toString()}`));
  }

  private async getIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.indicator_value) {
      return { content: [{ type: 'text', text: 'indicator_value is required' }], isError: true };
    }
    return this.ok(await this.request(`/indicator?value=${encodeURIComponent(args.indicator_value as string)}`));
  }

  private async listThreatActors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.last_updated) params.set('last_updated', args.last_updated as string);
    return this.ok(await this.request(`/threat-actors?${params.toString()}`));
  }

  private async getThreatActor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.actor_id) {
      return { content: [{ type: 'text', text: 'actor_id is required' }], isError: true };
    }
    return this.ok(await this.request(`/threat-actors/${encodeURIComponent(args.actor_id as string)}`));
  }

  private async listMalware(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.last_updated) params.set('last_updated', args.last_updated as string);
    return this.ok(await this.request(`/malware?${params.toString()}`));
  }

  private async getMalware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.malware_id) {
      return { content: [{ type: 'text', text: 'malware_id is required' }], isError: true };
    }
    return this.ok(await this.request(`/malware/${encodeURIComponent(args.malware_id as string)}`));
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.last_updated) params.set('last_updated', args.last_updated as string);
    if (args.exploit_rating) params.set('exploitation_rating', args.exploit_rating as string);
    return this.ok(await this.request(`/vulnerability?${params.toString()}`));
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cve_id) {
      return { content: [{ type: 'text', text: 'cve_id is required' }], isError: true };
    }
    return this.ok(await this.request(`/vulnerability/${encodeURIComponent(args.cve_id as string)}`));
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.actor_id) params.set('actor_id', args.actor_id as string);
    if (args.last_updated) params.set('last_updated', args.last_updated as string);
    return this.ok(await this.request(`/campaigns?${params.toString()}`));
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) {
      return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    }
    return this.ok(await this.request(`/campaigns/${encodeURIComponent(args.campaign_id as string)}`));
  }

  private async searchReports(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('query', args.query as string);
    params.set('limit', String((args.limit as number) ?? 25));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.report_type) params.set('report_type', args.report_type as string);
    if (args.start_date) params.set('start_date', args.start_date as string);
    return this.ok(await this.request(`/reports?${params.toString()}`));
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) {
      return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    }
    return this.ok(await this.request(`/reports/${encodeURIComponent(args.report_id as string)}`));
  }
}
