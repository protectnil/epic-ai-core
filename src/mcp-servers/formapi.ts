/**
 * FormAPI (DocSpring) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. DocSpring/FormAPI has not published an official MCP server.
//
// Base URL: https://api.docspring.com/api/v1
// Auth: HTTP Basic — api_token_id as username, api_token_secret as password
// Docs: https://docspring.com/docs/api/
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FormAPIConfig {
  apiTokenId: string;
  apiTokenSecret: string;
  baseUrl?: string;
}

export class FormAPIMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: FormAPIConfig) {
    super();
    const encoded = Buffer.from(`${config.apiTokenId}:${config.apiTokenSecret}`).toString('base64');
    this.authHeader = `Basic ${encoded}`;
    this.baseUrl = config.baseUrl || 'https://api.docspring.com/api/v1';
  }

  static catalog() {
    return {
      name: 'formapi',
      displayName: 'FormAPI (DocSpring)',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'formapi', 'docspring', 'pdf', 'pdf generation', 'pdf template', 'form',
        'document automation', 'pdf fill', 'submission', 'combine pdf',
        'merge pdf', 'e-signature', 'data request', 'folder', 'template',
      ],
      toolNames: [
        'test_authentication',
        'list_templates', 'get_template', 'get_template_full', 'get_template_schema',
        'create_pdf_template', 'create_pdf_template_from_upload', 'update_template',
        'copy_template', 'move_template_to_folder', 'add_fields_to_template',
        'generate_pdf', 'batch_generate_pdfs',
        'list_submissions', 'get_submission', 'expire_submission', 'list_template_submissions',
        'list_combined_submissions', 'get_combined_submission', 'combine_submissions',
        'expire_combined_submission',
        'get_data_request', 'update_data_request', 'create_data_request_token',
        'list_folders', 'create_folder', 'rename_folder', 'move_folder_to_folder', 'delete_folder',
        'create_custom_file_from_upload',
      ],
      description: 'PDF document automation: fill PDF templates, generate PDFs, combine submissions, manage templates and folders, handle data requests, and automate form workflows via the DocSpring API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Auth ──────────────────────────────────────────────────────────────
      {
        name: 'test_authentication',
        description: 'Test whether the provided API credentials are valid',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Templates ─────────────────────────────────────────────────────────
      {
        name: 'list_templates',
        description: 'List all PDF templates in the account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 50, max: 50)' },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get the status and basic attributes of a PDF template by template ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The PDF template ID' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'get_template_full',
        description: 'Fetch the full template attributes including all field definitions by template ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The PDF template ID' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'get_template_schema',
        description: 'Fetch the JSON schema for a template — describes all fillable fields and their types',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The PDF template ID' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'create_pdf_template',
        description: 'Create a new PDF template by uploading a PDF file via multipart form POST',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name for the new template' },
            template_type: { type: 'string', description: 'Template type: "pdf" (default) or "html"' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_pdf_template_from_upload',
        description: 'Create a new PDF template from a previously cached presign upload URL',
        inputSchema: {
          type: 'object',
          properties: {
            upload_id: { type: 'string', description: 'Cached upload ID from a presigned upload' },
            name: { type: 'string', description: 'Display name for the new template' },
          },
          required: ['upload_id', 'name'],
        },
      },
      {
        name: 'update_template',
        description: 'Update metadata or field definitions on an existing PDF template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The template ID to update' },
            name: { type: 'string', description: 'New display name for the template' },
            description: { type: 'string', description: 'Template description' },
            expiration_interval: { type: 'string', description: 'PDF expiration interval: "minutes", "hours", "days"' },
            expire_after: { type: 'number', description: 'Number of intervals before the generated PDF expires' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'copy_template',
        description: 'Create a copy of an existing PDF template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The template ID to copy' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'move_template_to_folder',
        description: 'Move a PDF template into a folder',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The template ID to move' },
            folder_id: { type: 'string', description: 'The destination folder ID' },
          },
          required: ['template_id', 'folder_id'],
        },
      },
      {
        name: 'add_fields_to_template',
        description: 'Add new fillable field definitions to an existing PDF template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The template ID to add fields to' },
            fields: {
              type: 'array',
              description: 'Array of field definition objects to add',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Field name (used as key in submission data)' },
                  type: { type: 'string', description: 'Field type: "string", "number", "boolean", "date", "image"' },
                  required: { type: 'boolean', description: 'Whether the field is required in submissions' },
                },
              },
            },
          },
          required: ['template_id', 'fields'],
        },
      },
      // ── PDF Generation ────────────────────────────────────────────────────
      {
        name: 'generate_pdf',
        description: 'Generate a PDF from a template by submitting field data — returns a submission with download URL',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The template ID to generate PDF from' },
            data: { type: 'object', description: 'Key-value field data matching the template schema', properties: {} },
            metadata: { type: 'object', description: 'Optional metadata object to store with the submission', properties: {} },
            test: { type: 'boolean', description: 'Generate in test mode (adds watermark, does not count against quota)' },
            password: { type: 'string', description: 'Password-protect the generated PDF' },
            expires_in: { type: 'number', description: 'Seconds until the generated PDF expires' },
          },
          required: ['template_id', 'data'],
        },
      },
      {
        name: 'batch_generate_pdfs',
        description: 'Generate multiple PDFs in a single batch request from the same template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The template ID to generate PDFs from' },
            submissions: {
              type: 'array',
              description: 'Array of submission objects, each with a "data" field',
              items: {
                type: 'object',
                properties: {
                  data: { type: 'object', description: 'Field data for this submission', properties: {} },
                  metadata: { type: 'object', description: 'Optional metadata for this submission', properties: {} },
                },
              },
            },
          },
          required: ['template_id', 'submissions'],
        },
      },
      // ── Submissions ───────────────────────────────────────────────────────
      {
        name: 'list_submissions',
        description: 'List all PDF submissions across all templates with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 50, max: 50)' },
          },
        },
      },
      {
        name: 'list_template_submissions',
        description: 'List all submissions for a specific PDF template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The template ID to list submissions for' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 50)' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'get_submission',
        description: 'Check the status of a PDF submission and retrieve its download URL when processing is complete',
        inputSchema: {
          type: 'object',
          properties: {
            submission_id: { type: 'string', description: 'The submission ID to check' },
          },
          required: ['submission_id'],
        },
      },
      {
        name: 'expire_submission',
        description: 'Expire a PDF submission to revoke its download URL and delete the generated file',
        inputSchema: {
          type: 'object',
          properties: {
            submission_id: { type: 'string', description: 'The submission ID to expire' },
          },
          required: ['submission_id'],
        },
      },
      // ── Combined Submissions ──────────────────────────────────────────────
      {
        name: 'list_combined_submissions',
        description: 'List all combined (merged) PDF submissions with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 50, max: 50)' },
          },
        },
      },
      {
        name: 'get_combined_submission',
        description: 'Check the status and download URL of a combined (merged) PDF submission',
        inputSchema: {
          type: 'object',
          properties: {
            combined_submission_id: { type: 'string', description: 'The combined submission ID to check' },
          },
          required: ['combined_submission_id'],
        },
      },
      {
        name: 'combine_submissions',
        description: 'Merge multiple generated PDFs into a single combined PDF document',
        inputSchema: {
          type: 'object',
          properties: {
            submission_ids: {
              type: 'array',
              description: 'Array of submission IDs to merge into one PDF',
              items: { type: 'string' },
            },
            expires_in: { type: 'number', description: 'Seconds until the combined PDF expires' },
            password: { type: 'string', description: 'Password-protect the combined PDF' },
          },
          required: ['submission_ids'],
        },
      },
      {
        name: 'expire_combined_submission',
        description: 'Expire a combined submission to revoke its download URL and delete the merged file',
        inputSchema: {
          type: 'object',
          properties: {
            combined_submission_id: { type: 'string', description: 'The combined submission ID to expire' },
          },
          required: ['combined_submission_id'],
        },
      },
      // ── Data Requests ─────────────────────────────────────────────────────
      {
        name: 'get_data_request',
        description: 'Look up a submission data request by ID to check its status and retrieve submitted form data',
        inputSchema: {
          type: 'object',
          properties: {
            data_request_id: { type: 'string', description: 'The data request ID to retrieve' },
          },
          required: ['data_request_id'],
        },
      },
      {
        name: 'update_data_request',
        description: 'Update a submission data request — change the assignee or set field values',
        inputSchema: {
          type: 'object',
          properties: {
            data_request_id: { type: 'string', description: 'The data request ID to update' },
            email: { type: 'string', description: 'Email address of the person assigned to fill out the form' },
            name: { type: 'string', description: 'Name of the person assigned to the data request' },
            fields: {
              type: 'array',
              description: 'Array of field name strings to include in the data request',
              items: { type: 'string' },
            },
          },
          required: ['data_request_id'],
        },
      },
      {
        name: 'create_data_request_token',
        description: 'Create an authentication token for a data request to allow form access without login',
        inputSchema: {
          type: 'object',
          properties: {
            data_request_id: { type: 'string', description: 'The data request ID to generate a token for' },
          },
          required: ['data_request_id'],
        },
      },
      // ── Folders ───────────────────────────────────────────────────────────
      {
        name: 'list_folders',
        description: 'List all folders in the account for organising templates',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder for organising PDF templates',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the new folder' },
          },
          required: ['name'],
        },
      },
      {
        name: 'rename_folder',
        description: 'Rename an existing folder by folder ID',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'The folder ID to rename' },
            name: { type: 'string', description: 'New name for the folder' },
          },
          required: ['folder_id', 'name'],
        },
      },
      {
        name: 'move_folder_to_folder',
        description: 'Move a folder into another folder to create a nested hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'The folder ID to move' },
            parent_folder_id: { type: 'string', description: 'The destination parent folder ID' },
          },
          required: ['folder_id', 'parent_folder_id'],
        },
      },
      {
        name: 'delete_folder',
        description: 'Delete a folder by folder ID (folder must be empty)',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'The folder ID to delete' },
          },
          required: ['folder_id'],
        },
      },
      // ── Custom Files ──────────────────────────────────────────────────────
      {
        name: 'create_custom_file_from_upload',
        description: 'Create a new custom file record from a previously cached presigned upload',
        inputSchema: {
          type: 'object',
          properties: {
            cache_id: { type: 'string', description: 'Cache ID from the presigned upload response' },
          },
          required: ['cache_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      let response: Response;

      switch (name) {
        // ── Auth ─────────────────────────────────────────────────────────────
        case 'test_authentication': {
          response = await this.fetchWithRetry(`${this.baseUrl}/authentication`, { headers });
          break;
        }

        // ── Templates ────────────────────────────────────────────────────────
        case 'list_templates': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          response = await this.fetchWithRetry(`${this.baseUrl}/templates?${params}`, { headers });
          break;
        }

        case 'get_template': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}`, { headers });
          break;
        }

        case 'get_template_full': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}?full=true`, { headers });
          break;
        }

        case 'get_template_schema': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}/schema`, { headers });
          break;
        }

        case 'create_pdf_template': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ template: { name: args.name, template_type: args.template_type ?? 'pdf' } }),
          });
          break;
        }

        case 'create_pdf_template_from_upload': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates?desc=cached_upload`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ template: { name: args.name }, upload_id: args.upload_id }),
          });
          break;
        }

        case 'update_template': {
          const body: Record<string, unknown> = {};
          if (args.name) body.name = args.name;
          if (args.description) body.description = args.description;
          if (args.expiration_interval) body.expiration_interval = args.expiration_interval;
          if (args.expire_after !== undefined) body.expire_after = args.expire_after;
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ template: body }),
          });
          break;
        }

        case 'copy_template': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}/copy`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          break;
        }

        case 'move_template_to_folder': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}/move`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ folder_id: args.folder_id }),
          });
          break;
        }

        case 'add_fields_to_template': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}/add_fields`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ fields: args.fields }),
          });
          break;
        }

        // ── PDF Generation ────────────────────────────────────────────────────
        case 'generate_pdf': {
          const submission: Record<string, unknown> = { data: args.data };
          if (args.metadata) submission.metadata = args.metadata;
          if (args.test !== undefined) submission.test = args.test;
          if (args.password) submission.password = args.password;
          if (args.expires_in !== undefined) submission.expires_in = args.expires_in;
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}/submissions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ submission }),
          });
          break;
        }

        case 'batch_generate_pdfs': {
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}/submissions/batch`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ submissions: args.submissions }),
          });
          break;
        }

        // ── Submissions ───────────────────────────────────────────────────────
        case 'list_submissions': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          response = await this.fetchWithRetry(`${this.baseUrl}/submissions?${params}`, { headers });
          break;
        }

        case 'list_template_submissions': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          response = await this.fetchWithRetry(`${this.baseUrl}/templates/${args.template_id}/submissions?${params}`, { headers });
          break;
        }

        case 'get_submission': {
          response = await this.fetchWithRetry(`${this.baseUrl}/submissions/${args.submission_id}`, { headers });
          break;
        }

        case 'expire_submission': {
          response = await this.fetchWithRetry(`${this.baseUrl}/submissions/${args.submission_id}`, {
            method: 'DELETE',
            headers,
          });
          break;
        }

        // ── Combined Submissions ──────────────────────────────────────────────
        case 'list_combined_submissions': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          response = await this.fetchWithRetry(`${this.baseUrl}/combined_submissions?${params}`, { headers });
          break;
        }

        case 'get_combined_submission': {
          response = await this.fetchWithRetry(`${this.baseUrl}/combined_submissions/${args.combined_submission_id}`, { headers });
          break;
        }

        case 'combine_submissions': {
          const body: Record<string, unknown> = { submission_ids: args.submission_ids };
          if (args.expires_in !== undefined) body.expires_in = args.expires_in;
          if (args.password) body.password = args.password;
          response = await this.fetchWithRetry(`${this.baseUrl}/combined_submissions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        case 'expire_combined_submission': {
          response = await this.fetchWithRetry(`${this.baseUrl}/combined_submissions/${args.combined_submission_id}`, {
            method: 'DELETE',
            headers,
          });
          break;
        }

        // ── Data Requests ─────────────────────────────────────────────────────
        case 'get_data_request': {
          response = await this.fetchWithRetry(`${this.baseUrl}/data_requests/${args.data_request_id}`, { headers });
          break;
        }

        case 'update_data_request': {
          const body: Record<string, unknown> = {};
          if (args.email) body.email = args.email;
          if (args.name) body.name = args.name;
          if (args.fields) body.fields = args.fields;
          response = await this.fetchWithRetry(`${this.baseUrl}/data_requests/${args.data_request_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        case 'create_data_request_token': {
          response = await this.fetchWithRetry(`${this.baseUrl}/data_requests/${args.data_request_id}/tokens`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          break;
        }

        // ── Folders ───────────────────────────────────────────────────────────
        case 'list_folders': {
          response = await this.fetchWithRetry(`${this.baseUrl}/folders/`, { headers });
          break;
        }

        case 'create_folder': {
          response = await this.fetchWithRetry(`${this.baseUrl}/folders/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ folder: { name: args.name } }),
          });
          break;
        }

        case 'rename_folder': {
          response = await this.fetchWithRetry(`${this.baseUrl}/folders/${args.folder_id}/rename`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ folder: { name: args.name } }),
          });
          break;
        }

        case 'move_folder_to_folder': {
          response = await this.fetchWithRetry(`${this.baseUrl}/folders/${args.folder_id}/move`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ parent_folder_id: args.parent_folder_id }),
          });
          break;
        }

        case 'delete_folder': {
          response = await this.fetchWithRetry(`${this.baseUrl}/folders/${args.folder_id}`, {
            method: 'DELETE',
            headers,
          });
          break;
        }

        // ── Custom Files ──────────────────────────────────────────────────────
        case 'create_custom_file_from_upload': {
          response = await this.fetchWithRetry(`${this.baseUrl}/custom_files`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ cache_id: args.cache_id }),
          });
          break;
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      const text = await response.text();
      const truncated = text.length > 10240 ? text.slice(0, 10240) + '…[truncated]' : text;
      return {
        content: [{ type: 'text', text: truncated }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
}
