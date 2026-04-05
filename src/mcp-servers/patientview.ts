/**
 * PatientView MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official PatientView MCP server exists.
// Our adapter covers: 15 tools across auth, patient, patient management, and observations.
// Recommendation: Use this adapter for full PatientView API coverage.
//
// Base URL: https://www.patientview.org
// Auth: POST /auth/login returns a token; pass as X-Auth-Token header on all subsequent requests.
// Docs: https://www.patientview.org/api
// Rate limits: Not publicly documented; contact PatientView for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PatientViewConfig {
  /** Username for PatientView authentication */
  username?: string;
  /** Password for PatientView authentication */
  password?: string;
  /** Pre-existing auth token (alternative to username/password) */
  authToken?: string;
  /** Optional base URL override (default: https://www.patientview.org) */
  baseUrl?: string;
}

export class PatientViewMCPServer extends MCPAdapterBase {
  private readonly authToken: string;
  private readonly baseUrl: string;

  constructor(config: PatientViewConfig) {
    super();
    this.authToken = config.authToken ?? '';
    this.baseUrl = config.baseUrl ?? 'https://www.patientview.org';
  }

  static catalog() {
    return {
      name: 'patientview',
      displayName: 'PatientView',
      version: '1.0.0',
      category: 'healthcare',
      keywords: [
        'patientview', 'healthcare', 'patient', 'observations', 'medical records',
        'clinical data', 'fhir', 'diagnoses', 'surgery', 'lab results',
        'health monitoring', 'patient portal', 'nhs', 'kidney disease',
      ],
      toolNames: [
        'auth_login', 'auth_logout', 'auth_get_user_info',
        'patient_get_basic', 'patient_management_get_diagnoses',
        'patient_management_get_lookup_types', 'patient_management_validate',
        'patient_management_get_record', 'patient_management_save_record',
        'patient_management_save_surgeries',
        'observations_get_available_headings', 'observations_get_by_codes',
        'observations_get_by_code', 'observations_get_patient_entered',
        'observations_get_patient_entered_headings',
      ],
      description: 'PatientView patient portal API — authentication, patient records, clinical observations, diagnoses, and patient-entered health data from FHIR-backed NHS systems.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'auth_login',
        description: 'Authenticate with PatientView using username and password — returns a token required for all subsequent API calls',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'PatientView username (email or username)',
            },
            password: {
              type: 'string',
              description: 'PatientView account password',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'auth_logout',
        description: 'Log out and invalidate an active PatientView authentication token',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Active PatientView auth token to invalidate',
            },
          },
          required: ['token'],
        },
      },
      {
        name: 'auth_get_user_info',
        description: 'Get basic user information including group role memberships for a logged-in PatientView user',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Active PatientView auth token',
            },
          },
          required: ['token'],
        },
      },
      {
        name: 'patient_get_basic',
        description: 'Get basic patient information from FHIR clinical data for a given PatientView user ID',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID (integer) of the patient to retrieve',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'patient_management_get_diagnoses',
        description: 'Get all available patient diagnoses from PatientView patient management',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'patient_management_get_lookup_types',
        description: 'Get all available lookup types used in PatientView patient management forms',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'patient_management_validate',
        description: 'Validate a patient management record before saving — checks required fields and data integrity',
        inputSchema: {
          type: 'object',
          properties: {
            patientData: {
              type: 'object',
              description: 'Patient management record object to validate',
            },
          },
          required: ['patientData'],
        },
      },
      {
        name: 'patient_management_get_record',
        description: 'Get an existing patient management record for a specific user, group, and identifier combination',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID',
            },
            groupId: {
              type: 'number',
              description: 'Group ID the patient belongs to',
            },
            identifierId: {
              type: 'number',
              description: 'Identifier ID for the patient record',
            },
          },
          required: ['userId', 'groupId', 'identifierId'],
        },
      },
      {
        name: 'patient_management_save_record',
        description: 'Create or update a patient management record for a specific user, group, and identifier',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID',
            },
            groupId: {
              type: 'number',
              description: 'Group ID the patient belongs to',
            },
            identifierId: {
              type: 'number',
              description: 'Identifier ID for the patient record',
            },
            patientData: {
              type: 'object',
              description: 'Patient management record data to save',
            },
          },
          required: ['userId', 'groupId', 'identifierId', 'patientData'],
        },
      },
      {
        name: 'patient_management_save_surgeries',
        description: 'Save surgery records for a patient identified by user, group, and identifier IDs',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID',
            },
            groupId: {
              type: 'number',
              description: 'Group ID the patient belongs to',
            },
            identifierId: {
              type: 'number',
              description: 'Identifier ID for the patient record',
            },
            surgeriesData: {
              type: 'object',
              description: 'Surgery records data to save',
            },
          },
          required: ['userId', 'groupId', 'identifierId', 'surgeriesData'],
        },
      },
      {
        name: 'observations_get_available_headings',
        description: 'Get all available observation headings (result types) that exist for a PatientView user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID to retrieve observation headings for',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'observations_get_by_codes',
        description: 'Get clinical observations for a user filtered by observation codes, with pagination and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID',
            },
            code: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of observation codes to filter by (e.g. ["WEIGHT", "BP"])',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of observations to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (number of records to skip)',
            },
            orderDirection: {
              type: 'string',
              enum: ['ASC', 'DESC'],
              description: 'Sort direction for results: ASC or DESC (default: DESC)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'observations_get_by_code',
        description: 'Get all clinical observations for a user filtered by a single observation code',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID',
            },
            code: {
              type: 'string',
              description: 'Single observation code to retrieve (e.g. "WEIGHT", "BP", "HBA1C")',
            },
          },
          required: ['userId', 'code'],
        },
      },
      {
        name: 'observations_get_patient_entered',
        description: 'Get patient-entered observations for a user filtered by a specific observation code',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID',
            },
            code: {
              type: 'string',
              description: 'Observation code for patient-entered data to retrieve',
            },
          },
          required: ['userId', 'code'],
        },
      },
      {
        name: 'observations_get_patient_entered_headings',
        description: 'Get all observation headings for which a user has entered patient-reported data',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'PatientView user ID to retrieve patient-entered observation headings for',
            },
          },
          required: ['userId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'auth_login':
          return this.authLogin(args);
        case 'auth_logout':
          return this.authLogout(args);
        case 'auth_get_user_info':
          return this.authGetUserInfo(args);
        case 'patient_get_basic':
          return this.patientGetBasic(args);
        case 'patient_management_get_diagnoses':
          return this.patientManagementGetDiagnoses();
        case 'patient_management_get_lookup_types':
          return this.patientManagementGetLookupTypes();
        case 'patient_management_validate':
          return this.patientManagementValidate(args);
        case 'patient_management_get_record':
          return this.patientManagementGetRecord(args);
        case 'patient_management_save_record':
          return this.patientManagementSaveRecord(args);
        case 'patient_management_save_surgeries':
          return this.patientManagementSaveSurgeries(args);
        case 'observations_get_available_headings':
          return this.observationsGetAvailableHeadings(args);
        case 'observations_get_by_codes':
          return this.observationsGetByCodes(args);
        case 'observations_get_by_code':
          return this.observationsGetByCode(args);
        case 'observations_get_patient_entered':
          return this.observationsGetPatientEntered(args);
        case 'observations_get_patient_entered_headings':
          return this.observationsGetPatientEnteredHeadings(args);
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
    if (this.authToken) headers['X-Auth-Token'] = this.authToken;
    return headers;
  }

  private async fetchGet(path: string, queryParams?: Record<string, string | number | string[] | undefined>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(k, item);
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const response = await this.fetchWithRetry(url.toString(), { method: 'GET', headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`PatientView returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async authLogin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.password) {
      return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
    }
    return this.fetchPost('/auth/login', { username: args.username, password: args.password });
  }

  private async authLogout(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.token) return { content: [{ type: 'text', text: 'token is required' }], isError: true };
    return this.fetchDelete(`/auth/logout/${encodeURIComponent(args.token as string)}`);
  }

  private async authGetUserInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.token) return { content: [{ type: 'text', text: 'token is required' }], isError: true };
    return this.fetchGet(`/auth/${encodeURIComponent(args.token as string)}/basicuserinformation`);
  }

  private async patientGetBasic(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    return this.fetchGet(`/patient/${encodeURIComponent(String(args.userId))}/basic`);
  }

  private async patientManagementGetDiagnoses(): Promise<ToolResult> {
    return this.fetchGet('/patientmanagement/diagnoses');
  }

  private async patientManagementGetLookupTypes(): Promise<ToolResult> {
    return this.fetchGet('/patientmanagement/lookuptypes');
  }

  private async patientManagementValidate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patientData) return { content: [{ type: 'text', text: 'patientData is required' }], isError: true };
    return this.fetchPost('/patientmanagement/validate', args.patientData);
  }

  private async patientManagementGetRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined || args.groupId === undefined || args.identifierId === undefined) {
      return { content: [{ type: 'text', text: 'userId, groupId, and identifierId are required' }], isError: true };
    }
    const path = `/patientmanagement/${encodeURIComponent(String(args.userId))}/group/${encodeURIComponent(String(args.groupId))}/identifier/${encodeURIComponent(String(args.identifierId))}`;
    return this.fetchGet(path);
  }

  private async patientManagementSaveRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined || args.groupId === undefined || args.identifierId === undefined || !args.patientData) {
      return { content: [{ type: 'text', text: 'userId, groupId, identifierId, and patientData are required' }], isError: true };
    }
    const path = `/patientmanagement/${encodeURIComponent(String(args.userId))}/group/${encodeURIComponent(String(args.groupId))}/identifier/${encodeURIComponent(String(args.identifierId))}`;
    return this.fetchPost(path, args.patientData);
  }

  private async patientManagementSaveSurgeries(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined || args.groupId === undefined || args.identifierId === undefined || !args.surgeriesData) {
      return { content: [{ type: 'text', text: 'userId, groupId, identifierId, and surgeriesData are required' }], isError: true };
    }
    const path = `/patientmanagement/${encodeURIComponent(String(args.userId))}/group/${encodeURIComponent(String(args.groupId))}/identifier/${encodeURIComponent(String(args.identifierId))}/surgeries`;
    return this.fetchPost(path, args.surgeriesData);
  }

  private async observationsGetAvailableHeadings(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    return this.fetchGet(`/user/${encodeURIComponent(String(args.userId))}/availableobservationheadings`);
  }

  private async observationsGetByCodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    const queryParams: Record<string, string | number | string[] | undefined> = {};
    if (args.code) queryParams['code'] = args.code as string[];
    if (args.limit !== undefined) queryParams['limit'] = args.limit as number;
    if (args.offset !== undefined) queryParams['offset'] = args.offset as number;
    if (args.orderDirection) queryParams['orderDirection'] = args.orderDirection as string;
    return this.fetchGet(`/user/${encodeURIComponent(String(args.userId))}/observations`, queryParams);
  }

  private async observationsGetByCode(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined || !args.code) {
      return { content: [{ type: 'text', text: 'userId and code are required' }], isError: true };
    }
    return this.fetchGet(`/user/${encodeURIComponent(String(args.userId))}/observations/${encodeURIComponent(args.code as string)}`);
  }

  private async observationsGetPatientEntered(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined || !args.code) {
      return { content: [{ type: 'text', text: 'userId and code are required' }], isError: true };
    }
    return this.fetchGet(`/user/${encodeURIComponent(String(args.userId))}/observations/${encodeURIComponent(args.code as string)}/patiententered`);
  }

  private async observationsGetPatientEnteredHeadings(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.userId === undefined) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    return this.fetchGet(`/user/${encodeURIComponent(String(args.userId))}/patiententeredobservationheadings`);
  }
}
