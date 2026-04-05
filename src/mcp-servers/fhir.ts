/**
 * HL7 FHIR R4 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// HL7 FHIR R4 REST API — universal healthcare interoperability standard.
// Covers any FHIR-compliant EHR: Epic MyChart, Cerner PowerChart, Allscripts, Meditech, etc.
// Each hospital/health system exposes its own FHIR base URL (e.g. https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4).
// Auth: OAuth2 Bearer (SMART on FHIR). Token URL varies by institution.
// Docs: https://www.hl7.org/fhir/R4/ | https://hl7.org/fhir/smart-app-launch/
// Rate limits: institution-specific; SMART on FHIR apps subject to EHR vendor throttling.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FhirConfig {
  baseUrl: string;
  accessToken: string;
}

export class FhirMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(config: FhirConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.accessToken = config.accessToken;
  }

  static catalog() {
    return {
      name: 'fhir',
      displayName: 'HL7 FHIR R4',
      version: '1.0.0',
      category: 'healthcare',
      keywords: [
        'fhir', 'hl7', 'healthcare', 'ehr', 'epic', 'cerner', 'allscripts', 'meditech',
        'patient', 'clinical', 'medical records', 'encounter', 'condition', 'observation',
        'medication', 'allergy', 'appointment', 'immunization', 'care plan', 'diagnostic',
        'smart on fhir', 'interoperability',
      ],
      toolNames: [
        'search_patients', 'get_patient', 'search_encounters', 'get_encounter',
        'search_conditions', 'search_observations', 'get_observation', 'search_medications',
        'search_allergies', 'get_practitioner', 'search_appointments', 'create_appointment',
        'search_diagnostic_reports', 'get_care_plan', 'search_immunizations',
      ],
      description: 'HL7 FHIR R4 healthcare API: search patients, retrieve clinical data (encounters, conditions, observations, medications, allergies, immunizations), manage appointments, and access care plans across any FHIR-compliant EHR.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_patients',
        description: 'Search for patients by name, identifier, birthdate, or other FHIR search parameters',
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
            identifier: {
              type: 'string',
              description: 'Patient identifier (MRN or other system identifier, e.g. system|value)',
            },
            birthdate: {
              type: 'string',
              description: 'Patient birthdate in YYYY-MM-DD format',
            },
            gender: {
              type: 'string',
              description: 'Administrative gender: male, female, other, unknown',
            },
            _count: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_patient',
        description: 'Retrieve a specific patient resource by FHIR Patient ID',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR Patient resource ID',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'search_encounters',
        description: 'Search for clinical encounters (visits, hospitalizations) for a patient or across the system',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID to filter encounters by patient',
            },
            date: {
              type: 'string',
              description: 'Encounter date filter (e.g. ge2024-01-01, le2024-12-31)',
            },
            status: {
              type: 'string',
              description: 'Encounter status: planned, arrived, triaged, in-progress, onleave, finished, cancelled',
            },
            type: {
              type: 'string',
              description: 'Encounter type code (SNOMED or local code)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_encounter',
        description: 'Retrieve a specific Encounter resource by FHIR Encounter ID',
        inputSchema: {
          type: 'object',
          properties: {
            encounter_id: {
              type: 'string',
              description: 'FHIR Encounter resource ID',
            },
          },
          required: ['encounter_id'],
        },
      },
      {
        name: 'search_conditions',
        description: 'Search for patient conditions (diagnoses, problems) on the problem list',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID (required)',
            },
            clinical_status: {
              type: 'string',
              description: 'Clinical status: active, recurrence, relapse, inactive, remission, resolved',
            },
            category: {
              type: 'string',
              description: 'Category: problem-list-item, encounter-diagnosis',
            },
            code: {
              type: 'string',
              description: 'Condition code (ICD-10 or SNOMED, e.g. http://hl7.org/fhir/sid/icd-10-cm|J18.9)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'search_observations',
        description: 'Search for clinical observations (lab results, vital signs, assessments) for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID (required)',
            },
            category: {
              type: 'string',
              description: 'Observation category: laboratory, vital-signs, imaging, exam, survey, therapy, activity',
            },
            code: {
              type: 'string',
              description: 'LOINC or SNOMED observation code (e.g. 85354-9 for blood pressure panel)',
            },
            date: {
              type: 'string',
              description: 'Observation date filter (e.g. ge2024-01-01)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_observation',
        description: 'Retrieve a specific Observation resource by FHIR Observation ID',
        inputSchema: {
          type: 'object',
          properties: {
            observation_id: {
              type: 'string',
              description: 'FHIR Observation resource ID',
            },
          },
          required: ['observation_id'],
        },
      },
      {
        name: 'search_medications',
        description: 'Search for a patient\'s medication requests (prescriptions) or medication statements',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID (required)',
            },
            status: {
              type: 'string',
              description: 'Medication status: active, on-hold, cancelled, completed, entered-in-error, stopped, draft, unknown',
            },
            intent: {
              type: 'string',
              description: 'Medication intent: proposal, plan, order, original-order, reflex-order, filler-order, instance-order, option',
            },
            code: {
              type: 'string',
              description: 'Medication code (RxNorm, e.g. http://www.nlm.nih.gov/research/umls/rxnorm|1049502)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'search_allergies',
        description: 'Search for a patient\'s allergy and intolerance records',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID (required)',
            },
            clinical_status: {
              type: 'string',
              description: 'Clinical status: active, inactive, resolved',
            },
            category: {
              type: 'string',
              description: 'Allergy category: food, medication, environment, biologic',
            },
            criticality: {
              type: 'string',
              description: 'Criticality: low, high, unable-to-assess',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_practitioner',
        description: 'Retrieve a specific Practitioner resource by FHIR Practitioner ID',
        inputSchema: {
          type: 'object',
          properties: {
            practitioner_id: {
              type: 'string',
              description: 'FHIR Practitioner resource ID',
            },
          },
          required: ['practitioner_id'],
        },
      },
      {
        name: 'search_appointments',
        description: 'Search for patient appointments across the scheduling system',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID to filter by patient',
            },
            practitioner: {
              type: 'string',
              description: 'FHIR Practitioner ID to filter by provider',
            },
            date: {
              type: 'string',
              description: 'Appointment date filter (e.g. ge2024-06-01, le2024-06-30)',
            },
            status: {
              type: 'string',
              description: 'Appointment status: proposed, pending, booked, arrived, fulfilled, cancelled, noshow, entered-in-error, checked-in, waitlist',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'create_appointment',
        description: 'Create a new appointment for a patient with a practitioner',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: {
              type: 'string',
              description: 'FHIR Patient ID',
            },
            practitioner_id: {
              type: 'string',
              description: 'FHIR Practitioner ID',
            },
            start: {
              type: 'string',
              description: 'Appointment start datetime in ISO 8601 format (e.g. 2024-06-15T09:00:00-05:00)',
            },
            end: {
              type: 'string',
              description: 'Appointment end datetime in ISO 8601 format',
            },
            description: {
              type: 'string',
              description: 'Appointment description or reason for visit',
            },
            appointment_type: {
              type: 'string',
              description: 'Appointment type code (e.g. FOLLOWUP, CHECKUP, WALKIN, VIRTUAL)',
            },
          },
          required: ['patient_id', 'practitioner_id', 'start', 'end'],
        },
      },
      {
        name: 'search_diagnostic_reports',
        description: 'Search for diagnostic reports (lab panels, imaging studies, pathology) for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID (required)',
            },
            category: {
              type: 'string',
              description: 'Report category: LAB, RAD, PAT, etc.',
            },
            code: {
              type: 'string',
              description: 'Report code (LOINC)',
            },
            date: {
              type: 'string',
              description: 'Report date filter (e.g. ge2024-01-01)',
            },
            status: {
              type: 'string',
              description: 'Report status: registered, partial, preliminary, final, amended, corrected, appended, cancelled, entered-in-error, unknown',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
      {
        name: 'get_care_plan',
        description: 'Retrieve a CarePlan resource for a patient by FHIR CarePlan ID',
        inputSchema: {
          type: 'object',
          properties: {
            care_plan_id: {
              type: 'string',
              description: 'FHIR CarePlan resource ID',
            },
          },
          required: ['care_plan_id'],
        },
      },
      {
        name: 'search_immunizations',
        description: 'Search for immunization records for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient: {
              type: 'string',
              description: 'FHIR Patient ID (required)',
            },
            status: {
              type: 'string',
              description: 'Immunization status: completed, entered-in-error, not-done',
            },
            date: {
              type: 'string',
              description: 'Immunization date filter (e.g. ge2020-01-01)',
            },
            vaccine_code: {
              type: 'string',
              description: 'Vaccine code (CVX, e.g. http://hl7.org/fhir/sid/cvx|207 for Moderna COVID-19)',
            },
            _count: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['patient'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_patients':
          return this.searchPatients(args);
        case 'get_patient':
          return this.getPatient(args);
        case 'search_encounters':
          return this.searchEncounters(args);
        case 'get_encounter':
          return this.getEncounter(args);
        case 'search_conditions':
          return this.searchConditions(args);
        case 'search_observations':
          return this.searchObservations(args);
        case 'get_observation':
          return this.getObservation(args);
        case 'search_medications':
          return this.searchMedications(args);
        case 'search_allergies':
          return this.searchAllergies(args);
        case 'get_practitioner':
          return this.getPractitioner(args);
        case 'search_appointments':
          return this.searchAppointments(args);
        case 'create_appointment':
          return this.createAppointment(args);
        case 'search_diagnostic_reports':
          return this.searchDiagnosticReports(args);
        case 'get_care_plan':
          return this.getCarePlan(args);
        case 'search_immunizations':
          return this.searchImmunizations(args);
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
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
    };
  }

  private async fhirGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `FHIR API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fhirPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `FHIR API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildParams(fields: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private async searchPatients(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      family: args.family as string,
      given: args.given as string,
      identifier: args.identifier as string,
      birthdate: args.birthdate as string,
      gender: args.gender as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/Patient${qs}`);
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id) {
      return { content: [{ type: 'text', text: 'patient_id is required' }], isError: true };
    }
    return this.fhirGet(`/Patient/${encodeURIComponent(args.patient_id as string)}`);
  }

  private async searchEncounters(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      patient: args.patient as string,
      date: args.date as string,
      status: args.status as string,
      type: args.type as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/Encounter${qs}`);
  }

  private async getEncounter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.encounter_id) {
      return { content: [{ type: 'text', text: 'encounter_id is required' }], isError: true };
    }
    return this.fhirGet(`/Encounter/${encodeURIComponent(args.encounter_id as string)}`);
  }

  private async searchConditions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient) {
      return { content: [{ type: 'text', text: 'patient is required' }], isError: true };
    }
    const qs = this.buildParams({
      patient: args.patient as string,
      'clinical-status': args.clinical_status as string,
      category: args.category as string,
      code: args.code as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/Condition${qs}`);
  }

  private async searchObservations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient) {
      return { content: [{ type: 'text', text: 'patient is required' }], isError: true };
    }
    const qs = this.buildParams({
      patient: args.patient as string,
      category: args.category as string,
      code: args.code as string,
      date: args.date as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/Observation${qs}`);
  }

  private async getObservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.observation_id) {
      return { content: [{ type: 'text', text: 'observation_id is required' }], isError: true };
    }
    return this.fhirGet(`/Observation/${encodeURIComponent(args.observation_id as string)}`);
  }

  private async searchMedications(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient) {
      return { content: [{ type: 'text', text: 'patient is required' }], isError: true };
    }
    const qs = this.buildParams({
      patient: args.patient as string,
      status: args.status as string,
      intent: args.intent as string,
      code: args.code as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/MedicationRequest${qs}`);
  }

  private async searchAllergies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient) {
      return { content: [{ type: 'text', text: 'patient is required' }], isError: true };
    }
    const qs = this.buildParams({
      patient: args.patient as string,
      'clinical-status': args.clinical_status as string,
      category: args.category as string,
      criticality: args.criticality as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/AllergyIntolerance${qs}`);
  }

  private async getPractitioner(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.practitioner_id) {
      return { content: [{ type: 'text', text: 'practitioner_id is required' }], isError: true };
    }
    return this.fhirGet(`/Practitioner/${encodeURIComponent(args.practitioner_id as string)}`);
  }

  private async searchAppointments(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams({
      patient: args.patient as string,
      practitioner: args.practitioner as string,
      date: args.date as string,
      status: args.status as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/Appointment${qs}`);
  }

  private async createAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient_id || !args.practitioner_id || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'patient_id, practitioner_id, start, and end are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      resourceType: 'Appointment',
      status: 'proposed',
      start: args.start,
      end: args.end,
      participant: [
        {
          actor: { reference: `Patient/${args.patient_id}` },
          status: 'accepted',
        },
        {
          actor: { reference: `Practitioner/${args.practitioner_id}` },
          status: 'accepted',
        },
      ],
    };
    if (args.description) body.description = args.description;
    if (args.appointment_type) {
      body.appointmentType = {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0276', code: args.appointment_type }],
      };
    }
    return this.fhirPost('/Appointment', body);
  }

  private async searchDiagnosticReports(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient) {
      return { content: [{ type: 'text', text: 'patient is required' }], isError: true };
    }
    const qs = this.buildParams({
      patient: args.patient as string,
      category: args.category as string,
      code: args.code as string,
      date: args.date as string,
      status: args.status as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/DiagnosticReport${qs}`);
  }

  private async getCarePlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.care_plan_id) {
      return { content: [{ type: 'text', text: 'care_plan_id is required' }], isError: true };
    }
    return this.fhirGet(`/CarePlan/${encodeURIComponent(args.care_plan_id as string)}`);
  }

  private async searchImmunizations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.patient) {
      return { content: [{ type: 'text', text: 'patient is required' }], isError: true };
    }
    const qs = this.buildParams({
      patient: args.patient as string,
      status: args.status as string,
      date: args.date as string,
      'vaccine-code': args.vaccine_code as string,
      _count: args._count as number,
    });
    return this.fhirGet(`/Immunization${qs}`);
  }
}
