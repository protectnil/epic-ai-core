/**
 * Microsoft Dynamics 365 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/mcp — Microsoft publishes two relevant MCP servers:
//   1. Microsoft Dataverse MCP (microsoft/mcp catalog, "Microsoft Dataverse" entry) — transport: Local (stdio),
//      auth: OAuth2/Microsoft Entra. Supports NL-to-query over business data (discover tables, run queries,
//      retrieve/insert/update records, execute custom prompts). Tool count: not fully enumerated in public docs;
//      focused on natural-language data access, not direct OData CRUD operations.
//   2. Dynamics 365 Sales MCP (learn.microsoft.com/dynamics365/sales) — transport: Remote, auth: Entra/OAuth2.
//      11 tools: get_lead_research, get_account_research, get_competitor_research, draft_outreach_email,
//      get_engage_summary, get_lead_qualification_assessment, get_customer_updates, get_sales_record_summary,
//      get_sales_lead_catchup, get_sales_account_catchup, get_sales_opportunity_catchup.
//      These are AI-insight/research tools, NOT generic CRUD operations.
// Decision: use-rest-api — neither vendor MCP covers generic OData CRUD (list/get/create/update/delete records,
//   FetchXML queries) across arbitrary entity sets. Our adapter provides the direct CRUD surface that the
//   vendor MCPs do not expose. Dataverse MCP is NL-over-data; Sales MCP is sales-insights only.
//   Our adapter: 15 tools (direct OData CRUD + FetchXML). MCP-only: 11 sales-insight tools (no overlap).
//   API-only: all 15 of our tools.
// Our adapter covers: 15 tools. Vendor Dataverse MCP: undocumented tool count. Sales MCP: 11 insight tools.
//
// Base URL: https://{org}.crm.dynamics.com/api/data/v9.2
// Regional variants: crm.dynamics.com (NA), crm4 (EU), crm5 (APAC), crm6 (OCE),
//   crm7 (Japan), crm8 (India), crm3 (Canada), crm2 (SA), crm11 (UK)
// Auth: OAuth2 Bearer token from Microsoft Entra ID (Azure AD)
// Docs: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview
// Rate limits: 6,000 req/5 min per user; 50 concurrent connections per user

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Dynamics365Config {
  accessToken: string;
  organizationUrl: string;
}

export class Dynamics365MCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: Dynamics365Config) {
    super();
    this.accessToken = config.accessToken;
    const orgUrl = config.organizationUrl.replace(/\/$/, '');
    this.baseUrl = `${orgUrl}/api/data/v9.2`;
  }

  static catalog() {
    return {
      name: 'dynamics-365',
      displayName: 'Microsoft Dynamics 365',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: [
        'dynamics', 'dynamics365', 'd365', 'microsoft', 'crm', 'dataverse',
        'account', 'contact', 'lead', 'opportunity', 'case', 'quote',
        'order', 'invoice', 'activity', 'task', 'appointment', 'sales',
        'odata', 'power-platform',
      ],
      toolNames: [
        'list_accounts', 'list_contacts', 'list_leads', 'list_opportunities',
        'list_cases', 'list_quotes', 'list_orders', 'list_invoices',
        'list_tasks', 'list_appointments', 'get_record', 'create_record',
        'update_record', 'delete_record', 'execute_fetch_xml',
      ],
      description: 'Microsoft Dynamics 365 CRM and Dataverse: manage accounts, contacts, leads, opportunities, cases, quotes, orders, invoices, activities, and execute custom OData/FetchXML queries.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List Dynamics 365 account records (companies/organizations) with optional OData filter, select, orderby, and pagination via skiptoken',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. name,accountnumber,telephone1,emailaddress1,revenue)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for active accounts)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. name asc, createdon desc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50, max: 5000)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken value for pagination',
            },
          },
        },
      },
      {
        name: 'list_contacts',
        description: 'List Dynamics 365 contact records (individual people) with optional OData filter, select, orderby, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. fullname,emailaddress1,telephone1,jobtitle)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for active contacts)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. fullname asc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_leads',
        description: 'List Dynamics 365 lead records (unqualified prospects) with optional OData filter, select, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. fullname,emailaddress1,subject,statuscode,leadsourcecode)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statuscode eq 1 for open leads)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. createdon desc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_opportunities',
        description: 'List Dynamics 365 opportunity records (qualified sales prospects) with optional filter for stage, probability, and estimated value',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. name,estimatedvalue,statecode,stepname,closeprobability,estimatedclosedate)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for open opportunities)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. estimatedvalue desc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_cases',
        description: 'List Dynamics 365 customer service case (incident) records with optional filter for status, priority, and customer',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. title,ticketnumber,statecode,prioritycode,createdon)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for active cases)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. createdon desc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_quotes',
        description: 'List Dynamics 365 quote records (sales quotations) with optional OData filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. name,quotenumber,statecode,totalamount,effectivefrom)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for draft quotes)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. createdon desc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_orders',
        description: 'List Dynamics 365 sales order records with optional OData filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. name,ordernumber,statecode,totalamount,submitdate)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for active orders)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. createdon desc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_invoices',
        description: 'List Dynamics 365 invoice records with optional OData filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. name,invoicenumber,statecode,totalamount,duedate)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 2 for paid invoices)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. duedate asc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_tasks',
        description: 'List Dynamics 365 task activity records with optional filter for status, due date, and owner',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. subject,description,statecode,scheduledend,prioritycode)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for open tasks)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. scheduledend asc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_appointments',
        description: 'List Dynamics 365 appointment activity records with optional filter for status and scheduled time',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. subject,statecode,scheduledstart,scheduledend,location)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for open appointments)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. scheduledstart asc)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a single Dynamics 365 record by entity set name and GUID, with optional field selection and related record expansion',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'OData entity set name (e.g. accounts, contacts, leads, opportunities, incidents, quotes, salesorders, invoices, tasks)',
            },
            id: {
              type: 'string',
              description: 'Record GUID (e.g. 00000000-0000-0000-0000-000000000000)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields to return',
            },
            expand: {
              type: 'string',
              description: 'OData $expand clause for related records (e.g. contact_customer_accounts($select=fullname,emailaddress1))',
            },
          },
          required: ['entity_set', 'id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new record in any Dynamics 365 entity (accounts, contacts, leads, opportunities, incidents, tasks, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'OData entity set name (e.g. accounts, contacts, leads, opportunities, incidents, tasks)',
            },
            data: {
              type: 'object',
              description: 'Record fields as key-value pairs using OData logical field names (e.g. {"name":"Acme Corp","telephone1":"555-1234"})',
            },
            return_representation: {
              type: 'boolean',
              description: 'If true, returns the created record body (uses Prefer: return=representation header). Default: false returns only the entity ID.',
            },
          },
          required: ['entity_set', 'data'],
        },
      },
      {
        name: 'update_record',
        description: 'Update an existing Dynamics 365 record by entity set name and GUID using PATCH (partial update)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'OData entity set name (e.g. accounts, contacts, leads, opportunities, incidents)',
            },
            id: {
              type: 'string',
              description: 'Record GUID to update',
            },
            data: {
              type: 'object',
              description: 'Fields to update as key-value pairs — only include fields you want to change',
            },
          },
          required: ['entity_set', 'id', 'data'],
        },
      },
      {
        name: 'delete_record',
        description: 'Delete a Dynamics 365 record by entity set name and GUID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'OData entity set name (e.g. accounts, contacts, leads, tasks)',
            },
            id: {
              type: 'string',
              description: 'Record GUID to delete',
            },
          },
          required: ['entity_set', 'id'],
        },
      },
      {
        name: 'execute_fetch_xml',
        description: 'Execute a FetchXML query against Dynamics 365 for advanced multi-entity queries with aggregates, joins, and grouping',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'Primary entity set name to query (e.g. accounts, contacts, opportunities)',
            },
            fetch_xml: {
              type: 'string',
              description: 'URL-encoded FetchXML query string (e.g. <fetch><entity name="account"><attribute name="name"/></entity></fetch>)',
            },
          },
          required: ['entity_set', 'fetch_xml'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return await this.listEntitySet('accounts', args);
        case 'list_contacts':
          return await this.listEntitySet('contacts', args);
        case 'list_leads':
          return await this.listEntitySet('leads', args);
        case 'list_opportunities':
          return await this.listEntitySet('opportunities', args);
        case 'list_cases':
          return await this.listEntitySet('incidents', args);
        case 'list_quotes':
          return await this.listEntitySet('quotes', args);
        case 'list_orders':
          return await this.listEntitySet('salesorders', args);
        case 'list_invoices':
          return await this.listEntitySet('invoices', args);
        case 'list_tasks':
          return await this.listEntitySet('tasks', args);
        case 'list_appointments':
          return await this.listEntitySet('appointments', args);
        case 'get_record':
          return await this.getRecord(args);
        case 'create_record':
          return await this.createRecord(args);
        case 'update_record':
          return await this.updateRecord(args);
        case 'delete_record':
          return await this.deleteRecord(args);
        case 'execute_fetch_xml':
          return await this.executeFetchXml(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'odata.maxpagesize=100',
    };
  }

  private buildListUrl(entitySet: string, args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    if (args.select) params.set('$select', args.select as string);
    if (args.filter) params.set('$filter', args.filter as string);
    if (args.orderby) params.set('$orderby', args.orderby as string);
    params.set('$top', String((args.top as number) ?? 50));
    if (args.skiptoken) params.set('$skiptoken', args.skiptoken as string);
    return `${this.baseUrl}/${entitySet}?${params.toString()}`;
  }


  private async listEntitySet(entitySet: string, args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildListUrl(entitySet, args), {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Failed to list ${entitySet}: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const entity_set = args.entity_set as string;
    const id = args.id as string;
    if (!entity_set || !id) {
      return { content: [{ type: 'text', text: 'entity_set and id are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.select) params.set('$select', args.select as string);
    if (args.expand) params.set('$expand', args.expand as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${encodeURIComponent(entity_set)}(${encodeURIComponent(id)})${qs}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get record: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const entity_set = args.entity_set as string;
    const data = args.data as Record<string, unknown>;
    if (!entity_set || !data) {
      return { content: [{ type: 'text', text: 'entity_set and data are required' }], isError: true };
    }
    const headers = { ...this.headers };
    if (args.return_representation) {
      headers['Prefer'] = 'return=representation';
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/${encodeURIComponent(entity_set)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Failed to create record: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    if (response.status === 204 || !args.return_representation) {
      const entityId = response.headers.get('OData-EntityId') ?? response.headers.get('Location') ?? '';
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, entityId }) }], isError: false };
    }
    let responseData: unknown;
    try { responseData = await response.json(); } catch {
      throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(responseData) }], isError: false };
  }

  private async updateRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const entity_set = args.entity_set as string;
    const id = args.id as string;
    const data = args.data as Record<string, unknown>;
    if (!entity_set || !id || !data) {
      return { content: [{ type: 'text', text: 'entity_set, id, and data are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${encodeURIComponent(entity_set)}(${encodeURIComponent(id)})`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify(data) },
    );
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Failed to update record: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, updated_id: id }) }], isError: false };
  }

  private async deleteRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const entity_set = args.entity_set as string;
    const id = args.id as string;
    if (!entity_set || !id) {
      return { content: [{ type: 'text', text: 'entity_set and id are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${encodeURIComponent(entity_set)}(${encodeURIComponent(id)})`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to delete record: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted_id: id }) }], isError: false };
  }

  private async executeFetchXml(args: Record<string, unknown>): Promise<ToolResult> {
    const entity_set = args.entity_set as string;
    const fetch_xml = args.fetch_xml as string;
    if (!entity_set || !fetch_xml) {
      return { content: [{ type: 'text', text: 'entity_set and fetch_xml are required' }], isError: true };
    }
    const encoded = encodeURIComponent(fetch_xml);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/${encodeURIComponent(entity_set)}?fetchXml=${encoded}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `FetchXML query failed: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
