/**
 * Qualtrics MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://api.qualtrics.com (vendor-hosted, per-API MCP servers) — transport: streamable-HTTP, auth: X-API-TOKEN
// Qualtrics officially provides an MCP server for every JSON-based API endpoint documented on api.qualtrics.com.
// Each API group (Surveys, Distributions, Contacts, etc.) has its own MCP server exposing tools 1:1 with API endpoints.
// The full API reference has 30+ endpoint groups (Surveys, Distributions, Contacts, Directories, Mailing Lists,
// Mailing List Contacts, Survey Responses, Import/Export, Users, Organizations, Tickets, Groups, etc.).
// Community MCP: https://github.com/yrvelez/qualtrics-mcp-server (53 tools, stdio, community-maintained, not official).
// Our adapter covers: 16 tools. Vendor official MCP covers: all JSON API endpoints (50+ tools estimated).
// Recommendation: use-vendor-mcp — the official Qualtrics MCP covers the full API surface, which is a strict superset
// of this adapter's 16 tools. Use this adapter for air-gapped deployments only.
//
// Base URL: https://{datacenter_id}.qualtrics.com/API/v3 (datacenter ID is account-specific, e.g. iad1, ca1, fra1)
// Auth: X-API-TOKEN header with the Qualtrics API token
// Docs: https://api.qualtrics.com/
// Rate limits: Varies by account tier; X-RateLimit-* headers returned in responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface QualtricsConfig {
  apiToken: string;
  datacenterId: string;
  baseUrl?: string;
}

export class QualtricsMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: QualtricsConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || `https://${config.datacenterId}.qualtrics.com/API/v3`;
  }

  static catalog() {
    return {
      name: 'qualtrics',
      displayName: 'Qualtrics',
      version: '1.0.0',
      category: 'misc',
      keywords: ['qualtrics', 'survey', 'feedback', 'responses', 'cx', 'experience management', 'XM', 'NPS', 'distribution', 'contact'],
      toolNames: [
        'list_surveys', 'get_survey', 'create_survey', 'update_survey', 'delete_survey',
        'export_responses', 'get_response_export_progress', 'get_response_export_file',
        'list_distributions', 'create_distribution',
        'list_contacts', 'create_contact', 'get_contact', 'update_contact', 'delete_contact',
        'get_whoami',
      ],
      description: 'Qualtrics experience management: manage surveys, export responses, create distributions, and manage contact lists.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_surveys',
        description: 'List all surveys in the Qualtrics account with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'string', description: 'Pagination offset token from a previous response nextPage field' },
          },
        },
      },
      {
        name: 'get_survey',
        description: 'Get full survey definition including questions, blocks, and flow for a specific survey ID',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID (e.g. SV_xxxxxxxxxxxxxxx)' },
          },
          required: ['surveyId'],
        },
      },
      {
        name: 'create_survey',
        description: 'Create a new Qualtrics survey with a specified name and optional project category',
        inputSchema: {
          type: 'object',
          properties: {
            SurveyName: { type: 'string', description: 'Display name for the new survey' },
            Language: { type: 'string', description: 'Survey language code (e.g. EN, ES, FR — default: EN)' },
            ProjectCategory: { type: 'string', description: 'Project category: CORE, CX, EX, BX (default: CORE)' },
          },
          required: ['SurveyName'],
        },
      },
      {
        name: 'update_survey',
        description: 'Update an existing Qualtrics survey name, status, or expiration date',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID to update' },
            SurveyName: { type: 'string', description: 'New name for the survey' },
            SurveyStatus: { type: 'string', description: 'Survey status: Active or Inactive' },
            SurveyExpirationDate: { type: 'string', description: 'Expiration date in YYYY-MM-DDTHH:MM:SS format (UTC)' },
          },
          required: ['surveyId'],
        },
      },
      {
        name: 'delete_survey',
        description: 'Permanently delete a Qualtrics survey and all associated response data',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID to delete' },
          },
          required: ['surveyId'],
        },
      },
      {
        name: 'export_responses',
        description: 'Start an asynchronous export of survey responses in CSV, JSON, or SPSS format',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID to export responses from' },
            format: { type: 'string', description: 'Export format: csv, json, spss, ndjson (default: json)' },
            startDate: { type: 'string', description: 'Include responses submitted after this date (ISO 8601 UTC)' },
            endDate: { type: 'string', description: 'Include responses submitted before this date (ISO 8601 UTC)' },
            limit: { type: 'number', description: 'Maximum number of responses to export' },
            useLabels: { type: 'boolean', description: 'Use answer labels instead of recode values (default: false)' },
          },
          required: ['surveyId', 'format'],
        },
      },
      {
        name: 'get_response_export_progress',
        description: 'Check the progress of an asynchronous survey response export by export progress ID',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID' },
            exportProgressId: { type: 'string', description: 'Export progress ID returned by export_responses' },
          },
          required: ['surveyId', 'exportProgressId'],
        },
      },
      {
        name: 'get_response_export_file',
        description: 'Download the completed response export file by survey ID and file ID',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID' },
            fileId: { type: 'string', description: 'File ID from the completed export progress response' },
          },
          required: ['surveyId', 'fileId'],
        },
      },
      {
        name: 'list_distributions',
        description: 'List survey distributions (email invites, links) for a survey with optional type and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID' },
            distributionRequestType: { type: 'string', description: 'Filter by type: Individual, Multiple, Anonymous, Email, Reminder, ThankYou' },
          },
          required: ['surveyId'],
        },
      },
      {
        name: 'create_distribution',
        description: 'Create a new email distribution to send survey invitations to a contact list',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string', description: 'Qualtrics survey ID to distribute' },
            mailingListId: { type: 'string', description: 'Contact list/mailing list ID to send to' },
            fromEmail: { type: 'string', description: 'Sender email address (must be verified in Qualtrics)' },
            fromName: { type: 'string', description: 'Sender display name' },
            replyToEmail: { type: 'string', description: 'Reply-to email address' },
            subject: { type: 'string', description: 'Email subject line' },
            sendDate: { type: 'string', description: 'Scheduled send date in ISO 8601 UTC format (e.g. 2026-04-01T14:00:00Z)' },
            message: { type: 'string', description: 'Email message body (can include survey link placeholder ${l://SurveyURL})' },
          },
          required: ['surveyId', 'mailingListId', 'fromEmail', 'fromName', 'subject', 'sendDate'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in a Qualtrics mailing list/directory with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            directoryId: { type: 'string', description: 'XM Directory ID (starts with POOL_)' },
            mailingListId: { type: 'string', description: 'Specific mailing list ID to list contacts from' },
            skipToken: { type: 'string', description: 'Pagination token from a previous response' },
          },
          required: ['directoryId'],
        },
      },
      {
        name: 'create_contact',
        description: 'Add a new contact to a Qualtrics XM directory and optional mailing list',
        inputSchema: {
          type: 'object',
          properties: {
            directoryId: { type: 'string', description: 'XM Directory ID (starts with POOL_)' },
            firstName: { type: 'string', description: 'Contact first name' },
            lastName: { type: 'string', description: 'Contact last name' },
            email: { type: 'string', description: 'Contact email address' },
            phone: { type: 'string', description: 'Contact phone number' },
            extRef: { type: 'string', description: 'External reference ID for linking to your system' },
            embeddedData: { type: 'object', description: 'Key-value pairs of custom embedded data fields' },
          },
          required: ['directoryId', 'email'],
        },
      },
      {
        name: 'get_contact',
        description: 'Get details for a specific contact in the Qualtrics XM directory by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            directoryId: { type: 'string', description: 'XM Directory ID (starts with POOL_)' },
            contactId: { type: 'string', description: 'Contact ID (starts with CID_)' },
          },
          required: ['directoryId', 'contactId'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update contact information in the Qualtrics XM directory',
        inputSchema: {
          type: 'object',
          properties: {
            directoryId: { type: 'string', description: 'XM Directory ID (starts with POOL_)' },
            contactId: { type: 'string', description: 'Contact ID to update (starts with CID_)' },
            firstName: { type: 'string', description: 'Updated first name' },
            lastName: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number' },
            embeddedData: { type: 'object', description: 'Updated key-value embedded data fields' },
          },
          required: ['directoryId', 'contactId'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Remove a contact from the Qualtrics XM directory by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            directoryId: { type: 'string', description: 'XM Directory ID (starts with POOL_)' },
            contactId: { type: 'string', description: 'Contact ID to delete (starts with CID_)' },
          },
          required: ['directoryId', 'contactId'],
        },
      },
      {
        name: 'get_whoami',
        description: 'Get the authenticated Qualtrics user account details including username, datacenter, and permissions',
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
        case 'list_surveys': return this.listSurveys(args);
        case 'get_survey': return this.getSurvey(args);
        case 'create_survey': return this.createSurvey(args);
        case 'update_survey': return this.updateSurvey(args);
        case 'delete_survey': return this.deleteSurvey(args);
        case 'export_responses': return this.exportResponses(args);
        case 'get_response_export_progress': return this.getResponseExportProgress(args);
        case 'get_response_export_file': return this.getResponseExportFile(args);
        case 'list_distributions': return this.listDistributions(args);
        case 'create_distribution': return this.createDistribution(args);
        case 'list_contacts': return this.listContacts(args);
        case 'create_contact': return this.createContact(args);
        case 'get_contact': return this.getContact(args);
        case 'update_contact': return this.updateContact(args);
        case 'delete_contact': return this.deleteContact(args);
        case 'get_whoami': return this.getWhoami();
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
      'X-API-TOKEN': this.apiToken,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { deleted: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSurveys(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.offset) params.offset = args.offset as string;
    return this.get('/surveys', params);
  }

  private async getSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId) return { content: [{ type: 'text', text: 'surveyId is required' }], isError: true };
    return this.get(`/surveys/${encodeURIComponent(args.surveyId as string)}`);
  }

  private async createSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.SurveyName) return { content: [{ type: 'text', text: 'SurveyName is required' }], isError: true };
    const body: Record<string, unknown> = { SurveyName: args.SurveyName };
    if (args.Language) body.Language = args.Language;
    if (args.ProjectCategory) body.ProjectCategory = args.ProjectCategory;
    return this.post('/surveys', body);
  }

  private async updateSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId) return { content: [{ type: 'text', text: 'surveyId is required' }], isError: true };
    const { surveyId, ...body } = args;
    return this.put(`/surveys/${surveyId}`, body as Record<string, unknown>);
  }

  private async deleteSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId) return { content: [{ type: 'text', text: 'surveyId is required' }], isError: true };
    return this.del(`/surveys/${encodeURIComponent(args.surveyId as string)}`);
  }

  private async exportResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId || !args.format) return { content: [{ type: 'text', text: 'surveyId and format are required' }], isError: true };
    const body: Record<string, unknown> = { format: args.format };
    if (args.startDate) body.startDate = args.startDate;
    if (args.endDate) body.endDate = args.endDate;
    if (args.limit) body.limit = args.limit;
    if (typeof args.useLabels === 'boolean') body.useLabels = args.useLabels;
    return this.post(`/surveys/${encodeURIComponent(args.surveyId as string)}/export-responses`, body);
  }

  private async getResponseExportProgress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId || !args.exportProgressId) return { content: [{ type: 'text', text: 'surveyId and exportProgressId are required' }], isError: true };
    return this.get(`/surveys/${encodeURIComponent(args.surveyId as string)}/export-responses/${encodeURIComponent(args.exportProgressId as string)}`);
  }

  private async getResponseExportFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId || !args.fileId) return { content: [{ type: 'text', text: 'surveyId and fileId are required' }], isError: true };
    return this.get(`/surveys/${encodeURIComponent(args.surveyId as string)}/export-responses/${encodeURIComponent(args.fileId as string)}/file`);
  }

  private async listDistributions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId) return { content: [{ type: 'text', text: 'surveyId is required' }], isError: true };
    const params: Record<string, string> = { surveyId: args.surveyId as string };
    if (args.distributionRequestType) params.distributionRequestType = args.distributionRequestType as string;
    return this.get('/distributions', params);
  }

  private async createDistribution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.surveyId || !args.mailingListId || !args.fromEmail || !args.fromName || !args.subject || !args.sendDate) {
      return { content: [{ type: 'text', text: 'surveyId, mailingListId, fromEmail, fromName, subject, and sendDate are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      surveyLink: { surveyId: args.surveyId, expirationDate: null, type: 'Individual' },
      header: {
        fromEmail: args.fromEmail,
        fromName: args.fromName,
        replyToEmail: args.replyToEmail || args.fromEmail,
        subject: args.subject,
      },
      message: { messageText: args.message || 'You have been invited to take a survey. Please click: ${l://SurveyURL}' },
      recipients: { mailingListId: args.mailingListId },
      sendDate: args.sendDate,
    };
    return this.post('/distributions', body);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.directoryId) return { content: [{ type: 'text', text: 'directoryId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.skipToken) params.skipToken = args.skipToken as string;
    const path = args.mailingListId
      ? `/directories/${encodeURIComponent(args.directoryId as string)}/mailinglists/${encodeURIComponent(args.mailingListId as string)}/contacts`
      : `/directories/${encodeURIComponent(args.directoryId as string)}/contacts`;
    return this.get(path, params);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.directoryId || !args.email) return { content: [{ type: 'text', text: 'directoryId and email are required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.lastName = args.lastName;
    if (args.phone) body.phone = args.phone;
    if (args.extRef) body.extRef = args.extRef;
    if (args.embeddedData) body.embeddedData = args.embeddedData;
    return this.post(`/directories/${encodeURIComponent(args.directoryId as string)}/contacts`, body);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.directoryId || !args.contactId) return { content: [{ type: 'text', text: 'directoryId and contactId are required' }], isError: true };
    return this.get(`/directories/${encodeURIComponent(args.directoryId as string)}/contacts/${encodeURIComponent(args.contactId as string)}`);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.directoryId || !args.contactId) return { content: [{ type: 'text', text: 'directoryId and contactId are required' }], isError: true };
    const { directoryId, contactId, ...body } = args;
    return this.put(`/directories/${directoryId}/contacts/${contactId}`, body as Record<string, unknown>);
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.directoryId || !args.contactId) return { content: [{ type: 'text', text: 'directoryId and contactId are required' }], isError: true };
    return this.del(`/directories/${encodeURIComponent(args.directoryId as string)}/contacts/${encodeURIComponent(args.contactId as string)}`);
  }

  private async getWhoami(): Promise<ToolResult> {
    return this.get('/whoami');
  }
}
