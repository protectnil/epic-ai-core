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

interface LogRhythmConfig {
  host: string;
  apiKey: string;
  port?: number;
  /** Set to false only in controlled non-production environments. Default: true */
  tlsRejectUnauthorized?: boolean;
}

export class LogRhythmMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: LogRhythmConfig) {
    const port = config.port || 8501;
    this.baseUrl = `https://${config.host}:${port}/lr-admin-api`;
    this.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alarms',
        description: 'List alarms in LogRhythm',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of alarms to return' },
            offset: { type: 'number', description: 'Number of alarms to skip' },
            status: { type: 'string', description: 'Filter by status (new, open, closed)' },
            severity: { type: 'string', description: 'Filter by severity (critical, high, medium, low)' },
          },
        },
      },
      {
        name: 'get_alarm',
        description: 'Get details of a specific alarm',
        inputSchema: {
          type: 'object',
          properties: {
            alarmId: { type: 'string', description: 'Alarm ID' },
          },
          required: ['alarmId'],
        },
      },
      {
        name: 'search_events',
        description: 'Search events in LogRhythm',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            startTime: { type: 'string', description: 'Start time (ISO 8601)' },
            endTime: { type: 'string', description: 'End time (ISO 8601)' },
            limit: { type: 'number', description: 'Maximum number of events to return' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_cases',
        description: 'List security investigation cases',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of cases to return' },
            offset: { type: 'number', description: 'Number of cases to skip' },
            status: { type: 'string', description: 'Filter by status (open, closed)' },
          },
        },
      },
      {
        name: 'update_case',
        description: 'Update a security case',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID' },
            status: { type: 'string', description: 'New status (open, closed)' },
            notes: { type: 'string', description: 'Case notes or comments' },
            assignee: { type: 'string', description: 'User ID to assign case to' },
          },
          required: ['caseId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alarms':
          return await this.listAlarms(args);
        case 'get_alarm':
          return await this.getAlarm(args);
        case 'search_events':
          return await this.searchEvents(args);
        case 'list_cases':
          return await this.listCases(args);
        case 'update_case':
          return await this.updateCase(args);
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

  private async listAlarms(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const status = args.status as string;
    const severity = args.severity as string;

    const url = new URL(`${this.baseUrl}/alarms`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    if (status) {
      url.searchParams.append('status', status);
    }
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

  private async getAlarm(args: Record<string, unknown>): Promise<ToolResult> {
    const alarmId = args.alarmId as string;
    if (!alarmId) {
      throw new Error('alarmId is required');
    }

    const url = `${this.baseUrl}/alarms/${encodeURIComponent(alarmId)}`;
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

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    const startTime = args.startTime as string;
    const endTime = args.endTime as string;
    const limit = (args.limit as number) || 50;

    if (!query) {
      throw new Error('query is required');
    }

    const body: Record<string, unknown> = {
      query: query,
      limit: limit,
    };

    if (startTime) {
      body.start_time = startTime;
    }
    if (endTime) {
      body.end_time = endTime;
    }

    const url = `${this.baseUrl}/events/search`;
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

  private async listCases(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const status = args.status as string;

    const url = new URL(`${this.baseUrl}/cases`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    if (status) {
      url.searchParams.append('status', status);
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

  private async updateCase(args: Record<string, unknown>): Promise<ToolResult> {
    const caseId = args.caseId as string;
    if (!caseId) {
      throw new Error('caseId is required');
    }

    const body: Record<string, unknown> = {};

    if (args.status) {
      body.status = args.status;
    }
    if (args.notes) {
      body.notes = args.notes;
    }
    if (args.assignee) {
      body.assignee = args.assignee;
    }

    if (Object.keys(body).length === 0) {
      throw new Error('At least one field (status, notes, or assignee) is required for update');
    }

    const url = `${this.baseUrl}/cases/${encodeURIComponent(caseId)}`;
    const response = await fetch(url, {
      method: 'PATCH',
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
}
