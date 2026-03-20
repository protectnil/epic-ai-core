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

interface QualysConfig {
  /**
   * Required. Qualys platform API URL — varies by region and subscription.
   * Examples: https://qualysapi.qualys.com, https://qualysapi.qg2.apps.qualys.com,
   *           https://qualysapi.qg3.apps.qualys.com, https://qualysapi.qg4.apps.qualys.com
   * No default is provided because using the wrong platform URL silently routes
   * requests to the wrong data centre.
   */
  baseUrl: string;
  username: string;
  password: string;
}

export class QualysMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: QualysConfig) {
    if (!config.baseUrl) {
      throw new Error(
        'QualysMCPServer: baseUrl is required. Qualys has multiple regional platforms; ' +
        'specify the correct URL for your subscription (e.g. https://qualysapi.qualys.com).'
      );
    }
    this.baseUrl = config.baseUrl;

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
        description: 'List vulnerabilities from Qualys',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of vulnerabilities to return' },
            offset: { type: 'number', description: 'Number of vulnerabilities to skip' },
            severity: { type: 'string', description: 'Filter by severity (critical, high, medium, low)' },
          },
        },
      },
      {
        name: 'launch_scan',
        description: 'Launch a vulnerability scan in Qualys',
        inputSchema: {
          type: 'object',
          properties: {
            scanName: { type: 'string', description: 'Name for the scan' },
            targets: { type: 'array', items: { type: 'string' }, description: 'List of IPs/hostnames to scan' },
            optionProfileId: { type: 'string', description: 'Option profile ID for scan settings' },
          },
          required: ['scanName', 'targets'],
        },
      },
      {
        name: 'get_scan_results',
        description: 'Get results of a specific scan',
        inputSchema: {
          type: 'object',
          properties: {
            scanId: { type: 'string', description: 'Scan ID' },
          },
          required: ['scanId'],
        },
      },
      {
        name: 'list_web_apps',
        description: 'List web applications in Qualys',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of web apps to return' },
            offset: { type: 'number', description: 'Number of web apps to skip' },
          },
        },
      },
      {
        name: 'get_compliance_posture',
        description: 'Get compliance posture information',
        inputSchema: {
          type: 'object',
          properties: {
            complianceType: { type: 'string', description: 'Compliance framework (e.g., pci-dss, hipaa, sox)' },
          },
          required: ['complianceType'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'launch_scan':
          return await this.launchScan(args);
        case 'get_scan_results':
          return await this.getScanResults(args);
        case 'list_web_apps':
          return await this.listWebApps(args);
        case 'get_compliance_posture':
          return await this.getCompliancePosture(args);
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
    const severity = args.severity as string;

    const url = new URL(`${this.baseUrl}/vulnerabilities`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    if (severity) {
      url.searchParams.append('severity', severity);
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

  private async launchScan(args: Record<string, unknown>): Promise<ToolResult> {
    const scanName = args.scanName as string;
    const targets = args.targets as string[];
    const optionProfileId = args.optionProfileId as string;

    if (!scanName || !targets || targets.length === 0) {
      throw new Error('scanName and targets are required');
    }

    const body = {
      scan_name: scanName,
      targets: targets.join(','),
      ...(optionProfileId && { option_profile_id: optionProfileId }),
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

  private async getScanResults(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scanId as string;
    if (!scanId) {
      throw new Error('scanId is required');
    }

    const url = `${this.baseUrl}/scans/${encodeURIComponent(scanId)}/results`;
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

  private async listWebApps(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = new URL(`${this.baseUrl}/web_applications`);
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

  private async getCompliancePosture(args: Record<string, unknown>): Promise<ToolResult> {
    const complianceType = args.complianceType as string;
    if (!complianceType) {
      throw new Error('complianceType is required');
    }

    const url = `${this.baseUrl}/compliance/posture/${encodeURIComponent(complianceType)}`;
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
