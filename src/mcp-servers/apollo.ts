/**
 * Apollo.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Apollo.io MCP server exists. Community implementations (NOT official):
//   github.com/Chainscore/apollo-io-mcp — 45 tools, community-maintained, stdio transport (last commit Feb 2026)
//   github.com/edwardchoh/apollo-io-mcp-server — community, 5 tools only
//   github.com/thevgergroup/apollo-io-mcp — community, limited tools
// None are officially maintained by Apollo.io. Use this adapter for production.
// Our adapter covers: 14 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.apollo.io/api/v1
// Auth: X-Api-Key header (master API key from Apollo Settings > Integrations > API)
// Docs: https://docs.apollo.io/reference/
// Rate limits: Varies by plan. Free: 600 req/min. Basic+: higher limits. Credit-based operations
//   (enrich) consume account credits separately from rate limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ApolloConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ApolloMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ApolloConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.apollo.io/api/v1';
  }

  private get headers(): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_people',
        description: 'Search Apollo\'s database for people matching demographic filters such as job title, location, seniority, and company domain. Returns profile data without consuming credits.',
        inputSchema: {
          type: 'object',
          properties: {
            person_titles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Job titles to filter by (e.g. ["VP of Sales", "Account Executive"])',
            },
            person_locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Locations to filter by (e.g. ["New York, NY", "San Francisco, CA"])',
            },
            person_seniorities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Seniority levels: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern',
            },
            organization_domains: {
              type: 'array',
              items: { type: 'string' },
              description: 'Company domains to filter by (e.g. ["salesforce.com", "hubspot.com"])',
            },
            organization_num_employees_ranges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee count ranges as "min,max" strings (e.g. ["1,10", "11,50", "51,200"])',
            },
            q_keywords: {
              type: 'string',
              description: 'Keyword search string to match against person name, title, or company',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, max: 500 pages of 100 records)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'enrich_person',
        description: 'Enrich a single person record by email or name+domain, returning verified contact data including work email, phone number, title, and company details. Consumes export credits.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Work email address of the person to enrich',
            },
            first_name: {
              type: 'string',
              description: 'First name (use with last_name and domain when email is unavailable)',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
            },
            organization_name: {
              type: 'string',
              description: 'Company name',
            },
            domain: {
              type: 'string',
              description: 'Company domain (e.g. "salesforce.com")',
            },
            reveal_personal_emails: {
              type: 'boolean',
              description: 'Whether to return personal email addresses (default: false)',
            },
            reveal_phone_number: {
              type: 'boolean',
              description: 'Whether to return phone numbers (default: false)',
            },
          },
        },
      },
      {
        name: 'bulk_enrich_people',
        description: 'Enrich up to 10 people in a single request by email or name+domain. More efficient than individual enrich_person calls. Consumes export credits per record.',
        inputSchema: {
          type: 'object',
          properties: {
            details: {
              type: 'array',
              description: 'Array of person objects to enrich. Each object supports: email, first_name, last_name, domain, organization_name.',
            },
            reveal_personal_emails: {
              type: 'boolean',
              description: 'Whether to return personal emails for all records (default: false)',
            },
            reveal_phone_number: {
              type: 'boolean',
              description: 'Whether to return phone numbers for all records (default: false)',
            },
          },
          required: ['details'],
        },
      },
      {
        name: 'enrich_organization',
        description: 'Enrich a company record by domain, returning firmographic data including employee count, revenue, industry, technologies used, and funding history.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Company domain to enrich (e.g. "salesforce.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'search_organizations',
        description: 'Search Apollo\'s database for companies matching filters such as industry, employee count, location, revenue range, and technology stack.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Company HQ locations to filter by (e.g. ["San Francisco, CA"])',
            },
            organization_num_employees_ranges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee count ranges as "min,max" strings (e.g. ["1,10", "51,200"])',
            },
            organization_industries: {
              type: 'array',
              items: { type: 'string' },
              description: 'Industries to filter by (e.g. ["Software", "Financial Services"])',
            },
            q_organization_keyword_tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keyword tags associated with the company',
            },
            organization_revenue_ranges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Annual revenue ranges (e.g. ["1000000,5000000"])',
            },
            organization_technology_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Technologies the company uses (e.g. ["Salesforce", "HubSpot"])',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'search_contacts',
        description: 'Search contacts in your Apollo CRM (people explicitly added to your account) with optional filters for name, email, title, and account.',
        inputSchema: {
          type: 'object',
          properties: {
            q_keywords: {
              type: 'string',
              description: 'Keyword search across contact name, email, and title',
            },
            contact_stage_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by contact stage IDs',
            },
            account_id: {
              type: 'string',
              description: 'Filter contacts belonging to a specific Apollo account ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in your Apollo CRM. The contact becomes available for sequences and reporting.',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Contact first name',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name',
            },
            email: {
              type: 'string',
              description: 'Contact email address',
            },
            title: {
              type: 'string',
              description: 'Contact job title',
            },
            organization_name: {
              type: 'string',
              description: 'Company name',
            },
            website_url: {
              type: 'string',
              description: 'Company website URL for auto-linking to an account',
            },
            account_id: {
              type: 'string',
              description: 'Apollo account ID to link this contact to',
            },
            phone_numbers: {
              type: 'array',
              description: 'Array of phone number objects with raw_number field',
            },
          },
          required: ['first_name', 'last_name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing contact in your Apollo CRM by contact ID. Only provided fields are updated.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Apollo contact ID to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            title: {
              type: 'string',
              description: 'Updated job title',
            },
            account_id: {
              type: 'string',
              description: 'Updated Apollo account ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve a saved account (company) record from your Apollo CRM by its Apollo account ID.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Apollo account ID to retrieve',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'search_accounts',
        description: 'Search accounts (companies) in your Apollo CRM with filters for name, domain, industry, and stage.',
        inputSchema: {
          type: 'object',
          properties: {
            q_organization_name: {
              type: 'string',
              description: 'Filter by company name (partial match)',
            },
            organization_industries: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by industry',
            },
            account_stage_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by account stage IDs',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'list_sequences',
        description: 'List email sequences in your Apollo account, including name, status, active contact count, and step configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'add_contacts_to_sequence',
        description: 'Add one or more contacts to an Apollo email sequence by sequence ID and contact IDs. Contacts must exist in your CRM.',
        inputSchema: {
          type: 'object',
          properties: {
            sequence_id: {
              type: 'string',
              description: 'Apollo sequence (emailer campaign) ID to add contacts to',
            },
            contact_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Apollo contact IDs to add to the sequence',
            },
            send_email_from_email_address: {
              type: 'string',
              description: 'Email address to send sequence emails from (must be a connected mailbox)',
            },
          },
          required: ['sequence_id', 'contact_ids'],
        },
      },
      {
        name: 'remove_contacts_from_sequence',
        description: 'Remove contacts from an Apollo sequence or mark them as finished, stopping further emails.',
        inputSchema: {
          type: 'object',
          properties: {
            sequence_id: {
              type: 'string',
              description: 'Apollo sequence (emailer campaign) ID',
            },
            contact_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Apollo contact IDs to remove from the sequence',
            },
          },
          required: ['sequence_id', 'contact_ids'],
        },
      },
      {
        name: 'list_contact_stages',
        description: 'List all contact stages defined in your Apollo account (e.g. New, Working, Nurture, Unqualified).',
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
        case 'search_people':
          return await this.searchPeople(args);
        case 'enrich_person':
          return await this.enrichPerson(args);
        case 'bulk_enrich_people':
          return await this.bulkEnrichPeople(args);
        case 'enrich_organization':
          return await this.enrichOrganization(args);
        case 'search_organizations':
          return await this.searchOrganizations(args);
        case 'search_contacts':
          return await this.searchContacts(args);
        case 'create_contact':
          return await this.createContact(args);
        case 'update_contact':
          return await this.updateContact(args);
        case 'get_account':
          return await this.getAccount(args);
        case 'search_accounts':
          return await this.searchAccounts(args);
        case 'list_sequences':
          return await this.listSequences(args);
        case 'add_contacts_to_sequence':
          return await this.addContactsToSequence(args);
        case 'remove_contacts_from_sequence':
          return await this.removeContactsFromSequence(args);
        case 'list_contact_stages':
          return await this.listContactStages();
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

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.person_titles) body.person_titles = args.person_titles;
    if (args.person_locations) body.person_locations = args.person_locations;
    if (args.person_seniorities) body.person_seniorities = args.person_seniorities;
    if (args.organization_domains) body.organization_domains = args.organization_domains;
    if (args.organization_num_employees_ranges) body.organization_num_employees_ranges = args.organization_num_employees_ranges;
    if (args.q_keywords) body.q_keywords = args.q_keywords;
    if (args.page) body.page = args.page;
    if (args.per_page) body.per_page = args.per_page;

    const response = await this.fetchWithRetry(`${this.baseUrl}/mixed_people/api_search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to search people: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async enrichPerson(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.email) body.email = args.email;
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.organization_name) body.organization_name = args.organization_name;
    if (args.domain) body.domain = args.domain;
    if (typeof args.reveal_personal_emails === 'boolean') body.reveal_personal_emails = args.reveal_personal_emails;
    if (typeof args.reveal_phone_number === 'boolean') body.reveal_phone_number = args.reveal_phone_number;

    if (!body.email && !(body.first_name && body.last_name)) {
      return {
        content: [{ type: 'text', text: 'Either email or first_name + last_name is required to enrich a person' }],
        isError: true,
      };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/people/match`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to enrich person: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async bulkEnrichPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      details: args.details,
    };
    if (typeof args.reveal_personal_emails === 'boolean') body.reveal_personal_emails = args.reveal_personal_emails;
    if (typeof args.reveal_phone_number === 'boolean') body.reveal_phone_number = args.reveal_phone_number;

    const response = await this.fetchWithRetry(`${this.baseUrl}/people/bulk_match`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to bulk enrich people: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async enrichOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const domain = args.domain as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/organizations/enrich?domain=${encodeURIComponent(domain)}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to enrich organization: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async searchOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.organization_locations) body.organization_locations = args.organization_locations;
    if (args.organization_num_employees_ranges) body.organization_num_employees_ranges = args.organization_num_employees_ranges;
    if (args.organization_industries) body.organization_industries = args.organization_industries;
    if (args.q_organization_keyword_tags) body.q_organization_keyword_tags = args.q_organization_keyword_tags;
    if (args.organization_revenue_ranges) body.organization_revenue_ranges = args.organization_revenue_ranges;
    if (args.organization_technology_names) body.organization_technology_names = args.organization_technology_names;
    if (args.page) body.page = args.page;
    if (args.per_page) body.per_page = args.per_page;

    const response = await this.fetchWithRetry(`${this.baseUrl}/mixed_companies/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to search organizations: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async searchContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.q_keywords) body.q_keywords = args.q_keywords;
    if (args.contact_stage_ids) body.contact_stage_ids = args.contact_stage_ids;
    if (args.account_id) body.account_id = args.account_id;
    if (args.page) body.page = args.page;
    if (args.per_page) body.per_page = args.per_page;

    const response = await this.fetchWithRetry(`${this.baseUrl}/contacts/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to search contacts: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      first_name: args.first_name,
      last_name: args.last_name,
    };
    if (args.email) body.email = args.email;
    if (args.title) body.title = args.title;
    if (args.organization_name) body.organization_name = args.organization_name;
    if (args.website_url) body.website_url = args.website_url;
    if (args.account_id) body.account_id = args.account_id;
    if (args.phone_numbers) body.phone_numbers = args.phone_numbers;

    const response = await this.fetchWithRetry(`${this.baseUrl}/contacts`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to create contact: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contact_id as string;
    const body: Record<string, unknown> = {};
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.email) body.email = args.email;
    if (args.title) body.title = args.title;
    if (args.account_id) body.account_id = args.account_id;

    const response = await this.fetchWithRetry(`${this.baseUrl}/contacts/${encodeURIComponent(contactId)}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to update contact: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as string;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/accounts/${encodeURIComponent(accountId)}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get account: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async searchAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.q_organization_name) body.q_organization_name = args.q_organization_name;
    if (args.organization_industries) body.organization_industries = args.organization_industries;
    if (args.account_stage_ids) body.account_stage_ids = args.account_stage_ids;
    if (args.page) body.page = args.page;
    if (args.per_page) body.per_page = args.per_page;

    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to search accounts: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listSequences(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    const qs = params.toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/emailer_campaigns${qs ? `?${qs}` : ''}`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list sequences: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async addContactsToSequence(args: Record<string, unknown>): Promise<ToolResult> {
    const sequenceId = args.sequence_id as string;
    const body: Record<string, unknown> = {
      contact_ids: args.contact_ids,
    };
    if (args.send_email_from_email_address) {
      body.send_email_from_email_address = args.send_email_from_email_address;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/emailer_campaigns/${encodeURIComponent(sequenceId)}/add_contact_ids`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to add contacts to sequence: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async removeContactsFromSequence(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      contact_ids: args.contact_ids,
      emailer_campaign_id: args.sequence_id,
    };

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/emailer_campaigns/remove_or_stop_contact_ids`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to remove contacts from sequence: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listContactStages(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/contact_stages`,
      { method: 'GET', headers: this.headers },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to list contact stages: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  static catalog() {
    return {
      name: 'apollo',
      displayName: 'Apollo.io',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['apollo', 'sales', 'prospecting', 'leads', 'contacts', 'enrichment', 'sequences', 'b2b', 'outreach', 'crm'],
      toolNames: [
        'search_people', 'enrich_person', 'bulk_enrich_people', 'enrich_organization',
        'search_organizations', 'search_contacts', 'create_contact', 'update_contact',
        'get_account', 'search_accounts', 'list_sequences', 'add_contacts_to_sequence',
        'remove_contacts_from_sequence', 'list_contact_stages',
      ],
      description: 'Apollo.io sales intelligence: search and enrich people and companies, manage CRM contacts and accounts, and orchestrate email sequences.',
      author: 'protectnil' as const,
    };
  }
}
