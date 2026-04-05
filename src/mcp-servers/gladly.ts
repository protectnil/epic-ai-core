/**
 * Gladly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Gladly MCP server found on GitHub or the Gladly developer portal.
// Community integrations exist via Unified.to and Merge.dev but no first-party MCP.
// Recommendation: Use this REST adapter. Evaluate vendor MCP if one is published.
//
// Base URL: https://{organization}.gladly.com/api/v1
// Auth: Basic auth — base64(email:apiToken) per developer.gladly.com
// Docs: https://developer.gladly.com/rest/
// Rate limits: 10 requests/second per method (GET, POST, PUT, PATCH, DELETE).
//   Reports API: 10 requests/minute with 2 concurrent requests across the org.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GladlyConfig {
  organization: string;
  email: string;
  apiToken: string;
  baseUrl?: string;
}

export class GladlyMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: GladlyConfig) {
    super();
    const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || `https://${config.organization}.gladly.com/api/v1`;
  }

  static catalog() {
    return {
      name: 'gladly',
      displayName: 'Gladly',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'gladly', 'customer service', 'support', 'helpdesk', 'conversation',
        'ticket', 'agent', 'inbox', 'topic', 'contact center', 'crm',
      ],
      toolNames: [
        'get_organization',
        'get_conversation',
        'get_conversation_items',
        'update_conversation',
        'add_conversation_topic',
        'add_conversation_note',
        'list_customers',
        'get_customer',
        'create_customer',
        'update_customer',
        'search_customers',
        'list_agents',
        'get_agent',
        'list_inboxes',
      ],
      description: 'Gladly customer service platform: manage conversations, customers, agents, and inboxes. Search, triage, assign, and close support conversations.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_organization',
        description: 'Get details and configuration of the Gladly organization including settings and feature flags.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_conversation',
        description: 'Get full details of a specific Gladly conversation by ID, including assignee, inbox, topics, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'get_conversation_items',
        description: 'Get the timeline items (messages, notes, channel interactions) for a specific conversation, up to 1000 items.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'update_conversation',
        description: 'Update a Gladly conversation: reassign to an agent or inbox, change status (OPEN, WAITING, CLOSED), or both in a single PATCH call.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID to update',
            },
            agent_id: {
              type: 'string',
              description: 'Agent ID to assign the conversation to (optional)',
            },
            inbox_id: {
              type: 'string',
              description: 'Inbox ID to route the conversation to (optional)',
            },
            status: {
              type: 'string',
              description: 'New conversation status: OPEN, WAITING, or CLOSED (optional)',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'add_conversation_topic',
        description: 'Add one or more topics to a Gladly conversation by topic ID. Use list_topics (Topics API) to retrieve valid topic IDs first.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID',
            },
            topic_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of topic IDs to add to the conversation (topics already on the conversation are ignored)',
            },
          },
          required: ['conversation_id', 'topic_ids'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customer profiles in the Gladly organization. Returns up to 50 profiles sorted by most recently updated.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of customers to return (default: 50, max: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get full profile details for a specific Gladly customer by ID, including contact information and conversation history.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Gladly customer ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer profile in Gladly with name, email, phone, and optional external system ID.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Customer full name',
            },
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number in E.164 format (e.g., +15555551234)',
            },
            external_customer_id: {
              type: 'string',
              description: 'Your system\'s unique identifier for this customer (for cross-system linking)',
            },
          },
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing Gladly customer profile. Only supplied fields are changed (patch semantics).',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Gladly customer ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated customer full name',
            },
            email: {
              type: 'string',
              description: 'Updated customer email address',
            },
            phone: {
              type: 'string',
              description: 'Updated customer phone number',
            },
            external_customer_id: {
              type: 'string',
              description: 'Updated external system ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'search_customers',
        description: 'Find Gladly customer profiles by email, phone number (E.164 format), or external customer ID. Returns up to 50 profiles.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to search for (e.g. customer@email.net)',
            },
            phone_number: {
              type: 'string',
              description: 'Phone number in E.164 format to search for (e.g. +16505551987)',
            },
            external_customer_id: {
              type: 'string',
              description: 'External system customer ID to look up',
            },
          },
        },
      },
      {
        name: 'list_agents',
        description: 'List agents (teammates) in the Gladly organization with their profile and availability status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return (default: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get profile and role details for a specific Gladly agent by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Gladly agent ID',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'list_inboxes',
        description: 'List all inboxes configured in the Gladly organization, including channel types and routing rules.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_conversation_note',
        description: 'Add an internal agent note to a Gladly conversation. Notes are visible only to agents and not to the customer. Supports plain text or rich content.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID to add the note to',
            },
            body: {
              type: 'string',
              description: 'Note body text (plain text or constrained HTML rich content)',
            },
          },
          required: ['conversation_id', 'body'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_organization':
          return await this.getOrganization();
        case 'get_conversation':
          return await this.getConversation(args);
        case 'get_conversation_items':
          return await this.getConversationItems(args);
        case 'update_conversation':
          return await this.updateConversation(args);
        case 'add_conversation_topic':
          return await this.addConversationTopic(args);
        case 'add_conversation_note':
          return await this.addConversationNote(args);
        case 'list_customers':
          return await this.listCustomers(args);
        case 'get_customer':
          return await this.getCustomer(args);
        case 'create_customer':
          return await this.createCustomer(args);
        case 'update_customer':
          return await this.updateCustomer(args);
        case 'search_customers':
          return await this.searchCustomers(args);
        case 'list_agents':
          return await this.listAgents(args);
        case 'get_agent':
          return await this.getAgent(args);
        case 'list_inboxes':
          return await this.listInboxes();
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

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async getOrganization(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/organization`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get organization: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    if (!conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get conversation: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getConversationItems(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    if (!conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/items`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get conversation items: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    if (!conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = {};
    if (args.agent_id || args.inbox_id) {
      const assignee: Record<string, unknown> = {};
      if (args.inbox_id) assignee.inboxId = args.inbox_id;
      if (args.agent_id) assignee.agentId = args.agent_id;
      payload.assignee = assignee;
    }
    if (args.status) {
      payload.status = { value: args.status };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify(payload) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update conversation: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addConversationTopic(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    const topic_ids = args.topic_ids as string[];
    if (!conversation_id || !topic_ids || topic_ids.length === 0) {
      return { content: [{ type: 'text', text: 'conversation_id and topic_ids are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/topics`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({ topicIds: topic_ids }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to add topic: ${response.status} ${response.statusText}` }], isError: true };
    }
    // 204 No Content on success
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/customer-profiles${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list customers: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const customer_id = args.customer_id as string;
    if (!customer_id) {
      return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/customer-profiles/${encodeURIComponent(customer_id)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get customer: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {};
    if (args.name) payload.name = args.name;
    if (args.email) payload.emails = [{ original: args.email }];
    if (args.phone) payload.phones = [{ original: args.phone }];
    if (args.external_customer_id) payload.externalCustomerId = args.external_customer_id;
    const response = await this.fetchWithRetry(`${this.baseUrl}/customer-profiles`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create customer: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const customer_id = args.customer_id as string;
    if (!customer_id) {
      return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = {};
    if (args.name) payload.name = args.name;
    if (args.email) payload.emails = [{ original: args.email }];
    if (args.phone) payload.phones = [{ original: args.phone }];
    if (args.external_customer_id) payload.externalCustomerId = args.external_customer_id;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/customer-profiles/${encodeURIComponent(customer_id)}`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify(payload) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update customer: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.phone_number) params.set('phoneNumber', args.phone_number as string);
    if (args.external_customer_id) params.set('externalCustomerId', args.external_customer_id as string);
    if (!params.toString()) {
      return { content: [{ type: 'text', text: 'At least one search parameter (email, phone_number, or external_customer_id) is required' }], isError: true };
    }
    const url = `${this.baseUrl}/customer-profiles?${params.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search customers: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/agents${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list agents: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    const agent_id = args.agent_id as string;
    if (!agent_id) {
      return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/agents/${encodeURIComponent(agent_id)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get agent: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInboxes(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/inboxes`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list inboxes: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addConversationNote(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    const body = args.body as string;
    if (!conversation_id || !body) {
      return { content: [{ type: 'text', text: 'conversation_id and body are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/notes`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({ content: { body } }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to add note: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
