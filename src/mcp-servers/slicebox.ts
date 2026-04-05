/**
 * Slicebox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Slicebox MCP server was found on GitHub or the vendor website.
//
// Base URL: http://slicebox.local/api (self-hosted; configurable via baseUrl)
// Auth: Session cookie obtained via POST /users/login with username/password credentials
// Docs: https://slicebox.github.io/slicebox-api/swagger.yaml
// Rate limits: Not applicable — self-hosted system; limits depend on operator configuration.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SliceboxConfig {
  username: string;
  password: string;
  /** Base URL of the Slicebox instance (default: http://slicebox.local/api) */
  baseUrl?: string;
}

export class SliceboxMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private sessionCookie: string | null = null;

  constructor(config: SliceboxConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl ?? 'http://slicebox.local/api';
  }

  static catalog() {
    return {
      name: 'slicebox',
      displayName: 'Slicebox',
      version: '1.0.0',
      category: 'healthcare',
      keywords: [
        'slicebox', 'dicom', 'medical imaging', 'radiology', 'pacs',
        'anonymization', 'patient', 'study', 'series', 'image',
        'healthcare', 'hl7', 'scp', 'scu', 'mri', 'ct', 'scan',
      ],
      toolNames: [
        'login',
        'get_health',
        'list_patients',
        'get_patient',
        'list_studies',
        'get_study',
        'list_series',
        'get_series',
        'list_images',
        'get_image_attributes',
        'list_anonymization_keys',
        'anonymize_images',
        'list_boxes',
        'send_images_to_box',
        'list_import_sessions',
        'create_import_session',
        'list_users',
        'get_log',
      ],
      description: 'Slicebox self-hosted DICOM medical image sharing: query patients, studies, series, and images; anonymize DICOM data; manage box-to-box transfers and import sessions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'login',
        description: 'Authenticate with the Slicebox server and establish a session — must be called before other operations if not already logged in',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_health',
        description: 'Check whether the Slicebox service is alive and responding',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_patients',
        description: 'List patients in the DICOM hierarchy with pagination, ordering, and text filter support',
        inputSchema: {
          type: 'object',
          properties: {
            startindex: {
              type: 'number',
              description: 'Start index of returned slice (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of patients to return (default: 20)',
            },
            orderby: {
              type: 'string',
              description: 'Property to order results by (e.g. PatientName)',
            },
            orderascending: {
              type: 'boolean',
              description: 'Order ascending if true, descending if false (default: true)',
            },
            filter: {
              type: 'string',
              description: 'Filter results by matching substrings of properties against this value',
            },
          },
        },
      },
      {
        name: 'get_patient',
        description: 'Get metadata for a specific patient by their numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric patient ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_studies',
        description: 'List studies for a given patient ID with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            patientid: {
              type: 'number',
              description: 'Patient ID to retrieve studies for',
            },
            startindex: {
              type: 'number',
              description: 'Start index of returned slice (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of studies to return (default: 20)',
            },
          },
          required: ['patientid'],
        },
      },
      {
        name: 'get_study',
        description: 'Get metadata for a specific study by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric study ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_series',
        description: 'List series for a given study ID with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            studyid: {
              type: 'number',
              description: 'Study ID to retrieve series for',
            },
            startindex: {
              type: 'number',
              description: 'Start index of returned slice (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of series to return (default: 20)',
            },
          },
          required: ['studyid'],
        },
      },
      {
        name: 'get_series',
        description: 'Get metadata for a specific DICOM series by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric series ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_images',
        description: 'List images (datasets) for a given series ID with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            seriesid: {
              type: 'number',
              description: 'Series ID to retrieve images for',
            },
            startindex: {
              type: 'number',
              description: 'Start index of returned slice (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of images to return (default: 20)',
            },
          },
          required: ['seriesid'],
        },
      },
      {
        name: 'get_image_attributes',
        description: 'List all DICOM attributes (tags and values) for a specific image by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric image ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_anonymization_keys',
        description: 'List anonymization keys showing how vital DICOM attributes were anonymized, with pagination and filter support',
        inputSchema: {
          type: 'object',
          properties: {
            startindex: {
              type: 'number',
              description: 'Start index of returned slice (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of keys to return (default: 20)',
            },
            orderby: {
              type: 'string',
              description: 'Property to order results by',
            },
            orderascending: {
              type: 'boolean',
              description: 'Order ascending if true, descending if false (default: true)',
            },
            filter: {
              type: 'string',
              description: 'Filter results by matching substrings against this value',
            },
          },
        },
      },
      {
        name: 'anonymize_images',
        description: 'Anonymize a list of DICOM images by replacing specified tags with provided values — returns newly created anonymous images',
        inputSchema: {
          type: 'object',
          properties: {
            imageTagValues: {
              type: 'array',
              description: 'Array of objects each containing imageId (number) and tagValues (array of {tag, value} pairs to anonymize)',
            },
          },
          required: ['imageTagValues'],
        },
      },
      {
        name: 'list_boxes',
        description: 'List configured box connections for box-to-box DICOM image sharing with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            startindex: {
              type: 'number',
              description: 'Start index of returned slice (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of boxes to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'send_images_to_box',
        description: 'Send a list of DICOM images to a remote box connection by box ID and image ID list',
        inputSchema: {
          type: 'object',
          properties: {
            boxId: {
              type: 'number',
              description: 'Numeric ID of the remote box to send images to',
            },
            imageIds: {
              type: 'array',
              description: 'Array of numeric image IDs to send to the remote box',
            },
          },
          required: ['boxId', 'imageIds'],
        },
      },
      {
        name: 'list_import_sessions',
        description: 'List available import sessions used for structured batch importing of DICOM files',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_import_session',
        description: 'Create a new import session for structured batch importing of DICOM datasets',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new import session',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users registered in the Slicebox system',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_log',
        description: 'Retrieve Slicebox system log messages with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            startindex: {
              type: 'number',
              description: 'Start index of returned log entries (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of log entries to return (default: 20)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'login':
          return this.doLogin();
        case 'get_health':
          return this.getHealth();
        case 'list_patients':
          return this.listPatients(args);
        case 'get_patient':
          return this.getPatient(args);
        case 'list_studies':
          return this.listStudies(args);
        case 'get_study':
          return this.getStudy(args);
        case 'list_series':
          return this.listSeries(args);
        case 'get_series':
          return this.getSeries(args);
        case 'list_images':
          return this.listImages(args);
        case 'get_image_attributes':
          return this.getImageAttributes(args);
        case 'list_anonymization_keys':
          return this.listAnonymizationKeys(args);
        case 'anonymize_images':
          return this.anonymizeImages(args);
        case 'list_boxes':
          return this.listBoxes(args);
        case 'send_images_to_box':
          return this.sendImagesToBox(args);
        case 'list_import_sessions':
          return this.listImportSessions();
        case 'create_import_session':
          return this.createImportSession(args);
        case 'list_users':
          return this.listUsers();
        case 'get_log':
          return this.getLog(args);
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

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionCookie) headers['Cookie'] = this.sessionCookie;
    return headers;
  }

  private buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const q = qs.toString();
    return `${this.baseUrl}${path}${q ? '?' + q : ''}`;
  }

  private async apiGet(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doLogin(): Promise<ToolResult> {
    const url = this.buildUrl('/users/login');
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: this.username, password: this.password }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Login failed: ${response.status} ${response.statusText}` }], isError: true };
    }
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.sessionCookie = setCookie.split(';')[0];
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Logged in successfully' }) }], isError: false };
  }

  private async getHealth(): Promise<ToolResult> {
    const url = this.buildUrl('/system/health');
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Health check failed: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'ok', httpStatus: response.status }) }], isError: false };
  }

  private async listPatients(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      startindex: String(args.startindex ?? 0),
      count: String(args.count ?? 20),
    };
    if (args.orderby) params.orderby = args.orderby as string;
    if (args.orderascending !== undefined) params.orderascending = String(args.orderascending);
    if (args.filter) params.filter = args.filter as string;
    return this.apiGet('/metadata/patients', params);
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/metadata/patients/${encodeURIComponent(String(args.id))}`);
  }

  private async listStudies(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.patientid === undefined) return { content: [{ type: 'text', text: 'patientid is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      patientid: String(args.patientid),
      startindex: String(args.startindex ?? 0),
      count: String(args.count ?? 20),
    };
    return this.apiGet('/metadata/studies', params);
  }

  private async getStudy(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/metadata/studies/${encodeURIComponent(String(args.id))}`);
  }

  private async listSeries(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.studyid === undefined) return { content: [{ type: 'text', text: 'studyid is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      studyid: String(args.studyid),
      startindex: String(args.startindex ?? 0),
      count: String(args.count ?? 20),
    };
    return this.apiGet('/metadata/series', params);
  }

  private async getSeries(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/metadata/series/${encodeURIComponent(String(args.id))}`);
  }

  private async listImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.seriesid === undefined) return { content: [{ type: 'text', text: 'seriesid is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      seriesid: String(args.seriesid),
      startindex: String(args.startindex ?? 0),
      count: String(args.count ?? 20),
    };
    return this.apiGet('/metadata/images', params);
  }

  private async getImageAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/images/${encodeURIComponent(String(args.id))}/attributes`);
  }

  private async listAnonymizationKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      startindex: String(args.startindex ?? 0),
      count: String(args.count ?? 20),
    };
    if (args.orderby) params.orderby = args.orderby as string;
    if (args.orderascending !== undefined) params.orderascending = String(args.orderascending);
    if (args.filter) params.filter = args.filter as string;
    return this.apiGet('/anonymization/keys', params);
  }

  private async anonymizeImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.imageTagValues || !Array.isArray(args.imageTagValues)) {
      return { content: [{ type: 'text', text: 'imageTagValues is required and must be an array' }], isError: true };
    }
    return this.apiPost('/anonymization/anonymize', args.imageTagValues);
  }

  private async listBoxes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      startindex: String(args.startindex ?? 0),
      count: String(args.count ?? 20),
    };
    return this.apiGet('/boxes', params);
  }

  private async sendImagesToBox(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.boxId === undefined) return { content: [{ type: 'text', text: 'boxId is required' }], isError: true };
    if (!args.imageIds || !Array.isArray(args.imageIds)) {
      return { content: [{ type: 'text', text: 'imageIds is required and must be an array' }], isError: true };
    }
    return this.apiPost(`/boxes/${encodeURIComponent(String(args.boxId))}/send`, args.imageIds);
  }

  private async listImportSessions(): Promise<ToolResult> {
    return this.apiGet('/import/sessions');
  }

  private async createImportSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiPost('/import/sessions', { name: args.name });
  }

  private async listUsers(): Promise<ToolResult> {
    return this.apiGet('/users');
  }

  private async getLog(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      startindex: String(args.startindex ?? 0),
      count: String(args.count ?? 20),
    };
    return this.apiGet('/log', params);
  }
}
