/**
 * Health Gorilla MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Health Gorilla MCP server was found on GitHub. Health Gorilla's GitHub org
// (github.com/healthgorilla) contains code examples and Postman collections, not an MCP server.
//
// Base URL: https://api.healthgorilla.com/fhir/R4
// Auth: OAuth2 client credentials — POST https://api.healthgorilla.com/oauth/token
//       with Basic auth (clientId:clientSecret) and grant_type=client_credentials
// Docs: https://developer.healthgorilla.com/docs/overview
// Rate limits: Not publicly documented; subject to per-contract limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HealthGorillaConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class HealthGorillaMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HealthGorillaConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.healthgorilla.com/fhir/R4';
    this.tokenUrl = config.tokenUrl || 'https://api.healthgorilla.com/oauth/token';
  }

  static catalog() {
    return {
      name: 'health-gorilla',
      displayName: 'Health Gorilla',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'health gorilla', 'fhir', 'clinical data', 'ehr', 'patient', 'observation',
        'diagnostic report', 'lab results', 'medication', 'immunization', 'allergy',
        'condition', 'encounter', 'healthcare interoperability', 'hl7',
      ],
      toolNames: [
        'get_patient', 'search_patients', 'get_observation', 'search_observations',
        'get_diagnostic_report', 'search_diagnostic_reports', 'get_medication_request',
        'search_medication_requests', 'get_immunization', 'search_immunizations',
        'get_allergy_intolerance', 'search_allergy_intolerances', 'get_condition',
        'search_conditions', 'get_encounter', 'search_encounters', 'get_patient_everything',
      ],
      description: 'Health Gorilla clinical data interoperability: retrieve and search FHIR R4 patient records, lab results, diagnostic reports, medications, immunizations, allergies, conditions, and encounters.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_patient',
        description: 'Retrieve a FHIR R4 Patient resource by patient ID from the Health Gorilla network',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'Health Gorilla patient resource ID',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'search_patients',
        description: 'Search for patients by name, date of birth, identifier, or other FHIR search parameters',
        inputSchema: {
          type: 'object',
          properties: {
            family: {
              type: 'string',
              description: 'Patient family (last) name to search',
            },
            given: {
              type: 'string',
              description: 'Patient given (first) name to search',
            },
            birthdate: {
              type: 'string',
              description: 'Patient date of birth in YYYY-MM-DD format',
            },
            identifier: {
              type: 'string',
              description: 'Patient identifier such as MRN (system|value format)',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_observation',
        description: 'Retrieve a specific FHIR R4 Observation resource (lab result, vital sign, or clinical finding) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            observation_id: {
              type: 'string',
              description: 'Health Gorilla Observation resource ID',
            },
          },
          required: ['observation_id'],
        },
      },
      {
        name: 'search_observations',
        description: 'Search Observations for a patient filtered by category, code, date range, or status',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'Patient resource ID to scope the search',
            },
            category: {
              type: 'string',
              description: 'Observation category: laboratory, vital-signs, social-history, imaging',
            },
            code: {
              type: 'string',
              description: 'LOINC or SNOMED code to filter observations (e.g. 2339-0 for blood glucose)',
            },
            date: {
              type: 'string',
              description: 'Date filter: exact date or range with prefixes (ge2024-01-01, le2024-12-31)',
            },
            status: {
              type: 'string',
              description: 'Observation status: registered, preliminary, final, amended, corrected, cancelled',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_diagnostic_report',
        description: 'Retrieve a FHIR R4 DiagnosticReport resource (lab panel or imaging report) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Health Gorilla DiagnosticReport resource ID',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'search_diagnostic_reports',
        description: 'Search DiagnosticReports for a patient filtered by category, code, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'Patient resource ID to scope the search',
            },
            category: {
              type: 'string',
              description: 'Report category: LAB, RAD (radiology), CT (cardiology)',
            },
            code: {
              type: 'string',
              description: 'LOINC code for the report type',
            },
            date: {
              type: 'string',
              description: 'Date filter using FHIR prefix syntax (e.g. ge2024-01-01)',
            },
            status: {
              type: 'string',
              description: 'Report status: registered, partial, preliminary, final, amended, corrected, cancelled',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_medication_request',
        description: 'Retrieve a FHIR R4 MedicationRequest resource (prescription or medication order) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            medication_request_id: {
              type: 'string',
              description: 'Health Gorilla MedicationRequest resource ID',
            },
          },
          required: ['medication_request_id'],
        },
      },
      {
        name: 'search_medication_requests',
        description: 'Search active or historical medication requests for a patient with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'Patient resource ID to scope the search',
            },
            status: {
              type: 'string',
              description: 'Request status: active, on-hold, cancelled, completed, stopped, draft, unknown',
            },
            date: {
              type: 'string',
              description: 'Authored date filter using FHIR prefix syntax (e.g. ge2024-01-01)',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_immunization',
        description: 'Retrieve a FHIR R4 Immunization resource by ID',
        inputSchema: {
          type: 'object',
          properties: {
            immunization_id: {
              type: 'string',
              description: 'Health Gorilla Immunization resource ID',
            },
          },
          required: ['immunization_id'],
        },
      },
      {
        name: 'search_immunizations',
        description: 'Search immunization records for a patient filtered by vaccine code or date',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'Patient resource ID to scope the search',
            },
            vaccine_code: {
              type: 'string',
              description: 'CVX or NDC vaccine code to filter results',
            },
            date: {
              type: 'string',
              description: 'Occurrence date filter using FHIR prefix syntax',
            },
            status: {
              type: 'string',
              description: 'Immunization status: completed, entered-in-error, not-done',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_allergy_intolerance',
        description: 'Retrieve a FHIR R4 AllergyIntolerance resource by ID',
        inputSchema: {
          type: 'object',
          properties: {
            allergy_id: {
              type: 'string',
              description: 'Health Gorilla AllergyIntolerance resource ID',
            },
          },
          required: ['allergy_id'],
        },
      },
      {
        name: 'search_allergy_intolerances',
        description: 'Search allergy and intolerance records for a patient filtered by clinical status or category',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'Patient resource ID to scope the search',
            },
            clinical_status: {
              type: 'string',
              description: 'Clinical status: active, inactive, resolved',
            },
            category: {
              type: 'string',
              description: 'Allergy category: food, medication, environment, biologic',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_condition',
        description: 'Retrieve a FHIR R4 Condition resource (diagnosis or problem) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            condition_id: {
              type: 'string',
              description: 'Health Gorilla Condition resource ID',
            },
          },
          required: ['condition_id'],
        },
      },
      {
        name: 'search_conditions',
        description: 'Search problem list conditions for a patient filtered by clinical status, category, or ICD/SNOMED code',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'Patient resource ID to scope the search',
            },
            clinical_status: {
              type: 'string',
              description: 'Condition status: active, recurrence, relapse, inactive, remission, resolved',
            },
            category: {
              type: 'string',
              description: 'Condition category: problem-list-item, encounter-diagnosis',
            },
            code: {
              type: 'string',
              description: 'ICD-10 or SNOMED CT code to filter conditions',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_encounter',
        description: 'Retrieve a FHIR R4 Encounter resource (clinical visit or hospitalization) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            encounter_id: {
              type: 'string',
              description: 'Health Gorilla Encounter resource ID',
            },
          },
          required: ['encounter_id'],
        },
      },
      {
        name: 'search_encounters',
        description: 'Search encounter records for a patient filtered by status, class, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'Patient resource ID to scope the search',
            },
            status: {
              type: 'string',
              description: 'Encounter status: planned, in-progress, onhold, discharged, completed, cancelled, discontinued, entered-in-error, unknown',
            },
            class: {
              type: 'string',
              description: 'Encounter class code: AMB (ambulatory), IMP (inpatient), EMER (emergency), HH (home health)',
            },
            date: {
              type: 'string',
              description: 'Encounter date filter using FHIR prefix syntax (e.g. ge2024-01-01)',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_patient_everything',
        description: 'Retrieve all FHIR resources associated with a patient using the $everything operation — returns the full longitudinal health record',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'Patient resource ID for which to retrieve all associated resources',
            },
            start: {
              type: 'string',
              description: 'Earliest date to include resources from (YYYY-MM-DD)',
            },
            end: {
              type: 'string',
              description: 'Latest date to include resources up to (YYYY-MM-DD)',
            },
          },
          required: ['patient_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_patient':
          return this.getResource('Patient', args.patient_id as string);
        case 'search_patients':
          return this.searchResource('Patient', args);
        case 'get_observation':
          return this.getResource('Observation', args.observation_id as string);
        case 'search_observations':
          return this.searchResource('Observation', args);
        case 'get_diagnostic_report':
          return this.getResource('DiagnosticReport', args.report_id as string);
        case 'search_diagnostic_reports':
          return this.searchResource('DiagnosticReport', args);
        case 'get_medication_request':
          return this.getResource('MedicationRequest', args.medication_request_id as string);
        case 'search_medication_requests':
          return this.searchResource('MedicationRequest', args);
        case 'get_immunization':
          return this.getResource('Immunization', args.immunization_id as string);
        case 'search_immunizations':
          return this.searchResource('Immunization', args);
        case 'get_allergy_intolerance':
          return this.getResource('AllergyIntolerance', args.allergy_id as string);
        case 'search_allergy_intolerances':
          return this.searchResource('AllergyIntolerance', args);
        case 'get_condition':
          return this.getResource('Condition', args.condition_id as string);
        case 'search_conditions':
          return this.searchResource('Condition', args);
        case 'get_encounter':
          return this.getResource('Encounter', args.encounter_id as string);
        case 'search_encounters':
          return this.searchResource('Encounter', args);
        case 'get_patient_everything':
          return this.getPatientEverything(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async getResource(resourceType: string, id: string): Promise<ToolResult> {
    if (!id) {
      return { content: [{ type: 'text', text: `${resourceType} ID is required` }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}/${resourceType}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/fhir+json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchResource(resourceType: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();

    // Map common search parameters for all resource types
    const paramMap: Record<string, string> = {
      patient: 'patient',
      family: 'family',
      given: 'given',
      birthdate: 'birthdate',
      identifier: 'identifier',
      category: 'category',
      code: 'code',
      date: 'date',
      status: 'status',
      clinical_status: 'clinical-status',
      vaccine_code: 'vaccine-code',
      class: 'class',
    };

    for (const [argKey, paramName] of Object.entries(paramMap)) {
      if (args[argKey] !== undefined) {
        params.set(paramName, String(args[argKey]));
      }
    }

    if (args._count !== undefined) {
      params.set('_count', String(args._count));
    } else {
      params.set('_count', '20');
    }

    const token = await this.getOrRefreshToken();
    const url = `${this.baseUrl}/${resourceType}?${params.toString()}`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/fhir+json',
      },
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPatientEverything(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.patient_id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.start) params.set('start', args.start as string);
    if (args.end) params.set('end', args.end as string);

    const token = await this.getOrRefreshToken();
    const qs = params.toString();
    const url = `${this.baseUrl}/Patient/${id}/$everything${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/fhir+json',
      },
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
