import { ToolDefinition, ToolResult } from './types.js';

export class ZscalerMCPServer {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly apiKey: string;
  private sessionCookie: string | null = null;
  private sessionExpiry: number = 0;
  private static readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private password: string | null;

  constructor(config: {
    baseUrl: string;
    username: string;
    password: string;
    apiKey: string;
  }) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
    this.apiKey = config.apiKey;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_url_categories',
        description: 'List all URL categories',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of categories to return',
            },
          },
        },
      },
      {
        name: 'list_firewall_rules',
        description: 'List all firewall rules',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'get_dlp_policies',
        description: 'Get DLP (Data Loss Prevention) policies',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Specific policy ID (optional)',
            },
          },
        },
      },
      {
        name: 'list_locations',
        description: 'List all Zscaler locations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of locations to return',
            },
          },
        },
      },
      {
        name: 'get_sandbox_report',
        description: 'Get sandbox analysis report for a file',
        inputSchema: {
          type: 'object',
          properties: {
            file_hash: {
              type: 'string',
              description: 'MD5 or SHA256 hash of the file to analyze',
            },
            report_type: {
              type: 'string',
              description: 'Type of report (e.g., "full", "summary")',
            },
          },
          required: ['file_hash'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      if (!this.sessionCookie || Date.now() >= this.sessionExpiry) {
        await this.authenticate();
      }

      switch (name) {
        case 'list_url_categories':
          return await this.withReauth(() => this.listUrlCategories(args));
        case 'list_firewall_rules':
          return await this.withReauth(() => this.listFirewallRules(args));
        case 'get_dlp_policies':
          return await this.withReauth(() => this.getDlpPolicies(args));
        case 'list_locations':
          return await this.withReauth(() => this.listLocations(args));
        case 'get_sandbox_report':
          return await this.withReauth(() => this.getSandboxReport(args));
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : 'Unknown error') }],
        isError: true,
      };
    }
  }

  /**
   * Zscaler uses password-based cookie auth.
   * This is required by the Zscaler Internet Access API — no OAuth2 alternative exists.
   
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
  private async withReauth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        this.sessionCookie = null;
        this.sessionExpiry = 0;
        await this.authenticate();
        return await fn();
      }
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    if (!this.password) {
      throw new Error('Zscaler: cannot re-authenticate — password has been cleared after initial auth');
    }

    const url = `${this.baseUrl}/authenticatedSession`;
    const headers = { 'Content-Type': 'application/json' };

    const body = JSON.stringify({
      username: this.username,
      password: this.password,
      apiKey: this.apiKey,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Zscaler authentication failed: ${response.status} ${response.statusText}`);
    }

    // Extract session cookie from Set-Cookie header
    const cookies = response.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('No session cookie returned from Zscaler API');
    }

    this.sessionCookie = cookies.split(';')[0];
    this.sessionExpiry = Date.now() + ZscalerMCPServer.SESSION_TTL_MS;
    this.password = null;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Cookie': this.sessionCookie || '',
    };
  }

  private async listUrlCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;

    const url = `${this.baseUrl}/urlCategories?limit=${limit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Zscaler API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Zscaler returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listFirewallRules(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const offset = (args.offset as number) || 0;

    const url = `${this.baseUrl}/firewallRules?limit=${limit}&offset=${offset}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Zscaler API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Zscaler returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getDlpPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as string | undefined;

    let url = `${this.baseUrl}/dlpPolicies`;

    if (policyId) {
      url += `/${encodeURIComponent(policyId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Zscaler API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Zscaler returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;

    const url = `${this.baseUrl}/locations?limit=${limit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Zscaler API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Zscaler returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSandboxReport(args: Record<string, unknown>): Promise<ToolResult> {
    const fileHash = args.file_hash as string;
    const reportType = (args.report_type as string) || 'full';

    const url = `${this.baseUrl}/sandbox/report/${encodeURIComponent(fileHash)}?reportType=${encodeURIComponent(reportType)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Zscaler API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Zscaler returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
