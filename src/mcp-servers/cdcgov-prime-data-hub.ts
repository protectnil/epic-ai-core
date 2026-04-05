/**
 * CDC Prime Data Hub MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official CDC Prime ReportStream MCP server was found on GitHub.
//
// Base URL: https://prime.cdc.gov (production) / https://staging.prime.cdc.gov (staging)
// Auth: OAuth2 (Bearer token) or API key via ApiKeyAuth header
// Docs: https://prime.cdc.gov/api/documentation
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CDCPrimeDataHubConfig {
  baseUrl?: string;   // defaults to https://prime.cdc.gov
  apiKey?: string;    // API key auth
  token?: string;     // OAuth2 Bearer token
}

export class CDCGovPrimeDataHubMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly token?: string;

  constructor(config: CDCPrimeDataHubConfig) {
    super();
    this.baseUrl = (config.baseUrl ?? 'https://prime.cdc.gov').replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.token = config.token;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Reports ─────────────────────────────────────────────────────────────
      {
        name: 'submit_report',
        description: 'Submit a public health report (HL7, CSV, or FHIR) to the CDC ReportStream data hub for routing and delivery',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Report content (HL7 2.5.1, CSV, or FHIR Bundle as a string)' },
            content_type: { type: 'string', description: 'MIME type: application/hl7-v2, text/csv, application/fhir+json' },
            client: { type: 'string', description: 'Sender client name (identifies the submitting organization and schema)' },
          },
          required: ['content', 'content_type', 'client'],
        },
      },
      // ── Organizations ────────────────────────────────────────────────────────
      {
        name: 'list_organizations',
        description: 'List all organizations registered in the ReportStream system (admin access required)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_organization',
        description: 'Get settings for a specific organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name/slug' },
          },
          required: ['organization_name'],
        },
      },
      {
        name: 'create_or_update_organization',
        description: 'Create or update an organization in ReportStream (admin access required)',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name/slug' },
            settings: { type: 'object', description: 'Organization settings object' },
          },
          required: ['organization_name', 'settings'],
        },
      },
      {
        name: 'delete_organization',
        description: 'Delete an organization and all associated senders and receivers (admin access required)',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name to delete' },
          },
          required: ['organization_name'],
        },
      },
      // ── Senders ──────────────────────────────────────────────────────────────
      {
        name: 'list_senders',
        description: 'List all senders (data submitters) for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
          },
          required: ['organization_name'],
        },
      },
      {
        name: 'get_sender',
        description: 'Get configuration for a specific sender within an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
            sender_name: { type: 'string', description: 'Sender name' },
          },
          required: ['organization_name', 'sender_name'],
        },
      },
      {
        name: 'create_or_update_sender',
        description: 'Create or update a sender configuration for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
            sender_name: { type: 'string', description: 'Sender name' },
            settings: { type: 'object', description: 'Sender settings (schema, format, topic, etc.)' },
          },
          required: ['organization_name', 'sender_name', 'settings'],
        },
      },
      {
        name: 'delete_sender',
        description: 'Delete a sender from an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
            sender_name: { type: 'string', description: 'Sender name to delete' },
          },
          required: ['organization_name', 'sender_name'],
        },
      },
      // ── Receivers ────────────────────────────────────────────────────────────
      {
        name: 'list_receivers',
        description: 'List all receivers (public health agencies) for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
          },
          required: ['organization_name'],
        },
      },
      {
        name: 'get_receiver',
        description: 'Get configuration for a specific receiver within an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
            receiver_name: { type: 'string', description: 'Receiver name' },
          },
          required: ['organization_name', 'receiver_name'],
        },
      },
      {
        name: 'create_or_update_receiver',
        description: 'Create or update a receiver configuration for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
            receiver_name: { type: 'string', description: 'Receiver name' },
            settings: { type: 'object', description: 'Receiver settings (transport, jurisdictionalFilter, timing, etc.)' },
          },
          required: ['organization_name', 'receiver_name', 'settings'],
        },
      },
      {
        name: 'delete_receiver',
        description: 'Delete a receiver from an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_name: { type: 'string', description: 'Organization name' },
            receiver_name: { type: 'string', description: 'Receiver name to delete' },
          },
          required: ['organization_name', 'receiver_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'submit_report': return await this.submitReport(args);
        case 'list_organizations': return await this.listOrganizations();
        case 'get_organization': return await this.getOrganization(args);
        case 'create_or_update_organization': return await this.createOrUpdateOrganization(args);
        case 'delete_organization': return await this.deleteOrganization(args);
        case 'list_senders': return await this.listSenders(args);
        case 'get_sender': return await this.getSender(args);
        case 'create_or_update_sender': return await this.createOrUpdateSender(args);
        case 'delete_sender': return await this.deleteSender(args);
        case 'list_receivers': return await this.listReceivers(args);
        case 'get_receiver': return await this.getReceiver(args);
        case 'create_or_update_receiver': return await this.createOrUpdateReceiver(args);
        case 'delete_receiver': return await this.deleteReceiver(args);
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
    const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    if (this.apiKey) h['x-functions-key'] = this.apiKey;
    return h;
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async submitReport(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = { ...this.headers, 'Content-Type': String(args.content_type), 'client': String(args.client) };
    const response = await this.fetchWithRetry(`${this.baseUrl}/reports`, { method: 'POST', headers, body: String(args.content) });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listOrganizations(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations`);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}`);
  }

  private async createOrUpdateOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}`, {
      method: 'PUT',
      body: JSON.stringify(args.settings),
    });
  }

  private async deleteOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}`, { method: 'DELETE' });
  }

  private async listSenders(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/senders`);
  }

  private async getSender(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/senders/${encodeURIComponent(String(args.sender_name))}`);
  }

  private async createOrUpdateSender(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/senders/${encodeURIComponent(String(args.sender_name))}`,
      { method: 'PUT', body: JSON.stringify(args.settings) },
    );
  }

  private async deleteSender(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/senders/${encodeURIComponent(String(args.sender_name))}`,
      { method: 'DELETE' },
    );
  }

  private async listReceivers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/receivers`);
  }

  private async getReceiver(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/receivers/${encodeURIComponent(String(args.receiver_name))}`);
  }

  private async createOrUpdateReceiver(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/receivers/${encodeURIComponent(String(args.receiver_name))}`,
      { method: 'PUT', body: JSON.stringify(args.settings) },
    );
  }

  private async deleteReceiver(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/settings/organizations/${encodeURIComponent(String(args.organization_name))}/receivers/${encodeURIComponent(String(args.receiver_name))}`,
      { method: 'DELETE' },
    );
  }

  static catalog() {
    return {
      name: 'cdcgov-prime-data-hub',
      displayName: 'CDC Prime ReportStream',
      version: '1.0.0',
      category: 'healthcare' as const,
      keywords: ['cdc', 'prime', 'reportstream', 'public health', 'hl7', 'fhir', 'covid', 'lab results', 'reporting', 'health data'],
      toolNames: [
        'submit_report', 'list_organizations', 'get_organization', 'create_or_update_organization', 'delete_organization',
        'list_senders', 'get_sender', 'create_or_update_sender', 'delete_sender',
        'list_receivers', 'get_receiver', 'create_or_update_receiver', 'delete_receiver',
      ],
      description: 'CDC Prime ReportStream: submit public health reports (HL7/FHIR/CSV), manage sender and receiver organizations for disease reporting and lab data routing.',
      author: 'protectnil' as const,
    };
  }
}
