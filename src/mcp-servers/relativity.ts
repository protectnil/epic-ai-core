/**
 * Relativity MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Relativity eDiscovery MCP server was found on GitHub as of March 2026.
// Relativity provides a REST API via the Object Manager service and workspace-specific
// endpoints for documents, searches, fields, custodians, and processing.
//
// Base URL: https://{instance}.relativity.one/Relativity.Rest/API
//   (instance-specific; passed in config.baseUrl)
// Auth: OAuth2 Bearer token — obtained via
//   POST {host}/Relativity/Identity/connect/token (client_credentials grant)
// Docs: https://platform.relativity.com/RelativityOne/Content/Explore/REST_API_Reference.htm
//       https://platform.relativity.com/RelativityOne/Content/BD_Object_Manager/Object_Manager_REST_API_Reference.htm
// Rate limits: Not publicly documented; subject to RelativityOne instance configuration.
// Required header: X-CSRF-Header: - (must be present on all mutating calls)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RelativityConfig {
  /**
   * OAuth2 Bearer access token obtained from
   * POST {host}/Relativity/Identity/connect/token
   */
  accessToken: string;
  /**
   * Full base URL for the Relativity REST API, e.g.
   * https://myinstance.relativity.one/Relativity.Rest/API
   */
  baseUrl: string;
}

export class RelativityMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: RelativityConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'relativity',
      displayName: 'Relativity',
      version: '1.0.0',
      category: 'compliance' as const,
      keywords: [
        'relativity', 'ediscovery', 'e-discovery', 'legal', 'document-review',
        'workspace', 'custodian', 'matter', 'litigation', 'review-coding',
        'saved-search', 'processing', 'redaction',
      ],
      toolNames: [
        'list_workspaces', 'get_workspace', 'create_workspace',
        'query_objects', 'read_object', 'create_object', 'update_object', 'delete_object',
        'mass_update_objects', 'mass_delete_objects',
        'search_documents', 'run_saved_search', 'list_saved_searches',
        'list_fields', 'list_choices',
        'list_matters', 'get_matter',
        'list_custodians', 'create_custodian',
        'get_document_text', 'export_objects',
      ],
      description: 'Relativity eDiscovery platform: manage workspaces, query and code documents, run saved searches, manage matters, custodians, and fields via the Object Manager REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Workspaces ────────────────────────────────────────────────────
      {
        name: 'list_workspaces',
        description: 'List all workspaces accessible to the authenticated user, with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            start: { type: 'number', description: 'Starting index for pagination (default: 1)' },
            length: { type: 'number', description: 'Number of workspaces to return (default: 25, max: 100)' },
            condition: { type: 'string', description: 'Optional RSAPI condition string to filter workspaces' },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Retrieve full details for a specific Relativity workspace by its Artifact ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Artifact ID of the workspace. Use -1 for admin context.' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'create_workspace',
        description: 'Create a new Relativity workspace under a specified matter and template',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name for the new workspace' },
            matterArtifactId: { type: 'number', description: 'Artifact ID of the matter to associate the workspace with' },
            templateArtifactId: { type: 'number', description: 'Artifact ID of the workspace template to use' },
            statusArtifactId: { type: 'number', description: 'Artifact ID of the initial workspace status' },
          },
          required: ['name', 'matterArtifactId', 'templateArtifactId'],
        },
      },
      // ── Object Manager — generic CRUD ─────────────────────────────────
      {
        name: 'query_objects',
        description: 'Query Relativity objects (Documents, RDOs, or system types) using RSAPI conditions, field selection, sorts, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID. Use -1 for admin-level queries.' },
            objectTypeId: { type: 'number', description: 'ArtifactTypeID of the object type to query (e.g. 10 for Document, 5 for Matter)' },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of field names to return (e.g. ["Control Number", "File Name", "Custodian"])',
            },
            condition: { type: 'string', description: 'RSAPI condition string (e.g. \'Status\' == \'Active\')' },
            sorts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fieldName: { type: 'string' },
                  direction: { type: 'string', description: 'Direction: Ascending or Descending' },
                },
              },
              description: 'Sort criteria array',
            },
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of results (default: 25, max: 200)' },
          },
          required: ['workspaceId', 'objectTypeId'],
        },
      },
      {
        name: 'read_object',
        description: 'Read all fields and values for a specific Relativity object by its Artifact ID and type',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            artifactId: { type: 'number', description: 'Artifact ID of the object to read' },
            fieldTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Field types to include: All, String, LongText, WholeNumber, Date, SingleChoice, MultipleChoice, YesNo, User, File, FixedLength (default: All)',
            },
          },
          required: ['workspaceId', 'artifactId'],
        },
      },
      {
        name: 'create_object',
        description: 'Create a new Relativity object (RDO or Document) with specified field values',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            objectTypeId: { type: 'number', description: 'ArtifactTypeID of the object type to create' },
            fieldValues: {
              type: 'object',
              description: 'Object mapping field names to values (e.g. {"Control Number": "DOC001", "Custodian": "John Smith"})',
              additionalProperties: {},
            },
          },
          required: ['workspaceId', 'objectTypeId', 'fieldValues'],
        },
      },
      {
        name: 'update_object',
        description: 'Update fields on an existing Relativity object by its Artifact ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            artifactId: { type: 'number', description: 'Artifact ID of the object to update' },
            fieldValues: {
              type: 'object',
              description: 'Object mapping field names to new values',
              additionalProperties: {},
            },
          },
          required: ['workspaceId', 'artifactId', 'fieldValues'],
        },
      },
      {
        name: 'delete_object',
        description: 'Delete a specific Relativity object by its Artifact ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            artifactId: { type: 'number', description: 'Artifact ID of the object to delete' },
          },
          required: ['workspaceId', 'artifactId'],
        },
      },
      {
        name: 'mass_update_objects',
        description: 'Update a field value across multiple Relativity objects matching a query condition in a single operation',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            objectTypeId: { type: 'number', description: 'ArtifactTypeID of the objects to update' },
            condition: { type: 'string', description: 'RSAPI condition string identifying objects to update' },
            fieldValues: {
              type: 'object',
              description: 'Field name → value pairs to set on all matching objects',
              additionalProperties: {},
            },
          },
          required: ['workspaceId', 'objectTypeId', 'condition', 'fieldValues'],
        },
      },
      {
        name: 'mass_delete_objects',
        description: 'Delete multiple Relativity objects matching a query condition in a single mass operation',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            objectTypeId: { type: 'number', description: 'ArtifactTypeID of the objects to delete' },
            condition: { type: 'string', description: 'RSAPI condition string identifying objects to delete' },
          },
          required: ['workspaceId', 'objectTypeId', 'condition'],
        },
      },
      // ── Document search ───────────────────────────────────────────────
      {
        name: 'search_documents',
        description: 'Keyword-search documents in a Relativity workspace using extracted text content',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            searchText: { type: 'string', description: 'Keyword or phrase to search for in extracted text' },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to return (default: ["Control Number", "File Name", "Artifact ID"])',
            },
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of results (default: 25)' },
          },
          required: ['workspaceId', 'searchText'],
        },
      },
      {
        name: 'list_saved_searches',
        description: 'List all saved searches available in a Relativity workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of saved searches to return (default: 100)' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'run_saved_search',
        description: 'Execute a saved search in a Relativity workspace and return matching document Artifact IDs and fields',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            searchId: { type: 'number', description: 'Artifact ID of the saved search to run' },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to return for each result document',
            },
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of results (default: 25)' },
          },
          required: ['workspaceId', 'searchId'],
        },
      },
      // ── Fields and choices ────────────────────────────────────────────
      {
        name: 'list_fields',
        description: 'List all fields defined in a Relativity workspace for a specific object type',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            objectTypeId: { type: 'number', description: 'ArtifactTypeID to filter fields by (default: 10 for Document)' },
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of fields to return (default: 100)' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_choices',
        description: 'List all choices (selectable values) for a single-choice or multi-choice field in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            fieldArtifactId: { type: 'number', description: 'Artifact ID of the choice field' },
          },
          required: ['workspaceId', 'fieldArtifactId'],
        },
      },
      // ── Matters ───────────────────────────────────────────────────────
      {
        name: 'list_matters',
        description: 'List matters (cases) in Relativity at the admin level (workspaceId = -1)',
        inputSchema: {
          type: 'object',
          properties: {
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of matters to return (default: 25)' },
            condition: { type: 'string', description: 'Optional RSAPI condition to filter matters' },
          },
        },
      },
      {
        name: 'get_matter',
        description: 'Retrieve full details for a specific Relativity matter by its Artifact ID',
        inputSchema: {
          type: 'object',
          properties: {
            matterArtifactId: { type: 'number', description: 'Artifact ID of the matter' },
          },
          required: ['matterArtifactId'],
        },
      },
      // ── Custodians ─────────────────────────────────────────────────────
      {
        name: 'list_custodians',
        description: 'List processing custodians in a Relativity workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of custodians to return (default: 50)' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'create_custodian',
        description: 'Create a new processing custodian in a Relativity workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            firstName: { type: 'string', description: 'Custodian first name' },
            lastName: { type: 'string', description: 'Custodian last name' },
            email: { type: 'string', description: 'Custodian email address' },
          },
          required: ['workspaceId', 'lastName'],
        },
      },
      // ── Document text ──────────────────────────────────────────────────
      {
        name: 'get_document_text',
        description: 'Retrieve the extracted text content of a document from a Relativity workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            documentId: { type: 'number', description: 'Artifact ID of the document' },
          },
          required: ['workspaceId', 'documentId'],
        },
      },
      // ── Export ────────────────────────────────────────────────────────
      {
        name: 'export_objects',
        description: 'Initiate an export of objects matching a query condition from a Relativity workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'number', description: 'Workspace Artifact ID' },
            objectTypeId: { type: 'number', description: 'ArtifactTypeID of objects to export' },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Field names to include in the export',
            },
            condition: { type: 'string', description: 'RSAPI condition to filter objects for export' },
            start: { type: 'number', description: 'Starting index (default: 1)' },
            length: { type: 'number', description: 'Number of objects to export (default: 1000)' },
          },
          required: ['workspaceId', 'objectTypeId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workspaces':
          return await this.listWorkspaces(args);
        case 'get_workspace':
          return await this.getWorkspace(args);
        case 'create_workspace':
          return await this.createWorkspace(args);
        case 'query_objects':
          return await this.queryObjects(args);
        case 'read_object':
          return await this.readObject(args);
        case 'create_object':
          return await this.createObject(args);
        case 'update_object':
          return await this.updateObject(args);
        case 'delete_object':
          return await this.deleteObject(args);
        case 'mass_update_objects':
          return await this.massUpdateObjects(args);
        case 'mass_delete_objects':
          return await this.massDeleteObjects(args);
        case 'search_documents':
          return await this.searchDocuments(args);
        case 'list_saved_searches':
          return await this.listSavedSearches(args);
        case 'run_saved_search':
          return await this.runSavedSearch(args);
        case 'list_fields':
          return await this.listFields(args);
        case 'list_choices':
          return await this.listChoices(args);
        case 'list_matters':
          return await this.listMatters(args);
        case 'get_matter':
          return await this.getMatter(args);
        case 'list_custodians':
          return await this.listCustodians(args);
        case 'create_custodian':
          return await this.createCustodian(args);
        case 'get_document_text':
          return await this.getDocumentText(args);
        case 'export_objects':
          return await this.exportObjects(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-CSRF-Header': '-',
    };
  }

  private async httpPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Relativity API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQueryRequest(args: Record<string, unknown>): Record<string, unknown> {
    const qr: Record<string, unknown> = {};
    if (args.fields) qr.Fields = (args.fields as string[]).map(name => ({ Name: name }));
    if (args.condition) qr.Condition = args.condition;
    if (args.sorts) qr.Sorts = args.sorts;
    if (args.objectTypeId) qr.ObjectType = { ArtifactTypeID: args.objectTypeId };
    return qr;
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Workspace.IWorkspaceModule/Workspace%20Manager/QueryAsync',
      {
        queryRequest: {
          Fields: [{ Name: 'Name' }, { Name: 'Artifact ID' }, { Name: 'Status' }, { Name: 'Matter' }],
          Condition: (args.condition as string) ?? '',
          Sorts: [],
        },
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 25,
      },
    );
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Workspace.IWorkspaceModule/Workspace%20Manager/ReadSingleAsync',
      { workspaceArtifactID: args.workspaceId },
    );
  }

  private async createWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const workspaceRequest: Record<string, unknown> = {
      Name: args.name,
      Matter: { ArtifactID: args.matterArtifactId },
      Template: { ArtifactID: args.templateArtifactId },
    };
    if (args.statusArtifactId) workspaceRequest.Status = { ArtifactID: args.statusArtifactId };
    return this.httpPost(
      '/Relativity.Services.Workspace.IWorkspaceModule/Workspace%20Manager/CreateAsync',
      { workspaceRequest },
    );
  }

  private async queryObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const queryRequest = this.buildQueryRequest(args);
    if (!queryRequest.Fields) {
      queryRequest.Fields = [{ Name: 'Artifact ID' }, { Name: 'Name' }];
    }
    if (!queryRequest.Condition) queryRequest.Condition = '';
    if (!queryRequest.Sorts) queryRequest.Sorts = [];
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest,
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 25,
      },
    );
  }

  private async readObject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/ReadAsync',
      {
        workspaceArtifactID: args.workspaceId,
        artifactID: args.artifactId,
        fieldTypes: (args.fieldTypes as string[]) ?? ['All'],
      },
    );
  }

  private async createObject(args: Record<string, unknown>): Promise<ToolResult> {
    const fieldValues = args.fieldValues as Record<string, unknown>;
    const fields = Object.entries(fieldValues).map(([name, value]) => ({
      Field: { Name: name },
      Value: value,
    }));
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/CreateAsync',
      {
        workspaceArtifactID: args.workspaceId,
        relativityObject: {
          ObjectType: { ArtifactTypeID: args.objectTypeId },
          FieldValues: fields,
        },
      },
    );
  }

  private async updateObject(args: Record<string, unknown>): Promise<ToolResult> {
    const fieldValues = args.fieldValues as Record<string, unknown>;
    const fields = Object.entries(fieldValues).map(([name, value]) => ({
      Field: { Name: name },
      Value: value,
    }));
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/UpdateAsync',
      {
        workspaceArtifactID: args.workspaceId,
        relativityObject: {
          ArtifactID: args.artifactId,
          FieldValues: fields,
        },
      },
    );
  }

  private async deleteObject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/DeleteAsync',
      {
        workspaceArtifactID: args.workspaceId,
        relativityObject: { ArtifactID: args.artifactId },
      },
    );
  }

  private async massUpdateObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const fieldValues = args.fieldValues as Record<string, unknown>;
    const fields = Object.entries(fieldValues).map(([name, value]) => ({
      Field: { Name: name },
      Value: value,
    }));
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/MassUpdateAsync',
      {
        workspaceArtifactID: args.workspaceId,
        massRequest: {
          ObjectType: { ArtifactTypeID: args.objectTypeId },
          Condition: args.condition,
          FieldValues: fields,
        },
      },
    );
  }

  private async massDeleteObjects(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/MassDeleteAsync',
      {
        workspaceArtifactID: args.workspaceId,
        massRequest: {
          ObjectType: { ArtifactTypeID: args.objectTypeId },
          Condition: args.condition,
        },
      },
    );
  }

  private async searchDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const fields = (args.fields as string[]) ?? ['Control Number', 'File Name', 'Artifact ID'];
    const searchText = (args.searchText as string).replace(/'/g, "''");
    return this.httpPost(
      '/Relativity.Services.Search.ISearchModule/Keyword%20Search%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest: {
          Fields: fields.map(name => ({ Name: name })),
          Condition: `'Extracted Text' LIKE '${searchText}'`,
          Sorts: [],
        },
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 25,
      },
    );
  }

  private async listSavedSearches(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Search.ISearchModule/Search%20Container%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest: {
          Fields: [{ Name: 'Name' }, { Name: 'Artifact ID' }, { Name: 'Owner' }],
          Condition: '',
          Sorts: [],
        },
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 100,
      },
    );
  }

  private async runSavedSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const fields = (args.fields as string[] | undefined) ?? ['Control Number', 'File Name', 'Artifact ID'];
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest: {
          Fields: fields.map(name => ({ Name: name })),
          SavedSearchArtifactID: args.searchId,
        },
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 25,
      },
    );
  }

  private async listFields(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Field.IFieldModule/Field%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest: {
          ObjectType: { ArtifactTypeID: (args.objectTypeId as number) ?? 10 },
          Fields: [{ Name: 'Name' }, { Name: 'Artifact ID' }, { Name: 'Field Type' }],
          Condition: '',
          Sorts: [{ FieldIdentifier: { Name: 'Name' }, Direction: 'Ascending' }],
        },
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 100,
      },
    );
  }

  private async listChoices(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Choice.IChoiceModule/Choice%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest: {
          Fields: [{ Name: 'Name' }, { Name: 'Artifact ID' }, { Name: 'Order' }],
          Condition: `'Field' SUBQUERY (ArtifactID == ${encodeURIComponent(args.fieldArtifactId as string)})`,
          Sorts: [{ FieldIdentifier: { Name: 'Order' }, Direction: 'Ascending' }],
        },
        start: 1,
        length: 500,
      },
    );
  }

  private async listMatters(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/QueryAsync',
      {
        workspaceArtifactID: -1,
        queryRequest: {
          ObjectType: { ArtifactTypeID: 5 },
          Fields: [{ Name: 'Name' }, { Name: 'Artifact ID' }, { Name: 'Status' }, { Name: 'Number' }],
          Condition: (args.condition as string) ?? '',
          Sorts: [],
        },
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 25,
      },
    );
  }

  private async getMatter(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/ReadAsync',
      {
        workspaceArtifactID: -1,
        artifactID: args.matterArtifactId,
        fieldTypes: ['All'],
      },
    );
  }

  private async listCustodians(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Processing.IProcessingModule/Processing%20Custodian%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest: {
          Fields: [{ Name: 'First Name' }, { Name: 'Last Name' }, { Name: 'Email' }, { Name: 'Artifact ID' }],
          Condition: '',
          Sorts: [],
        },
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 50,
      },
    );
  }

  private async createCustodian(args: Record<string, unknown>): Promise<ToolResult> {
    const custodian: Record<string, unknown> = {
      LastName: args.lastName,
    };
    if (args.firstName) custodian.FirstName = args.firstName;
    if (args.email) custodian.Email = args.email;
    return this.httpPost(
      '/Relativity.Services.Processing.IProcessingModule/Processing%20Custodian%20Manager/SaveAsync',
      {
        workspaceArtifactID: args.workspaceId,
        processingCustodian: custodian,
      },
    );
  }

  private async getDocumentText(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/ReadAsync',
      {
        workspaceArtifactID: args.workspaceId,
        artifactID: args.documentId,
        fieldTypes: ['LongText'],
      },
    );
  }

  private async exportObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const fields = (args.fields as string[] | undefined) ?? ['Artifact ID', 'Control Number'];
    const queryRequest: Record<string, unknown> = {
      ObjectType: { ArtifactTypeID: args.objectTypeId },
      Fields: fields.map(name => ({ Name: name })),
      Condition: (args.condition as string) ?? '',
      Sorts: [],
    };
    return this.httpPost(
      '/Relativity.Services.Objects.IObjectsModule/Object%20Manager/QueryAsync',
      {
        workspaceArtifactID: args.workspaceId,
        queryRequest,
        start: (args.start as number) ?? 1,
        length: (args.length as number) ?? 1000,
      },
    );
  }
}
