/**
 * Docker DVP (Docker Verified Publisher) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Docker DVP Data API MCP server was found on GitHub. The Docker DVP Data API
// is a specialized analytics API exclusively for Docker Verified Publishers to retrieve
// image pull metrics. It is distinct from the general Docker Hub API (see docker-hub.ts).
//
// Base URL: https://hub.docker.com/api/publisher/analytics/v1
// Auth: Bearer JWT token (obtained via POST https://hub.docker.com/v2/users/login)
//       Note: PATs (Personal Access Tokens) are NOT supported — password-based JWT only.
// Docs: https://docs.docker.com/docker-hub/api/dvp/
// Rate limits: Not publicly documented; stay under 100 req/min per token
// Audience: Docker Verified Publishers only — requires publisher namespace access

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DockerDvpConfig {
  /**
   * Bearer JWT token for the Docker DVP Data API.
   * Obtain via POST https://hub.docker.com/v2/users/login with Docker Hub credentials.
   * NOTE: Personal Access Tokens (PATs) are NOT supported by this API.
   */
  token: string;
  /**
   * Override the API base URL.
   * Defaults to https://hub.docker.com/api/publisher/analytics/v1
   */
  baseUrl?: string;
}

export class DockerDvpMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: DockerDvpConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://hub.docker.com/api/publisher/analytics/v1';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Authentication ---
      {
        name: 'login',
        description: 'Authenticate with Docker Hub using username and password to obtain a JWT bearer token for use with the DVP Data API. Returns a token string. PATs are not supported.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Docker Hub username' },
            password: { type: 'string', description: 'Docker Hub password (PATs not supported for this API)' },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'login_2fa',
        description: 'Complete two-factor authentication after an initial login attempt returned a login_2fa_token. Returns a JWT bearer token.',
        inputSchema: {
          type: 'object',
          properties: {
            login_2fa_token: { type: 'string', description: 'The intermediate 2FA token returned from the login call' },
            code: { type: 'string', description: 'The Time-based One-Time Password (TOTP) code from your authenticator app' },
          },
          required: ['login_2fa_token', 'code'],
        },
      },
      // --- Discovery ---
      {
        name: 'get_namespaces',
        description: 'Get a list of your Docker Hub publisher namespaces and repositories that have pull analytics data available.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_namespace',
        description: 'Get metadata associated with a specific publisher namespace, including extra repositories associated with the namespace and available datasets.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'The Docker Hub publisher namespace to fetch metadata for' },
          },
          required: ['namespace'],
        },
      },
      // --- Namespace Analytics ---
      {
        name: 'get_namespace_years',
        description: 'Get a list of years that have pull analytics data available for the given publisher namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'The Docker Hub publisher namespace' },
          },
          required: ['namespace'],
        },
      },
      {
        name: 'get_namespace_timespans',
        description: 'Get a list of available timespans (months or weeks) within a given year that have pull analytics data for the specified namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'The Docker Hub publisher namespace' },
            year: { type: 'number', description: 'The year to list available timespans for (e.g. 2024)' },
            timespantype: { type: 'string', enum: ['months', 'weeks'], description: 'Type of timespan: "months" or "weeks"' },
          },
          required: ['namespace', 'year', 'timespantype'],
        },
      },
      {
        name: 'get_namespace_timespan_metadata',
        description: 'Get metadata about a specific timespan (month number or week number) for a namespace, confirming data availability.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'The Docker Hub publisher namespace' },
            year: { type: 'number', description: 'The year (e.g. 2024)' },
            timespantype: { type: 'string', enum: ['months', 'weeks'], description: 'Type of timespan: "months" or "weeks"' },
            timespan: { type: 'number', description: 'The timespan value: month number (1-12) or week number (1-53)' },
          },
          required: ['namespace', 'year', 'timespantype', 'timespan'],
        },
      },
      {
        name: 'get_namespace_data',
        description: 'Get download URLs for pull analytics data files for a specific namespace and timespan. The dataview parameter selects raw event data, per-tag summary, or per-repo summary. Returns a list of signed download URLs for CSV files.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'The Docker Hub publisher namespace' },
            year: { type: 'number', description: 'The year (e.g. 2024)' },
            timespantype: { type: 'string', enum: ['months', 'weeks'], description: 'Type of timespan: "months" or "weeks"' },
            timespan: { type: 'number', description: 'The timespan value: month number (1-12) or week number (1-53)' },
            dataview: { type: 'string', enum: ['raw', 'summary', 'repo-summary'], description: 'Data format: "raw" (individual pull events), "summary" (per-tag aggregated), or "repo-summary" (per-repository aggregated)' },
          },
          required: ['namespace', 'year', 'timespantype', 'timespan', 'dataview'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'login': return await this.login(args);
        case 'login_2fa': return await this.login2fa(args);
        case 'get_namespaces': return await this.getNamespaces();
        case 'get_namespace': return await this.getNamespace(args);
        case 'get_namespace_years': return await this.getNamespaceYears(args);
        case 'get_namespace_timespans': return await this.getNamespaceTimespans(args);
        case 'get_namespace_timespan_metadata': return await this.getNamespaceTimespanMetadata(args);
        case 'get_namespace_data': return await this.getNamespaceData(args);
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async login(args: Record<string, unknown>): Promise<ToolResult> {
    const { username, password } = args;
    if (!username || !password) {
      return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
    }
    const response = await this.fetchWithRetry('https://hub.docker.com/v2/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { content: [{ type: 'text', text: `Login failed: ${response.status} ${response.statusText} — ${this.truncate(errData)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async login2fa(args: Record<string, unknown>): Promise<ToolResult> {
    const { login_2fa_token, code } = args;
    if (!login_2fa_token || !code) {
      return { content: [{ type: 'text', text: 'login_2fa_token and code are required' }], isError: true };
    }
    const response = await this.fetchWithRetry('https://hub.docker.com/v2/users/2fa-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ login_2fa_token, code }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { content: [{ type: 'text', text: `2FA login failed: ${response.status} ${response.statusText} — ${this.truncate(errData)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getNamespaces(): Promise<ToolResult> {
    return this.apiGet('/');
  }

  private async getNamespace(args: Record<string, unknown>): Promise<ToolResult> {
    const namespace = args.namespace as string;
    if (!namespace) return { content: [{ type: 'text', text: 'namespace is required' }], isError: true };
    return this.apiGet(`/namespaces/${encodeURIComponent(namespace)}`);
  }

  private async getNamespaceYears(args: Record<string, unknown>): Promise<ToolResult> {
    const namespace = args.namespace as string;
    if (!namespace) return { content: [{ type: 'text', text: 'namespace is required' }], isError: true };
    return this.apiGet(`/namespaces/${encodeURIComponent(namespace)}/pulls/exports/years`);
  }

  private async getNamespaceTimespans(args: Record<string, unknown>): Promise<ToolResult> {
    const { namespace, year, timespantype } = args;
    if (!namespace || !year || !timespantype) {
      return { content: [{ type: 'text', text: 'namespace, year, and timespantype are required' }], isError: true };
    }
    return this.apiGet(`/namespaces/${encodeURIComponent(namespace as string)}/pulls/exports/years/${year}/${encodeURIComponent(timespantype as string)}`);
  }

  private async getNamespaceTimespanMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const { namespace, year, timespantype, timespan } = args;
    if (!namespace || !year || !timespantype || timespan === undefined) {
      return { content: [{ type: 'text', text: 'namespace, year, timespantype, and timespan are required' }], isError: true };
    }
    return this.apiGet(`/namespaces/${encodeURIComponent(namespace as string)}/pulls/exports/years/${year}/${encodeURIComponent(timespantype as string)}/${timespan}`);
  }

  private async getNamespaceData(args: Record<string, unknown>): Promise<ToolResult> {
    const { namespace, year, timespantype, timespan, dataview } = args;
    if (!namespace || !year || !timespantype || timespan === undefined || !dataview) {
      return { content: [{ type: 'text', text: 'namespace, year, timespantype, timespan, and dataview are required' }], isError: true };
    }
    return this.apiGet(`/namespaces/${encodeURIComponent(namespace as string)}/pulls/exports/years/${year}/${encodeURIComponent(timespantype as string)}/${timespan}/${encodeURIComponent(dataview as string)}`);
  }

  static catalog() {
    return {
      name: 'docker-dvp',
      displayName: 'Docker DVP (Verified Publisher Analytics)',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['docker', 'dvp', 'publisher', 'analytics', 'pulls', 'hub'],
      toolNames: ['login', 'login_2fa', 'get_namespaces', 'get_namespace', 'get_namespace_years', 'get_namespace_timespans', 'get_namespace_timespan_metadata', 'get_namespace_data'],
      description: 'Docker Verified Publisher (DVP) Data API adapter for pull analytics. Provides image pull metrics, download CSV exports, and namespace discovery for Docker Hub verified publishers.',
      author: 'protectnil' as const,
    };
  }
}
