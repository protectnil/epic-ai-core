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

interface TenableConfig {
  baseUrl?: string;
  accessKey: string;
  secretKey: string;
}

export class TenableMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: TenableConfig) {
    this.baseUrl = config.baseUrl || 'https://cloud.tenable.com';
    const apiKeys = `accessKey=${config.accessKey};secretKey=${config.secretKey}`;
    this.headers = {
      'X-ApiKeys': apiKeys,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities from Tenable Vulnerability Management',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of vulnerabilities to return' },
            offset: { type: 'number', description: 'Number of vulnerabilities to skip' },
            sortBy: { type: 'string', description: 'Field to sort by' },
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
        description: 'List assets in Tenable Vulnerability Management',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of assets to return' },
            offset: { type: 'number', description: 'Number of assets to skip' },
          },
        },
      },
      {
        name: 'run_scan',
        description: 'Run a vulnerability scan',
        inputSchema: {
          type: 'object',
          properties: {
            scanId: { type: 'string', description: 'Scan template ID' },
            targets: { type: 'array', items: { type: 'string' }, description: 'List of target IPs/hostnames' },
            scanName: { type: 'string', description: 'Name for this scan run' },
          },
          required: ['scanId', 'targets'],
        },
      },
      {
        name: 'get_compliance_status',
        description: 'Get compliance status',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: { type: 'string', description: 'Asset ID' },
          },
          required: ['assetId'],
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
        case 'run_scan':
          return await this.runScan(args);
        case 'get_compliance_status':
          return await this.getComplianceStatus(args);
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
    const sortBy = (args.sortBy as string) || 'severity';

    const url = new URL(`${this.baseUrl}/vuln-api/vulnerabilities`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    url.searchParams.append('sort', sortBy);

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

    // encodeURIComponent applied to all path segment values
    const url = `${this.baseUrl}/vuln-api/vulnerabilities/${encodeURIComponent(vulnId)}`;
    const response = await fetch(url, { headers: this.headers });
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

    const url = new URL(`${this.baseUrl}/asset-api/assets`);
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

  private async runScan(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scanId as string;
    const targets = args.targets as string[];
    const scanName = args.scanName as string;

    if (!scanId || !targets || targets.length === 0) {
      throw new Error('scanId and targets are required');
    }

    const body = {
      scan_id: scanId,
      targets: targets,
      scan_name: scanName || `Scan-${Date.now()}`,
    };

    const url = `${this.baseUrl}/scans`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getComplianceStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.assetId as string;
    if (!assetId) {
      throw new Error('assetId is required');
    }

    // encodeURIComponent applied to all path segment values
    const url = `${this.baseUrl}/asset-api/assets/${encodeURIComponent(assetId)}/compliance`;
    const response = await fetch(url, { headers: this.headers });
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
