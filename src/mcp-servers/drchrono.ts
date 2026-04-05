/**
 * DrChrono MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. DrChrono has not published an official MCP server.
//
// Base URL: https://app.drchrono.com
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   OAuth2 scopes: patients, calendar, clinical, billing, practice_defaults, labs, messages
// Docs: https://app.drchrono.com/api-docs-old/tutorial
// Rate limits: Not publicly documented. DrChrono enforces per-account limits server-side.
// Note: DrChrono is an EHR (Electronic Health Record) platform. This adapter covers
//   key clinical workflows: patients, appointments, clinical notes, medications, labs,
//   allergies, problems, billing, and more.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DrChronoConfig {
  accessToken: string;
  baseUrl?: string;
}

export class DrChronoMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: DrChronoConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://app.drchrono.com';
  }

  static catalog() {
    return {
      name: 'drchrono',
      displayName: 'DrChrono',
      version: '1.0.0',
      category: 'healthcare' as const,
      keywords: [
        'drchrono', 'ehr', 'healthcare', 'electronic health record', 'patient',
        'appointment', 'clinical note', 'medication', 'allergy', 'lab', 'billing',
        'insurance', 'doctor', 'medical', 'emr', 'practice management', 'hipaa',
        'clinical', 'diagnosis', 'problem', 'procedure', 'prescription', 'vaccine',
      ],
      toolNames: [
        // Patients
        'list_patients', 'get_patient', 'create_patient', 'update_patient', 'delete_patient',
        'get_patient_ccda', 'get_patient_qrda1',
        'list_patients_summary', 'get_patient_summary', 'create_patient_summary',
        // Appointments
        'list_appointments', 'get_appointment', 'create_appointment', 'update_appointment', 'delete_appointment',
        'list_appointment_profiles', 'get_appointment_profile',
        'list_appointment_templates', 'get_appointment_template',
        // Clinical Notes
        'list_clinical_notes', 'get_clinical_note',
        'list_clinical_note_templates', 'get_clinical_note_template',
        'list_clinical_note_field_types', 'get_clinical_note_field_type',
        'list_clinical_note_field_values', 'get_clinical_note_field_value', 'create_clinical_note_field_value', 'update_clinical_note_field_value',
        // Medications
        'list_medications', 'get_medication', 'create_medication', 'update_medication',
        // Allergies
        'list_allergies', 'get_allergy', 'create_allergy', 'update_allergy',
        // Problems
        'list_problems', 'get_problem', 'create_problem', 'update_problem',
        // Lab Orders & Results
        'list_lab_orders', 'get_lab_order', 'create_lab_order', 'delete_lab_order',
        'list_lab_results', 'get_lab_result', 'create_lab_result',
        'list_lab_documents', 'get_lab_document', 'create_lab_document',
        'list_patient_lab_results', 'get_patient_lab_result', 'create_patient_lab_result',
        // Billing & Line Items
        'list_line_items', 'get_line_item', 'create_line_item', 'delete_line_item',
        'list_transactions', 'get_transaction',
        'list_patient_payments', 'get_patient_payment', 'create_patient_payment',
        'list_eligibility_checks', 'get_eligibility_check',
        'list_insurances', 'get_insurance',
        // Doctors & Offices
        'list_doctors', 'get_doctor',
        'list_offices', 'get_office', 'update_office',
        // Documents
        'list_documents', 'get_document', 'create_document', 'delete_document',
        // Vaccines
        'list_patient_vaccine_records', 'get_patient_vaccine_record', 'create_patient_vaccine_record',
        'list_inventory_vaccines', 'get_inventory_vaccine', 'create_inventory_vaccine',
        // Tasks
        'list_tasks', 'get_task', 'create_task', 'update_task',
        'list_task_notes', 'get_task_note', 'create_task_note',
        // Messages
        'list_messages', 'get_message', 'create_message',
        'list_patient_messages', 'get_patient_message', 'create_patient_message',
        // Users & Groups
        'list_users', 'get_user',
        'list_user_groups', 'get_user_group',
        // Misc
        'list_custom_demographics', 'get_custom_demographic',
        'list_amendments', 'get_amendment', 'create_amendment',
        'list_comm_logs', 'get_comm_log', 'create_comm_log',
        'list_consent_forms', 'get_consent_form', 'create_consent_form',
      ],
      description: 'Access DrChrono EHR: manage patients, appointments, clinical notes, medications, allergies, lab orders, billing, documents, vaccines, tasks, and more via the DrChrono v4 REST API.',
      author: 'protectnil',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    try {
      const resp = await this.fetchWithRetry(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await resp.text();
      if (resp.status === 204) {
        return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
      }
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!resp.ok) {
        return { content: [{ type: 'text', text: `HTTP ${resp.status}: ${text}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
    } catch (err) {
      return { content: [{ type: 'text', text: String(err) }], isError: true };
    }
  }

  private qs(params: Record<string, string | number | boolean | undefined>): string {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return parts.length ? '?' + parts.join('&') : '';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Patients ───────────────────────────────────────────────────────────
      {
        name: 'list_patients',
        description: 'List patients with optional filters for doctor, date of birth, name, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            date_of_birth: { type: 'string', description: 'Filter by date of birth (YYYY-MM-DD)' },
            first_name: { type: 'string', description: 'Filter by first name' },
            last_name: { type: 'string', description: 'Filter by last name' },
            page: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Number of results per page' },
          },
        },
      },
      {
        name: 'get_patient',
        description: 'Get a single patient record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_patient',
        description: 'Create a new patient record in DrChrono',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Patient first name' },
            last_name: { type: 'string', description: 'Patient last name' },
            date_of_birth: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
            gender: { type: 'string', description: 'Patient gender (Male, Female, Other, Unknown)' },
            doctor: { type: 'number', description: 'Primary doctor ID' },
            email: { type: 'string', description: 'Patient email address' },
            cell_phone: { type: 'string', description: 'Patient cell phone number' },
            address: { type: 'string', description: 'Street address' },
            city: { type: 'string', description: 'City' },
            state: { type: 'string', description: 'State abbreviation' },
            zip_code: { type: 'string', description: 'ZIP code' },
          },
          required: ['first_name', 'last_name', 'date_of_birth', 'gender', 'doctor'],
        },
      },
      {
        name: 'update_patient',
        description: 'Update an existing patient record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            date_of_birth: { type: 'string', description: 'Updated date of birth (YYYY-MM-DD)' },
            gender: { type: 'string', description: 'Updated gender' },
            email: { type: 'string', description: 'Updated email address' },
            cell_phone: { type: 'string', description: 'Updated cell phone' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_patient',
        description: 'Delete a patient record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_patient_ccda',
        description: 'Get the CCDA (Continuity of Care Document) for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_patient_qrda1',
        description: 'Get the QRDA Category 1 document for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_patients_summary',
        description: 'List patient summary records with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_patient_summary',
        description: 'Get a patient summary by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient summary ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_patient_summary',
        description: 'Create a patient summary record',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            summary: { type: 'object', description: 'Summary data object' },
          },
          required: ['patient'],
        },
      },
      // ── Appointments ───────────────────────────────────────────────────────
      {
        name: 'list_appointments',
        description: 'List appointments with optional filters for doctor, patient, office, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            patient: { type: 'number', description: 'Filter by patient ID' },
            office: { type: 'number', description: 'Filter by office ID' },
            date_range: { type: 'string', description: 'Date range filter in YYYY-MM-DD/YYYY-MM-DD format' },
            status: { type: 'string', description: 'Appointment status filter' },
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_appointment',
        description: 'Get an appointment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The appointment ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_appointment',
        description: 'Create a new appointment in DrChrono',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Doctor ID' },
            patient: { type: 'number', description: 'Patient ID' },
            office: { type: 'number', description: 'Office ID' },
            scheduled_time: { type: 'string', description: 'Appointment datetime in ISO 8601 format' },
            duration: { type: 'number', description: 'Duration in minutes' },
            exam_room: { type: 'number', description: 'Exam room number' },
            reason: { type: 'string', description: 'Reason for the appointment' },
            notes: { type: 'string', description: 'Additional notes' },
          },
          required: ['doctor', 'patient', 'office', 'scheduled_time', 'duration', 'exam_room'],
        },
      },
      {
        name: 'update_appointment',
        description: 'Update an existing appointment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The appointment ID to update' },
            status: { type: 'string', description: 'Updated appointment status' },
            scheduled_time: { type: 'string', description: 'Updated scheduled time (ISO 8601)' },
            duration: { type: 'number', description: 'Updated duration in minutes' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_appointment',
        description: 'Delete an appointment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The appointment ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_appointment_profiles',
        description: 'List appointment profiles (templates for appointment types)',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_appointment_profile',
        description: 'Get an appointment profile by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The appointment profile ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_appointment_templates',
        description: 'List appointment templates for scheduling',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            office: { type: 'number', description: 'Filter by office ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_appointment_template',
        description: 'Get an appointment template by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The appointment template ID' },
          },
          required: ['id'],
        },
      },
      // ── Clinical Notes ─────────────────────────────────────────────────────
      {
        name: 'list_clinical_notes',
        description: 'List clinical notes for patients with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            appointment: { type: 'number', description: 'Filter by appointment ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_clinical_note',
        description: 'Get a clinical note by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The clinical note ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_clinical_note_templates',
        description: 'List clinical note templates',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_clinical_note_template',
        description: 'Get a clinical note template by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The clinical note template ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_clinical_note_field_types',
        description: 'List clinical note field types',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_clinical_note_field_type',
        description: 'Get a clinical note field type by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The field type ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_clinical_note_field_values',
        description: 'List clinical note field values',
        inputSchema: {
          type: 'object',
          properties: {
            clinical_note: { type: 'number', description: 'Filter by clinical note ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_clinical_note_field_value',
        description: 'Get a clinical note field value by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The field value ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_clinical_note_field_value',
        description: 'Create a new clinical note field value',
        inputSchema: {
          type: 'object',
          properties: {
            clinical_note: { type: 'number', description: 'Clinical note ID' },
            field_type: { type: 'number', description: 'Field type ID' },
            value: { type: 'string', description: 'The field value' },
          },
          required: ['clinical_note', 'field_type'],
        },
      },
      {
        name: 'update_clinical_note_field_value',
        description: 'Update an existing clinical note field value by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The field value ID to update' },
            value: { type: 'string', description: 'Updated value' },
          },
          required: ['id'],
        },
      },
      // ── Medications ────────────────────────────────────────────────────────
      {
        name: 'list_medications',
        description: 'List medications for patients with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_medication',
        description: 'Get a medication record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The medication ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_medication',
        description: 'Create a new medication record for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Prescribing doctor ID' },
            name: { type: 'string', description: 'Medication name' },
            dose_quantity: { type: 'string', description: 'Dosage amount' },
            dose_unit: { type: 'string', description: 'Dosage unit (e.g. mg, ml)' },
            route: { type: 'string', description: 'Administration route (e.g. oral, IV)' },
            frequency: { type: 'string', description: 'Dosing frequency' },
            dispense_quantity: { type: 'string', description: 'Amount to dispense' },
            refills: { type: 'number', description: 'Number of refills' },
            notes: { type: 'string', description: 'Additional notes or instructions' },
          },
          required: ['patient', 'doctor', 'name'],
        },
      },
      {
        name: 'update_medication',
        description: 'Update a medication record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The medication ID to update' },
            name: { type: 'string', description: 'Updated medication name' },
            dose_quantity: { type: 'string', description: 'Updated dosage amount' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['id'],
        },
      },
      // ── Allergies ──────────────────────────────────────────────────────────
      {
        name: 'list_allergies',
        description: 'List patient allergies with optional patient and doctor filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_allergy',
        description: 'Get an allergy record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The allergy ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_allergy',
        description: 'Create a new allergy record for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Doctor ID' },
            allergen: { type: 'string', description: 'The allergen name or substance' },
            reaction: { type: 'string', description: 'Type of allergic reaction' },
            severity: { type: 'string', description: 'Severity: Mild, Moderate, Severe' },
            notes: { type: 'string', description: 'Additional notes' },
          },
          required: ['patient', 'doctor'],
        },
      },
      {
        name: 'update_allergy',
        description: 'Update an allergy record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The allergy ID to update' },
            reaction: { type: 'string', description: 'Updated reaction description' },
            severity: { type: 'string', description: 'Updated severity' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['id'],
        },
      },
      // ── Problems ───────────────────────────────────────────────────────────
      {
        name: 'list_problems',
        description: 'List patient problems (diagnoses) with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_problem',
        description: 'Get a problem record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The problem ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_problem',
        description: 'Create a new problem (diagnosis) record for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Doctor ID' },
            name: { type: 'string', description: 'Problem or diagnosis name' },
            icd_code: { type: 'string', description: 'ICD-10 diagnosis code' },
            status: { type: 'string', description: 'Problem status: Active, Inactive, Resolved' },
            date_diagnosis: { type: 'string', description: 'Date of diagnosis in YYYY-MM-DD format' },
            notes: { type: 'string', description: 'Additional clinical notes' },
          },
          required: ['patient', 'doctor', 'name'],
        },
      },
      {
        name: 'update_problem',
        description: 'Update a problem record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The problem ID to update' },
            status: { type: 'string', description: 'Updated status' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['id'],
        },
      },
      // ── Lab Orders ─────────────────────────────────────────────────────────
      {
        name: 'list_lab_orders',
        description: 'List lab orders with optional patient and doctor filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_lab_order',
        description: 'Get a lab order by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The lab order ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_lab_order',
        description: 'Create a new lab order for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Ordering doctor ID' },
            order_type: { type: 'string', description: 'Type of lab order' },
            clinical_notes: { type: 'string', description: 'Clinical notes for the order' },
          },
          required: ['patient', 'doctor'],
        },
      },
      {
        name: 'delete_lab_order',
        description: 'Delete a lab order by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The lab order ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Lab Results ────────────────────────────────────────────────────────
      {
        name: 'list_lab_results',
        description: 'List lab results with optional patient and order filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            order: { type: 'number', description: 'Filter by lab order ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_lab_result',
        description: 'Get a lab result by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The lab result ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_lab_result',
        description: 'Create a new lab result record',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            order: { type: 'number', description: 'Lab order ID' },
            value: { type: 'string', description: 'Result value' },
            units: { type: 'string', description: 'Result units' },
            abnormal_status: { type: 'string', description: 'Abnormal status flag (N, L, H, etc.)' },
          },
          required: ['patient'],
        },
      },
      // ── Lab Documents ──────────────────────────────────────────────────────
      {
        name: 'list_lab_documents',
        description: 'List lab documents with optional patient filter',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_lab_document',
        description: 'Get a lab document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The lab document ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_lab_document',
        description: 'Create a new lab document',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            document: { type: 'string', description: 'Document content or URL' },
            description: { type: 'string', description: 'Document description' },
          },
          required: ['patient'],
        },
      },
      // ── Patient Lab Results ────────────────────────────────────────────────
      {
        name: 'list_patient_lab_results',
        description: 'List patient-level lab results',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_patient_lab_result',
        description: 'Get a patient lab result by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient lab result ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_patient_lab_result',
        description: 'Create a new patient lab result record',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            result: { type: 'object', description: 'Lab result data object' },
          },
          required: ['patient'],
        },
      },
      // ── Billing & Line Items ───────────────────────────────────────────────
      {
        name: 'list_line_items',
        description: 'List billing line items with optional patient and appointment filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            appointment: { type: 'number', description: 'Filter by appointment ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_line_item',
        description: 'Get a billing line item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The line item ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_line_item',
        description: 'Create a new billing line item for an appointment',
        inputSchema: {
          type: 'object',
          properties: {
            appointment: { type: 'number', description: 'Appointment ID' },
            code: { type: 'string', description: 'CPT or billing code' },
            description: { type: 'string', description: 'Service description' },
            units: { type: 'number', description: 'Number of units' },
            ins1_billed: { type: 'string', description: 'Amount billed to primary insurance' },
          },
          required: ['appointment', 'code'],
        },
      },
      {
        name: 'delete_line_item',
        description: 'Delete a billing line item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The line item ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List financial transactions with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get a transaction record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The transaction ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_patient_payments',
        description: 'List patient payment records',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_patient_payment',
        description: 'Get a patient payment record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient payment ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_patient_payment',
        description: 'Create a patient payment record',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            amount: { type: 'string', description: 'Payment amount as decimal string' },
            payment_method: { type: 'string', description: 'Payment method (e.g. Check, Cash, CreditCard)' },
            notes: { type: 'string', description: 'Payment notes' },
          },
          required: ['patient', 'amount'],
        },
      },
      {
        name: 'list_eligibility_checks',
        description: 'List insurance eligibility checks',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_eligibility_check',
        description: 'Get an eligibility check by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The eligibility check ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_insurances',
        description: 'List insurance records with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_insurance',
        description: 'Get an insurance record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The insurance record ID' },
          },
          required: ['id'],
        },
      },
      // ── Doctors & Offices ──────────────────────────────────────────────────
      {
        name: 'list_doctors',
        description: 'List all doctors in the practice',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_doctor',
        description: 'Get a doctor by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The doctor ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_offices',
        description: 'List all offices (practice locations)',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_office',
        description: 'Get an office by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The office ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_office',
        description: 'Update an office record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The office ID to update' },
            name: { type: 'string', description: 'Updated office name' },
            phone: { type: 'string', description: 'Updated phone number' },
            address: { type: 'string', description: 'Updated address' },
          },
          required: ['id'],
        },
      },
      // ── Documents ──────────────────────────────────────────────────────────
      {
        name: 'list_documents',
        description: 'List patient documents with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_document',
        description: 'Get a document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The document ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new patient document',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Doctor ID' },
            description: { type: 'string', description: 'Document description' },
            document: { type: 'string', description: 'Document content or URL' },
          },
          required: ['patient', 'doctor'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The document ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Vaccines ───────────────────────────────────────────────────────────
      {
        name: 'list_patient_vaccine_records',
        description: 'List patient vaccine administration records',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_patient_vaccine_record',
        description: 'Get a patient vaccine record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The vaccine record ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_patient_vaccine_record',
        description: 'Create a new patient vaccine administration record',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Administering doctor ID' },
            vaccine_inventory: { type: 'number', description: 'Vaccine inventory ID' },
            administered_at: { type: 'string', description: 'Administration datetime (ISO 8601)' },
            cvx_code: { type: 'string', description: 'CVX vaccine code' },
          },
          required: ['patient', 'doctor'],
        },
      },
      {
        name: 'list_inventory_vaccines',
        description: 'List vaccine inventory records',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_inventory_vaccine',
        description: 'Get a vaccine inventory record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The vaccine inventory ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_inventory_vaccine',
        description: 'Create a new vaccine inventory record',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Doctor ID' },
            cvx_code: { type: 'string', description: 'CVX vaccine code' },
            lot_number: { type: 'string', description: 'Vaccine lot number' },
            expiration: { type: 'string', description: 'Expiration date (YYYY-MM-DD)' },
          },
          required: ['doctor'],
        },
      },
      // ── Tasks ──────────────────────────────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List tasks with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            assigned_to: { type: 'number', description: 'Filter by assignee user ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Get a task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The task ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID (optional)' },
            assigned_to: { type: 'number', description: 'User ID to assign the task to' },
            title: { type: 'string', description: 'Task title or subject' },
            due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
            status: { type: 'string', description: 'Task status' },
            notes: { type: 'string', description: 'Task notes or description' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_task',
        description: 'Update a task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The task ID to update' },
            status: { type: 'string', description: 'Updated task status' },
            notes: { type: 'string', description: 'Updated notes' },
            due_date: { type: 'string', description: 'Updated due date' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_task_notes',
        description: 'List notes attached to tasks',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'number', description: 'Filter by task ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_task_note',
        description: 'Get a task note by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The task note ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_task_note',
        description: 'Create a note on a task',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'number', description: 'Task ID' },
            text: { type: 'string', description: 'Note text content' },
          },
          required: ['task', 'text'],
        },
      },
      // ── Messages ───────────────────────────────────────────────────────────
      {
        name: 'list_messages',
        description: 'List secure messages with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Filter by doctor ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Get a message by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The message ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_message',
        description: 'Create a new secure message',
        inputSchema: {
          type: 'object',
          properties: {
            doctor: { type: 'number', description: 'Doctor ID' },
            patient: { type: 'number', description: 'Patient ID (optional)' },
            subject: { type: 'string', description: 'Message subject' },
            body: { type: 'string', description: 'Message body text' },
          },
          required: ['doctor', 'subject'],
        },
      },
      {
        name: 'list_patient_messages',
        description: 'List patient-portal messages with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_patient_message',
        description: 'Get a patient-portal message by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The patient message ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_patient_message',
        description: 'Create a new patient-portal message',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            subject: { type: 'string', description: 'Message subject' },
            body: { type: 'string', description: 'Message body text' },
          },
          required: ['patient', 'subject'],
        },
      },
      // ── Users & Groups ─────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List practice staff users',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The user ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_user_groups',
        description: 'List user groups in the practice',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_user_group',
        description: 'Get a user group by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The user group ID' },
          },
          required: ['id'],
        },
      },
      // ── Custom Demographics ────────────────────────────────────────────────
      {
        name: 'list_custom_demographics',
        description: 'List custom demographic fields',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_custom_demographic',
        description: 'Get a custom demographic field by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The custom demographic ID' },
          },
          required: ['id'],
        },
      },
      // ── Amendments ─────────────────────────────────────────────────────────
      {
        name: 'list_amendments',
        description: 'List patient record amendments',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_amendment',
        description: 'Get an amendment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The amendment ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_amendment',
        description: 'Create a new record amendment',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Doctor ID' },
            amendment: { type: 'string', description: 'Amendment text' },
          },
          required: ['patient', 'doctor'],
        },
      },
      // ── Communication Logs ─────────────────────────────────────────────────
      {
        name: 'list_comm_logs',
        description: 'List communication logs',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_comm_log',
        description: 'Get a communication log entry by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The comm log ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_comm_log',
        description: 'Create a new communication log entry',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            doctor: { type: 'number', description: 'Doctor ID' },
            comm_type: { type: 'string', description: 'Communication type (e.g. Phone, Email, Fax)' },
            notes: { type: 'string', description: 'Communication notes' },
          },
          required: ['patient', 'doctor'],
        },
      },
      // ── Consent Forms ──────────────────────────────────────────────────────
      {
        name: 'list_consent_forms',
        description: 'List patient consent forms',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Filter by patient ID' },
            page: { type: 'number', description: 'Page number' },
          },
        },
      },
      {
        name: 'get_consent_form',
        description: 'Get a consent form by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The consent form ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_consent_form',
        description: 'Create a new consent form',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'number', description: 'Patient ID' },
            name: { type: 'string', description: 'Consent form name' },
            content: { type: 'string', description: 'Consent form content' },
          },
          required: ['patient', 'name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const a = args as Record<string, string & number & Record<string, unknown>>;
    switch (name) {
      // Patients
      case 'list_patients': {
        const qs = this.qs({ doctor: a.doctor, date_of_birth: a.date_of_birth, first_name: a.first_name, last_name: a.last_name, page: a.page, page_size: a.page_size });
        return this.request('GET', `/api/patients${qs}`);
      }
      case 'get_patient': return this.request('GET', `/api/patients/${a.id}`);
      case 'create_patient': return this.request('POST', '/api/patients', a);
      case 'update_patient': { const { id, ...body } = a; return this.request('PATCH', `/api/patients/${id}`, body); }
      case 'delete_patient': return this.request('DELETE', `/api/patients/${a.id}`);
      case 'get_patient_ccda': return this.request('GET', `/api/patients/${a.id}/ccda`);
      case 'get_patient_qrda1': return this.request('GET', `/api/patients/${a.id}/qrda1`);
      case 'list_patients_summary': {
        const qs = this.qs({ doctor: a.doctor, page: a.page, page_size: a.page_size });
        return this.request('GET', `/api/patients_summary${qs}`);
      }
      case 'get_patient_summary': return this.request('GET', `/api/patients_summary/${a.id}`);
      case 'create_patient_summary': return this.request('POST', '/api/patients_summary', a);
      // Appointments
      case 'list_appointments': {
        const qs = this.qs({ doctor: a.doctor, patient: a.patient, office: a.office, date_range: a.date_range, status: a.status, page: a.page, page_size: a.page_size });
        return this.request('GET', `/api/appointments${qs}`);
      }
      case 'get_appointment': return this.request('GET', `/api/appointments/${a.id}`);
      case 'create_appointment': return this.request('POST', '/api/appointments', a);
      case 'update_appointment': { const { id, ...body } = a; return this.request('PATCH', `/api/appointments/${id}`, body); }
      case 'delete_appointment': return this.request('DELETE', `/api/appointments/${a.id}`);
      case 'list_appointment_profiles': {
        const qs = this.qs({ doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/appointment_profiles${qs}`);
      }
      case 'get_appointment_profile': return this.request('GET', `/api/appointment_profiles/${a.id}`);
      case 'list_appointment_templates': {
        const qs = this.qs({ doctor: a.doctor, office: a.office, page: a.page });
        return this.request('GET', `/api/appointment_templates${qs}`);
      }
      case 'get_appointment_template': return this.request('GET', `/api/appointment_templates/${a.id}`);
      // Clinical Notes
      case 'list_clinical_notes': {
        const qs = this.qs({ patient: a.patient, doctor: a.doctor, appointment: a.appointment, page: a.page });
        return this.request('GET', `/api/clinical_notes${qs}`);
      }
      case 'get_clinical_note': return this.request('GET', `/api/clinical_notes/${a.id}`);
      case 'list_clinical_note_templates': {
        const qs = this.qs({ doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/clinical_note_templates${qs}`);
      }
      case 'get_clinical_note_template': return this.request('GET', `/api/clinical_note_templates/${a.id}`);
      case 'list_clinical_note_field_types': {
        const qs = this.qs({ page: a.page });
        return this.request('GET', `/api/clinical_note_field_types${qs}`);
      }
      case 'get_clinical_note_field_type': return this.request('GET', `/api/clinical_note_field_types/${a.id}`);
      case 'list_clinical_note_field_values': {
        const qs = this.qs({ clinical_note: a.clinical_note, page: a.page });
        return this.request('GET', `/api/clinical_note_field_values${qs}`);
      }
      case 'get_clinical_note_field_value': return this.request('GET', `/api/clinical_note_field_values/${a.id}`);
      case 'create_clinical_note_field_value': return this.request('POST', '/api/clinical_note_field_values', a);
      case 'update_clinical_note_field_value': { const { id, ...body } = a; return this.request('PATCH', `/api/clinical_note_field_values/${id}`, body); }
      // Medications
      case 'list_medications': {
        const qs = this.qs({ patient: a.patient, doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/medications${qs}`);
      }
      case 'get_medication': return this.request('GET', `/api/medications/${a.id}`);
      case 'create_medication': return this.request('POST', '/api/medications', a);
      case 'update_medication': { const { id, ...body } = a; return this.request('PATCH', `/api/medications/${id}`, body); }
      // Allergies
      case 'list_allergies': {
        const qs = this.qs({ patient: a.patient, doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/allergies${qs}`);
      }
      case 'get_allergy': return this.request('GET', `/api/allergies/${a.id}`);
      case 'create_allergy': return this.request('POST', '/api/allergies', a);
      case 'update_allergy': { const { id, ...body } = a; return this.request('PATCH', `/api/allergies/${id}`, body); }
      // Problems
      case 'list_problems': {
        const qs = this.qs({ patient: a.patient, doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/problems${qs}`);
      }
      case 'get_problem': return this.request('GET', `/api/problems/${a.id}`);
      case 'create_problem': return this.request('POST', '/api/problems', a);
      case 'update_problem': { const { id, ...body } = a; return this.request('PATCH', `/api/problems/${id}`, body); }
      // Lab Orders
      case 'list_lab_orders': {
        const qs = this.qs({ patient: a.patient, doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/lab_orders${qs}`);
      }
      case 'get_lab_order': return this.request('GET', `/api/lab_orders/${a.id}`);
      case 'create_lab_order': return this.request('POST', '/api/lab_orders', a);
      case 'delete_lab_order': return this.request('DELETE', `/api/lab_orders/${a.id}`);
      // Lab Results
      case 'list_lab_results': {
        const qs = this.qs({ patient: a.patient, order: a.order, page: a.page });
        return this.request('GET', `/api/lab_results${qs}`);
      }
      case 'get_lab_result': return this.request('GET', `/api/lab_results/${a.id}`);
      case 'create_lab_result': return this.request('POST', '/api/lab_results', a);
      // Lab Documents
      case 'list_lab_documents': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/lab_documents${qs}`);
      }
      case 'get_lab_document': return this.request('GET', `/api/lab_documents/${a.id}`);
      case 'create_lab_document': return this.request('POST', '/api/lab_documents', a);
      // Patient Lab Results
      case 'list_patient_lab_results': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/patient_lab_results${qs}`);
      }
      case 'get_patient_lab_result': return this.request('GET', `/api/patient_lab_results/${a.id}`);
      case 'create_patient_lab_result': return this.request('POST', '/api/patient_lab_results', a);
      // Billing
      case 'list_line_items': {
        const qs = this.qs({ patient: a.patient, appointment: a.appointment, doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/line_items${qs}`);
      }
      case 'get_line_item': return this.request('GET', `/api/line_items/${a.id}`);
      case 'create_line_item': return this.request('POST', '/api/line_items', a);
      case 'delete_line_item': return this.request('DELETE', `/api/line_items/${a.id}`);
      case 'list_transactions': {
        const qs = this.qs({ patient: a.patient, doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/transactions${qs}`);
      }
      case 'get_transaction': return this.request('GET', `/api/transactions/${a.id}`);
      case 'list_patient_payments': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/patient_payments${qs}`);
      }
      case 'get_patient_payment': return this.request('GET', `/api/patient_payments/${a.id}`);
      case 'create_patient_payment': return this.request('POST', '/api/patient_payments', a);
      case 'list_eligibility_checks': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/eligibility_checks${qs}`);
      }
      case 'get_eligibility_check': return this.request('GET', `/api/eligibility_checks/${a.id}`);
      case 'list_insurances': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/insurances${qs}`);
      }
      case 'get_insurance': return this.request('GET', `/api/insurances/${a.id}`);
      // Doctors & Offices
      case 'list_doctors': { const qs = this.qs({ page: a.page }); return this.request('GET', `/api/doctors${qs}`); }
      case 'get_doctor': return this.request('GET', `/api/doctors/${a.id}`);
      case 'list_offices': { const qs = this.qs({ page: a.page }); return this.request('GET', `/api/offices${qs}`); }
      case 'get_office': return this.request('GET', `/api/offices/${a.id}`);
      case 'update_office': { const { id, ...body } = a; return this.request('PATCH', `/api/offices/${id}`, body); }
      // Documents
      case 'list_documents': {
        const qs = this.qs({ patient: a.patient, doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/documents${qs}`);
      }
      case 'get_document': return this.request('GET', `/api/documents/${a.id}`);
      case 'create_document': return this.request('POST', '/api/documents', a);
      case 'delete_document': return this.request('DELETE', `/api/documents/${a.id}`);
      // Vaccines
      case 'list_patient_vaccine_records': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/patient_vaccine_records${qs}`);
      }
      case 'get_patient_vaccine_record': return this.request('GET', `/api/patient_vaccine_records/${a.id}`);
      case 'create_patient_vaccine_record': return this.request('POST', '/api/patient_vaccine_records', a);
      case 'list_inventory_vaccines': {
        const qs = this.qs({ doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/inventory_vaccines${qs}`);
      }
      case 'get_inventory_vaccine': return this.request('GET', `/api/inventory_vaccines/${a.id}`);
      case 'create_inventory_vaccine': return this.request('POST', '/api/inventory_vaccines', a);
      // Tasks
      case 'list_tasks': {
        const qs = this.qs({ patient: a.patient, assigned_to: a.assigned_to, page: a.page });
        return this.request('GET', `/api/tasks${qs}`);
      }
      case 'get_task': return this.request('GET', `/api/tasks/${a.id}`);
      case 'create_task': return this.request('POST', '/api/tasks', a);
      case 'update_task': { const { id, ...body } = a; return this.request('PATCH', `/api/tasks/${id}`, body); }
      case 'list_task_notes': {
        const qs = this.qs({ task: a.task, page: a.page });
        return this.request('GET', `/api/task_notes${qs}`);
      }
      case 'get_task_note': return this.request('GET', `/api/task_notes/${a.id}`);
      case 'create_task_note': return this.request('POST', '/api/task_notes', a);
      // Messages
      case 'list_messages': {
        const qs = this.qs({ doctor: a.doctor, page: a.page });
        return this.request('GET', `/api/messages${qs}`);
      }
      case 'get_message': return this.request('GET', `/api/messages/${a.id}`);
      case 'create_message': return this.request('POST', '/api/messages', a);
      case 'list_patient_messages': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/patient_messages${qs}`);
      }
      case 'get_patient_message': return this.request('GET', `/api/patient_messages/${a.id}`);
      case 'create_patient_message': return this.request('POST', '/api/patient_messages', a);
      // Users
      case 'list_users': { const qs = this.qs({ page: a.page }); return this.request('GET', `/api/users${qs}`); }
      case 'get_user': return this.request('GET', `/api/users/${a.id}`);
      case 'list_user_groups': { const qs = this.qs({ page: a.page }); return this.request('GET', `/api/user_groups${qs}`); }
      case 'get_user_group': return this.request('GET', `/api/user_groups/${a.id}`);
      // Custom Demographics
      case 'list_custom_demographics': {
        const qs = this.qs({ page: a.page });
        return this.request('GET', `/api/custom_demographics${qs}`);
      }
      case 'get_custom_demographic': return this.request('GET', `/api/custom_demographics/${a.id}`);
      // Amendments
      case 'list_amendments': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/amendments${qs}`);
      }
      case 'get_amendment': return this.request('GET', `/api/amendments/${a.id}`);
      case 'create_amendment': return this.request('POST', '/api/amendments', a);
      // Comm Logs
      case 'list_comm_logs': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/comm_logs${qs}`);
      }
      case 'get_comm_log': return this.request('GET', `/api/comm_logs/${a.id}`);
      case 'create_comm_log': return this.request('POST', '/api/comm_logs', a);
      // Consent Forms
      case 'list_consent_forms': {
        const qs = this.qs({ patient: a.patient, page: a.page });
        return this.request('GET', `/api/consent_forms${qs}`);
      }
      case 'get_consent_form': return this.request('GET', `/api/consent_forms/${a.id}`);
      case 'create_consent_form': return this.request('POST', '/api/consent_forms', a);
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  }
}
