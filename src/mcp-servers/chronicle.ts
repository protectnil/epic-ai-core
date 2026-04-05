/**
 * Google Chronicle (SecOps) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/google/mcp-security — actively maintained by Google (2025-2026).
// Sub-servers: secops (Chronicle SIEM), soar, gti (threat intel), scc (Cloud Security Command Center).
// Also available as a hosted remote MCP at https://chronicle.us.rep.googleapis.com/mcp.
// Transport: stdio (local Python via uvx/uv) and hosted streamable-HTTP remote.
// Vendor MCP tool count: 20+ tools confirmed (search_security_events, get_security_alerts,
//   lookup_entity, list_security_rules, search_security_rules, create_retrohunt, get_retrohunt,
//   search_rule_alerts, ingest_raw_log, ingest_udm_events, list_feeds, get_feed, list_watchlists,
//   get_watchlist, list_investigations, create_reference_list, get_reference_list,
//   update_reference_list, list_curated_rules, get_curated_rule, get_curated_rule_by_name, + more).
// Our adapter covers: 14 tools (Backstory API — previous-generation REST API).
// Recommendation: use-both — vendor MCP (secops sub-server) meets all four criteria and covers
//   curated rules, raw log ingestion, feeds, watchlists, reference lists, and investigations not in
//   the Backstory REST API. Our REST adapter covers direct Backstory API access for air-gapped
//   deployments and write operations (create_rule, enable_rule, disable_rule, ingest_udm_events).
// Integration: use-both
// MCP-sourced tools (recommended): search_security_events, get_security_alerts, lookup_entity,
//   list_security_rules, create_retrohunt, get_retrohunt, search_rule_alerts, ingest_raw_log,
//   list_feeds, list_watchlists, list_investigations, list_curated_rules, get_curated_rule
// REST-sourced tools (this adapter): udm_search, get_event, list_alerts, list_rules, get_rule,
//   create_rule, enable_rule, disable_rule, list_detections, search_iocs, list_ioc_details,
//   list_assets, search_entities, ingest_udm_events
//
// Base URL: https://backstory.googleapis.com (US multi-region, default — Backstory/legacy API)
//           https://europe-backstory.googleapis.com  (EU)
//           https://asia-southeast1-backstory.googleapis.com  (APAC)
// NOTE: Google recommends migrating to the new Chronicle API at
//       https://{region}-chronicle.googleapis.com for new integrations.
// Auth: OAuth 2.0 Bearer token (gcloud auth print-access-token or service account key exchange)
//       Scope required: https://www.googleapis.com/auth/chronicle-backstory
// Docs: https://cloud.google.com/chronicle/docs/reference/search-api (Backstory Search API)
//       https://cloud.google.com/chronicle/docs/reference/detection-engine-api (Detection Engine)
//       https://cloud.google.com/chronicle/docs/reference/ingestion-api (Ingestion API)
// Rate limits: udmSearch: 360 QPH; GetLog/GetEvent: 60 QPS; ListAlerts/ListEvents/ListIocs: 1 QPS;
//              ListAssets: 5 QPS (Backstory API limits)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ChronicleConfig {
  accessToken: string;
  baseUrl?: string;
}

export class ChronicleMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ChronicleConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://backstory.googleapis.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'udm_search',
        description: 'Search UDM (Unified Data Model) events using a YARA-L query with optional time range and result limit',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'UDM search query string (YARA-L syntax)',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format (e.g. 2024-01-01T00:00:00Z)',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 10000)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve a single UDM event by its unique event ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'The unique UDM event ID to retrieve',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List detection rule alerts generated in Chronicle with optional time range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of alerts per page (default: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_rules',
        description: 'List YARA-L detection rules defined in the Chronicle instance with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Maximum number of rules per page (default: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_rule',
        description: 'Retrieve the full YARA-L source and metadata for a single detection rule by rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'The rule ID (e.g. ru_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'create_rule',
        description: 'Create a new YARA-L detection rule in Chronicle from rule text',
        inputSchema: {
          type: 'object',
          properties: {
            rule_text: {
              type: 'string',
              description: 'Full YARA-L 2.0 rule text including meta, events, condition, and outcome sections',
            },
          },
          required: ['rule_text'],
        },
      },
      {
        name: 'enable_rule',
        description: 'Enable alerting for a detection rule so it generates alerts when conditions match',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'The rule ID to enable alerting on',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'disable_rule',
        description: 'Disable alerting for a detection rule — rule remains but will not generate new alerts',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'The rule ID to disable alerting on',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'list_detections',
        description: 'List detections generated by a specific rule, with optional time range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'The rule ID to list detections for',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of detections per page (default: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'search_iocs',
        description: 'Search for indicators of compromise (domains, IPs, hashes) in Chronicle ingested data',
        inputSchema: {
          type: 'object',
          properties: {
            ioc_value: {
              type: 'string',
              description: 'IoC value to search: domain name, IP address, or file hash',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of results per page (default: 100)',
            },
          },
          required: ['ioc_value'],
        },
      },
      {
        name: 'list_ioc_details',
        description: 'Get threat intelligence details for a specific IoC artifact (domain, IP, or file hash)',
        inputSchema: {
          type: 'object',
          properties: {
            artifact_indicator: {
              type: 'string',
              description: 'IoC artifact: IP address, domain name, or file MD5/SHA256 hash',
            },
          },
          required: ['artifact_indicator'],
        },
      },
      {
        name: 'list_assets',
        description: 'List Chronicle assets and their alert history associated with a hostname or IP address',
        inputSchema: {
          type: 'object',
          properties: {
            hostname: {
              type: 'string',
              description: 'Hostname to look up assets for (mutually exclusive with ip_address)',
            },
            ip_address: {
              type: 'string',
              description: 'IP address to look up assets for (mutually exclusive with hostname)',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of assets to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'search_entities',
        description: 'Search for entity summaries (users, assets, IPs) and their associated context in Chronicle',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Entity search query (hostname, username, IP address, or email)',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of entity results (default: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'ingest_udm_events',
        description: 'Ingest one or more UDM-formatted events directly into Chronicle via the Ingestion API',
        inputSchema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of UDM event objects conforming to the Chronicle UDM schema',
            },
          },
          required: ['events'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'udm_search':
          return await this.udmSearch(args);
        case 'get_event':
          return await this.getEvent(args);
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'list_rules':
          return await this.listRules(args);
        case 'get_rule':
          return await this.getRule(args);
        case 'create_rule':
          return await this.createRule(args);
        case 'enable_rule':
          return await this.enableRule(args);
        case 'disable_rule':
          return await this.disableRule(args);
        case 'list_detections':
          return await this.listDetections(args);
        case 'search_iocs':
          return await this.searchIocs(args);
        case 'list_ioc_details':
          return await this.listIocDetails(args);
        case 'list_assets':
          return await this.listAssets(args);
        case 'search_entities':
          return await this.searchEntities(args);
        case 'ingest_udm_events':
          return await this.ingestUdmEvents(args);
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

  private get reqHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async chronicleGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.reqHeaders });
    if (!response.ok) {
      const errText = await response.text();
      return { content: [{ type: 'text', text: `Chronicle API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Chronicle returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async chroniclePost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.reqHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text();
      return { content: [{ type: 'text', text: `Chronicle API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Chronicle returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async chroniclePatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.reqHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text();
      return { content: [{ type: 'text', text: `Chronicle API error (HTTP ${response.status}): ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Chronicle returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async udmSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = { query };
    if (args.start_time) body.startTime = args.start_time;
    if (args.end_time) body.endTime = args.end_time;
    if (args.limit) body.limit = args.limit;
    return this.chroniclePost('/v2/events:udmSearch', body);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.event_id as string;
    if (!id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.chronicleGet(`/v2/events/${encodeURIComponent(id)}`);
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start_time) params.set('startTime', args.start_time as string);
    if (args.end_time) params.set('endTime', args.end_time as string);
    if (args.page_size) params.set('pageSize', String(args.page_size));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    const qs = params.toString();
    return this.chronicleGet(`/v2/alert/alertinfos${qs ? `?${qs}` : ''}`);
  }

  private async listRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page_size) params.set('pageSize', String(args.page_size));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    const qs = params.toString();
    return this.chronicleGet(`/v2/detect/rules${qs ? `?${qs}` : ''}`);
  }

  private async getRule(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.rule_id as string;
    if (!id) return { content: [{ type: 'text', text: 'rule_id is required' }], isError: true };
    return this.chronicleGet(`/v2/detect/rules/${encodeURIComponent(id)}`);
  }

  private async createRule(args: Record<string, unknown>): Promise<ToolResult> {
    const ruleText = args.rule_text as string;
    if (!ruleText) return { content: [{ type: 'text', text: 'rule_text is required' }], isError: true };
    return this.chroniclePost('/v2/detect/rules', { ruleText });
  }

  private async enableRule(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.rule_id as string;
    if (!id) return { content: [{ type: 'text', text: 'rule_id is required' }], isError: true };
    return this.chroniclePatch(`/v2/detect/rules/${encodeURIComponent(id)}`, { alertingEnabled: true });
  }

  private async disableRule(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.rule_id as string;
    if (!id) return { content: [{ type: 'text', text: 'rule_id is required' }], isError: true };
    return this.chroniclePatch(`/v2/detect/rules/${encodeURIComponent(id)}`, { alertingEnabled: false });
  }

  private async listDetections(args: Record<string, unknown>): Promise<ToolResult> {
    const ruleId = args.rule_id as string;
    if (!ruleId) return { content: [{ type: 'text', text: 'rule_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.start_time) params.set('startTime', args.start_time as string);
    if (args.end_time) params.set('endTime', args.end_time as string);
    if (args.page_size) params.set('pageSize', String(args.page_size));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    const qs = params.toString();
    return this.chronicleGet(`/v2/detect/rules/${encodeURIComponent(ruleId)}/detections${qs ? `?${qs}` : ''}`);
  }

  private async searchIocs(args: Record<string, unknown>): Promise<ToolResult> {
    const iocValue = args.ioc_value as string;
    if (!iocValue) return { content: [{ type: 'text', text: 'ioc_value is required' }], isError: true };
    const params = new URLSearchParams();
    // Detect IoC type: IPv4/IPv6 → destinationIpAddress, MD5/SHA256 hash → fileHash, else domain
    if (/^[\d.:]+$/.test(iocValue)) {
      params.set('artifactIndicator.destinationIpAddress', iocValue);
    } else if (/^[0-9a-fA-F]{32,64}$/.test(iocValue)) {
      params.set('artifactIndicator.hashSha256', iocValue.length === 64 ? iocValue : '');
      if (iocValue.length === 32) {
        params.delete('artifactIndicator.hashSha256');
        params.set('artifactIndicator.hashMd5', iocValue);
      }
    } else {
      params.set('artifactIndicator.domainName', iocValue);
    }
    if (args.start_time) params.set('startTime', args.start_time as string);
    if (args.end_time) params.set('endTime', args.end_time as string);
    if (args.page_size) params.set('pageSize', String(args.page_size));
    return this.chronicleGet(`/v2/ioc:searchAssociations?${params.toString()}`);
  }

  private async listIocDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const artifact = args.artifact_indicator as string;
    if (!artifact) return { content: [{ type: 'text', text: 'artifact_indicator is required' }], isError: true };
    // Detect artifact type: IPv4/IPv6 → destinationIpAddress, hash → hashSha256/hashMd5, else domain
    let paramKey = 'artifact.domainName';
    if (/^[\d.:]+$/.test(artifact)) {
      paramKey = 'artifact.destinationIpAddress';
    } else if (/^[0-9a-fA-F]{64}$/.test(artifact)) {
      paramKey = 'artifact.hashSha256';
    } else if (/^[0-9a-fA-F]{32}$/.test(artifact)) {
      paramKey = 'artifact.hashMd5';
    }
    return this.chronicleGet(`/v2/ioc/details?${paramKey}=${encodeURIComponent(artifact)}`);
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.hostname) params.set('hostname', args.hostname as string);
    if (args.ip_address) params.set('destinationIpAddress', args.ip_address as string);
    if (args.start_time) params.set('startTime', args.start_time as string);
    if (args.end_time) params.set('endTime', args.end_time as string);
    if (args.page_size) params.set('pageSize', String(args.page_size));
    return this.chronicleGet(`/v2/asset/listAlerts?${params.toString()}`);
  }

  private async searchEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('query', query);
    if (args.start_time) params.set('startTime', args.start_time as string);
    if (args.end_time) params.set('endTime', args.end_time as string);
    if (args.page_size) params.set('pageSize', String(args.page_size));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    return this.chronicleGet(`/v2/entities:summarize?${params.toString()}`);
  }

  private async ingestUdmEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const events = args.events as unknown[];
    if (!events || !Array.isArray(events) || events.length === 0) {
      return { content: [{ type: 'text', text: 'events must be a non-empty array' }], isError: true };
    }
    return this.chroniclePost('/v2/udmevents', { events });
  }

  static catalog() {
    return {
      name: 'chronicle',
      displayName: 'Chronicle',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['chronicle'],
      toolNames: ['udm_search', 'get_event', 'list_alerts', 'list_rules', 'get_rule', 'create_rule', 'enable_rule', 'disable_rule', 'list_detections', 'search_iocs', 'list_ioc_details', 'list_assets', 'search_entities', 'ingest_udm_events'],
      description: 'Chronicle adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
