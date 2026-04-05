/**
 * Climate.com (FieldView) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Climate.com / Bayer FieldView MCP server found on GitHub.
//
// Base URL: https://platform.climate.com/
// Auth: OAuth2 Bearer token (Authorization Code Grant) + X-Api-Key header for throttling.
//       Token URL: https://api.climate.com/api/oauth/token
//       Auth URL: https://climate.com/static/app-login/
// Docs: https://developer.climate.com/
// Rate limits: 429 responses controlled by X-Api-Key throttling.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClimateConfig {
  accessToken: string;
  apiKey?: string;
  baseUrl?: string;
}

export class ClimateMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ClimateConfig) {
    super();
    this.accessToken = config.accessToken;
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? 'https://platform.climate.com';
  }

  private get authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }
    return headers;
  }

  static catalog() {
    return {
      name: 'climate',
      displayName: 'Climate.com FieldView',
      version: '1.0.0',
      category: 'agriculture' as const,
      keywords: [
        'climate', 'fieldview', 'bayer', 'agriculture', 'farm', 'field', 'boundary',
        'planting', 'harvest', 'application', 'scouting', 'operations', 'agronomy',
        'precision agriculture', 'layers', 'uploads', 'exports',
      ],
      toolNames: [
        'list_fields',
        'list_all_fields',
        'get_field',
        'upload_boundary',
        'query_boundaries',
        'get_boundary',
        'list_applied_activities',
        'get_applied_activity_contents',
        'list_harvested_activities',
        'get_harvested_activity_contents',
        'list_planted_activities',
        'get_planted_activity_contents',
        'list_scouting_observations',
        'get_scouting_observation',
        'list_scouting_attachments',
        'get_scouting_attachment_contents',
        'list_operations',
        'get_farm_organization',
        'get_resource_owner',
        'create_export',
        'get_export_status',
        'get_export_contents',
        'create_upload',
        'query_upload_statuses',
        'chunked_upload',
        'get_upload_status',
      ],
      description:
        'Access Climate.com FieldView platform for precision agriculture: manage fields, boundaries, ' +
        'planting/harvest/application activity layers, scouting observations, farm operations, ' +
        'and data exports/uploads.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_fields',
        description:
          'Retrieve a paginated list of fields the authenticated user has access to, with optional name filter.',
        inputSchema: {
          type: 'object',
          properties: {
            fieldName: {
              type: 'string',
              description: 'Optional prefix filter for field name (minimum 3 characters)',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination token from a previous response to fetch the next batch',
            },
            limit: {
              type: 'number',
              description: 'Max results per batch, 1–100 (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_all_fields',
        description:
          'Retrieve a paginated list of all fields accessible to the user, across all organizations.',
        inputSchema: {
          type: 'object',
          properties: {
            fieldName: {
              type: 'string',
              description: 'Optional prefix filter for field name (minimum 3 characters)',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination token from a previous response to fetch the next batch',
            },
            limit: {
              type: 'number',
              description: 'Max results per batch, 1–100 (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_field',
        description: 'Retrieve a specific field by its unique ID including metadata and boundary info.',
        inputSchema: {
          type: 'object',
          properties: {
            fieldId: {
              type: 'string',
              description: 'Unique identifier of the field',
            },
          },
          required: ['fieldId'],
        },
      },
      {
        name: 'upload_boundary',
        description:
          'Upload a new field boundary as GeoJSON geometry to the FieldView platform.',
        inputSchema: {
          type: 'object',
          properties: {
            geometry: {
              type: 'object',
              description: 'GeoJSON geometry object defining the field boundary polygon',
            },
          },
          required: ['geometry'],
        },
      },
      {
        name: 'query_boundaries',
        description:
          'Retrieve multiple field boundaries in batch by providing an array of boundary IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of boundary unique identifiers to retrieve',
              items: { type: 'string' },
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_boundary',
        description: 'Retrieve a single field boundary by its unique ID.',
        inputSchema: {
          type: 'object',
          properties: {
            boundaryId: {
              type: 'string',
              description: 'Unique identifier of the boundary',
            },
          },
          required: ['boundaryId'],
        },
      },
      {
        name: 'list_applied_activities',
        description:
          'Retrieve a list of as-applied (application) activity layers with optional date range and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            resourceOwnerId: {
              type: 'string',
              description: 'Optional resource owner ID to filter by; defaults to the authenticated user',
            },
            occurredAfter: {
              type: 'string',
              description: 'ISO 8601 start time filter for activity occurrence date',
            },
            occurredBefore: {
              type: 'string',
              description: 'ISO 8601 end time filter for activity occurrence date',
            },
            updatedAfter: {
              type: 'string',
              description: 'ISO 8601 filter for activities updated after this time',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Max results per batch, 1–100 (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_applied_activity_contents',
        description:
          'Retrieve the raw binary contents of a specific as-applied activity using byte range.',
        inputSchema: {
          type: 'object',
          properties: {
            activityId: {
              type: 'string',
              description: 'Unique identifier of the application activity',
            },
            byteRange: {
              type: 'string',
              description: 'Byte range in format bytes=start-end (e.g., bytes=0-1023)',
            },
          },
          required: ['activityId', 'byteRange'],
        },
      },
      {
        name: 'list_harvested_activities',
        description:
          'Retrieve a list of as-harvested activity layers with optional date range and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            resourceOwnerId: {
              type: 'string',
              description: 'Optional resource owner ID to filter by',
            },
            occurredAfter: {
              type: 'string',
              description: 'ISO 8601 start time filter for activity occurrence date',
            },
            occurredBefore: {
              type: 'string',
              description: 'ISO 8601 end time filter for activity occurrence date',
            },
            updatedAfter: {
              type: 'string',
              description: 'ISO 8601 filter for activities updated after this time',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Max results per batch, 1–100 (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_harvested_activity_contents',
        description:
          'Retrieve the raw binary contents of a specific as-harvested activity using byte range.',
        inputSchema: {
          type: 'object',
          properties: {
            activityId: {
              type: 'string',
              description: 'Unique identifier of the harvest activity',
            },
            byteRange: {
              type: 'string',
              description: 'Byte range in format bytes=start-end (e.g., bytes=0-1023)',
            },
          },
          required: ['activityId', 'byteRange'],
        },
      },
      {
        name: 'list_planted_activities',
        description:
          'Retrieve a list of as-planted activity layers with optional date range and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            resourceOwnerId: {
              type: 'string',
              description: 'Optional resource owner ID to filter by',
            },
            occurredAfter: {
              type: 'string',
              description: 'ISO 8601 start time filter for activity occurrence date',
            },
            occurredBefore: {
              type: 'string',
              description: 'ISO 8601 end time filter for activity occurrence date',
            },
            updatedAfter: {
              type: 'string',
              description: 'ISO 8601 filter for activities updated after this time',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Max results per batch, 1–100 (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_planted_activity_contents',
        description:
          'Retrieve the raw binary contents of a specific as-planted activity using byte range.',
        inputSchema: {
          type: 'object',
          properties: {
            activityId: {
              type: 'string',
              description: 'Unique identifier of the planting activity',
            },
            byteRange: {
              type: 'string',
              description: 'Byte range in format bytes=start-end (e.g., bytes=0-1023)',
            },
          },
          required: ['activityId', 'byteRange'],
        },
      },
      {
        name: 'list_scouting_observations',
        description:
          'Retrieve a paginated list of field scouting observations with optional date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            occurredAfter: {
              type: 'string',
              description: 'ISO 8601 start time filter for observation occurrence',
            },
            occurredBefore: {
              type: 'string',
              description: 'ISO 8601 end time filter for observation occurrence',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Max results per batch, 1–100 (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_scouting_observation',
        description: 'Retrieve a single scouting observation by its unique ID.',
        inputSchema: {
          type: 'object',
          properties: {
            scoutingObservationId: {
              type: 'string',
              description: 'Unique identifier of the scouting observation',
            },
          },
          required: ['scoutingObservationId'],
        },
      },
      {
        name: 'list_scouting_attachments',
        description:
          'Retrieve attachments (images, files) associated with a given scouting observation.',
        inputSchema: {
          type: 'object',
          properties: {
            scoutingObservationId: {
              type: 'string',
              description: 'Unique identifier of the scouting observation',
            },
            nextToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Max results per batch, 1–100 (default: 100)',
            },
          },
          required: ['scoutingObservationId'],
        },
      },
      {
        name: 'get_scouting_attachment_contents',
        description:
          'Retrieve the binary contents of a specific scouting observation attachment using byte range.',
        inputSchema: {
          type: 'object',
          properties: {
            scoutingObservationId: {
              type: 'string',
              description: 'Unique identifier of the scouting observation',
            },
            attachmentId: {
              type: 'string',
              description: 'Unique identifier of the attachment',
            },
            byteRange: {
              type: 'string',
              description: 'Byte range in format bytes=start-end (e.g., bytes=0-1023)',
            },
          },
          required: ['scoutingObservationId', 'attachmentId', 'byteRange'],
        },
      },
      {
        name: 'list_operations',
        description:
          'Retrieve all farm operations accessible to the user, optionally filtered by resource owner.',
        inputSchema: {
          type: 'object',
          properties: {
            resourceOwnerId: {
              type: 'string',
              description: 'Optional comma-separated list of resource owner IDs to filter by',
            },
          },
        },
      },
      {
        name: 'get_farm_organization',
        description:
          'Retrieve a specific farm organization by its type (e.g., grower, operation) and ID.',
        inputSchema: {
          type: 'object',
          properties: {
            farmOrganizationType: {
              type: 'string',
              description: 'Type of the farm organization (e.g., grower, operation)',
            },
            farmOrganizationId: {
              type: 'string',
              description: 'Unique identifier of the farm organization',
            },
          },
          required: ['farmOrganizationType', 'farmOrganizationId'],
        },
      },
      {
        name: 'get_resource_owner',
        description: 'Retrieve a resource owner (farmer/grower account) by their unique ID.',
        inputSchema: {
          type: 'object',
          properties: {
            resourceOwnerId: {
              type: 'string',
              description: 'Unique identifier of the resource owner',
            },
          },
          required: ['resourceOwnerId'],
        },
      },
      {
        name: 'create_export',
        description:
          'Initiate a new data export request for agronomic data (planting, harvest, application, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            contentType: {
              type: 'string',
              description: 'Content type representing data being exported (e.g., application/vnd.climate.acrsi.geojson)',
            },
            definition: {
              type: 'object',
              description: 'Additional export specifications dependent on the content type',
            },
          },
          required: ['contentType'],
        },
      },
      {
        name: 'get_export_status',
        description: 'Retrieve the processing status of a previously initiated export request.',
        inputSchema: {
          type: 'object',
          properties: {
            exportId: {
              type: 'string',
              description: 'Unique identifier of the export request',
            },
          },
          required: ['exportId'],
        },
      },
      {
        name: 'get_export_contents',
        description:
          'Download the binary contents of a completed export by export ID using byte range.',
        inputSchema: {
          type: 'object',
          properties: {
            exportId: {
              type: 'string',
              description: 'Unique identifier of the completed export',
            },
            byteRange: {
              type: 'string',
              description: 'Byte range in format bytes=start-end (e.g., bytes=0-1023)',
            },
          },
          required: ['exportId', 'byteRange'],
        },
      },
      {
        name: 'create_upload',
        description:
          'Initiate a new chunked upload session for agronomic data (prescription, soil, imagery, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            contentType: {
              type: 'string',
              description: 'Content type of the data being uploaded (e.g., image/vnd.climate.rgb.geotiff)',
            },
            md5: {
              type: 'string',
              description: 'Base64-encoded MD5 hash of the complete file content',
            },
            length: {
              type: 'number',
              description: 'Total file size in bytes',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata object for the upload',
            },
            recipientEmail: {
              type: 'string',
              description: 'Email of a Climate account to send the upload to (optional)',
            },
          },
          required: ['contentType', 'md5', 'length'],
        },
      },
      {
        name: 'query_upload_statuses',
        description:
          'Retrieve the status of multiple upload sessions in batch by providing an array of upload IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of upload unique identifiers to query',
              items: { type: 'string' },
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'chunked_upload',
        description:
          'Send a chunk of binary data for an active upload session using Content-Range header.',
        inputSchema: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              description: 'Unique identifier of the upload session',
            },
            contentRange: {
              type: 'string',
              description: 'Byte range of this chunk in format bytes start-end/total (e.g., bytes 0-1023/4096)',
            },
            dataBase64: {
              type: 'string',
              description: 'Base64-encoded binary chunk data to upload',
            },
          },
          required: ['uploadId', 'contentRange', 'dataBase64'],
        },
      },
      {
        name: 'get_upload_status',
        description: 'Retrieve the processing status of a specific upload session by upload ID.',
        inputSchema: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              description: 'Unique identifier of the upload session',
            },
          },
          required: ['uploadId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_fields':
          return await this.listFields(args, '/v4/fields');
        case 'list_all_fields':
          return await this.listFields(args, '/v4/fields/all');
        case 'get_field':
          return await this.getField(args);
        case 'upload_boundary':
          return await this.uploadBoundary(args);
        case 'query_boundaries':
          return await this.queryBoundaries(args);
        case 'get_boundary':
          return await this.getBoundary(args);
        case 'list_applied_activities':
          return await this.listLayerActivities('/v4/layers/asApplied', args);
        case 'get_applied_activity_contents':
          return await this.getActivityContents('/v4/layers/asApplied', args);
        case 'list_harvested_activities':
          return await this.listLayerActivities('/v4/layers/asHarvested', args);
        case 'get_harvested_activity_contents':
          return await this.getActivityContents('/v4/layers/asHarvested', args);
        case 'list_planted_activities':
          return await this.listLayerActivities('/v4/layers/asPlanted', args);
        case 'get_planted_activity_contents':
          return await this.getActivityContents('/v4/layers/asPlanted', args);
        case 'list_scouting_observations':
          return await this.listScoutingObservations(args);
        case 'get_scouting_observation':
          return await this.getScoutingObservation(args);
        case 'list_scouting_attachments':
          return await this.listScoutingAttachments(args);
        case 'get_scouting_attachment_contents':
          return await this.getScoutingAttachmentContents(args);
        case 'list_operations':
          return await this.listOperations(args);
        case 'get_farm_organization':
          return await this.getFarmOrganization(args);
        case 'get_resource_owner':
          return await this.getResourceOwner(args);
        case 'create_export':
          return await this.createExport(args);
        case 'get_export_status':
          return await this.getExportStatus(args);
        case 'get_export_contents':
          return await this.getExportContents(args);
        case 'create_upload':
          return await this.createUpload(args);
        case 'query_upload_statuses':
          return await this.queryUploadStatuses(args);
        case 'chunked_upload':
          return await this.chunkedUpload(args);
        case 'get_upload_status':
          return await this.getUploadStatus(args);
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

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: URLSearchParams,
    extraHeaders?: Record<string, string>,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const headers = { ...this.authHeaders, ...extraHeaders };
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 204, message: 'Success (no content)' }) }],
        isError: false,
      };
    }

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Climate API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listFields(args: Record<string, unknown>, path: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fieldName) params.set('fieldName', args.fieldName as string);
    const headers: Record<string, string> = {};
    if (args.nextToken) headers['X-Next-Token'] = args.nextToken as string;
    if (args.limit) headers['X-Limit'] = String(args.limit as number);
    return this.request('GET', path, undefined, params.toString() ? params : undefined, headers);
  }

  private async getField(args: Record<string, unknown>): Promise<ToolResult> {
    const fieldId = args.fieldId as string;
    if (!fieldId) {
      return { content: [{ type: 'text', text: 'fieldId is required' }], isError: true };
    }
    return this.request('GET', `/v4/fields/${encodeURIComponent(fieldId)}`);
  }

  private async uploadBoundary(args: Record<string, unknown>): Promise<ToolResult> {
    const geometry = args.geometry;
    if (!geometry) {
      return { content: [{ type: 'text', text: 'geometry is required' }], isError: true };
    }
    return this.request('POST', '/v4/boundaries', { geometry });
  }

  private async queryBoundaries(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { content: [{ type: 'text', text: 'ids array is required' }], isError: true };
    }
    return this.request('POST', '/v4/boundaries/query', { ids });
  }

  private async getBoundary(args: Record<string, unknown>): Promise<ToolResult> {
    const boundaryId = args.boundaryId as string;
    if (!boundaryId) {
      return { content: [{ type: 'text', text: 'boundaryId is required' }], isError: true };
    }
    return this.request('GET', `/v4/boundaries/${encodeURIComponent(boundaryId)}`);
  }

  private async listLayerActivities(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.resourceOwnerId) params.set('resourceOwnerId', args.resourceOwnerId as string);
    if (args.occurredAfter) params.set('occurredAfter', args.occurredAfter as string);
    if (args.occurredBefore) params.set('occurredBefore', args.occurredBefore as string);
    if (args.updatedAfter) params.set('updatedAfter', args.updatedAfter as string);
    const headers: Record<string, string> = { Accept: '*/*' };
    if (args.nextToken) headers['X-Next-Token'] = args.nextToken as string;
    if (args.limit) headers['X-Limit'] = String(args.limit as number);
    return this.request('GET', basePath, undefined, params.toString() ? params : undefined, headers);
  }

  private async getActivityContents(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    const activityId = args.activityId as string;
    const byteRange = args.byteRange as string;
    if (!activityId || !byteRange) {
      return { content: [{ type: 'text', text: 'activityId and byteRange are required' }], isError: true };
    }
    return this.request(
      'GET',
      `${basePath}/${encodeURIComponent(activityId)}/contents`,
      undefined,
      undefined,
      { Accept: '*/*', Range: byteRange },
    );
  }

  private async listScoutingObservations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.occurredAfter) params.set('occurredAfter', args.occurredAfter as string);
    if (args.occurredBefore) params.set('occurredBefore', args.occurredBefore as string);
    const headers: Record<string, string> = {};
    if (args.nextToken) headers['X-Next-Token'] = args.nextToken as string;
    if (args.limit) headers['X-Limit'] = String(args.limit as number);
    return this.request('GET', '/v4/layers/scoutingObservations', undefined, params.toString() ? params : undefined, headers);
  }

  private async getScoutingObservation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.scoutingObservationId as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'scoutingObservationId is required' }], isError: true };
    }
    return this.request('GET', `/v4/layers/scoutingObservations/${encodeURIComponent(id)}`);
  }

  private async listScoutingAttachments(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.scoutingObservationId as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'scoutingObservationId is required' }], isError: true };
    }
    const headers: Record<string, string> = {};
    if (args.nextToken) headers['X-Next-Token'] = args.nextToken as string;
    if (args.limit) headers['X-Limit'] = String(args.limit as number);
    return this.request('GET', `/v4/layers/scoutingObservations/${encodeURIComponent(id)}/attachments`, undefined, undefined, headers);
  }

  private async getScoutingAttachmentContents(args: Record<string, unknown>): Promise<ToolResult> {
    const obsId = args.scoutingObservationId as string;
    const attId = args.attachmentId as string;
    const byteRange = args.byteRange as string;
    if (!obsId || !attId || !byteRange) {
      return { content: [{ type: 'text', text: 'scoutingObservationId, attachmentId, and byteRange are required' }], isError: true };
    }
    return this.request(
      'GET',
      `/v4/layers/scoutingObservations/${encodeURIComponent(obsId)}/attachments/${encodeURIComponent(attId)}/contents`,
      undefined,
      undefined,
      { Accept: '*/*', Range: byteRange },
    );
  }

  private async listOperations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.resourceOwnerId) params.set('resourceOwnerId', args.resourceOwnerId as string);
    return this.request('GET', '/v4/operations/all', undefined, params.toString() ? params : undefined);
  }

  private async getFarmOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const type = args.farmOrganizationType as string;
    const id = args.farmOrganizationId as string;
    if (!type || !id) {
      return { content: [{ type: 'text', text: 'farmOrganizationType and farmOrganizationId are required' }], isError: true };
    }
    return this.request('GET', `/v4/farmOrganizations/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
  }

  private async getResourceOwner(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.resourceOwnerId as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'resourceOwnerId is required' }], isError: true };
    }
    return this.request('GET', `/v4/resourceOwners/${encodeURIComponent(id)}`);
  }

  private async createExport(args: Record<string, unknown>): Promise<ToolResult> {
    const contentType = args.contentType as string;
    if (!contentType) {
      return { content: [{ type: 'text', text: 'contentType is required' }], isError: true };
    }
    const body: Record<string, unknown> = { contentType };
    if (args.definition) body.definition = args.definition;
    return this.request('POST', '/v4/exports', body);
  }

  private async getExportStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const exportId = args.exportId as string;
    if (!exportId) {
      return { content: [{ type: 'text', text: 'exportId is required' }], isError: true };
    }
    return this.request('GET', `/v4/exports/${encodeURIComponent(exportId)}/status`);
  }

  private async getExportContents(args: Record<string, unknown>): Promise<ToolResult> {
    const exportId = args.exportId as string;
    const byteRange = args.byteRange as string;
    if (!exportId || !byteRange) {
      return { content: [{ type: 'text', text: 'exportId and byteRange are required' }], isError: true };
    }
    return this.request(
      'GET',
      `/v4/exports/${encodeURIComponent(exportId)}/contents`,
      undefined,
      undefined,
      { Accept: '*/*', Range: byteRange },
    );
  }

  private async createUpload(args: Record<string, unknown>): Promise<ToolResult> {
    const contentType = args.contentType as string;
    const md5 = args.md5 as string;
    const length = args.length as number;
    if (!contentType || !md5 || length === undefined) {
      return { content: [{ type: 'text', text: 'contentType, md5, and length are required' }], isError: true };
    }
    const body: Record<string, unknown> = { contentType, md5, length };
    if (args.metadata) body.metadata = args.metadata;
    const extraHeaders: Record<string, string> = {};
    if (args.recipientEmail) extraHeaders['X-Recipient-Email'] = args.recipientEmail as string;
    return this.request('POST', '/v4/uploads', body, undefined, extraHeaders);
  }

  private async queryUploadStatuses(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.ids as string[];
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { content: [{ type: 'text', text: 'ids array is required' }], isError: true };
    }
    return this.request('POST', '/v4/uploads/status/query', { ids });
  }

  private async chunkedUpload(args: Record<string, unknown>): Promise<ToolResult> {
    const uploadId = args.uploadId as string;
    const contentRange = args.contentRange as string;
    const dataBase64 = args.dataBase64 as string;
    if (!uploadId || !contentRange || !dataBase64) {
      return { content: [{ type: 'text', text: 'uploadId, contentRange, and dataBase64 are required' }], isError: true };
    }
    const bytes = Uint8Array.from(atob(dataBase64), c => c.charCodeAt(0));
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Content-Range': contentRange,
    };
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v4/uploads/${encodeURIComponent(uploadId)}`, {
      method: 'PUT',
      headers,
      body: bytes,
    });
    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Climate API error ${response.status} ${response.statusText}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: JSON.stringify({ status: response.status }) }], isError: false };
    }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getUploadStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const uploadId = args.uploadId as string;
    if (!uploadId) {
      return { content: [{ type: 'text', text: 'uploadId is required' }], isError: true };
    }
    return this.request('GET', `/v4/uploads/${encodeURIComponent(uploadId)}/status`);
  }
}
