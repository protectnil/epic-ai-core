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

interface Rapid7Config {
  host: string;
  username: string;
  password: string;
  port?: number;
  /** Set to false only in controlled non-production environments. Default: true */
  tlsRejectUnauthorized?: boolean;
}

export class Rapid7MCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  constructor(config: Rapid7Config) {
    const port = config.port || 3780;
    this.baseUrl = `https://${config.host}:${port}/api/3`;
    // tlsRejectUnauthorized is stored for future use when the HTTP client is wired to respect it
    void (config.tlsRejectUnauthorized !== false);

    const credentials = btoa(`${config.username}:${config.password}`);
    this.headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities from Rapid7 InsightVM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of vulnerabilities to return' },
            offset: { type: 'number', description: 'Number of vulnerabilities to skip' },
            sort: { type: 'string', description: 'Field to sort by' },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get details of a specific vulnerability',
        inputSchema: {
          type: 'object',
          properties: {
            vulnId: { type: 'string', description: 'Vulnerability ID' },
          },
          required: ['vulnId'],
        },
      },
      {
        name: 'list_assets',
        description: 'List assets in Rapid7 InsightVM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of assets to return' },
            offset: { type: 'number', description: 'Number of assets to skip' },
          },
        },
      },
      {
        name: 'list_scans',
        description: 'List scans in Rapid7 InsightVM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of scans to return' },
            offset: { type: 'number', description: 'Number of scans to skip' },
          },
        },
      },
      {
        name: 'get_remediation',
        description: 'Get remediation advice for a vulnerability',
        inputSchema: {
          type: 'object',
          properties: {
            vulnId: { type: 'string', description: 'Vulnerability ID' },
            assetId: { type: 'string', description: 'Asset ID' },
          },
          required: ['vulnId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'get_vulnerability':
          return await this.getVulnerability(args);
        case 'list_assets':
          return await this.listAssets(args);
        case 'list_scans':
          return await this.listScans(args);
        case 'get_remediation':
          return await this.getRemediation(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const sort = (args.sort as string) || 'severity';

    const url = new URL(`${this.baseUrl}/vulnerabilities`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    url.searchParams.append('sort', sort);

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const vulnId = args.vulnId as string;
    if (!vulnId) {
      throw new Error('vulnId is required');
    }

    const url = new URL(`${this.baseUrl}/vulnerabilities/${encodeURIComponent(vulnId)}`);
    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = new URL(`${this.baseUrl}/assets`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listScans(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = new URL(`${this.baseUrl}/scans`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getRemediation(args: Record<string, unknown>): Promise<ToolResult> {
    const vulnId = args.vulnId as string;
    const assetId = args.assetId as string;

    if (!vulnId) {
      throw new Error('vulnId is required');
    }

    // Use URLSearchParams for query parameter construction — no raw concatenation of user input
    const url = new URL(`${this.baseUrl}/vulnerabilities/${encodeURIComponent(vulnId)}/remediation`);
    if (assetId) {
      url.searchParams.append('asset_id', assetId);
    }

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
