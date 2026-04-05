/**
 * Freshservice MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Freshworks has not published an official MCP server
//   for Freshservice. Community implementations exist (effytech/freshservice_mcp — community, MIT,
//   last commit Dec 2025; forterro/freshservice_mcp — community, MIT, 36 tools, stdio + SSE) but
//   neither is an official Freshworks product. None qualify under the 4-criteria protocol gate.
// Our adapter covers: 35 tools. Vendor MCP covers: 0 tools (no official server).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://{domain}/api/v2
//   domain = full Freshservice hostname, e.g. mycompany.freshservice.com
// Auth: HTTP Basic — API key as username, literal "X" as password
//   Authorization: Basic base64("<api_key>:X")
//   (Username/password Basic auth was deprecated 2023-05-31; API key only.)
// Docs: https://api.freshservice.com/
// Rate limits: Starter: 100 req/min overall; Growth: 200 req/min; Pro: 400 req/min; Enterprise: 500 req/min
//   Per-endpoint sub-limits apply (e.g., Create Ticket: 50/min Starter, 80/min Growth, 140/min Pro).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FreshserviceConfig {
  apiKey: string;
  /** Full Freshservice hostname, e.g. "mycompany.freshservice.com" */
  domain: string;
}

export class FreshserviceMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FreshserviceConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = `https://${config.domain}/api/v2`;
  }

  private get authHeader(): string {
    const encoded = Buffer.from(`${this.apiKey}:X`).toString('base64');
    return `Basic ${encoded}`;
  }

  static catalog() {
    return {
      name: 'freshservice',
      displayName: 'Freshservice',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['freshservice', 'freshworks', 'itsm', 'itil', 'service desk', 'ticket', 'incident', 'problem', 'change', 'release', 'asset', 'cmdb', 'service catalog', 'agent', 'department'],
      toolNames: [
        'list_tickets', 'get_ticket', 'create_ticket', 'update_ticket', 'delete_ticket',
        'filter_tickets', 'create_child_ticket',
        'add_ticket_note', 'list_ticket_conversations',
        'list_ticket_tasks', 'create_ticket_task',
        'list_problems', 'get_problem', 'create_problem', 'update_problem',
        'list_changes', 'get_change', 'create_change', 'update_change',
        'list_releases', 'get_release', 'create_release',
        'list_assets', 'get_asset', 'update_asset',
        'list_agents', 'get_agent',
        'list_departments', 'get_department',
        'list_locations',
        'list_service_catalog_items', 'get_service_catalog_item', 'create_service_request',
        'list_requesters', 'get_requester',
      ],
      description: 'Manage Freshservice ITSM: tickets, problems, changes, releases, assets, agents, departments, locations, service catalog, and requesters via the Freshservice REST API v2.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Tickets ───────────────────────────────────────────────────────────
      {
        name: 'list_tickets',
        description: 'List IT service tickets with optional filters for status, requester, agent, and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Predefined filter: new_and_my_open, watching, spam, or deleted' },
            requester_id: { type: 'number', description: 'Filter by requester ID' },
            agent_id: { type: 'number', description: 'Filter by assigned agent ID' },
            group_id: { type: 'number', description: 'Filter by assigned group ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
            order_by: { type: 'string', description: 'Sort field: created_at, due_by, updated_at (default: created_at)' },
            order_type: { type: 'string', description: 'Sort direction: asc or desc (default: desc)' },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Get full details of a specific Freshservice ticket by ID, including all ITIL fields',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshservice ticket ID' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new IT service ticket (incident or service request) with subject, requester, priority, and category',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Subject of the ticket (required)' },
            description: { type: 'string', description: 'HTML description of the ticket' },
            email: { type: 'string', description: 'Requester email address (required if requester_id not provided)' },
            requester_id: { type: 'number', description: 'Requester ID (required if email not provided)' },
            priority: { type: 'number', description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent (default: 1)' },
            status: { type: 'number', description: 'Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed (default: 2)' },
            type: { type: 'string', description: 'Ticket type: Incident or Service Request' },
            category: { type: 'string', description: 'Ticket category (e.g. Hardware, Software, Network)' },
            sub_category: { type: 'string', description: 'Ticket sub-category' },
            tags: { type: 'array', description: 'Array of tag strings', items: { type: 'string' } },
            agent_id: { type: 'number', description: 'Agent ID to assign the ticket to' },
            group_id: { type: 'number', description: 'Group ID to assign the ticket to' },
            department_id: { type: 'number', description: 'Department ID to associate with the ticket' },
          },
          required: ['subject'],
        },
      },
      {
        name: 'update_ticket',
        description: 'Update an existing Freshservice ticket — change status, priority, assignment, category, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The ticket ID to update (required)' },
            subject: { type: 'string', description: 'Updated subject' },
            description: { type: 'string', description: 'Updated HTML description' },
            priority: { type: 'number', description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent' },
            status: { type: 'number', description: 'Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed' },
            category: { type: 'string', description: 'Updated category' },
            tags: { type: 'array', description: 'Updated tags', items: { type: 'string' } },
            agent_id: { type: 'number', description: 'Agent ID to reassign to' },
            group_id: { type: 'number', description: 'Group ID to reassign to' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'delete_ticket',
        description: 'Delete a ticket by ID (moves to trash, recoverable within 30 days)',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshservice ticket ID to delete' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'filter_tickets',
        description: 'Filter tickets using Freshservice query syntax for complex ticket lookups',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Freshservice filter query, e.g. "status:2 AND priority:3"' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_child_ticket',
        description: 'Create a child ticket linked to an existing parent ticket, for sub-task tracking',
        inputSchema: {
          type: 'object',
          properties: {
            parent_ticket_id: { type: 'number', description: 'Parent ticket ID (required)' },
            subject: { type: 'string', description: 'Subject of the child ticket (required)' },
            email: { type: 'string', description: 'Requester email address' },
            description: { type: 'string', description: 'HTML description' },
            priority: { type: 'number', description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent' },
          },
          required: ['parent_ticket_id', 'subject'],
        },
      },
      // ── Ticket Conversations ──────────────────────────────────────────────
      {
        name: 'add_ticket_note',
        description: 'Add a note (private or public reply) to a Freshservice ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshservice ticket ID (required)' },
            body: { type: 'string', description: 'HTML content of the note (required)' },
            private: { type: 'boolean', description: 'Whether the note is private — agents only (default: true)' },
            notify_emails: { type: 'array', description: 'Email addresses to notify about this note', items: { type: 'string' } },
          },
          required: ['ticket_id', 'body'],
        },
      },
      {
        name: 'list_ticket_conversations',
        description: 'List all conversations (replies and notes) on a specific ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshservice ticket ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['ticket_id'],
        },
      },
      // ── Ticket Tasks ──────────────────────────────────────────────────────
      {
        name: 'list_ticket_tasks',
        description: 'List all tasks associated with a specific ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshservice ticket ID' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket_task',
        description: 'Create a task on a ticket with title, due date, and optional agent assignment',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshservice ticket ID (required)' },
            title: { type: 'string', description: 'Task title (required)' },
            description: { type: 'string', description: 'Task description' },
            due_date: { type: 'string', description: 'Task due date in ISO 8601 format, e.g. 2026-04-01T09:00:00Z' },
            agent_id: { type: 'number', description: 'Agent ID to assign the task to' },
            status: { type: 'number', description: 'Status: 1=Open, 2=In Progress, 3=Completed (default: 1)' },
          },
          required: ['ticket_id', 'title'],
        },
      },
      // ── Problems ──────────────────────────────────────────────────────────
      {
        name: 'list_problems',
        description: 'List ITIL problem records in Freshservice with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
          },
        },
      },
      {
        name: 'get_problem',
        description: 'Get full details of a specific problem record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            problem_id: { type: 'number', description: 'The Freshservice problem ID' },
          },
          required: ['problem_id'],
        },
      },
      {
        name: 'create_problem',
        description: 'Create a new ITIL problem record with subject, description, priority, and status',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Problem subject/title (required)' },
            email: { type: 'string', description: 'Requester email address' },
            description: { type: 'string', description: 'HTML description of the problem' },
            priority: { type: 'number', description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent (default: 1)' },
            status: { type: 'number', description: 'Status: 1=Open, 2=Change Requested, 3=Closed (default: 1)' },
            category: { type: 'string', description: 'Problem category' },
            agent_id: { type: 'number', description: 'Agent ID to assign the problem to' },
          },
          required: ['subject'],
        },
      },
      {
        name: 'update_problem',
        description: 'Update an existing problem record — change status, priority, assignment, or category',
        inputSchema: {
          type: 'object',
          properties: {
            problem_id: { type: 'number', description: 'The Freshservice problem ID to update (required)' },
            subject: { type: 'string', description: 'Updated subject' },
            description: { type: 'string', description: 'Updated HTML description' },
            priority: { type: 'number', description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent' },
            status: { type: 'number', description: 'Status: 1=Open, 2=Change Requested, 3=Closed' },
            category: { type: 'string', description: 'Updated category' },
            agent_id: { type: 'number', description: 'Agent ID to reassign to' },
          },
          required: ['problem_id'],
        },
      },
      // ── Changes ───────────────────────────────────────────────────────────
      {
        name: 'list_changes',
        description: 'List ITIL change requests in Freshservice with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
          },
        },
      },
      {
        name: 'get_change',
        description: 'Get full details of a specific change request by ID',
        inputSchema: {
          type: 'object',
          properties: {
            change_id: { type: 'number', description: 'The Freshservice change request ID' },
          },
          required: ['change_id'],
        },
      },
      {
        name: 'create_change',
        description: 'Create a new ITIL change request with subject, type, priority, and planned dates',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Change request subject/title (required)' },
            email: { type: 'string', description: 'Requester email address' },
            description: { type: 'string', description: 'HTML description of the change' },
            priority: { type: 'number', description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent (default: 1)' },
            status: { type: 'number', description: 'Status: 1=Open, 2=Planning, 3=Approval, 4=Pending Release, 5=Pending Review, 6=Closed (default: 1)' },
            change_type: { type: 'number', description: 'Type: 1=Minor, 2=Standard, 3=Major, 4=Emergency (default: 1)' },
            planned_start_date: { type: 'string', description: 'Planned start date/time in ISO 8601 format, e.g. 2026-04-01T09:00:00Z' },
            planned_end_date: { type: 'string', description: 'Planned end date/time in ISO 8601 format' },
            agent_id: { type: 'number', description: 'Agent ID to assign the change to' },
            group_id: { type: 'number', description: 'Group ID to assign the change to' },
          },
          required: ['subject'],
        },
      },
      {
        name: 'update_change',
        description: 'Update an existing change request — change status, type, planned dates, or assignment',
        inputSchema: {
          type: 'object',
          properties: {
            change_id: { type: 'number', description: 'The change request ID to update (required)' },
            status: { type: 'number', description: 'New status (1=Open through 6=Closed)' },
            change_type: { type: 'number', description: 'New type: 1=Minor, 2=Standard, 3=Major, 4=Emergency' },
            planned_start_date: { type: 'string', description: 'Updated planned start date in ISO 8601 format' },
            planned_end_date: { type: 'string', description: 'Updated planned end date in ISO 8601 format' },
            agent_id: { type: 'number', description: 'Agent ID to reassign to' },
            description: { type: 'string', description: 'Updated HTML description' },
          },
          required: ['change_id'],
        },
      },
      // ── Releases ──────────────────────────────────────────────────────────
      {
        name: 'list_releases',
        description: 'List ITIL release records in Freshservice with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
          },
        },
      },
      {
        name: 'get_release',
        description: 'Get full details of a specific release record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            release_id: { type: 'number', description: 'The Freshservice release ID' },
          },
          required: ['release_id'],
        },
      },
      {
        name: 'create_release',
        description: 'Create a new release record for coordinating deployments and software releases',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Release title (required)' },
            description: { type: 'string', description: 'HTML description of the release' },
            status: { type: 'number', description: 'Status: 1=Open, 2=On Hold, 3=In Progress, 4=Incomplete, 5=Completed (default: 1)' },
            release_type: { type: 'number', description: 'Type: 1=Minor, 2=Standard, 3=Major, 4=Emergency (default: 2)' },
            planned_start_date: { type: 'string', description: 'Planned start date in ISO 8601 format' },
            planned_end_date: { type: 'string', description: 'Planned end date in ISO 8601 format' },
            agent_id: { type: 'number', description: 'Agent ID to assign the release to' },
          },
          required: ['subject'],
        },
      },
      // ── Assets ────────────────────────────────────────────────────────────
      {
        name: 'list_assets',
        description: 'List IT assets (configuration items) in the Freshservice CMDB with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
            search: { type: 'string', description: 'Search term to filter assets by name or serial number' },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get full details of a specific asset by its display_id (not internal ID)',
        inputSchema: {
          type: 'object',
          properties: {
            display_id: { type: 'number', description: 'The Freshservice asset display ID (shown in UI)' },
          },
          required: ['display_id'],
        },
      },
      {
        name: 'update_asset',
        description: 'Update an asset record — change name, description, or custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            display_id: { type: 'number', description: 'The asset display ID to update (required)' },
            name: { type: 'string', description: 'Updated asset name' },
            description: { type: 'string', description: 'Updated asset description' },
            asset_state: { type: 'string', description: 'Asset lifecycle state, e.g. In Use, In Stock, Retired' },
            user_id: { type: 'number', description: 'User ID to assign the asset to' },
          },
          required: ['display_id'],
        },
      },
      // ── Agents ────────────────────────────────────────────────────────────
      {
        name: 'list_agents',
        description: 'List all agents in the Freshservice account with their roles and contact info',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filter by exact agent email' },
            active: { type: 'boolean', description: 'Filter by active status (default: all)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30)' },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get full details for a specific agent by ID',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'number', description: 'The Freshservice agent ID' },
          },
          required: ['agent_id'],
        },
      },
      // ── Departments ───────────────────────────────────────────────────────
      {
        name: 'list_departments',
        description: 'List all departments in the Freshservice account',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30)' },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get details of a specific department by ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: { type: 'number', description: 'The Freshservice department ID' },
          },
          required: ['department_id'],
        },
      },
      // ── Locations ─────────────────────────────────────────────────────────
      {
        name: 'list_locations',
        description: 'List all configured locations (offices, sites) in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30)' },
          },
        },
      },
      // ── Service Catalog ───────────────────────────────────────────────────
      {
        name: 'list_service_catalog_items',
        description: 'List all service catalog items available for users to request in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30)' },
          },
        },
      },
      {
        name: 'get_service_catalog_item',
        description: 'Get details of a specific service catalog item, including its custom fields and pricing',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'number', description: 'The service catalog item ID' },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'create_service_request',
        description: 'Submit a service request from the service catalog on behalf of a requester',
        inputSchema: {
          type: 'object',
          properties: {
            display_id: { type: 'number', description: 'Service catalog item display_id to request (required)' },
            email: { type: 'string', description: 'Requester email address' },
            quantity: { type: 'number', description: 'Quantity to request (default: 1)' },
            child_items: {
              type: 'array',
              description: 'Array of child catalog items to include in the bundle',
              items: { type: 'object' },
            },
          },
          required: ['display_id'],
        },
      },
      // ── Requesters ────────────────────────────────────────────────────────
      {
        name: 'list_requesters',
        description: 'List all requesters (end users) in the Freshservice account',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filter by exact email address' },
            department_id: { type: 'number', description: 'Filter by department ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
          },
        },
      },
      {
        name: 'get_requester',
        description: 'Get details for a specific requester (end user) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            requester_id: { type: 'number', description: 'The Freshservice requester ID' },
          },
          required: ['requester_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tickets':                return await this.listTickets(args);
        case 'get_ticket':                  return await this.getTicket(args);
        case 'create_ticket':               return await this.createTicket(args);
        case 'update_ticket':               return await this.updateTicket(args);
        case 'delete_ticket':               return await this.deleteTicket(args);
        case 'filter_tickets':              return await this.filterTickets(args);
        case 'create_child_ticket':         return await this.createChildTicket(args);
        case 'add_ticket_note':             return await this.addTicketNote(args);
        case 'list_ticket_conversations':   return await this.listTicketConversations(args);
        case 'list_ticket_tasks':           return await this.listTicketTasks(args);
        case 'create_ticket_task':          return await this.createTicketTask(args);
        case 'list_problems':               return await this.listProblems(args);
        case 'get_problem':                 return await this.getProblem(args);
        case 'create_problem':              return await this.createProblem(args);
        case 'update_problem':              return await this.updateProblem(args);
        case 'list_changes':                return await this.listChanges(args);
        case 'get_change':                  return await this.getChange(args);
        case 'create_change':               return await this.createChange(args);
        case 'update_change':               return await this.updateChange(args);
        case 'list_releases':               return await this.listReleases(args);
        case 'get_release':                 return await this.getRelease(args);
        case 'create_release':              return await this.createRelease(args);
        case 'list_assets':                 return await this.listAssets(args);
        case 'get_asset':                   return await this.getAsset(args);
        case 'update_asset':                return await this.updateAsset(args);
        case 'list_agents':                 return await this.listAgents(args);
        case 'get_agent':                   return await this.getAgent(args);
        case 'list_departments':            return await this.listDepartments(args);
        case 'get_department':              return await this.getDepartment(args);
        case 'list_locations':              return await this.listLocations(args);
        case 'list_service_catalog_items':  return await this.listServiceCatalogItems(args);
        case 'get_service_catalog_item':    return await this.getServiceCatalogItem(args);
        case 'create_service_request':      return await this.createServiceRequest(args);
        case 'list_requesters':             return await this.listRequesters(args);
        case 'get_requester':               return await this.getRequester(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async fsRequest(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Freshservice API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Freshservice returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private pageParams(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
    return params.toString() ? `?${params.toString()}` : '';
  }

  // ── Tickets ───────────────────────────────────────────────────────────────

  private async listTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    if (args.requester_id !== undefined) params.set('requester_id', String(args.requester_id));
    if (args.agent_id !== undefined) params.set('agent_id', String(args.agent_id));
    if (args.group_id !== undefined) params.set('group_id', String(args.group_id));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
    if (args.order_by) params.set('order_by', args.order_by as string);
    if (args.order_type) params.set('order_type', args.order_type as string);
    const qs = params.toString();
    return this.fsRequest(`${this.baseUrl}/tickets${qs ? '?' + qs : ''}`);
  }

  private async getTicket(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}`);
  }

  private async createTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { subject: args.subject };
    if (args.description) body.description = args.description;
    if (args.email) body.email = args.email;
    if (args.requester_id !== undefined) body.requester_id = args.requester_id;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.status !== undefined) body.status = args.status;
    if (args.type) body.type = args.type;
    if (args.category) body.category = args.category;
    if (args.sub_category) body.sub_category = args.sub_category;
    if (args.tags) body.tags = args.tags;
    if (args.agent_id !== undefined) body.responder_id = args.agent_id;
    if (args.group_id !== undefined) body.group_id = args.group_id;
    if (args.department_id !== undefined) body.department_id = args.department_id;
    return this.fsRequest(`${this.baseUrl}/tickets`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const { ticket_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.subject) body.subject = fields.subject;
    if (fields.description) body.description = fields.description;
    if (fields.priority !== undefined) body.priority = fields.priority;
    if (fields.status !== undefined) body.status = fields.status;
    if (fields.category) body.category = fields.category;
    if (fields.tags) body.tags = fields.tags;
    if (fields.agent_id !== undefined) body.responder_id = fields.agent_id;
    if (fields.group_id !== undefined) body.group_id = fields.group_id;
    return this.fsRequest(`${this.baseUrl}/tickets/${ticket_id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async deleteTicket(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}`, { method: 'DELETE' });
  }

  private async filterTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: `"${encodeURIComponent(args.query as string)}"` });
    if (args.page) params.set('page', String(args.page));
    return this.fsRequest(`${this.baseUrl}/tickets/filter?${params.toString()}`);
  }

  private async createChildTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { subject: args.subject };
    if (args.email) body.email = args.email;
    if (args.description) body.description = args.description;
    if (args.priority !== undefined) body.priority = args.priority;
    return this.fsRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.parent_ticket_id as string)}/create_child_ticket`, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  private async addTicketNote(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      body: args.body,
      private: typeof args.private === 'boolean' ? args.private : true,
    };
    if (args.notify_emails) body.notify_emails = args.notify_emails;
    return this.fsRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/notes`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listTicketConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    const qs = params.toString();
    return this.fsRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/conversations${qs ? '?' + qs : ''}`);
  }

  // ── Ticket Tasks ──────────────────────────────────────────────────────────

  private async listTicketTasks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/tasks`);
  }

  private async createTicketTask(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title };
    if (args.description) body.description = args.description;
    if (args.due_date) body.due_date = args.due_date;
    if (args.agent_id !== undefined) body.agent_id = args.agent_id;
    if (args.status !== undefined) body.status = args.status;
    return this.fsRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/tasks`, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Problems ──────────────────────────────────────────────────────────────

  private async listProblems(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/problems${this.pageParams(args)}`);
  }

  private async getProblem(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/problems/${encodeURIComponent(args.problem_id as string)}`);
  }

  private async createProblem(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { subject: args.subject };
    if (args.email) body.email = args.email;
    if (args.description) body.description = args.description;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.status !== undefined) body.status = args.status;
    if (args.category) body.category = args.category;
    if (args.agent_id !== undefined) body.agent_id = args.agent_id;
    return this.fsRequest(`${this.baseUrl}/problems`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateProblem(args: Record<string, unknown>): Promise<ToolResult> {
    const { problem_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.subject) body.subject = fields.subject;
    if (fields.description) body.description = fields.description;
    if (fields.priority !== undefined) body.priority = fields.priority;
    if (fields.status !== undefined) body.status = fields.status;
    if (fields.category) body.category = fields.category;
    if (fields.agent_id !== undefined) body.agent_id = fields.agent_id;
    return this.fsRequest(`${this.baseUrl}/problems/${problem_id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  // ── Changes ───────────────────────────────────────────────────────────────

  private async listChanges(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/changes${this.pageParams(args)}`);
  }

  private async getChange(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/changes/${encodeURIComponent(args.change_id as string)}`);
  }

  private async createChange(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { subject: args.subject };
    if (args.email) body.email = args.email;
    if (args.description) body.description = args.description;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.status !== undefined) body.status = args.status;
    if (args.change_type !== undefined) body.change_type = args.change_type;
    if (args.planned_start_date) body.planned_start_date = args.planned_start_date;
    if (args.planned_end_date) body.planned_end_date = args.planned_end_date;
    if (args.agent_id !== undefined) body.agent_id = args.agent_id;
    if (args.group_id !== undefined) body.group_id = args.group_id;
    return this.fsRequest(`${this.baseUrl}/changes`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateChange(args: Record<string, unknown>): Promise<ToolResult> {
    const { change_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.status !== undefined) body.status = fields.status;
    if (fields.change_type !== undefined) body.change_type = fields.change_type;
    if (fields.planned_start_date) body.planned_start_date = fields.planned_start_date;
    if (fields.planned_end_date) body.planned_end_date = fields.planned_end_date;
    if (fields.agent_id !== undefined) body.agent_id = fields.agent_id;
    if (fields.description) body.description = fields.description;
    return this.fsRequest(`${this.baseUrl}/changes/${change_id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  // ── Releases ──────────────────────────────────────────────────────────────

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/releases${this.pageParams(args)}`);
  }

  private async getRelease(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/releases/${encodeURIComponent(args.release_id as string)}`);
  }

  private async createRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { subject: args.subject };
    if (args.description) body.description = args.description;
    if (args.status !== undefined) body.status = args.status;
    if (args.release_type !== undefined) body.release_type = args.release_type;
    if (args.planned_start_date) body.planned_start_date = args.planned_start_date;
    if (args.planned_end_date) body.planned_end_date = args.planned_end_date;
    if (args.agent_id !== undefined) body.agent_id = args.agent_id;
    return this.fsRequest(`${this.baseUrl}/releases`, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Assets ────────────────────────────────────────────────────────────────

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
    if (args.search) params.set('search', args.search as string);
    const qs = params.toString();
    return this.fsRequest(`${this.baseUrl}/assets${qs ? '?' + qs : ''}`);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/assets/${encodeURIComponent(args.display_id as string)}`);
  }

  private async updateAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const { display_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.name) body.name = fields.name;
    if (fields.description) body.description = fields.description;
    if (fields.asset_state) body.asset_state = fields.asset_state;
    if (fields.user_id !== undefined) body.user_id = fields.user_id;
    return this.fsRequest(`${this.baseUrl}/assets/${display_id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  // ── Agents ────────────────────────────────────────────────────────────────

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.active !== undefined) params.set('active', String(args.active));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
    const qs = params.toString();
    return this.fsRequest(`${this.baseUrl}/agents${qs ? '?' + qs : ''}`);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/agents/${encodeURIComponent(args.agent_id as string)}`);
  }

  // ── Departments ───────────────────────────────────────────────────────────

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/departments${this.pageParams(args)}`);
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/departments/${encodeURIComponent(args.department_id as string)}`);
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/locations${this.pageParams(args)}`);
  }

  // ── Service Catalog ───────────────────────────────────────────────────────

  private async listServiceCatalogItems(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/service_catalog/items${this.pageParams(args)}`);
  }

  private async getServiceCatalogItem(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/service_catalog/items/${encodeURIComponent(args.item_id as string)}`);
  }

  private async createServiceRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      display_id: args.display_id,
      quantity: (args.quantity as number) ?? 1,
    };
    if (args.email) body.email = args.email;
    if (args.child_items) body.child_items = args.child_items;
    return this.fsRequest(`${this.baseUrl}/service_catalog/items/${encodeURIComponent(args.display_id as string)}/place_request`, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Requesters ────────────────────────────────────────────────────────────

  private async listRequesters(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.department_id !== undefined) params.set('department_id', String(args.department_id));
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
    const qs = params.toString();
    return this.fsRequest(`${this.baseUrl}/requesters${qs ? '?' + qs : ''}`);
  }

  private async getRequester(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fsRequest(`${this.baseUrl}/requesters/${encodeURIComponent(args.requester_id as string)}`);
  }
}
