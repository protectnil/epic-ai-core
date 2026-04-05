/**
 * MAIF Otoroshi MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: http://otoroshi-api.oto.tools  (or customer-provided host)
// Auth: HTTP Basic — Otoroshi-Client-Id + Otoroshi-Client-Secret headers
// Docs: https://maif.github.io/otoroshi/
// OpenAPI spec: https://api.apis.guru/v2/specs/maif.local/otoroshi/1.5.0-dev/openapi.json
// Rate limits: Not published; enforced per-deployment.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OtoroshiConfig {
  baseUrl: string;      // e.g. http://otoroshi-api.oto.tools
  clientId: string;     // Otoroshi-Client-Id header value
  clientSecret: string; // Otoroshi-Client-Secret header value
}

export class MaifOtoroshiMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: OtoroshiConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  static catalog() {
    return {
      name: 'maif-otoroshi',
      displayName: 'MAIF Otoroshi',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['otoroshi', 'maif', 'api-gateway', 'reverse-proxy', 'service-mesh', 'apikeys', 'services', 'groups', 'certificates', 'snow-monkey', 'chaos', 'jwt', 'auth', 'scripts'],
      toolNames: [
        'list_apikeys', 'get_apikey', 'create_apikey', 'delete_apikey',
        'list_services', 'get_service', 'create_service', 'update_service', 'delete_service',
        'get_service_apikeys', 'add_service_apikey',
        'list_groups', 'get_group',
        'list_certificates', 'get_certificate',
        'get_global_config', 'update_global_config',
        'get_health',
        'list_jwt_verifiers', 'get_jwt_verifier',
        'list_auth_modules', 'get_auth_module',
        'list_scripts',
        'get_snow_monkey_config', 'start_snow_monkey', 'stop_snow_monkey',
        'export_config',
      ],
      description: 'Manage MAIF Otoroshi API gateway: services, API keys, service groups, TLS certificates, JWT verifiers, auth modules, chaos engineering (Snow Monkey), scripts, and global configuration via the Otoroshi Admin API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── API Keys ──────────────────────────────────────────────────────────
      {
        name: 'list_apikeys',
        description: 'List all API keys across all services in Otoroshi',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_apikey',
        description: 'Get a specific API key by its client ID',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The API key client ID' },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'create_apikey',
        description: 'Create a new API key for a service group in Otoroshi',
        inputSchema: {
          type: 'object',
          properties: {
            group_id:        { type: 'string',  description: 'Service group ID to assign the API key to' },
            client_id:       { type: 'string',  description: 'Client ID for the new API key' },
            client_secret:   { type: 'string',  description: 'Client secret for the new API key' },
            client_name:     { type: 'string',  description: 'Human-readable name for the API key' },
            enabled:         { type: 'boolean', description: 'Whether the API key is enabled (default: true)' },
            throttling_quota:{ type: 'number',  description: 'Max requests per second allowed' },
            daily_quota:     { type: 'number',  description: 'Max requests per day allowed' },
            monthly_quota:   { type: 'number',  description: 'Max requests per month allowed' },
          },
          required: ['group_id', 'client_id', 'client_secret', 'client_name'],
        },
      },
      {
        name: 'delete_apikey',
        description: 'Delete an API key from a service group by client ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id:  { type: 'string', description: 'Service group ID the API key belongs to' },
            client_id: { type: 'string', description: 'Client ID of the API key to delete' },
          },
          required: ['group_id', 'client_id'],
        },
      },
      // ── Services ──────────────────────────────────────────────────────────
      {
        name: 'list_services',
        description: 'List all service descriptors (reverse proxy routes) registered in Otoroshi',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_service',
        description: 'Get a specific service descriptor by its service ID',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'The service descriptor ID' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'create_service',
        description: 'Create a new service descriptor (reverse proxy route) in Otoroshi',
        inputSchema: {
          type: 'object',
          properties: {
            name:             { type: 'string',  description: 'Service name' },
            env:              { type: 'string',  description: 'Environment label (e.g. prod, dev)' },
            domain:           { type: 'string',  description: 'Public domain for the service (e.g. api.example.com)' },
            subdomain:        { type: 'string',  description: 'Subdomain prefix (e.g. www)' },
            target_root:      { type: 'string',  description: 'Backend target base URL (e.g. https://backend.internal)' },
            enabled:          { type: 'boolean', description: 'Whether the service is enabled (default: true)' },
            force_https:      { type: 'boolean', description: 'Redirect HTTP to HTTPS (default: true)' },
            maintenance_mode: { type: 'boolean', description: 'Enable maintenance mode' },
          },
          required: ['name', 'env', 'domain', 'target_root'],
        },
      },
      {
        name: 'update_service',
        description: 'Update an existing service descriptor by ID — toggle enabled, maintenance mode, HTTPS redirect, or rename',
        inputSchema: {
          type: 'object',
          properties: {
            service_id:       { type: 'string',  description: 'Service descriptor ID to update' },
            enabled:          { type: 'boolean', description: 'Enable or disable the service' },
            maintenance_mode: { type: 'boolean', description: 'Toggle maintenance mode' },
            force_https:      { type: 'boolean', description: 'Toggle HTTPS redirect enforcement' },
            name:             { type: 'string',  description: 'New service name' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'delete_service',
        description: 'Delete a service descriptor by ID. Removes the route from Otoroshi permanently.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Service descriptor ID to delete' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'get_service_apikeys',
        description: 'List all API keys associated with a specific service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Service descriptor ID' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'add_service_apikey',
        description: "Add a new API key directly to a service",
        inputSchema: {
          type: 'object',
          properties: {
            service_id:    { type: 'string', description: 'Service descriptor ID' },
            client_id:     { type: 'string', description: 'Client ID of the API key to associate' },
            client_secret: { type: 'string', description: 'Client secret of the API key' },
            client_name:   { type: 'string', description: 'Name of the API key' },
          },
          required: ['service_id', 'client_id', 'client_secret', 'client_name'],
        },
      },
      // ── Groups ────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all service groups in Otoroshi',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_group',
        description: 'Get a specific service group by its group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The service group ID' },
          },
          required: ['group_id'],
        },
      },
      // ── Certificates ──────────────────────────────────────────────────────
      {
        name: 'list_certificates',
        description: 'List all TLS/SSL certificates managed by Otoroshi',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_certificate',
        description: 'Get a specific TLS certificate by its certificate ID',
        inputSchema: {
          type: 'object',
          properties: {
            cert_id: { type: 'string', description: 'Certificate ID' },
          },
          required: ['cert_id'],
        },
      },
      // ── Global Config ─────────────────────────────────────────────────────
      {
        name: 'get_global_config',
        description: 'Get the global Otoroshi configuration including throttling, analytics, and alert settings',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_global_config',
        description: 'Update the global Otoroshi configuration with partial fields',
        inputSchema: {
          type: 'object',
          properties: {
            throttling_quota:       { type: 'number',  description: 'Global max requests per second' },
            per_ip_throttling_quota:{ type: 'number',  description: 'Per-IP max requests per second' },
            max_http_response_size: { type: 'number',  description: 'Maximum HTTP response size in bytes' },
            use_circuit_breakers:   { type: 'boolean', description: 'Enable circuit breakers globally' },
          },
        },
      },
      // ── Health ────────────────────────────────────────────────────────────
      {
        name: 'get_health',
        description: 'Get the health status of the Otoroshi instance including database connectivity and live metrics',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── JWT Verifiers ─────────────────────────────────────────────────────
      {
        name: 'list_jwt_verifiers',
        description: 'List all global JWT token verifier configurations in Otoroshi',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_jwt_verifier',
        description: 'Get a specific JWT verifier configuration by its verifier ID',
        inputSchema: {
          type: 'object',
          properties: {
            verifier_id: { type: 'string', description: 'JWT verifier ID' },
          },
          required: ['verifier_id'],
        },
      },
      // ── Auth Modules ──────────────────────────────────────────────────────
      {
        name: 'list_auth_modules',
        description: 'List all global authentication module configurations (LDAP, OAuth2, in-memory)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_auth_module',
        description: 'Get a specific authentication module configuration by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            auth_id: { type: 'string', description: 'Auth module configuration ID' },
          },
          required: ['auth_id'],
        },
      },
      // ── Scripts ───────────────────────────────────────────────────────────
      {
        name: 'list_scripts',
        description: 'List all request transformer scripts registered in Otoroshi',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Snow Monkey (Chaos Engineering) ───────────────────────────────────
      {
        name: 'get_snow_monkey_config',
        description: 'Get the Snow Monkey chaos engineering configuration including outage scheduling',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'start_snow_monkey',
        description: 'Start the Snow Monkey chaos engineering module to inject failures into services',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'stop_snow_monkey',
        description: 'Stop the Snow Monkey chaos engineering module and cease fault injection',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Export ────────────────────────────────────────────────────────────
      {
        name: 'export_config',
        description: 'Export the full Otoroshi configuration as JSON for backup or migration',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_apikeys':            return await this.listApikeys();
        case 'get_apikey':              return await this.getApikey(args);
        case 'create_apikey':           return await this.createApikey(args);
        case 'delete_apikey':           return await this.deleteApikey(args);
        case 'list_services':           return await this.listServices();
        case 'get_service':             return await this.getService(args);
        case 'create_service':          return await this.createService(args);
        case 'update_service':          return await this.updateService(args);
        case 'delete_service':          return await this.deleteService(args);
        case 'get_service_apikeys':     return await this.getServiceApikeys(args);
        case 'add_service_apikey':      return await this.addServiceApikey(args);
        case 'list_groups':             return await this.listGroups();
        case 'get_group':               return await this.getGroup(args);
        case 'list_certificates':       return await this.listCertificates();
        case 'get_certificate':         return await this.getCertificate(args);
        case 'get_global_config':       return await this.getGlobalConfig();
        case 'update_global_config':    return await this.updateGlobalConfig(args);
        case 'get_health':              return await this.getHealth();
        case 'list_jwt_verifiers':      return await this.listJwtVerifiers();
        case 'get_jwt_verifier':        return await this.getJwtVerifier(args);
        case 'list_auth_modules':       return await this.listAuthModules();
        case 'get_auth_module':         return await this.getAuthModule(args);
        case 'list_scripts':            return await this.listScripts();
        case 'get_snow_monkey_config':  return await this.getSnowMonkeyConfig();
        case 'start_snow_monkey':       return await this.startSnowMonkey();
        case 'stop_snow_monkey':        return await this.stopSnowMonkey();
        case 'export_config':           return await this.exportConfig();
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

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Otoroshi-Client-Id': this.clientId,
      'Otoroshi-Client-Secret': this.clientSecret,
    };
  }

  private async otoRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Otoroshi API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Otoroshi returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── API Keys ───────────────────────────────────────────────────────────────

  private async listApikeys(): Promise<ToolResult> {
    return this.otoRequest('/api/apikeys');
  }

  private async getApikey(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/apikeys/${encodeURIComponent(args.client_id as string)}`);
  }

  private async createApikey(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      clientId: args.client_id,
      clientSecret: args.client_secret,
      clientName: args.client_name,
      enabled: args.enabled !== undefined ? args.enabled : true,
      authorizedGroup: args.group_id,
    };
    if (args.throttling_quota !== undefined) body.throttlingQuota = args.throttling_quota;
    if (args.daily_quota !== undefined) body.dailyQuota = args.daily_quota;
    if (args.monthly_quota !== undefined) body.monthlyQuota = args.monthly_quota;
    return this.otoRequest(`/api/groups/${encodeURIComponent(args.group_id as string)}/apikeys`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteApikey(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(
      `/api/groups/${encodeURIComponent(args.group_id as string)}/apikeys/${encodeURIComponent(args.client_id as string)}`,
      { method: 'DELETE' }
    );
  }

  // ── Services ──────────────────────────────────────────────────────────────

  private async listServices(): Promise<ToolResult> {
    return this.otoRequest('/api/services');
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/services/${encodeURIComponent(args.service_id as string)}`);
  }

  private async createService(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      env: args.env,
      domain: args.domain,
      targets: [{ host: args.target_root, scheme: 'https', weight: 1 }],
      enabled: args.enabled !== undefined ? args.enabled : true,
      forceHttps: args.force_https !== undefined ? args.force_https : true,
      maintenanceMode: args.maintenance_mode || false,
    };
    if (args.subdomain) body.subdomain = args.subdomain;
    return this.otoRequest('/api/services', { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateService(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.enabled !== undefined) body.enabled = args.enabled;
    if (args.maintenance_mode !== undefined) body.maintenanceMode = args.maintenance_mode;
    if (args.force_https !== undefined) body.forceHttps = args.force_https;
    if (args.name) body.name = args.name;
    return this.otoRequest(`/api/services/${encodeURIComponent(args.service_id as string)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async deleteService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/services/${encodeURIComponent(args.service_id as string)}`, { method: 'DELETE' });
  }

  private async getServiceApikeys(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/services/${encodeURIComponent(args.service_id as string)}/apikeys`);
  }

  private async addServiceApikey(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      clientId: args.client_id,
      clientSecret: args.client_secret,
      clientName: args.client_name,
      enabled: true,
    };
    return this.otoRequest(`/api/services/${encodeURIComponent(args.service_id as string)}/apikeys`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  private async listGroups(): Promise<ToolResult> {
    return this.otoRequest('/api/groups');
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  // ── Certificates ──────────────────────────────────────────────────────────

  private async listCertificates(): Promise<ToolResult> {
    return this.otoRequest('/api/certificates');
  }

  private async getCertificate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/certificates/${encodeURIComponent(args.cert_id as string)}`);
  }

  // ── Global Config ─────────────────────────────────────────────────────────

  private async getGlobalConfig(): Promise<ToolResult> {
    return this.otoRequest('/api/globalconfig');
  }

  private async updateGlobalConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.throttling_quota !== undefined) body.throttlingQuota = args.throttling_quota;
    if (args.per_ip_throttling_quota !== undefined) body.perIpThrottlingQuota = args.per_ip_throttling_quota;
    if (args.max_http_response_size !== undefined) body.maxHttpResponseSize = args.max_http_response_size;
    if (args.use_circuit_breakers !== undefined) body.useCircuitBreakers = args.use_circuit_breakers;
    return this.otoRequest('/api/globalconfig', { method: 'PUT', body: JSON.stringify(body) });
  }

  // ── Health ────────────────────────────────────────────────────────────────

  private async getHealth(): Promise<ToolResult> {
    return this.otoRequest('/health');
  }

  // ── JWT Verifiers ─────────────────────────────────────────────────────────

  private async listJwtVerifiers(): Promise<ToolResult> {
    return this.otoRequest('/api/verifiers');
  }

  private async getJwtVerifier(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/verifiers/${encodeURIComponent(args.verifier_id as string)}`);
  }

  // ── Auth Modules ──────────────────────────────────────────────────────────

  private async listAuthModules(): Promise<ToolResult> {
    return this.otoRequest('/api/auths');
  }

  private async getAuthModule(args: Record<string, unknown>): Promise<ToolResult> {
    return this.otoRequest(`/api/auths/${encodeURIComponent(args.auth_id as string)}`);
  }

  // ── Scripts ───────────────────────────────────────────────────────────────

  private async listScripts(): Promise<ToolResult> {
    return this.otoRequest('/api/scripts');
  }

  // ── Snow Monkey ───────────────────────────────────────────────────────────

  private async getSnowMonkeyConfig(): Promise<ToolResult> {
    return this.otoRequest('/api/snowmonkey/config');
  }

  private async startSnowMonkey(): Promise<ToolResult> {
    return this.otoRequest('/api/snowmonkey/_start', { method: 'POST' });
  }

  private async stopSnowMonkey(): Promise<ToolResult> {
    return this.otoRequest('/api/snowmonkey/_stop', { method: 'POST' });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  private async exportConfig(): Promise<ToolResult> {
    return this.otoRequest('/api/otoroshi.json');
  }
}
