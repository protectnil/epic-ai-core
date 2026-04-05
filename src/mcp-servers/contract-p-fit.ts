/**
 * Contract.fit MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Contract.fit MCP server was found on GitHub.
//
// Base URL: https://cfportal.contract-p.fit/api
// Auth: HTTP Basic (username/password) or Bearer JWT token or API Key (Authorization header)
// Docs: https://cfportal.contract-p.fit/swagger.json
// Rate limits: Not documented; 429 returned when exceeded

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ContractPFitConfig {
  apiToken?: string;
  username?: string;
  password?: string;
  baseUrl?: string;
}

export class ContractPFitMCPServer extends MCPAdapterBase {
  private readonly apiToken: string | null;
  private readonly username: string | null;
  private readonly password: string | null;
  private readonly baseUrl: string;

  constructor(config: ContractPFitConfig) {
    super();
    this.apiToken = config.apiToken ?? null;
    this.username = config.username ?? null;
    this.password = config.password ?? null;
    this.baseUrl = config.baseUrl ?? 'https://cfportal.contract-p.fit/api';
  }

  static catalog() {
    return {
      name: 'contract-p-fit',
      displayName: 'Contract.fit',
      version: '1.0.0',
      category: 'legal',
      keywords: [
        'contract',
        'contractfit',
        'document',
        'ocr',
        'extraction',
        'inbox',
        'legal',
        'processing',
        'ai',
        'review',
        'feedback',
        'format',
        'project',
        'report',
        'user',
        'role',
        'api-key',
        'integration',
        'stats',
        'analytics',
      ],
      toolNames: [
        'login',
        'get_current_user',
        'list_users',
        'create_user',
        'update_user',
        'delete_user',
        'list_api_keys',
        'create_api_key',
        'delete_api_key',
        'list_projects',
        'create_project',
        'update_project',
        'delete_project',
        'list_inboxes',
        'create_inbox',
        'get_inbox',
        'update_inbox',
        'delete_inbox',
        'list_inbox_documents',
        'get_paginated_inbox_documents',
        'upload_document',
        'upload_document_to_inbox',
        'get_document',
        'delete_document',
        'get_document_text',
        'reprocess_document',
        'submit_document_feedback',
        'update_document_status',
        'list_formats',
        'get_format',
        'create_format',
        'update_format',
        'delete_format',
        'list_roles',
        'create_role',
        'update_role',
        'delete_role',
        'list_reports',
        'create_report',
        'generate_report',
        'get_inbox_stats',
        'get_usage_stats',
        'list_integrations',
        'create_integration',
        'delete_integration',
        'list_connections',
        'create_connection',
        'delete_connection',
      ],
      description:
        'Contract.fit document AI: upload and process contracts/invoices, extract structured data, manage inboxes and formats, submit review feedback, generate reports, and administer users, roles, and API keys.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Auth ────────────────────────────────────────────────────────────
      {
        name: 'login',
        description:
          'Authenticate with username and password to receive a JWT token for subsequent API calls.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Account username or email address.',
            },
            password: {
              type: 'string',
              description: 'Account password.',
            },
          },
          required: ['username', 'password'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────
      {
        name: 'get_current_user',
        description: 'Return info about the currently authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the organization. Requires edit_users permission.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_user',
        description:
          'Create a new user with specified attributes and roles. Requires edit_users permission.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username for the new account.',
            },
            email: {
              type: 'string',
              description: 'Email address for the new user.',
            },
            password: {
              type: 'string',
              description: 'Initial password for the new user.',
            },
            roles: {
              type: 'string',
              description: 'JSON array of role IDs to assign to the user.',
            },
          },
          required: ['username', 'email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing user attributes. Requires edit_users permission.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'ID of the user to update.',
            },
            email: {
              type: 'string',
              description: 'New email address.',
            },
            roles: {
              type: 'string',
              description: 'JSON array of role IDs to assign.',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user permanently. Requires edit_users permission.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'ID of the user to delete.',
            },
          },
          required: ['user_id'],
        },
      },
      // ── API Keys ─────────────────────────────────────────────────────────
      {
        name: 'list_api_keys',
        description: 'List all API keys for the account. Requires view_api_keys permission.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_api_key',
        description:
          'Create a new API key bound to specified roles. Requires edit_backend_settings permission.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the API key.',
            },
            roles: {
              type: 'string',
              description: 'JSON array of role IDs to bind to the key.',
            },
          },
        },
      },
      {
        name: 'delete_api_key',
        description:
          'Permanently revoke an API key. Requires edit_backend_settings permission.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The API key string to delete.',
            },
          },
          required: ['key'],
        },
      },
      // ── Projects ─────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all projects in the organization.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_project',
        description: 'Create a new project. Requires create_inbox permission.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new project.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_project',
        description:
          'Update project attributes (name, default format). Requires edit_format_settings permission.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ID of the project to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the project.',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'delete_project',
        description:
          'Delete a project permanently. Requires edit_format_settings permission. WARNING: not recoverable.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ID of the project to delete.',
            },
          },
          required: ['project_id'],
        },
      },
      // ── Inboxes ──────────────────────────────────────────────────────────
      {
        name: 'list_inboxes',
        description: 'List all inboxes in the organization.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_inbox',
        description:
          'Create a new inbox within a project. Requires create_inbox permission.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new inbox.',
            },
            project_id: {
              type: 'string',
              description: 'ID of the parent project.',
            },
          },
          required: ['name', 'project_id'],
        },
      },
      {
        name: 'get_inbox',
        description:
          'Get attributes of a specific inbox. Requires view_list permission.',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'ID of the inbox.',
            },
          },
          required: ['inbox_id'],
        },
      },
      {
        name: 'update_inbox',
        description:
          'Update inbox attributes such as name or format. Requires view_list permission.',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'ID of the inbox to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the inbox.',
            },
          },
          required: ['inbox_id'],
        },
      },
      {
        name: 'delete_inbox',
        description:
          'Delete an inbox permanently. WARNING: not recoverable.',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'ID of the inbox to delete.',
            },
          },
          required: ['inbox_id'],
        },
      },
      {
        name: 'list_inbox_documents',
        description:
          'Get all documents in an inbox. Requires view_list permission.',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'ID of the inbox.',
            },
          },
          required: ['inbox_id'],
        },
      },
      {
        name: 'get_paginated_inbox_documents',
        description:
          'Get a paginated list of documents in an inbox with date filtering and ordering. Requires view_list permission.',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'ID of the inbox.',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Documents per page (default: 20).',
            },
            start_receive_date: {
              type: 'string',
              description: 'Filter by receive date start (ISO 8601 date string).',
            },
            end_receive_date: {
              type: 'string',
              description: 'Filter by receive date end (ISO 8601 date string).',
            },
            order_by: {
              type: 'string',
              description: 'Field to order results by.',
            },
          },
          required: ['inbox_id'],
        },
      },
      // ── Documents ────────────────────────────────────────────────────────
      {
        name: 'upload_document',
        description:
          'Upload a document file for simplified synchronous processing. Fallback to invoice inbox if inbox_id not specified.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Local path to the file to upload.',
            },
            inbox_id: {
              type: 'string',
              description: 'Optional inbox ID to upload to (defaults to invoice inbox).',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'upload_document_to_inbox',
        description:
          'Upload a document to a specific inbox with sync/async control. Use sync=false for production workloads to avoid timeouts.',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'ID of the target inbox.',
            },
            file_path: {
              type: 'string',
              description: 'Local path to the file to upload.',
            },
            sync: {
              type: 'boolean',
              description:
                'If true, blocks until processing completes (default: true). Use false for async scheduling.',
            },
          },
          required: ['inbox_id', 'file_path'],
        },
      },
      {
        name: 'get_document',
        description:
          'Get a processed document by ID, including extracted fields, transcription, and processing status. Requires review permission.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document.',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'delete_document',
        description:
          'Delete a document. Use how=FULL to delete entirely or how=SOURCE_FILES to remove files and archive.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document to delete.',
            },
            how: {
              type: 'string',
              description:
                'Deletion mode: FULL (remove everything) or SOURCE_FILES (archive, remove files only).',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'get_document_text',
        description:
          'Get the optimal text extraction for a document (OCR, native, or translated). Requires review permission.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document.',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'reprocess_document',
        description:
          'Schedule async reprocessing of an existing document, skipping OCR. Requires upload permission.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document to reprocess.',
            },
            name: {
              type: 'string',
              description: 'Optional version name for the reprocessing run.',
            },
            reviewer: {
              type: 'string',
              description: 'Optional reviewer name to assign to the new version.',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'submit_document_feedback',
        description:
          'Submit reviewer feedback (corrected field values) for a document to improve model accuracy. Requires submit permission.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document to submit feedback for.',
            },
            feedback: {
              type: 'string',
              description: 'JSON object containing field corrections and review data.',
            },
          },
          required: ['document_id', 'feedback'],
        },
      },
      {
        name: 'update_document_status',
        description:
          'Update status flags on a document: lock, escalate, reject, delete, archive, or submitted.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'ID of the document.',
            },
            status: {
              type: 'string',
              description:
                'JSON object with status fields to update (e.g. {"lock": {"status": true}}).',
            },
          },
          required: ['document_id', 'status'],
        },
      },
      // ── Formats ──────────────────────────────────────────────────────────
      {
        name: 'list_formats',
        description: 'List all extraction formats (field schemas) defined in the organization.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_format',
        description:
          'Get attributes of a specific extraction format. Requires edit_format_settings or review permission.',
        inputSchema: {
          type: 'object',
          properties: {
            format_id: {
              type: 'string',
              description: 'ID of the format.',
            },
          },
          required: ['format_id'],
        },
      },
      {
        name: 'create_format',
        description:
          'Create a new extraction format defining document fields. Requires edit_format_settings permission.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new format.',
            },
            fields: {
              type: 'string',
              description: 'JSON array of field definitions for document extraction.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_format',
        description:
          'Update an existing extraction format. Requires edit_format_settings permission.',
        inputSchema: {
          type: 'object',
          properties: {
            format_id: {
              type: 'string',
              description: 'ID of the format to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the format.',
            },
            fields: {
              type: 'string',
              description: 'Updated JSON array of field definitions.',
            },
          },
          required: ['format_id'],
        },
      },
      {
        name: 'delete_format',
        description:
          'Delete an extraction format permanently. Requires edit_format_settings permission. WARNING: not recoverable.',
        inputSchema: {
          type: 'object',
          properties: {
            format_id: {
              type: 'string',
              description: 'ID of the format to delete.',
            },
          },
          required: ['format_id'],
        },
      },
      // ── Roles ────────────────────────────────────────────────────────────
      {
        name: 'list_roles',
        description: 'List all RBAC roles defined in the organization.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_role',
        description:
          'Create a new role with specified permissions. Requires edit_users permission.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new role.',
            },
            permissions: {
              type: 'string',
              description: 'JSON array of permission strings to grant to the role.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_role',
        description: 'Modify role attributes and permissions. Requires edit_users permission.',
        inputSchema: {
          type: 'object',
          properties: {
            role_id: {
              type: 'string',
              description: 'ID of the role to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the role.',
            },
            permissions: {
              type: 'string',
              description: 'Updated JSON array of permission strings.',
            },
          },
          required: ['role_id'],
        },
      },
      {
        name: 'delete_role',
        description:
          'Delete a role permanently. Requires edit_users permission. WARNING: not recoverable.',
        inputSchema: {
          type: 'object',
          properties: {
            role_id: {
              type: 'string',
              description: 'ID of the role to delete.',
            },
          },
          required: ['role_id'],
        },
      },
      // ── Reports ──────────────────────────────────────────────────────────
      {
        name: 'list_reports',
        description: 'List all reports. Requires read_reports permission.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_report',
        description: 'Create a new report definition. Requires edit_reports permission.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the report.',
            },
            config: {
              type: 'string',
              description: 'JSON object with report configuration.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'generate_report',
        description:
          'Generate a report for a date range and deliver via email or download. Requires read_reports permission.',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'ID of the report to generate.',
            },
            delivery_method: {
              type: 'string',
              description: 'Delivery method: email or download.',
            },
            email: {
              type: 'string',
              description: 'Email address for delivery (required if delivery_method is email).',
            },
            start_date: {
              type: 'string',
              description: 'Start date for the report period (ISO 8601).',
            },
            end_date: {
              type: 'string',
              description: 'End date for the report period (ISO 8601).',
            },
          },
          required: ['report_id', 'delivery_method'],
        },
      },
      // ── Statistics ───────────────────────────────────────────────────────
      {
        name: 'get_inbox_stats',
        description:
          'Get accuracy, precision, recall, and F1 statistics for an inbox, optionally filtered by field, date range, and version. Requires view_statistics permission.',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'ID of the inbox.',
            },
            field_name: {
              type: 'string',
              description: 'Filter stats to a specific field name.',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter (ISO 8601).',
            },
            end_date: {
              type: 'string',
              description: 'End date filter (ISO 8601).',
            },
            version_name: {
              type: 'string',
              description: 'Filter to a specific processing version name.',
            },
          },
          required: ['inbox_id'],
        },
      },
      {
        name: 'get_usage_stats',
        description:
          'Get usage statistics across all inboxes for a mandatory date range, optionally filtered by inbox.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date for the usage period (ISO 8601). Required.',
            },
            end_date: {
              type: 'string',
              description: 'End date for the usage period (ISO 8601). Required.',
            },
            inbox_id: {
              type: 'string',
              description: 'Optional inbox ID to restrict stats to one inbox.',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      // ── Integrations ─────────────────────────────────────────────────────
      {
        name: 'list_integrations',
        description:
          'List all configured integrations. Requires read_integrations permission.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_integration',
        description:
          'Create a new integration (e.g. S3, SFTP, ERP connector). Requires edit_integrations permission.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Integration type identifier (e.g. s3, sftp, webhook).',
            },
            config: {
              type: 'string',
              description: 'JSON object with integration-specific configuration.',
            },
          },
          required: ['type', 'config'],
        },
      },
      {
        name: 'delete_integration',
        description:
          'Delete an integration permanently. Requires edit_integrations permission. WARNING: not recoverable.',
        inputSchema: {
          type: 'object',
          properties: {
            integration_id: {
              type: 'string',
              description: 'ID of the integration to delete.',
            },
          },
          required: ['integration_id'],
        },
      },
      // ── Connections ──────────────────────────────────────────────────────
      {
        name: 'list_connections',
        description:
          'List all connections (project/inbox-scoped integrations). Requires edit_integrations permission.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_connection',
        description:
          'Create a new connection bound to a project or inbox scope. Requires edit_integrations permission.',
        inputSchema: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              description: 'Scope of the connection: project or inbox ID.',
            },
            integration_id: {
              type: 'string',
              description: 'ID of the integration to connect.',
            },
            config: {
              type: 'string',
              description: 'JSON object with connection-specific configuration.',
            },
          },
          required: ['scope', 'integration_id'],
        },
      },
      {
        name: 'delete_connection',
        description:
          'Delete a connection permanently. Requires edit_integrations permission. WARNING: not recoverable.',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'string',
              description: 'ID of the connection to delete.',
            },
          },
          required: ['connection_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'login':
          return await this.login(args);
        case 'get_current_user':
          return await this.getCurrentUser();
        case 'list_users':
          return await this.listUsers();
        case 'create_user':
          return await this.createUser(args);
        case 'update_user':
          return await this.updateUser(args);
        case 'delete_user':
          return await this.deleteUser(args);
        case 'list_api_keys':
          return await this.listApiKeys();
        case 'create_api_key':
          return await this.createApiKey(args);
        case 'delete_api_key':
          return await this.deleteApiKey(args);
        case 'list_projects':
          return await this.listProjects();
        case 'create_project':
          return await this.createProject(args);
        case 'update_project':
          return await this.updateProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_inboxes':
          return await this.listInboxes();
        case 'create_inbox':
          return await this.createInbox(args);
        case 'get_inbox':
          return await this.getInbox(args);
        case 'update_inbox':
          return await this.updateInbox(args);
        case 'delete_inbox':
          return await this.deleteInbox(args);
        case 'list_inbox_documents':
          return await this.listInboxDocuments(args);
        case 'get_paginated_inbox_documents':
          return await this.getPaginatedInboxDocuments(args);
        case 'upload_document':
          return await this.uploadDocument(args);
        case 'upload_document_to_inbox':
          return await this.uploadDocumentToInbox(args);
        case 'get_document':
          return await this.getDocument(args);
        case 'delete_document':
          return await this.deleteDocument(args);
        case 'get_document_text':
          return await this.getDocumentText(args);
        case 'reprocess_document':
          return await this.reprocessDocument(args);
        case 'submit_document_feedback':
          return await this.submitDocumentFeedback(args);
        case 'update_document_status':
          return await this.updateDocumentStatus(args);
        case 'list_formats':
          return await this.listFormats();
        case 'get_format':
          return await this.getFormat(args);
        case 'create_format':
          return await this.createFormat(args);
        case 'update_format':
          return await this.updateFormat(args);
        case 'delete_format':
          return await this.deleteFormat(args);
        case 'list_roles':
          return await this.listRoles();
        case 'create_role':
          return await this.createRole(args);
        case 'update_role':
          return await this.updateRole(args);
        case 'delete_role':
          return await this.deleteRole(args);
        case 'list_reports':
          return await this.listReports();
        case 'create_report':
          return await this.createReport(args);
        case 'generate_report':
          return await this.generateReport(args);
        case 'get_inbox_stats':
          return await this.getInboxStats(args);
        case 'get_usage_stats':
          return await this.getUsageStats(args);
        case 'list_integrations':
          return await this.listIntegrations();
        case 'create_integration':
          return await this.createIntegration(args);
        case 'delete_integration':
          return await this.deleteIntegration(args);
        case 'list_connections':
          return await this.listConnections();
        case 'create_connection':
          return await this.createConnection(args);
        case 'delete_connection':
          return await this.deleteConnection(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private authHeaders(): Record<string, string> {
    if (this.apiToken) {
      return {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      };
    }
    if (this.username && this.password) {
      const encoded = btoa(`${this.username}:${this.password}`);
      return {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
      };
    }
    return { 'Content-Type': 'application/json' };
  }


  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const options: RequestInit = {
      method,
      headers: this.authHeaders(),
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(url, options);

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    // Some DELETE endpoints return 204 No Content
    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
        isError: false,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  private async login(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: args.username, password: args.password }),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Login failed: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  private async getCurrentUser(): Promise<ToolResult> {
    return this.request('GET', '/users/me');
  }

  private async listUsers(): Promise<ToolResult> {
    return this.request('GET', '/users');
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      username: args.username,
      email: args.email,
    };
    if (args.password) body.password = args.password;
    if (args.roles) {
      try { body.roles = JSON.parse(args.roles as string); } catch { body.roles = args.roles; }
    }
    return this.request('POST', '/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    const body: Record<string, unknown> = {};
    if (args.email) body.email = args.email;
    if (args.roles) {
      try { body.roles = JSON.parse(args.roles as string); } catch { body.roles = args.roles; }
    }
    return this.request('PATCH', `/users/${user_id}`, body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    return this.request('DELETE', `/users/${user_id}`);
  }

  // ── API Keys ───────────────────────────────────────────────────────────────

  private async listApiKeys(): Promise<ToolResult> {
    return this.request('GET', '/auth/api-key');
  }

  private async createApiKey(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.roles) {
      try { body.roles = JSON.parse(args.roles as string); } catch { body.roles = args.roles; }
    }
    return this.request('POST', '/auth/api-key', body);
  }

  private async deleteApiKey(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key as string;
    return this.request('DELETE', `/auth/api-key/${key}`);
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  private async listProjects(): Promise<ToolResult> {
    return this.request('GET', '/projects');
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/projects', { name: args.name });
  }

  private async updateProject(args: Record<string, unknown>): Promise<ToolResult> {
    const project_id = args.project_id as string;
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    return this.request('PATCH', `/projects/${project_id}`, body);
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    const project_id = args.project_id as string;
    return this.request('DELETE', `/projects/${project_id}`);
  }

  // ── Inboxes ────────────────────────────────────────────────────────────────

  private async listInboxes(): Promise<ToolResult> {
    return this.request('GET', '/inboxes');
  }

  private async createInbox(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/inboxes', { name: args.name, project_id: args.project_id });
  }

  private async getInbox(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/inboxes/${args.inbox_id}`);
  }

  private async updateInbox(args: Record<string, unknown>): Promise<ToolResult> {
    const inbox_id = args.inbox_id as string;
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    return this.request('PATCH', `/inboxes/${inbox_id}`, body);
  }

  private async deleteInbox(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/inboxes/${args.inbox_id}`);
  }

  private async listInboxDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/inboxes/${args.inbox_id}/documents`);
  }

  private async getPaginatedInboxDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const inbox_id = args.inbox_id as string;
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.start_receive_date) params.start_receive_date = String(args.start_receive_date);
    if (args.end_receive_date) params.end_receive_date = String(args.end_receive_date);
    if (args.order_by) params.order_by = String(args.order_by);
    return this.request('GET', `/inboxes/${inbox_id}/paginated`, undefined, params);
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  private async uploadDocument(args: Record<string, unknown>): Promise<ToolResult> {
    // Note: actual file upload requires multipart/form-data; returning guidance
    const note = {
      note: 'File upload requires multipart/form-data. Provide file_path to the actual binary. Use fetch with FormData in your runtime.',
      endpoint: `${this.baseUrl}/documents/`,
      inbox_id: args.inbox_id ?? null,
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
      isError: false,
    };
  }

  private async uploadDocumentToInbox(args: Record<string, unknown>): Promise<ToolResult> {
    const note = {
      note: 'File upload requires multipart/form-data. Provide file_path to the actual binary. Use fetch with FormData in your runtime.',
      endpoint: `${this.baseUrl}/documents/${args.inbox_id}`,
      sync: args.sync ?? true,
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
      isError: false,
    };
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/documents/${args.document_id}`);
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.how) params.how = String(args.how);
    return this.request('DELETE', `/documents/${args.document_id}`, undefined, params);
  }

  private async getDocumentText(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/documents/${args.document_id}/text`);
  }

  private async reprocessDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const document_id = args.document_id as string;
    const params: Record<string, string> = {};
    if (args.name) params.name = String(args.name);
    if (args.reviewer) params.reviewer = String(args.reviewer);
    return this.request('POST', `/documents/${document_id}/reprocess`, undefined, params);
  }

  private async submitDocumentFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    const document_id = args.document_id as string;
    let feedback: unknown;
    try { feedback = JSON.parse(args.feedback as string); } catch { feedback = args.feedback; }
    return this.request('POST', `/documents/${document_id}/feedback`, feedback as Record<string, unknown>);
  }

  private async updateDocumentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const document_id = args.document_id as string;
    let status: unknown;
    try { status = JSON.parse(args.status as string); } catch { status = args.status; }
    return this.request('POST', `/documents/${document_id}/status_data`, status as Record<string, unknown>);
  }

  // ── Formats ────────────────────────────────────────────────────────────────

  private async listFormats(): Promise<ToolResult> {
    return this.request('GET', '/formats');
  }

  private async getFormat(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/formats/${args.format_id}`);
  }

  private async createFormat(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.fields) {
      try { body.fields = JSON.parse(args.fields as string); } catch { body.fields = args.fields; }
    }
    return this.request('POST', '/formats', body);
  }

  private async updateFormat(args: Record<string, unknown>): Promise<ToolResult> {
    const format_id = args.format_id as string;
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.fields) {
      try { body.fields = JSON.parse(args.fields as string); } catch { body.fields = args.fields; }
    }
    return this.request('PATCH', `/formats/${format_id}`, body);
  }

  private async deleteFormat(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/formats/${args.format_id}`);
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  private async listRoles(): Promise<ToolResult> {
    return this.request('GET', '/roles');
  }

  private async createRole(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.permissions) {
      try { body.permissions = JSON.parse(args.permissions as string); } catch { body.permissions = args.permissions; }
    }
    return this.request('POST', '/roles', body);
  }

  private async updateRole(args: Record<string, unknown>): Promise<ToolResult> {
    const role_id = args.role_id as string;
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.permissions) {
      try { body.permissions = JSON.parse(args.permissions as string); } catch { body.permissions = args.permissions; }
    }
    return this.request('PATCH', `/roles/${role_id}`, body);
  }

  private async deleteRole(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/roles/${args.role_id}`);
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  private async listReports(): Promise<ToolResult> {
    return this.request('GET', '/reports');
  }

  private async createReport(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.config) {
      try { body.config = JSON.parse(args.config as string); } catch { body.config = args.config; }
    }
    return this.request('POST', '/reports', body);
  }

  private async generateReport(args: Record<string, unknown>): Promise<ToolResult> {
    const report_id = args.report_id as string;
    const params: Record<string, string> = {
      delivery_method: args.delivery_method as string,
    };
    if (args.email) params.email = String(args.email);
    if (args.start_date) params.start_date = String(args.start_date);
    if (args.end_date) params.end_date = String(args.end_date);
    return this.request('POST', `/reports/${report_id}/generate`, undefined, params);
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  private async getInboxStats(args: Record<string, unknown>): Promise<ToolResult> {
    const inbox_id = args.inbox_id as string;
    const params: Record<string, string> = {};
    if (args.field_name) params.field_name = String(args.field_name);
    if (args.start_date) params.start_date = String(args.start_date);
    if (args.end_date) params.end_date = String(args.end_date);
    if (args.version_name) params.version_name = String(args.version_name);
    return this.request('GET', `/stats/${inbox_id}`, undefined, params);
  }

  private async getUsageStats(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      start_date: args.start_date as string,
      end_date: args.end_date as string,
    };
    if (args.inbox_id) params.inbox_id = String(args.inbox_id);
    return this.request('GET', '/stats/usage', undefined, params);
  }

  // ── Integrations ───────────────────────────────────────────────────────────

  private async listIntegrations(): Promise<ToolResult> {
    return this.request('GET', '/integrations/');
  }

  private async createIntegration(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { type: args.type };
    if (args.config) {
      try { body.config = JSON.parse(args.config as string); } catch { body.config = args.config; }
    }
    return this.request('POST', '/integrations/', body);
  }

  private async deleteIntegration(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/integrations/${args.integration_id}`);
  }

  // ── Connections ────────────────────────────────────────────────────────────

  private async listConnections(): Promise<ToolResult> {
    return this.request('GET', '/connections');
  }

  private async createConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      scope: args.scope,
      integration_id: args.integration_id,
    };
    if (args.config) {
      try { body.config = JSON.parse(args.config as string); } catch { body.config = args.config; }
    }
    return this.request('POST', '/connections', body);
  }

  private async deleteConnection(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/connections/${args.connection_id}`);
  }
}
