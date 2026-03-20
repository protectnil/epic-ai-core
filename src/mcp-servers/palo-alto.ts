import { ToolDefinition, ToolResult } from './types.js';

export class PaloAltoMCPServer {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly headers: Record<string, string>;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    // Finding #1/#10: API key moved to X-PAN-KEY header — never in URL query string.
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-PAN-KEY': this.apiKey,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_security_rules',
        description: 'List all security rules from the firewall',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location of the rules (e.g., "vsys" or "device")',
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
          required: ['location'],
        },
      },
      {
        name: 'get_threats',
        description: 'Retrieve current threat information from the firewall',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Specific threat ID to retrieve (optional)',
            },
            category: {
              type: 'string',
              description: 'Filter threats by category',
            },
          },
        },
      },
      {
        name: 'list_url_categories',
        description: 'List all URL categories configured on the firewall',
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
        name: 'get_globalprotect_users',
        description: 'Get current GlobalProtect VPN users',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by user status (e.g., "active", "disconnected")',
            },
          },
        },
      },
      {
        name: 'get_system_info',
        description: 'Retrieve firewall system information',
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
        case 'list_security_rules':
          return await this.listSecurityRules(args);
        case 'get_threats':
          return await this.getThreats(args);
        case 'list_url_categories':
          return await this.listUrlCategories(args);
        case 'get_globalprotect_users':
          return await this.getGlobalProtectUsers(args);
        case 'get_system_info':
          return await this.getSystemInfo(args);
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

  private async listSecurityRules(args: Record<string, unknown>): Promise<ToolResult> {
    const location = args.location as string;
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    // Finding #1: No ?key= in URL; key is in X-PAN-KEY header set at construction.
    const url = `${this.baseUrl}/config/devices/entry/name/localhost/vsys/entry/name/${encodeURIComponent(location)}/security/rules?limit=${limit}&offset=${offset}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Palo Alto API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19: wrap response.json() in try-catch
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Palo Alto returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const threatId = args.threat_id as string | undefined;
    const category = args.category as string | undefined;

    // Finding #1: No ?key= in URL.
    let url = `${this.baseUrl}/config/devices/entry/name/localhost/vsys/entry/name/vsys1/threat`;
    const params = new URLSearchParams();
    if (threatId) params.append('threat-id', threatId);
    if (category) params.append('category', category);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const response = await fetch(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      throw new Error(`Palo Alto API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Palo Alto returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listUrlCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;

    // Finding #1: No ?key= in URL.
    const url = `${this.baseUrl}/config/devices/entry/name/localhost/vsys/entry/name/vsys1/url-category?limit=${limit}`;

    const response = await fetch(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      throw new Error(`Palo Alto API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Palo Alto returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getGlobalProtectUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const status = args.status as string | undefined;

    // Finding #1/#7: No ?key= in URL; status is encodeURIComponent-encoded.
    let url = `${this.baseUrl}/config/devices/entry/name/localhost/vsys/entry/name/vsys1/global-protect/users`;
    if (status) {
      url += `?status=${encodeURIComponent(status)}`;
    }

    const response = await fetch(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      throw new Error(`Palo Alto API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Palo Alto returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSystemInfo(_args: Record<string, unknown>): Promise<ToolResult> {
    // Finding #1: No ?key= in URL.
    const url = `${this.baseUrl}/config/system`;

    const response = await fetch(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      throw new Error(`Palo Alto API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Palo Alto returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
