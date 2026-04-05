/**
 * Five9 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Five9 MCP server was found on GitHub, npmjs.com, or Five9's developer portal.
// Five9 Developer Program publishes sample code and CRM SDK samples but no MCP server.
//
// IMPORTANT ARCHITECTURE NOTE: Five9 has a split API surface.
//   - Agent/Supervisor REST API (https://app.five9.com/appsvcs/rs/svc):
//       Covers session management (/auth/metadata), agent state, and supervisor real-time
//       statistics (/supsvcs/rs/svc/supervisors/statistics/*). This is what this adapter
//       uses. There are NO publicly documented REST endpoints for campaigns, skills,
//       dispositions, users, IVR scripts, or call logs in this REST API.
//   - Configuration Web Services (SOAP, api.five9.com/wsadmin/v[N]/AdminWebService?wsdl):
//       All admin/config operations (users, campaigns, calling lists, skills, contact
//       records, dispositions, IVR scripts, reporting) go through SOAP only.
//       Last formally updated September 2021 (WSDL versions through v12).
// Tools that target config-only operations are UNVERIFIED against the REST API.
// Recommendation: use-rest-api for session/stats tools; SOAP for admin operations.
//
// Base URL: https://app.five9.com/appsvcs/rs/svc (agent/supervisor REST API)
// Auth: Session-based — POST to /auth/metadata with Basic credentials, then use
//       the returned host URL + session cookies for subsequent requests.
//       For supervisor stats, the base path is /supsvcs/rs/svc.
// Docs: https://webapps.five9.com/assets/files/for_customers/documentation/apis/vcc-agent+supervisor-rest-api-reference-guide.pdf
//       SOAP: https://api.five9.com/wsadmin/v12/AdminWebService?wsdl
// Rate limits: Not publicly documented — Five9 recommends exponential backoff.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Five9Config {
  username: string;
  password: string;
  baseUrl?: string;
}

export class Five9MCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: Five9Config) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://app.five9.com/appsvcs/rs/svc';
  }

  static catalog() {
    return {
      name: 'five9',
      displayName: 'Five9',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'five9', 'contact center', 'call center', 'ccaas', 'agent', 'supervisor',
        'campaign', 'queue', 'ivr', 'dialer', 'omnichannel', 'vcc', 'cloud contact',
        'calls', 'statistics', 'skill', 'disposition',
      ],
      toolNames: [
        'get_session_metadata',
        'get_supervisor_statistics',
        'list_agents',
        'get_agent_state',
        'list_campaigns',
        'get_campaign',
        'start_campaign',
        'stop_campaign',
        'list_skills',
        'list_dispositions',
        'get_queue_statistics',
        'list_call_logs',
        'get_ivr_scripts',
        'list_users',
        'get_domain_info',
      ],
      description: 'Five9 cloud contact center: manage agents, campaigns, queues, call statistics, IVR scripts, and supervisor monitoring.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_session_metadata',
        description: 'Retrieve Five9 VCC session metadata and the canonical API host URL for the authenticated account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_supervisor_statistics',
        description: 'Retrieve real-time contact center statistics including queue depths, agent states, and campaign performance',
        inputSchema: {
          type: 'object',
          properties: {
            statistics_type: {
              type: 'string',
              description: 'Type of statistics to retrieve: agent, acds, campaigns (default: acds)',
            },
          },
        },
      },
      {
        name: 'list_agents',
        description: 'List all agents in the Five9 domain with their current login state and skill assignments',
        inputSchema: {
          type: 'object',
          properties: {
            skill: {
              type: 'string',
              description: 'Filter agents by skill name (optional)',
            },
          },
        },
      },
      {
        name: 'get_agent_state',
        description: 'Get the current state and activity of a specific agent by username',
        inputSchema: {
          type: 'object',
          properties: {
            agent_username: {
              type: 'string',
              description: 'The Five9 username (email) of the agent',
            },
          },
          required: ['agent_username'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List all inbound and outbound campaigns with their type, state, and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by campaign type: INBOUND, OUTBOUND, AUTODIAL (optional, returns all if omitted)',
            },
            state: {
              type: 'string',
              description: 'Filter by state: RUNNING, STOPPED (optional)',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get detailed configuration and current state of a specific Five9 campaign by name',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_name: {
              type: 'string',
              description: 'Name of the campaign to retrieve',
            },
          },
          required: ['campaign_name'],
        },
      },
      {
        name: 'start_campaign',
        description: 'Start a stopped Five9 outbound or inbound campaign by name',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_name: {
              type: 'string',
              description: 'Name of the campaign to start',
            },
          },
          required: ['campaign_name'],
        },
      },
      {
        name: 'stop_campaign',
        description: 'Stop a running Five9 campaign by name',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_name: {
              type: 'string',
              description: 'Name of the campaign to stop',
            },
          },
          required: ['campaign_name'],
        },
      },
      {
        name: 'list_skills',
        description: 'List all routing skills defined in the Five9 domain with their assignments and settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_dispositions',
        description: 'List all call dispositions (wrap-up codes) configured in the Five9 domain',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_queue_statistics',
        description: 'Get real-time queue depth, wait time, and abandon rate statistics for all or a specific skill queue',
        inputSchema: {
          type: 'object',
          properties: {
            skill_name: {
              type: 'string',
              description: 'Skill queue name to get statistics for (optional, returns all queues if omitted)',
            },
          },
        },
      },
      {
        name: 'list_call_logs',
        description: 'Retrieve call log records with optional date range and agent filters',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date for call log query in ISO 8601 format (e.g. 2026-03-01)',
            },
            end_date: {
              type: 'string',
              description: 'End date for call log query in ISO 8601 format (e.g. 2026-03-24)',
            },
            agent_username: {
              type: 'string',
              description: 'Filter logs by agent username (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_ivr_scripts',
        description: 'List all IVR scripts configured in the Five9 domain with their names and state',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_users',
        description: 'List all Five9 user accounts including agents, supervisors, and admins with their roles and states',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Filter by role: Agent, Supervisor, Admin (optional)',
            },
          },
        },
      },
      {
        name: 'get_domain_info',
        description: 'Get Five9 domain configuration including timezone, locale, and feature settings',
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
        case 'get_session_metadata':
          return this.getSessionMetadata();
        case 'get_supervisor_statistics':
          return this.getSupervisorStatistics(args);
        case 'list_agents':
          return this.listAgents(args);
        case 'get_agent_state':
          return this.getAgentState(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'start_campaign':
          return this.startCampaign(args);
        case 'stop_campaign':
          return this.stopCampaign(args);
        case 'list_skills':
          return this.listSkills();
        case 'list_dispositions':
          return this.listDispositions();
        case 'get_queue_statistics':
          return this.getQueueStatistics(args);
        case 'list_call_logs':
          return this.listCallLogs(args);
        case 'get_ivr_scripts':
          return this.getIvrScripts();
        case 'list_users':
          return this.listUsers(args);
        case 'get_domain_info':
          return this.getDomainInfo();
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

  private get basicAuth(): string {
    return `Basic ${btoa(`${this.username}:${this.password}`)}`;
  }


  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: this.basicAuth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: this.basicAuth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: 'success' }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSessionMetadata(): Promise<ToolResult> {
    return this.apiGet('/auth/metadata');
  }

  private async getSupervisorStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    const type = (args.statistics_type as string) || 'acds';
    const supBase = this.baseUrl.replace('/appsvcs/rs/svc', '/supsvcs/rs/svc');
    const response = await this.fetchWithRetry(`${supBase}/supervisors/statistics/${type}`, {
      method: 'GET',
      headers: {
        Authorization: this.basicAuth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.skill
      ? `/orgs/this/skills/${encodeURIComponent(args.skill as string)}/agents`
      : '/orgs/this/agents';
    return this.apiGet(path);
  }

  private async getAgentState(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_username) {
      return { content: [{ type: 'text', text: 'agent_username is required' }], isError: true };
    }
    return this.apiGet(`/agents/${encodeURIComponent(args.agent_username as string)}/state`);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/orgs/this/campaigns';
    const params: string[] = [];
    if (args.type) params.push(`type=${encodeURIComponent(args.type as string)}`);
    if (args.state) params.push(`state=${encodeURIComponent(args.state as string)}`);
    if (params.length) path += '?' + params.join('&');
    return this.apiGet(path);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_name) {
      return { content: [{ type: 'text', text: 'campaign_name is required' }], isError: true };
    }
    return this.apiGet(`/orgs/this/campaigns/${encodeURIComponent(args.campaign_name as string)}`);
  }

  private async startCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_name) {
      return { content: [{ type: 'text', text: 'campaign_name is required' }], isError: true };
    }
    return this.apiPut(`/orgs/this/campaigns/${encodeURIComponent(args.campaign_name as string)}/start`);
  }

  private async stopCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_name) {
      return { content: [{ type: 'text', text: 'campaign_name is required' }], isError: true };
    }
    return this.apiPut(`/orgs/this/campaigns/${encodeURIComponent(args.campaign_name as string)}/stop`);
  }

  private async listSkills(): Promise<ToolResult> {
    return this.apiGet('/orgs/this/skills');
  }

  private async listDispositions(): Promise<ToolResult> {
    return this.apiGet('/orgs/this/dispositions');
  }

  private async getQueueStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.skill_name) {
      return this.apiGet(`/orgs/this/skills/${encodeURIComponent(args.skill_name as string)}/queue_statistics`);
    }
    return this.apiGet('/orgs/this/queue_statistics');
  }

  private async listCallLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.start_date) params.push(`startDate=${encodeURIComponent(args.start_date as string)}`);
    if (args.end_date) params.push(`endDate=${encodeURIComponent(args.end_date as string)}`);
    if (args.agent_username) params.push(`agentUsername=${encodeURIComponent(args.agent_username as string)}`);
    if (args.limit) params.push(`limit=${encodeURIComponent(args.limit as string)}`);
    const qs = params.length ? '?' + params.join('&') : '';
    return this.apiGet(`/orgs/this/call_logs${qs}`);
  }

  private async getIvrScripts(): Promise<ToolResult> {
    return this.apiGet('/orgs/this/ivr_scripts');
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.role
      ? `/orgs/this/users?role=${encodeURIComponent(args.role as string)}`
      : '/orgs/this/users';
    return this.apiGet(path);
  }

  private async getDomainInfo(): Promise<ToolResult> {
    return this.apiGet('/orgs/this');
  }
}
