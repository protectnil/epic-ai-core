/**
 * SureVoIP UK MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official SureVoIP MCP server was found on GitHub or npm.
//
// Base URL: https://api.surevoip.co.uk
// Auth: HTTP Basic Auth (username + password). OAuth2 also supported via
//   Authorization URL: https://authz.surevoip.co.uk/oauth2/auth
//   Token URL: https://authz.surevoip.co.uk/oauth2/token
// Docs: https://www.surevoip.co.uk/support/wiki/api_documentation
// Rate limits: Not publicly documented. Contact support@surevoip.co.uk for enterprise limits.
// Sandbox: https://sandbox.surevoip.co.uk (data is 24 hours behind production)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SureVoIPUKConfig {
  /** HTTP Basic Auth username (your SureVoIP account ID or email) */
  username: string;
  /** HTTP Basic Auth password */
  password: string;
  /** Optional base URL override (default: https://api.surevoip.co.uk) */
  baseUrl?: string;
}

export class SureVoIPUKMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: SureVoIPUKConfig) {
    super();
    this.authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.baseUrl = config.baseUrl ?? 'https://api.surevoip.co.uk';
  }

  static catalog() {
    return {
      name: 'surevoip-uk',
      displayName: 'SureVoIP UK',
      version: '1.0.0',
      category: 'telecom',
      keywords: [
        'surevoip', 'voip', 'sip', 'telecom', 'telephony', 'calls', 'phone',
        'numbers', 'sms', 'fax', 'billing', 'announcements', 'customers',
        'porting', 'mobile', 'hosted', 'contacts', 'charges', 'invoice',
        'topup', 'area-codes', 'ip-address', 'service-status', 'uk',
      ],
      toolNames: [
        'get_api_root', 'list_announcements', 'create_announcement',
        'list_area_codes', 'get_billing', 'list_calls', 'create_call',
        'list_charges', 'add_charge', 'list_contacts', 'list_customers',
        'get_customer', 'list_customer_announcements', 'get_customer_announcement',
        'delete_customer_announcement', 'list_faxes', 'list_hosted_numbers',
        'get_ip_address', 'list_mobile_numbers', 'list_numbers',
        'list_number_area_codes', 'list_partners', 'list_porting_requests',
        'get_service_status', 'get_sip_details', 'list_sms', 'list_topups',
        'echo_test',
      ],
      description: 'SureVoIP UK VoIP REST API: manage calls, phone numbers, SMS, fax, customers, billing, announcements, SIP details, porting requests, and service status for the SureVoIP hosted telephony platform.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_api_root',
        description: 'Get the API root hypermedia document listing all available top-level resources and their URLs',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_announcements',
        description: 'List all audio announcements available on the account (used for scheduled call announcements and hold music)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_announcement',
        description: 'Upload a new audio announcement WAV file with a description to the account',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Human-readable description of the announcement (e.g. "On-hold music - Jazz")',
            },
            file_base64: {
              type: 'string',
              description: 'Base64-encoded WAV audio file content',
            },
            filename: {
              type: 'string',
              description: 'Filename for the WAV file (e.g. "hold-music.wav")',
            },
          },
          required: ['description', 'file_base64', 'filename'],
        },
      },
      {
        name: 'list_area_codes',
        description: 'List all UK geographic area codes available for searching and provisioning telephone numbers',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_billing',
        description: 'Retrieve billing summary and invoice history for the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_calls',
        description: 'List calls on the account. Set validate=true to validate call parameters without placing a live call.',
        inputSchema: {
          type: 'object',
          properties: {
            validate: {
              type: 'boolean',
              description: 'If true, validate call parameters only — no live call is placed (default: false)',
            },
          },
        },
      },
      {
        name: 'create_call',
        description: 'Create an outbound call from a SureVoIP number. Optionally schedule an announcement and automatic hangup.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Caller ID — your SureVoIP number in E.164 format (e.g. +441234567890)',
            },
            to: {
              type: 'string',
              description: 'Destination number in E.164 format (e.g. +447700900123)',
            },
            hangup_at: {
              type: 'number',
              description: 'Seconds after which to automatically hang up the call',
            },
            announcement_id: {
              type: 'string',
              description: 'ID of an announcement to play before hangup (requires announcement_at)',
            },
            announcement_at: {
              type: 'number',
              description: 'Seconds before hangup at which to play the announcement (e.g. 120 = 2 minutes before end)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'list_charges',
        description: 'List all charges on the account including per-minute call charges, setup fees, and recurring fees',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_charge',
        description: 'Add a manual charge to an account (reseller accounts only)',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Description of the charge',
            },
            amount: {
              type: 'number',
              description: 'Charge amount in pence (GBP). E.g. 500 = £5.00',
            },
          },
          required: ['description', 'amount'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List all contacts in the account address book',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_customers',
        description: 'List all customer accounts (reseller accounts only; standard accounts redirect to their own account)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_customer',
        description: 'Get full details for a customer account including balance, address, company name, and contact information',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Customer account ID (e.g. "ACME-001")',
            },
          },
          required: ['account'],
        },
      },
      {
        name: 'list_customer_announcements',
        description: 'List all audio announcements belonging to a specific customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Customer account ID',
            },
          },
          required: ['account'],
        },
      },
      {
        name: 'get_customer_announcement',
        description: 'Get details and metadata for a specific announcement file belonging to a customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Customer account ID',
            },
            announcement_id: {
              type: 'string',
              description: 'Announcement ID',
            },
          },
          required: ['account', 'announcement_id'],
        },
      },
      {
        name: 'delete_customer_announcement',
        description: 'Permanently delete a specific announcement from a customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Customer account ID',
            },
            announcement_id: {
              type: 'string',
              description: 'Announcement ID to delete',
            },
          },
          required: ['account', 'announcement_id'],
        },
      },
      {
        name: 'list_faxes',
        description: 'List fax messages sent and received on the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_hosted_numbers',
        description: 'List all hosted (ported-in) telephone numbers on the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_ip_address',
        description: 'Get the public IP address of the API caller (useful for SIP firewall whitelist configuration)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_mobile_numbers',
        description: 'List all mobile numbers associated with the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_numbers',
        description: 'List all telephone numbers provisioned on the account including DDI/DID geographic and non-geographic numbers',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_number_area_codes',
        description: 'List UK area codes available specifically under the numbers resource for provisioning',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_partners',
        description: 'List all partner accounts linked to this reseller account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_porting_requests',
        description: 'List all telephone number porting requests (port-in and port-out) for the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_service_status',
        description: 'Get current SureVoIP platform service status including any active incidents or maintenance windows',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_sip_details',
        description: 'Get SIP registration credentials and server details for configuring SIP phones, softphones, and PBX systems',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_sms',
        description: 'List SMS messages sent and received on the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_topups',
        description: 'List all credit top-up transactions on the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'echo_test',
        description: 'Send a support echo test request to verify API connectivity and authentication are working correctly',
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
        case 'get_api_root':                  return this.get('/');
        case 'list_announcements':            return this.get('/announcements');
        case 'create_announcement':           return this.createAnnouncement(args);
        case 'list_area_codes':               return this.get('/areacodes');
        case 'get_billing':                   return this.get('/billing');
        case 'list_calls':                    return this.listCalls(args);
        case 'create_call':                   return this.createCall(args);
        case 'list_charges':                  return this.get('/charges');
        case 'add_charge':                    return this.addCharge(args);
        case 'list_contacts':                 return this.get('/contacts');
        case 'list_customers':                return this.get('/customers');
        case 'get_customer':                  return this.getCustomer(args);
        case 'list_customer_announcements':   return this.listCustomerAnnouncements(args);
        case 'get_customer_announcement':     return this.getCustomerAnnouncement(args);
        case 'delete_customer_announcement':  return this.deleteCustomerAnnouncement(args);
        case 'list_faxes':                   return this.get('/faxes');
        case 'list_hosted_numbers':          return this.get('/hosted');
        case 'get_ip_address':               return this.get('/ip-address');
        case 'list_mobile_numbers':          return this.get('/mobile');
        case 'list_numbers':                 return this.get('/numbers');
        case 'list_number_area_codes':       return this.get('/numbers/areacodes');
        case 'list_partners':               return this.get('/partners');
        case 'list_porting_requests':       return this.get('/porting');
        case 'get_service_status':          return this.get('/service-status');
        case 'get_sip_details':             return this.get('/sip');
        case 'list_sms':                    return this.get('/sms');
        case 'list_topups':                 return this.get('/topups');
        case 'echo_test':                   return this.post('/support/echo', {});
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

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const response = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`SureVoIP returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errText: string;
      try { errText = JSON.stringify(await response.json()); } catch { errText = response.statusText; }
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, status: response.status }) }], isError: false };
  }

  private async createAnnouncement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.description || !args.file_base64 || !args.filename) {
      return { content: [{ type: 'text', text: 'description, file_base64, and filename are required' }], isError: true };
    }
    const boundary = `----EpicAIBoundary${Date.now()}`;
    const fileBuffer = Buffer.from(args.file_base64 as string, 'base64');
    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\n${args.description as string}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${args.filename as string}"\r\nContent-Type: audio/x-wav\r\n\r\n`,
      'utf8'
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const bodyBuffer = Buffer.concat([preamble, fileBuffer, epilogue]);
    const response = await this.fetchWithRetry(`${this.baseUrl}/announcements`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Accept: 'application/json',
      },
      body: bodyBuffer,
    });
    if (!response.ok) {
      let errText: string;
      try { errText = JSON.stringify(await response.json()); } catch { errText = response.statusText; }
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.validate === true) params['validate'] = 'true';
    return this.get('/calls', params);
  }

  private async createCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    const body: Record<string, unknown> = { from: args.from, to: args.to };
    if (args.hangup_at !== undefined) body.hangup_at = args.hangup_at;
    if (args.announcement_id !== undefined) body.announcement_id = args.announcement_id;
    if (args.announcement_at !== undefined) body.announcement_at = String(args.announcement_at);
    return this.post('/calls', body);
  }

  private async addCharge(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.description || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'description and amount are required' }], isError: true };
    }
    return this.post('/charges', { description: args.description, amount: args.amount });
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account) return { content: [{ type: 'text', text: 'account is required' }], isError: true };
    return this.get(`/customers/${encodeURIComponent(args.account as string)}`);
  }

  private async listCustomerAnnouncements(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account) return { content: [{ type: 'text', text: 'account is required' }], isError: true };
    return this.get(`/customers/${encodeURIComponent(args.account as string)}/announcements`);
  }

  private async getCustomerAnnouncement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account || !args.announcement_id) {
      return { content: [{ type: 'text', text: 'account and announcement_id are required' }], isError: true };
    }
    return this.get(
      `/customers/${encodeURIComponent(args.account as string)}/announcements/${encodeURIComponent(args.announcement_id as string)}`
    );
  }

  private async deleteCustomerAnnouncement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account || !args.announcement_id) {
      return { content: [{ type: 'text', text: 'account and announcement_id are required' }], isError: true };
    }
    return this.httpDelete(
      `/customers/${encodeURIComponent(args.account as string)}/announcements/${encodeURIComponent(args.announcement_id as string)}`
    );
  }
}
