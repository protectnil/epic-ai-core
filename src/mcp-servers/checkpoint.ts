import { ToolDefinition, ToolResult } from './types.js';

export class CheckPointMCPServer {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private sessionId: string | null = null;
  // Finding #8: track session token expiry; Check Point sessions are 10 minutes by default
  private tokenExpiry: number = 0;
  private static readonly SESSION_TTL_MS = 600_000; // 10 minutes

  constructor(config: { baseUrl: string; username: string; password: string }) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_access_rules',
        description: 'List all access control rules',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the access policy',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'show_gateways',
        description: 'List all configured gateways',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of gateways to return',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'list_threat_logs',
        description: 'List threat prevention logs',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression for logs',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of logs to return',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get access control policy details',
        inputSchema: {
          type: 'object',
          properties: {
            policy_name: {
              type: 'string',
              description: 'Name of the policy',
            },
          },
          required: ['policy_name'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List active user sessions',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      // Finding #8: Ensure valid session; re-auth if expired
      if (!this.sessionId || Date.now() >= this.tokenExpiry) {
        await this.login();
      }

      switch (name) {
        case 'list_access_rules':
          return await this.withReauth(() => this.listAccessRules(args));
        case 'show_gateways':
          return await this.withReauth(() => this.showGateways(args));
        case 'list_threat_logs':
          return await this.withReauth(() => this.listThreatLogs(args));
        case 'get_policy':
          return await this.withReauth(() => this.getPolicy(args));
        case 'list_sessions':
          return await this.withReauth(() => this.listSessions(args));
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown error' }],
        isError: true,
      };
    }
  }

  /**
   * Finding #8: On 401/403, clear session and re-authenticate once, then retry.
   * NOTE (Finding #17): Check Point uses password-based session auth (ROPC-equivalent).
   * This is required by the Check Point Management API — no alternative token endpoint exists.
   */
  private async withReauth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('401') || error.message.includes('403'))
      ) {
        // Clear stale session and re-authenticate once
        this.sessionId = null;
        this.tokenExpiry = 0;
        await this.login();
        return await fn();
      }
      throw error;
    }
  }

  private async login(): Promise<void> {
    const url = `${this.baseUrl}/login`;
    const headers = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({
      user: this.username,
      password: this.password,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Check Point login failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { sid?: string };
    if (!data.sid) {
      throw new Error('No session ID returned from Check Point API');
    }

    this.sessionId = data.sid;
    // Finding #8: record expiry so we re-auth before the session times out
    this.tokenExpiry = Date.now() + CheckPointMCPServer.SESSION_TTL_MS;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Chkp-SID': this.sessionId || '',
    };
  }

  private async listAccessRules(args: Record<string, unknown>): Promise<ToolResult> {
    const policyName = args.policy_name as string;
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = `${this.baseUrl}/show-access-rulebase`;
    const body = JSON.stringify({
      policy_name: policyName,
      limit,
      offset,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body,
    });

    if (!response.ok) {
      throw new Error(`Check Point API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Check Point returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async showGateways(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = `${this.baseUrl}/show-gateways`;
    const body = JSON.stringify({ limit, offset });

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body,
    });

    if (!response.ok) {
      throw new Error(`Check Point API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Check Point returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listThreatLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const filter = args.filter as string | undefined;
    const limit = (args.limit as number) || 100;

    const url = `${this.baseUrl}/show-threat-logs`;
    const body: Record<string, unknown> = { limit };

    if (filter) {
      body.filter = filter;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Check Point API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Check Point returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const policyName = args.policy_name as string;

    const url = `${this.baseUrl}/show-access-policy`;
    const body = JSON.stringify({ policy_name: policyName });

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body,
    });

    if (!response.ok) {
      throw new Error(`Check Point API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Check Point returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSessions(_args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (_args.limit as number) || 50;

    const url = `${this.baseUrl}/show-sessions`;
    const body = JSON.stringify({ limit });

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body,
    });

    if (!response.ok) {
      throw new Error(`Check Point API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Check Point returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
