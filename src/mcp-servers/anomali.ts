/**
 * Anomali ThreatStream MCP Server Wrapper
 * Integrates Anomali ThreatStream REST API for threat intelligence and indicators
 * Base URL: https://api.threatstream.com/api/v2
 * Auth: Authorization header (apikey {username}:{apiKey})
 */

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}

interface AnomaliConfig {
  username: string;
  apiKey: string;
  baseUrl?: string;
}

export class AnomaliMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: AnomaliConfig) {
    this.baseUrl = config.baseUrl || 'https://api.threatstream.com/api/v2';
    // Credentials are sent in the Authorization header — never in URL query parameters
    this.headers = {
      'Authorization': `apikey ${config.username}:${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_indicators',
        description: 'Search for threat indicators (IPs, domains, hashes, etc)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (IP, domain, hash, email, URL, etc)',
            },
            type: {
              type: 'string',
              description: 'Indicator type (ip, domain, hash_md5, hash_sha1, hash_sha256, email, url)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip',
            },
            confidence: {
              type: 'number',
              description: 'Minimum confidence level (0-100)',
            },
          },
        },
      },
      {
        name: 'get_indicator',
        description: 'Get detailed information about a specific indicator by ID',
        inputSchema: {
          type: 'object',
          properties: {
            indicatorId: {
              type: 'string',
              description: 'The indicator ID',
            },
          },
          required: ['indicatorId'],
        },
      },
      {
        name: 'list_threat_bulletins',
        description: 'List threat intelligence bulletins and reports',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of bulletins to return',
            },
            offset: {
              type: 'number',
              description: 'Number of bulletins to skip',
            },
            tag: {
              type: 'string',
              description: 'Filter by threat bulletin tag',
            },
          },
        },
      },
      {
        name: 'search_actors',
        description: 'Search for threat actors and campaigns',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for actor name or campaign',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip',
            },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get details about a vulnerability',
        inputSchema: {
          type: 'object',
          properties: {
            cveId: {
              type: 'string',
              description: 'CVE ID (e.g., CVE-2024-1234)',
            },
          },
          required: ['cveId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_indicators':
          return await this.searchIndicators(args);
        case 'get_indicator':
          return await this.getIndicator(args);
        case 'list_threat_bulletins':
          return await this.listThreatBulletins(args);
        case 'search_actors':
          return await this.searchActors(args);
        case 'get_vulnerability':
          return await this.getVulnerability(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async searchIndicators(args: Record<string, unknown>): Promise<ToolResult> {
    const query = String(args.query ?? '');

    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 50));
    params.append('offset', String(args.offset || 0));
    if (args.type) params.append('type', String(args.type));
    if (args.confidence !== undefined) params.append('confidence__gte', String(args.confidence));
    if (query) params.append('value__icontains', query);

    const response = await fetch(
      `${this.baseUrl}/indicators/?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Anomali API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Anomali returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getIndicator(args: Record<string, unknown>): Promise<ToolResult> {
    const { indicatorId } = args;
    if (!indicatorId) {
      throw new Error('indicatorId is required');
    }

    const response = await fetch(
      `${this.baseUrl}/indicators/${encodeURIComponent(String(indicatorId))}/`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Anomali API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Anomali returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listThreatBulletins(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 50));
    params.append('offset', String(args.offset || 0));
    if (args.tag) params.append('tags__name', String(args.tag));

    const response = await fetch(
      `${this.baseUrl}/bulletins/?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Anomali API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Anomali returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async searchActors(args: Record<string, unknown>): Promise<ToolResult> {
    const query = String(args.query ?? '');

    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 50));
    params.append('offset', String(args.offset || 0));
    if (query) params.append('name__icontains', query);

    const response = await fetch(
      `${this.baseUrl}/actors/?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Anomali API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Anomali returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const { cveId } = args;
    if (!cveId) {
      throw new Error('cveId is required');
    }

    const params = new URLSearchParams();
    params.append('cve_id', String(cveId));

    const response = await fetch(
      `${this.baseUrl}/vulnerabilities/?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Anomali API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Anomali returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
