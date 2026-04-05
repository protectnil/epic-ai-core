/**
 * Recorded Future Intelligence MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Recorded Future MCP server exists on GitHub or npm.
//
// Recorded Future exposes multiple distinct API surfaces. This adapter covers:
//   Connect API v2  (base: https://api.recordedfuture.com/v2) — IOC enrichment: IP, domain, hash, URL, vulnerability, malware
//   Alert API       (base: https://api.recordedfuture.com/alert) — triggered alerts (v2/search, v2/{id})
//   Playbook Alert API (base: https://api.recordedfuture.com/playbook-alert) — structured priority intelligence alerts
//   Threat Actor lookup is in the separate Threat API (https://api.recordedfuture.com/threat) — see search_threat_actors note.
//
// Our adapter covers: 15 tools
// Recommendation: use-rest-api (no vendor MCP exists)
//
// Base URL: https://api.recordedfuture.com/v2  (Connect API — IOC enrichment)
// Auth: API token header — X-RFToken: {token} on ALL requests across all RF API surfaces
// Docs: https://api.recordedfuture.com/ (API index), https://docs.recordedfuture.com (subscription required)
// Rate limits: Varies by subscription tier; not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RecordedFutureConfig {
  apiToken: string;
  baseUrl?: string;
}

export class RecordedFutureMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  // Alert API and Playbook Alert API have separate base URLs from the Connect API
  private readonly alertBaseUrl = 'https://api.recordedfuture.com/alert';
  private readonly playbookAlertBaseUrl = 'https://api.recordedfuture.com/playbook-alert';

  constructor(config: RecordedFutureConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.recordedfuture.com/v2';
  }

  static catalog() {
    return {
      name: 'recorded-future',
      displayName: 'Recorded Future',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: ['recorded future', 'threat intelligence', 'ioc', 'indicator', 'malware', 'threat actor', 'cve', 'vulnerability', 'risk score', 'alert', 'playbook', 'ip reputation', 'domain', 'hash', 'ttps'],
      toolNames: [
        'search_indicators', 'get_ip_intelligence', 'get_domain_intelligence',
        'get_hash_intelligence', 'get_url_intelligence', 'get_vulnerability_intelligence',
        'get_risk_score',
        'list_alerts', 'get_alert', 'search_threat_actors', 'get_threat_actor',
        'search_malware', 'get_malware',
        'list_playbook_alerts', 'get_playbook_alert',
      ],
      description: 'Threat intelligence from Recorded Future: enrich IPs, domains, hashes, CVEs; search threat actors and malware; manage alerts and playbook alerts.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      'X-RFToken': this.apiToken,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_indicators',
        description: 'Free-text search for threat indicators of a specific type (IP, domain, hash, URL, CVE) in Recorded Future',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (IP address, domain, file hash, URL, CVE ID, or keyword)',
            },
            indicator_type: {
              type: 'string',
              description: 'Required indicator type to search: "ip", "domain", "hash", "url", or "vulnerability"',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
          required: ['query', 'indicator_type'],
        },
      },
      {
        name: 'get_ip_intelligence',
        description: 'Get full threat intelligence for an IP address: risk score, threat categories, related malware, and evidence',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to look up',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include: entity,risk,threatLists,relatedEntities,timestamps (default: all)',
            },
          },
          required: ['ip'],
        },
      },
      {
        name: 'get_domain_intelligence',
        description: 'Get full threat intelligence for a domain: risk score, DNS history, related IPs, malware associations',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to look up (e.g. evil.example.com)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include: entity,risk,threatLists,relatedEntities,timestamps (default: all)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_hash_intelligence',
        description: 'Get full threat intelligence for a file hash (MD5, SHA-1, or SHA-256): malware family, verdicts, sandbox detections',
        inputSchema: {
          type: 'object',
          properties: {
            hash: {
              type: 'string',
              description: 'File hash to look up (MD5, SHA-1, or SHA-256)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include: entity,risk,threatLists,relatedEntities,timestamps (default: all)',
            },
          },
          required: ['hash'],
        },
      },
      {
        name: 'get_url_intelligence',
        description: 'Get full threat intelligence for a URL: risk score, phishing/malware classifications, and related indicators',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to look up (e.g. https://malicious.example.com/path)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include: entity,risk,threatLists,relatedEntities,timestamps (default: all)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_vulnerability_intelligence',
        description: 'Get threat intelligence for a CVE: risk score, exploit availability, affected products, and patch intelligence',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: {
              type: 'string',
              description: 'CVE identifier (e.g. CVE-2021-44228)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include: entity,risk,threatLists,relatedEntities,nvdDescription,timestamps (default: all)',
            },
          },
          required: ['cve_id'],
        },
      },
      {
        name: 'get_risk_score',
        description: 'Get the Recorded Future risk score (0–100) and risk rules for a specific indicator',
        inputSchema: {
          type: 'object',
          properties: {
            indicator: {
              type: 'string',
              description: 'The indicator value (IP, domain, hash, URL, or CVE ID)',
            },
            indicator_type: {
              type: 'string',
              description: 'Type of indicator: "ip", "domain", "hash", "url", "vulnerability"',
            },
          },
          required: ['indicator', 'indicator_type'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List triggered Recorded Future alerts with optional time range and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            triggered: {
              type: 'string',
              description: 'Filter by trigger time window: "last-24-hours", "last-7-days", "last-30-days"',
            },
            status: {
              type: 'string',
              description: 'Filter by alert status: "unread", "read", "dismissed"',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get full details for a specific triggered alert by ID, including matched entities and context',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'The alert notification ID',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'search_threat_actors',
        description: 'Search for threat actors and APT groups by name with risk scores and TTP summaries',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Threat actor or APT group name to search for (e.g. "Lazarus Group", "APT29")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_threat_actor',
        description: 'Get full intelligence profile for a specific threat actor: TTPs, targets, tools, and recent activity',
        inputSchema: {
          type: 'object',
          properties: {
            actor_id: {
              type: 'string',
              description: 'The Recorded Future threat actor entity ID',
            },
          },
          required: ['actor_id'],
        },
      },
      {
        name: 'search_malware',
        description: 'Search for malware families by name with risk scores and distribution information',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Malware family name to search for (e.g. "Emotet", "Cobalt Strike")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_malware',
        description: 'Get full intelligence for a specific malware family: indicators, TTPs, threat actors, and C2 infrastructure',
        inputSchema: {
          type: 'object',
          properties: {
            malware_id: {
              type: 'string',
              description: 'The Recorded Future malware entity ID',
            },
          },
          required: ['malware_id'],
        },
      },
      {
        name: 'list_playbook_alerts',
        description: 'List Recorded Future Playbook Alerts (structured, high-fidelity priority intelligence alerts)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of playbook alerts to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: "new", "in-progress", "dismissed", "resolved"',
            },
            category: {
              type: 'string',
              description: 'Filter by category: "domain_abuse", "cyber_vulnerability", "identity_novel_exposures", "code_repo_leakage"',
            },
          },
        },
      },
      {
        name: 'get_playbook_alert',
        description: 'Get full details for a specific Playbook Alert by ID, including evidence panel and recommended actions',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'The Playbook Alert ID',
            },
          },
          required: ['alert_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_indicators':
          return await this.searchIndicators(args);
        case 'get_ip_intelligence':
          return await this.getEntityIntelligence('ip', args.ip as string, args.fields as string | undefined);
        case 'get_domain_intelligence':
          return await this.getEntityIntelligence('domain', args.domain as string, args.fields as string | undefined);
        case 'get_hash_intelligence':
          return await this.getEntityIntelligence('hash', args.hash as string, args.fields as string | undefined);
        case 'get_url_intelligence':
          return await this.getEntityIntelligence('url', args.url as string, args.fields as string | undefined);
        case 'get_vulnerability_intelligence':
          return await this.getEntityIntelligence('vulnerability', args.cve_id as string, args.fields as string | undefined);
        case 'get_risk_score':
          return await this.getRiskScore(args);
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_alert':
          return await this.getAlert(args);
        case 'search_threat_actors':
          return await this.searchThreatActors(args);
        case 'get_threat_actor':
          return await this.getThreatActor(args);
        case 'search_malware':
          return await this.searchMalware(args);
        case 'get_malware':
          return await this.getMalware(args);
        case 'list_playbook_alerts':
          return await this.listPlaybookAlerts(args);
        case 'get_playbook_alert':
          return await this.getPlaybookAlert(args);
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
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const indicatorType = args.indicator_type as string | undefined;
    if (!indicatorType) {
      return { content: [{ type: 'text', text: 'indicator_type is required: "ip", "domain", "hash", "url", or "vulnerability"' }], isError: true };
    }
    const params = new URLSearchParams({ freetext: query });
    if (args.limit) params.set('limit', String(args.limit));
    const response = await this.fetchWithRetry(`${this.baseUrl}/${encodeURIComponent(indicatorType)}/search?${params.toString()}`, {
      headers: this.headers,
    });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getEntityIntelligence(type: string, value: string, fields?: string): Promise<ToolResult> {
    if (!value) return { content: [{ type: 'text', text: `${type} value is required` }], isError: true };
    const params = new URLSearchParams();
    if (fields) params.set('fields', fields);
    const qs = params.toString();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${encodeURIComponent(type)}/${encodeURIComponent(value)}${qs ? `?${qs}` : ''}`,
      { headers: this.headers }
    );
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getRiskScore(args: Record<string, unknown>): Promise<ToolResult> {
    const indicator = args.indicator as string;
    const indicatorType = args.indicator_type as string;
    if (!indicator || !indicatorType) {
      return { content: [{ type: 'text', text: 'indicator and indicator_type are required' }], isError: true };
    }
    const params = new URLSearchParams({ fields: 'entity,risk' });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${encodeURIComponent(indicatorType)}/${encodeURIComponent(indicator)}?${params.toString()}`,
      { headers: this.headers }
    );
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: !response.ok,
    };
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    // Alert API is at https://api.recordedfuture.com/alert — separate from Connect API v2
    // Endpoint: GET /v2/search (search for alerts)
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    if (args.triggered) params.set('triggered', args.triggered as string);
    if (args.status) params.set('status', args.status as string);
    const response = await this.fetchWithRetry(`${this.alertBaseUrl}/v2/search?${params.toString()}`, { headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    // Alert API: GET /v2/{alert_id} at https://api.recordedfuture.com/alert
    const alertId = args.alert_id as string;
    if (!alertId) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.alertBaseUrl}/v2/${encodeURIComponent(alertId)}`, { headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async searchThreatActors(args: Record<string, unknown>): Promise<ToolResult> {
    // NOTE: Threat actors are NOT in Connect API v2 (https://api.recordedfuture.com/v2).
    // The Recorded Future "Threat API" (https://api.recordedfuture.com/threat) handles threat actor search.
    // Exact endpoint path could not be verified from public docs (subscription required).
    // Using GET /threatactor/search as best-effort based on RF's consistent GET-for-search pattern.
    // UNVERIFIED: path /threatactor/search on the Threat API base URL.
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = new URLSearchParams({ freetext: query });
    if (args.limit) params.set('limit', String(args.limit));
    const response = await this.fetchWithRetry(`${this.baseUrl}/threatactor/search?${params.toString()}`, {
      headers: this.headers,
    });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getThreatActor(args: Record<string, unknown>): Promise<ToolResult> {
    const actorId = args.actor_id as string;
    if (!actorId) return { content: [{ type: 'text', text: 'actor_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/threatactor/${encodeURIComponent(actorId)}`, { headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async searchMalware(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = new URLSearchParams({ freetext: query });
    if (args.limit) params.set('limit', String(args.limit));
    const response = await this.fetchWithRetry(`${this.baseUrl}/malware/search?${params.toString()}`, {
      headers: this.headers,
    });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getMalware(args: Record<string, unknown>): Promise<ToolResult> {
    const malwareId = args.malware_id as string;
    if (!malwareId) return { content: [{ type: 'text', text: 'malware_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/malware/${encodeURIComponent(malwareId)}`, { headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async listPlaybookAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    // Playbook Alert API: POST /search at https://api.recordedfuture.com/playbook-alert
    const body: Record<string, unknown> = {};
    if (args.limit) body.limit = args.limit;
    if (args.offset) body.offset = args.offset;
    if (args.status) body.status = args.status;
    if (args.category) body.category = args.category;
    const response = await this.fetchWithRetry(`${this.playbookAlertBaseUrl}/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getPlaybookAlert(args: Record<string, unknown>): Promise<ToolResult> {
    // Playbook Alert API: GET /common/{playbook_alert_id} at https://api.recordedfuture.com/playbook-alert
    const alertId = args.alert_id as string;
    if (!alertId) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.playbookAlertBaseUrl}/common/${encodeURIComponent(alertId)}`, { headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }
}
