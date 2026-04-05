/**
 * Epic Systems FHIR R4 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Epic Systems MCP server was found on GitHub or the MCP registry.
// Third-party FHIR MCP servers exist (github.com/wso2/fhir-mcp-server,
// github.com/xSoVx/fhir-mcp) but none are official Epic-published servers.
// This adapter targets the Epic on FHIR SMART on FHIR / OAuth2 REST API.
//
// Base URL: https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
//   (Per-org override via baseUrl config — each Epic org has its own endpoint)
// Auth: OAuth2 client credentials — Epic backend services use private key JWT assertion
//   (client_assertion_type: urn:ietf:params:oauth:client-assertion-type:jwt-bearer).
//   This adapter implements Basic auth with client_secret for older/sandbox configs.
//   Production deployments using SMART Backend Services MUST use JWT-signed assertions
//   with a registered RSA/EC public key — not a client_secret. See:
//   https://fhir.epic.com/Documentation?docId=oauth2
//   Token endpoint: https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
//   (per-org endpoint resolved from .well-known/smart-configuration)
// Docs: https://fhir.epic.com/Documentation
// Rate limits: Not publicly documented; Epic recommends exponential back-off on 429 responses
// Our adapter covers: 23 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official Epic MCP server exists.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpicFhirConfig {
  clientId: string;
  clientSecret: string;
  /** Full FHIR R4 base URL, e.g. https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4 */
  baseUrl?: string;
  /** OAuth2 token endpoint; defaults to standard Epic sandbox token URL */
  tokenUrl?: string;
}

export class EpicFhirMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: EpicFhirConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
    this.tokenUrl = config.tokenUrl || 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
  }

  static catalog() {
    return {
      name: 'epic-fhir',
      displayName: 'Epic Systems EHR (FHIR R4)',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'epic', 'ehr', 'fhir', 'healthcare', 'patient', 'clinical', 'health record',
        'observation', 'condition', 'medication', 'allergy', 'appointment', 'encounter',
        'procedure', 'diagnostic', 'immunization', 'care plan', 'smart on fhir', 'interoperability',
      ],
      toolNames: [
        'get_patient', 'search_patients',
        'list_observations', 'get_observation',
        'list_conditions', 'get_condition',
        'list_medications', 'get_medication_request',
        'list_allergy_intolerances', 'get_allergy_intolerance',
        'list_appointments', 'get_appointment',
        'list_encounters', 'get_encounter',
        'list_procedures', 'get_procedure',
        'list_diagnostic_reports', 'get_diagnostic_report',
        'list_immunizations', 'get_immunization',
        'get_care_plan', 'get_practitioner',
        'get_capability_statement',
      ],
      description: 'Epic EHR via FHIR R4: read patient demographics, observations, conditions, medications, allergies, appointments, encounters, procedures, diagnostics, and immunizations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_patient',
        description: 'Retrieve a patient resource by FHIR patient ID including demographics, identifiers, and contact information',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID (e.g. eAB3MNAXOZQ9q7oSWVHFXvQ3)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'search_patients',
        description: 'Search for patients by name, birthdate, MRN, or identifier with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            family: {
              type: 'string',
              description: 'Patient family (last) name',
            },
            given: {
              type: 'string',
              description: 'Patient given (first) name',
            },
            birthdate: {
              type: 'string',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            identifier: {
              type: 'string',
              description: 'MRN or other identifier in system|value format (e.g. urn:oid:1.2.840.114350.1.13.0.1.7.5.737384.14|12345)',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'list_observations',
        description: 'List clinical observations for a patient (vital signs, lab results, etc.) with optional category and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            category: {
              type: 'string',
              description: 'Observation category: vital-signs, laboratory, social-history, survey, exam (default: all)',
            },
            code: {
              type: 'string',
              description: 'LOINC code to filter observations (e.g. 8867-4 for heart rate)',
            },
            date: {
              type: 'string',
              description: 'Date filter in format ge2024-01-01 or le2024-12-31 (FHIR date prefix notation)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_observation',
        description: 'Retrieve a single observation resource by its FHIR ID',
        inputSchema: {
          type: 'object',
          properties: {
            observation_id: {
              type: 'string',
              description: 'FHIR observation logical ID',
            },
          },
          required: ['observation_id'],
        },
      },
      {
        name: 'list_conditions',
        description: 'List active or historical conditions/diagnoses for a patient with optional clinical status filter',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            clinical_status: {
              type: 'string',
              description: 'Filter by status: active, recurrence, relapse, inactive, remission, resolved (default: active)',
            },
            category: {
              type: 'string',
              description: 'Condition category: problem-list-item, encounter-diagnosis (default: all)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_condition',
        description: 'Retrieve a single condition/diagnosis resource by FHIR ID',
        inputSchema: {
          type: 'object',
          properties: {
            condition_id: {
              type: 'string',
              description: 'FHIR condition logical ID',
            },
          },
          required: ['condition_id'],
        },
      },
      {
        name: 'list_medications',
        description: 'List medication requests (prescriptions) for a patient with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, on-hold, cancelled, completed, draft, stopped (default: active)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_medication_request',
        description: 'Retrieve a single medication request (prescription) resource by FHIR ID',
        inputSchema: {
          type: 'object',
          properties: {
            medication_request_id: {
              type: 'string',
              description: 'FHIR MedicationRequest logical ID',
            },
          },
          required: ['medication_request_id'],
        },
      },
      {
        name: 'list_allergy_intolerances',
        description: 'List documented allergies and intolerances for a patient with optional clinical status filter',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            clinical_status: {
              type: 'string',
              description: 'Filter by status: active, inactive, resolved (default: active)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_allergy_intolerance',
        description: 'Retrieve a single allergy or intolerance resource by FHIR ID',
        inputSchema: {
          type: 'object',
          properties: {
            allergy_id: {
              type: 'string',
              description: 'FHIR AllergyIntolerance logical ID',
            },
          },
          required: ['allergy_id'],
        },
      },
      {
        name: 'list_appointments',
        description: 'List appointments for a patient with optional date range and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: booked, cancelled, fulfilled, noshow, waitlist (default: booked)',
            },
            date: {
              type: 'string',
              description: 'Date filter using FHIR prefix notation (e.g. ge2024-01-01)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_appointment',
        description: 'Retrieve a single appointment resource by FHIR ID including provider, location, and timing details',
        inputSchema: {
          type: 'object',
          properties: {
            appointment_id: {
              type: 'string',
              description: 'FHIR Appointment logical ID',
            },
          },
          required: ['appointment_id'],
        },
      },
      {
        name: 'list_encounters',
        description: 'List clinical encounters (visits, hospitalizations) for a patient with optional date and class filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            class: {
              type: 'string',
              description: 'Encounter class: AMB (ambulatory), IMP (inpatient), EMER (emergency), HH (home health)',
            },
            date: {
              type: 'string',
              description: 'Date filter using FHIR prefix notation (e.g. ge2024-01-01)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_encounter',
        description: 'Retrieve a single encounter resource by FHIR ID including diagnoses, participants, and location',
        inputSchema: {
          type: 'object',
          properties: {
            encounter_id: {
              type: 'string',
              description: 'FHIR Encounter logical ID',
            },
          },
          required: ['encounter_id'],
        },
      },
      {
        name: 'list_procedures',
        description: 'List procedures performed for a patient with optional date and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: preparation, in-progress, not-done, completed, entered-in-error (default: completed)',
            },
            date: {
              type: 'string',
              description: 'Date filter using FHIR prefix notation (e.g. ge2024-01-01)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_procedure',
        description: 'Retrieve a single procedure resource by FHIR ID',
        inputSchema: {
          type: 'object',
          properties: {
            procedure_id: {
              type: 'string',
              description: 'FHIR Procedure logical ID',
            },
          },
          required: ['procedure_id'],
        },
      },
      {
        name: 'list_diagnostic_reports',
        description: 'List diagnostic reports (labs, imaging, pathology) for a patient with optional category and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            category: {
              type: 'string',
              description: 'Report category: LAB, RAD (radiology), PAT (pathology) (default: all)',
            },
            date: {
              type: 'string',
              description: 'Date filter using FHIR prefix notation (e.g. ge2024-01-01)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_diagnostic_report',
        description: 'Retrieve a single diagnostic report by FHIR ID including results and performer details',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'FHIR DiagnosticReport logical ID',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_immunizations',
        description: 'List immunization records for a patient with optional date and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: completed, entered-in-error, not-done (default: completed)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_immunization',
        description: 'Retrieve a single immunization record by FHIR ID',
        inputSchema: {
          type: 'object',
          properties: {
            immunization_id: {
              type: 'string',
              description: 'FHIR Immunization logical ID',
            },
          },
          required: ['immunization_id'],
        },
      },
      {
        name: 'get_care_plan',
        description: 'Retrieve the active care plan for a patient including goals, activities, and care team',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR patient logical ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, on-hold, completed, cancelled (default: active)',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_practitioner',
        description: 'Retrieve a practitioner (provider) resource by FHIR ID including specialty, credentials, and identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            practitioner_id: {
              type: 'string',
              description: 'FHIR Practitioner logical ID',
            },
          },
          required: ['practitioner_id'],
        },
      },
      {
        name: 'get_capability_statement',
        description: 'Retrieve the FHIR capability statement (metadata) for the Epic server, listing supported resources and operations',
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
        case 'get_patient':
          return this.getPatient(args);
        case 'search_patients':
          return this.searchPatients(args);
        case 'list_observations':
          return this.listObservations(args);
        case 'get_observation':
          return this.getResource('Observation', args.observation_id as string);
        case 'list_conditions':
          return this.listConditions(args);
        case 'get_condition':
          return this.getResource('Condition', args.condition_id as string);
        case 'list_medications':
          return this.listMedications(args);
        case 'get_medication_request':
          return this.getResource('MedicationRequest', args.medication_request_id as string);
        case 'list_allergy_intolerances':
          return this.listAllergyIntolerances(args);
        case 'get_allergy_intolerance':
          return this.getResource('AllergyIntolerance', args.allergy_id as string);
        case 'list_appointments':
          return this.listAppointments(args);
        case 'get_appointment':
          return this.getResource('Appointment', args.appointment_id as string);
        case 'list_encounters':
          return this.listEncounters(args);
        case 'get_encounter':
          return this.getResource('Encounter', args.encounter_id as string);
        case 'list_procedures':
          return this.listProcedures(args);
        case 'get_procedure':
          return this.getResource('Procedure', args.procedure_id as string);
        case 'list_diagnostic_reports':
          return this.listDiagnosticReports(args);
        case 'get_diagnostic_report':
          return this.getResource('DiagnosticReport', args.report_id as string);
        case 'list_immunizations':
          return this.listImmunizations(args);
        case 'get_immunization':
          return this.getResource('Immunization', args.immunization_id as string);
        case 'get_care_plan':
          return this.getCarePlan(args);
        case 'get_practitioner':
          return this.getResource('Practitioner', args.practitioner_id as string);
        case 'get_capability_statement':
          return this.getCapabilityStatement();
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
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=system%2FPatient.read+system%2FObservation.read+system%2FCondition.read+system%2FMedicationRequest.read+system%2FAllergyIntolerance.read+system%2FAppointment.read+system%2FEncounter.read+system%2FProcedure.read+system%2FDiagnosticReport.read+system%2FImmunization.read+system%2FCarePlan.read+system%2FPractitioner.read',
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async fhirGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}${qs ? '?' + qs : ''}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/fhir+json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `FHIR API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getResource(resourceType: string, id: string | undefined): Promise<ToolResult> {
    if (!id) {
      return { content: [{ type: 'text', text: `${resourceType} ID is required` }], isError: true };
    }
    return this.fhirGet(`${resourceType}/${encodeURIComponent(id)}`);
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    return this.fhirGet(`Patient/${encodeURIComponent(args.patient_id as string)}`);
  }

  private async searchPatients(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      _count: String((args._count as number) || 20),
    };
    if (args.family) params.family = args.family as string;
    if (args.given) params.given = args.given as string;
    if (args.birthdate) params.birthdate = args.birthdate as string;
    if (args.identifier) params.identifier = args.identifier as string;
    return this.fhirGet('Patient', params);
  }

  private async listObservations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      _count: String((args._count as number) || 50),
    };
    if (args.category) params.category = args.category as string;
    if (args.code) params.code = args.code as string;
    if (args.date) params.date = args.date as string;
    return this.fhirGet('Observation', params);
  }

  private async listConditions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      _count: String((args._count as number) || 50),
    };
    if (args.clinical_status) params['clinical-status'] = args.clinical_status as string;
    if (args.category) params.category = args.category as string;
    return this.fhirGet('Condition', params);
  }

  private async listMedications(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      status: (args.status as string) || 'active',
      _count: String((args._count as number) || 50),
    };
    return this.fhirGet('MedicationRequest', params);
  }

  private async listAllergyIntolerances(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      _count: String((args._count as number) || 50),
    };
    if (args.clinical_status) params['clinical-status'] = args.clinical_status as string;
    return this.fhirGet('AllergyIntolerance', params);
  }

  private async listAppointments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      status: (args.status as string) || 'booked',
      _count: String((args._count as number) || 20),
    };
    if (args.date) params.date = args.date as string;
    return this.fhirGet('Appointment', params);
  }

  private async listEncounters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      _count: String((args._count as number) || 20),
    };
    if (args.class) params.class = args.class as string;
    if (args.date) params.date = args.date as string;
    return this.fhirGet('Encounter', params);
  }

  private async listProcedures(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      status: (args.status as string) || 'completed',
      _count: String((args._count as number) || 50),
    };
    if (args.date) params.date = args.date as string;
    return this.fhirGet('Procedure', params);
  }

  private async listDiagnosticReports(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      _count: String((args._count as number) || 20),
    };
    if (args.category) params.category = args.category as string;
    if (args.date) params.date = args.date as string;
    return this.fhirGet('DiagnosticReport', params);
  }

  private async listImmunizations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      status: (args.status as string) || 'completed',
      _count: String((args._count as number) || 50),
    };
    return this.fhirGet('Immunization', params);
  }

  private async getCarePlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    const params: Record<string, string> = {
      patient: args.patient_id as string,
      status: (args.status as string) || 'active',
    };
    return this.fhirGet('CarePlan', params);
  }

  private async getCapabilityStatement(): Promise<ToolResult> {
    return this.fhirGet('metadata');
  }
}
