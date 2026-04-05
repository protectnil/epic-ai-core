/**
 * Anomali ThreatStream MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://api.threatstream.com/mcp (vendor-hosted remote endpoint) — transport: streamable-HTTP, auth: Api-Key user:apiKey header
// Anomali publishes an official vendor-hosted MCP server for ThreatStream (confirmed active as of 2026-03).
// Accessed via mcp-remote: args ["mcp-remote", "<endpoint-url>", "--header", "Authorization:${AUTH_HEADER}"]
// Tool count: Not publicly documented (vendor-hosted, no public tool list). Tool surface unknown.
// Our adapter covers: 16 tools (core threat intel operations). Vendor MCP coverage: unknown.
// Recommendation: use-rest-api — vendor MCP tool count/surface unverifiable; our adapter provides curated
// coverage of the primary ThreatStream API v2 operations with verified endpoints. Evaluate vendor MCP
// separately when tool list becomes publicly available.
//
// Base URL: https://api.threatstream.com/api (mixed versioning: indicators at /v2/intelligence/, threat model entities at /v1/{type}/)
// Auth: Authorization header — "apikey {username}:{apiKey}" (credentials never in URL query parameters)
// Docs: https://apidocs.threatstream.com/
// Rate limits: Not publicly documented; recommended to stay under 60 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AnomaliConfig {
  username: string;
  apiKey: string;
  baseUrl?: string;
}

export class AnomaliMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: AnomaliConfig) {
    super();
    this.baseUrl = config.baseUrl || 'https://api.threatstream.com/api';
    this.headers = {
      'Authorization': `apikey ${config.username}:${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Indicators (Observables) ---
      {
        name: 'search_indicators',
        description: 'Search threat indicators (IPs, domains, hashes, URLs, emails) in ThreatStream with optional type, confidence, and severity filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search value (IP address, domain, hash, email, URL, etc.)' },
            type: { type: 'string', description: 'Indicator type: ip, domain, hash_md5, hash_sha1, hash_sha256, email, url' },
            confidence: { type: 'number', description: 'Minimum confidence score (0-100)' },
            severity: { type: 'string', description: 'Filter by severity: low, medium, high, very-high' },
            status: { type: 'string', description: 'Filter by status: active, inactive, falsepos (default: active)' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 50, max: 1000)' },
            offset: { type: 'number', description: 'Number of results to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_indicator',
        description: 'Get full details of a specific ThreatStream threat indicator by its internal ID.',
        inputSchema: {
          type: 'object',
          properties: {
            indicator_id: { type: 'string', description: 'The indicator ID to retrieve' },
          },
          required: ['indicator_id'],
        },
      },
      {
        name: 'create_indicator',
        description: 'Create a new threat indicator in ThreatStream with type, value, confidence, severity, and optional tags.',
        inputSchema: {
          type: 'object',
          properties: {
            objects: {
              type: 'array',
              description: 'Array of indicator objects to create. Each must have: itype (e.g. "mal_ip", "phish_url"), value, confidence (0-100), severity (low/medium/high/very-high). Optional: tags, source.',
              items: { type: 'object' },
            },
          },
          required: ['objects'],
        },
      },
      {
        name: 'update_indicator',
        description: 'Update an existing ThreatStream indicator — change confidence, severity, status, or tags.',
        inputSchema: {
          type: 'object',
          properties: {
            indicator_id: { type: 'string', description: 'The indicator ID to update' },
            confidence: { type: 'number', description: 'Updated confidence score (0-100)' },
            severity: { type: 'string', description: 'Updated severity: low, medium, high, or very-high' },
            status: { type: 'string', description: 'Updated status: active, inactive, or falsepos' },
            tags: { type: 'array', description: 'Updated tags array (replaces existing tags)', items: { type: 'string' } },
          },
          required: ['indicator_id'],
        },
      },
      // --- Threat Bulletins ---
      {
        name: 'list_threat_bulletins',
        description: 'List ThreatStream threat intelligence bulletins and reports with optional tag and status filters.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by bulletin status: published, draft, review' },
            tag: { type: 'string', description: 'Filter by bulletin tag name' },
            is_public: { type: 'boolean', description: 'Filter by visibility: true for public, false for private' },
            limit: { type: 'number', description: 'Maximum number of bulletins to return (default: 50)' },
            offset: { type: 'number', description: 'Number of bulletins to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_threat_bulletin',
        description: 'Get full details of a specific ThreatStream threat bulletin by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            bulletin_id: { type: 'string', description: 'The threat bulletin ID to retrieve' },
          },
          required: ['bulletin_id'],
        },
      },
      // --- Threat Actors ---
      {
        name: 'search_actors',
        description: 'Search for threat actors and adversary groups in ThreatStream by name or keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for actor name or alias' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            offset: { type: 'number', description: 'Number of results to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_actor',
        description: 'Get full details of a specific threat actor by their ThreatStream ID including TTPs, targets, and associated indicators.',
        inputSchema: {
          type: 'object',
          properties: {
            actor_id: { type: 'string', description: 'The threat actor ID to retrieve' },
          },
          required: ['actor_id'],
        },
      },
      // --- Campaigns ---
      {
        name: 'list_campaigns',
        description: 'List threat campaigns tracked in ThreatStream with optional name search and date filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query to filter campaigns by name' },
            limit: { type: 'number', description: 'Maximum number of campaigns to return (default: 50)' },
            offset: { type: 'number', description: 'Number of campaigns to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get full details of a specific threat campaign by its ThreatStream ID including associated indicators and actors.',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'string', description: 'The campaign ID to retrieve' },
          },
          required: ['campaign_id'],
        },
      },
      // --- Vulnerabilities ---
      {
        name: 'search_vulnerabilities',
        description: 'Search ThreatStream for vulnerability intelligence by CVE ID or keyword with optional severity filter.',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: { type: 'string', description: 'CVE ID to search for (e.g. CVE-2024-1234)' },
            query: { type: 'string', description: 'Keyword search for vulnerability name or description' },
            severity: { type: 'string', description: 'Filter by severity: low, medium, high, very-high' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
            offset: { type: 'number', description: 'Number of results to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get full ThreatStream intelligence details for a vulnerability by its CVE ID.',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: { type: 'string', description: 'CVE ID (e.g. CVE-2024-1234)' },
          },
          required: ['cve_id'],
        },
      },
      // --- Intelligence Sources ---
      {
        name: 'list_intelligence_sources',
        description: 'List available threat intelligence feed sources configured in ThreatStream with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of sources to return (default: 50)' },
            offset: { type: 'number', description: 'Number of sources to skip for pagination (default: 0)' },
          },
        },
      },
      // --- Tags ---
      {
        name: 'list_tags',
        description: 'List all tags used in ThreatStream for classifying intelligence objects.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query to filter tags by name' },
            limit: { type: 'number', description: 'Maximum number of tags to return (default: 100)' },
            offset: { type: 'number', description: 'Number of tags to skip for pagination (default: 0)' },
          },
        },
      },
      // --- Investigations / Incidents ---
      {
        name: 'list_incidents',
        description: 'List ThreatStream incidents and investigations with optional status and date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by incident status: open, closed, in-progress' },
            limit: { type: 'number', description: 'Maximum number of incidents to return (default: 50)' },
            offset: { type: 'number', description: 'Number of incidents to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Get full details of a specific ThreatStream incident by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The incident ID to retrieve' },
          },
          required: ['incident_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_indicators': return await this.searchIndicators(args);
        case 'get_indicator': return await this.getIndicator(args);
        case 'create_indicator': return await this.createIndicator(args);
        case 'update_indicator': return await this.updateIndicator(args);
        case 'list_threat_bulletins': return await this.listThreatBulletins(args);
        case 'get_threat_bulletin': return await this.getThreatBulletin(args);
        case 'search_actors': return await this.searchActors(args);
        case 'get_actor': return await this.getActor(args);
        case 'list_campaigns': return await this.listCampaigns(args);
        case 'get_campaign': return await this.getCampaign(args);
        case 'search_vulnerabilities': return await this.searchVulnerabilities(args);
        case 'get_vulnerability': return await this.getVulnerability(args);
        case 'list_intelligence_sources': return await this.listIntelligenceSources(args);
        case 'list_tags': return await this.listTags(args);
        case 'list_incidents': return await this.listIncidents(args);
        case 'get_incident': return await this.getIncident(args);
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

  private async searchIndicators(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 50));
    params.append('offset', String(args.offset ?? 0));
    if (args.type) params.append('type', String(args.type));
    if (args.confidence !== undefined) params.append('confidence__gte', String(args.confidence));
    if (args.severity) params.append('meta.severity', String(args.severity));
    if (args.status) params.append('status', String(args.status));
    if (args.query) params.append('value__icontains', String(args.query));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/intelligence/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.indicator_id as string;
    if (!id) return { content: [{ type: 'text', text: 'indicator_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/intelligence/${encodeURIComponent(id)}/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const objects = args.objects as unknown[];
    if (!objects || !Array.isArray(objects) || objects.length === 0) {
      return { content: [{ type: 'text', text: 'objects array is required and must be non-empty' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/intelligence/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ objects }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.indicator_id as string;
    if (!id) return { content: [{ type: 'text', text: 'indicator_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.confidence !== undefined) body.confidence = args.confidence;
    if (args.severity) body.meta = { severity: args.severity };
    if (args.status) body.status = args.status;
    if (args.tags) body.tags = args.tags;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/intelligence/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listThreatBulletins(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 50));
    params.append('offset', String(args.offset ?? 0));
    if (args.status) params.append('status', String(args.status));
    if (args.tag) params.append('tags__name', String(args.tag));
    if (args.is_public !== undefined) params.append('is_public', String(args.is_public));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/tipreport/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getThreatBulletin(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.bulletin_id as string;
    if (!id) return { content: [{ type: 'text', text: 'bulletin_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/tipreport/${encodeURIComponent(id)}/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchActors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 50));
    params.append('offset', String(args.offset ?? 0));
    if (args.query) params.append('name__icontains', String(args.query));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/actor/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getActor(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.actor_id as string;
    if (!id) return { content: [{ type: 'text', text: 'actor_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/actor/${encodeURIComponent(id)}/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 50));
    params.append('offset', String(args.offset ?? 0));
    if (args.query) params.append('name__icontains', String(args.query));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/campaign/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.campaign_id as string;
    if (!id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/campaign/${encodeURIComponent(id)}/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 50));
    params.append('offset', String(args.offset ?? 0));
    if (args.cve_id) params.append('cve_id', String(args.cve_id));
    if (args.query) params.append('name__icontains', String(args.query));
    if (args.severity) params.append('meta.severity', String(args.severity));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/vulnerability/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const cveId = args.cve_id as string;
    if (!cveId) return { content: [{ type: 'text', text: 'cve_id is required' }], isError: true };
    const params = new URLSearchParams();
    params.append('cve_id', cveId);
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/vulnerability/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIntelligenceSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 50));
    params.append('offset', String(args.offset ?? 0));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/feed/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 100));
    params.append('offset', String(args.offset ?? 0));
    if (args.query) params.append('name__icontains', String(args.query));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/tag/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit ?? 50));
    params.append('offset', String(args.offset ?? 0));
    if (args.status) params.append('status', String(args.status));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/incident/?${params.toString()}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as string;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/incident/${encodeURIComponent(id)}/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  static catalog() {
    return {
      name: 'anomali',
      displayName: 'Anomali',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['anomali'],
      toolNames: ['search_indicators', 'get_indicator', 'create_indicator', 'update_indicator', 'list_threat_bulletins', 'get_threat_bulletin', 'search_actors', 'get_actor', 'list_campaigns', 'get_campaign', 'search_vulnerabilities', 'get_vulnerability', 'list_intelligence_sources', 'list_tags', 'list_incidents', 'get_incident'],
      description: 'Anomali adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
