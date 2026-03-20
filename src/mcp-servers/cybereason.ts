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

interface CybereasonConfig {
  host: string;
  username: string;
  password: string;
  port?: number;
  /** Set to false only in controlled non-production environments. Default: true */
  tlsRejectUnauthorized?: boolean;
  /** Session cookie TTL in milliseconds. Default: 86400000 (24 hours) */
  sessionTtlMs?: number;
}

export class CybereasonMCPServer {
  private readonly baseUrl: string;
  private readonly username: string;
  private password: string | null;
  private readonly headers: Record<string, string>;
  private sessionCookie: string | null = null;
  private sessionExpiry: number = 0;
  private readonly sessionTtlMs: number;

  constructor(config: CybereasonConfig) {
    const port = config.port || 8443;
    this.baseUrl = `https://${config.host}.cybereason.net:${port}`;
    this.username = config.username;
    this.password = config.password;
    this.sessionTtlMs = config.sessionTtlMs ?? 86400000; // 24 hours default
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_malops',
        description: 'List malware operations (MalOps) detected by Cybereason',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of MalOps to return' },
            offset: { type: 'number', description: 'Number of MalOps to skip' },
            status: { type: 'string', description: 'Filter by status (active, archived, closed)' },
          },
        },
      },
      {
        name: 'get_malop',
        description: 'Get details of a specific MalOp',
        inputSchema: {
          type: 'object',
          properties: {
            malopId: { type: 'string', description: 'MalOp ID' },
          },
          required: ['malopId'],
        },
      },
      {
        name: 'list_machines',
        description: 'List machines managed by Cybereason',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of machines to return' },
            offset: { type: 'number', description: 'Number of machines to skip' },
          },
        },
      },
      {
        name: 'get_sensor_status',
        description: 'Get sensor status for a machine',
        inputSchema: {
          type: 'object',
          properties: {
            machineId: { type: 'string', description: 'Machine ID' },
          },
          required: ['machineId'],
        },
      },
      {
        name: 'isolate_machine',
        description: 'Isolate a machine from the network',
        inputSchema: {
          type: 'object',
          properties: {
            machineId: { type: 'string', description: 'Machine ID to isolate' },
            reason: { type: 'string', description: 'Reason for isolation' },
          },
          required: ['machineId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      await this.ensureAuthenticated();

      switch (name) {
        case 'list_malops':
          return await this.listMalops(args);
        case 'get_malop':
          return await this.getMalop(args);
        case 'list_machines':
          return await this.listMachines(args);
        case 'get_sensor_status':
          return await this.getSensorStatus(args);
        case 'isolate_machine':
          return await this.isolateMachine(args);
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

  private async ensureAuthenticated(): Promise<void> {
    const now = Date.now();
    if (this.sessionCookie && now < this.sessionExpiry) {
      return;
    }

    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    if (!this.password) {
      throw new Error('Cannot re-authenticate: password has been cleared');
    }

    const loginUrl = `${this.baseUrl}/login.html`;
    const loginBody = {
      username: this.username,
      password: this.password,
    };

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(loginBody),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: HTTP ${response.status}`);
    }

    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('No session cookie received from authentication');
    }

    this.sessionCookie = setCookieHeader.split(';')[0];
    this.sessionExpiry = Date.now() + this.sessionTtlMs;
    this.headers['Cookie'] = this.sessionCookie;

    // Clear plaintext password from memory after successful authentication
    this.password = null;
  }

  private async fetchWithReauth(url: string, options: RequestInit): Promise<Response> {
    const response = await fetch(url, options);

    // On 401, clear the cached session and re-authenticate once
    if (response.status === 401) {
      this.sessionCookie = null;
      this.sessionExpiry = 0;
      delete this.headers['Cookie'];
      await this.ensureAuthenticated();
      return fetch(url, { ...options, headers: this.headers });
    }

    return response;
  }

  private async listMalops(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const status = args.status as string;

    const url = new URL(`${this.baseUrl}/api/v2.1/malops`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    if (status) {
      url.searchParams.append('status', status);
    }

    const response = await this.fetchWithReauth(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cybereason returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getMalop(args: Record<string, unknown>): Promise<ToolResult> {
    const malopId = args.malopId as string;
    if (!malopId) {
      throw new Error('malopId is required');
    }

    const url = `${this.baseUrl}/api/v2.1/malops/${encodeURIComponent(malopId)}`;
    const response = await this.fetchWithReauth(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cybereason returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listMachines(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = new URL(`${this.baseUrl}/api/v2.1/machines`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const response = await this.fetchWithReauth(url.toString(), { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cybereason returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getSensorStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const machineId = args.machineId as string;
    if (!machineId) {
      throw new Error('machineId is required');
    }

    const url = `${this.baseUrl}/api/v2.1/machines/${encodeURIComponent(machineId)}/sensor_status`;
    const response = await this.fetchWithReauth(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cybereason returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async isolateMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const machineId = args.machineId as string;
    const reason = args.reason as string;

    if (!machineId) {
      throw new Error('machineId is required');
    }

    const body = {
      machine_id: machineId,
      reason: reason || 'Security isolation via MCP',
    };

    const url = `${this.baseUrl}/api/v2.1/machines/${encodeURIComponent(machineId)}/isolate`;
    const response = await this.fetchWithReauth(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cybereason returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
