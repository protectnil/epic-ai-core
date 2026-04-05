/**
 * Redox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Redox MCP server was found on GitHub or the Redox developer portal.
//
// Base URL: https://api.redoxengine.com
// Auth: OAuth2 JWT bearer assertion — POST /auth/token with:
//   grant_type=client_credentials
//   client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
//   client_assertion=<RS384-signed JWT with iss=sub=clientId, aud=https://api.redoxengine.com/auth/token>
//   Tokens expire in 5 minutes; no refresh token issued. Re-authenticate via new JWT assertion.
//   FHIR base URL pattern: https://api.redoxengine.com/fhir/R4/{destination-slug}/{environment-type}
//   connectionId should be passed as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")
// Our adapter covers: 14 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api (no vendor MCP exists as of 2026-03-28)
// Docs: https://docs.redoxengine.com/api-reference/fhir-api-reference/
// Rate limits: Not publicly documented; contact Redox for tenant-level quotas

import { createSign, randomUUID } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RedoxConfig {
  clientId: string;
  /** PEM-encoded RS384 private key used to sign the JWT assertion */
  privateKey: string;
  baseUrl?: string;
}

export class RedoxMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly privateKey: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: RedoxConfig) {
    super();
    this.clientId = config.clientId;
    this.privateKey = config.privateKey;
    this.baseUrl = config.baseUrl || 'https://api.redoxengine.com';
  }

  static catalog() {
    return {
      name: 'redox',
      displayName: 'Redox',
      version: '1.0.0',
      category: 'misc',
      keywords: ['redox', 'health', 'healthcare', 'FHIR', 'EHR', 'patient', 'clinical', 'HL7', 'interoperability', 'medical records'],
      toolNames: [
        'get_patient', 'search_patients', 'create_patient',
        'list_encounters', 'get_encounter',
        'list_observations', 'get_observation',
        'list_conditions', 'get_condition',
        'list_medications', 'get_medication_request',
        'list_allergies',
        'get_organization', 'list_practitioners',
      ],
      description: 'Redox healthcare data integration: access FHIR R4 patient demographics, encounters, observations, conditions, medications, and allergies via EHR connections.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_patient',
        description: 'Get a specific patient record by FHIR Patient resource ID including demographics and identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
          },
          required: ['patientId', 'connectionId'],
        },
      },
      {
        name: 'search_patients',
        description: 'Search for patients by name, date of birth, or identifier across connected EHR systems',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            family: { type: 'string', description: 'Patient last name (partial match supported)' },
            given: { type: 'string', description: 'Patient first name (partial match supported)' },
            birthdate: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
            identifier: { type: 'string', description: 'Patient identifier (MRN or other system identifier)' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'create_patient',
        description: 'Register a new patient in a connected EHR system via the Redox FHIR Patient resource',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            family: { type: 'string', description: 'Patient last name' },
            given: { type: 'string', description: 'Patient first name' },
            birthDate: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
            gender: { type: 'string', description: 'Administrative gender: male, female, other, unknown' },
            phone: { type: 'string', description: 'Patient phone number' },
            email: { type: 'string', description: 'Patient email address' },
          },
          required: ['connectionId', 'family', 'given', 'birthDate'],
        },
      },
      {
        name: 'list_encounters',
        description: 'List clinical encounters for a patient including visit type, date, and status',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            status: { type: 'string', description: 'Filter by status: planned, arrived, triaged, in-progress, finished, cancelled' },
            date: { type: 'string', description: 'Filter by date range (e.g. ge2025-01-01, le2026-01-01)' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_encounter',
        description: 'Get full details for a specific clinical encounter by FHIR Encounter resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            encounterId: { type: 'string', description: 'FHIR Encounter resource ID' },
          },
          required: ['connectionId', 'encounterId'],
        },
      },
      {
        name: 'list_observations',
        description: 'List clinical observations (vitals, lab results) for a patient with category and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            category: { type: 'string', description: 'Observation category: vital-signs, laboratory, social-history, imaging' },
            code: { type: 'string', description: 'LOINC code to filter specific observation type (e.g. 8302-2 for height)' },
            date: { type: 'string', description: 'Filter by date range (e.g. ge2025-01-01)' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_observation',
        description: 'Get full details for a specific clinical observation by FHIR Observation resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            observationId: { type: 'string', description: 'FHIR Observation resource ID' },
          },
          required: ['connectionId', 'observationId'],
        },
      },
      {
        name: 'list_conditions',
        description: 'List active diagnoses and conditions for a patient with optional clinical status filter',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            clinicalStatus: { type: 'string', description: 'Filter by status: active, recurrence, relapse, inactive, remission, resolved' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_condition',
        description: 'Get full details for a specific clinical condition/diagnosis by FHIR Condition resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            conditionId: { type: 'string', description: 'FHIR Condition resource ID' },
          },
          required: ['connectionId', 'conditionId'],
        },
      },
      {
        name: 'list_medications',
        description: 'List medication requests and prescriptions for a patient with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            status: { type: 'string', description: 'Filter by status: active, on-hold, cancelled, completed, stopped' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_medication_request',
        description: 'Get full details for a specific medication request/prescription by FHIR MedicationRequest resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            medicationRequestId: { type: 'string', description: 'FHIR MedicationRequest resource ID' },
          },
          required: ['connectionId', 'medicationRequestId'],
        },
      },
      {
        name: 'list_allergies',
        description: 'List allergy and intolerance records for a patient with optional verification status filter',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            clinicalStatus: { type: 'string', description: 'Filter by status: active, inactive, resolved' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a healthcare organization by FHIR Organization resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            organizationId: { type: 'string', description: 'FHIR Organization resource ID' },
          },
          required: ['connectionId', 'organizationId'],
        },
      },
      {
        name: 'list_practitioners',
        description: 'Search for healthcare practitioners by name or NPI identifier',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox destination path as "{destination-slug}/{environment-type}" (e.g. "redox-fhir-sandbox/Development")' },
            name: { type: 'string', description: 'Practitioner name (partial match)' },
            identifier: { type: 'string', description: 'NPI or other system identifier' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_patient': return this.getPatient(args);
        case 'search_patients': return this.searchPatients(args);
        case 'create_patient': return this.createPatient(args);
        case 'list_encounters': return this.listEncounters(args);
        case 'get_encounter': return this.getEncounter(args);
        case 'list_observations': return this.listObservations(args);
        case 'get_observation': return this.getObservation(args);
        case 'list_conditions': return this.listConditions(args);
        case 'get_condition': return this.getCondition(args);
        case 'list_medications': return this.listMedications(args);
        case 'get_medication_request': return this.getMedicationRequest(args);
        case 'list_allergies': return this.listAllergies(args);
        case 'get_organization': return this.getOrganization(args);
        case 'list_practitioners': return this.listPractitioners(args);
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
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    // Redox requires a JWT bearer assertion (RS384-signed) — NOT a plain client_secret.
    // Docs: https://docs.redoxengine.com/api-reference/redox-data-model-api-reference/authenticate-an-oauth-api-key/
    const tokenUrl = `${this.baseUrl}/auth/token`;
    const nowSec = Math.floor(now / 1000);
    const expSec = nowSec + 300; // 5-minute assertion window

    // Build JWT header + payload
    const header = Buffer.from(JSON.stringify({ alg: 'RS384', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: this.clientId,
      sub: this.clientId,
      aud: tokenUrl,
      iat: nowSec,
      exp: expSec,
      jti: randomUUID(),
    })).toString('base64url');
    const signingInput = `${header}.${payload}`;

    const sign = createSign('RSA-SHA384');
    sign.update(signingInput);
    const signature = sign.sign(this.privateKey, 'base64url');
    const assertion = `${signingInput}.${signature}`;

    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      }).toString(),
    });

    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Redox tokens expire in 5 minutes (300s); refresh 60s early
    const expiresIn = data.expires_in ?? 300;
    this.tokenExpiry = now + (expiresIn - 60) * 1000;
    return this.bearerToken;
  }

  private fhirBase(connectionId: string): string {
    return `${this.baseUrl}/fhir/R4/${connectionId}`;
  }

  private async fhirGet(connectionId: string, resource: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.fhirBase(connectionId)}/${resource}${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fhirPost(connectionId: string, resource: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.fhirBase(connectionId)}/${resource}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Patient/${encodeURIComponent(args.patientId as string)}`);
  }

  private async searchPatients(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.family) params.family = args.family as string;
    if (args.given) params.given = args.given as string;
    if (args.birthdate) params.birthdate = args.birthdate as string;
    if (args.identifier) params.identifier = args.identifier as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Patient', params);
  }

  private async createPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.family || !args.given || !args.birthDate) {
      return { content: [{ type: 'text', text: 'connectionId, family, given, and birthDate are required' }], isError: true };
    }
    const resource: Record<string, unknown> = {
      resourceType: 'Patient',
      name: [{ family: args.family, given: [args.given] }],
      birthDate: args.birthDate,
    };
    if (args.gender) resource.gender = args.gender;
    if (args.phone || args.email) {
      resource.telecom = [];
      if (args.phone) (resource.telecom as unknown[]).push({ system: 'phone', value: args.phone });
      if (args.email) (resource.telecom as unknown[]).push({ system: 'email', value: args.email });
    }
    return this.fhirPost(args.connectionId as string, 'Patient', resource);
  }

  private async listEncounters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.status) params.status = args.status as string;
    if (args.date) params.date = args.date as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Encounter', params);
  }

  private async getEncounter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.encounterId) return { content: [{ type: 'text', text: 'connectionId and encounterId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Encounter/${encodeURIComponent(args.encounterId as string)}`);
  }

  private async listObservations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.category) params.category = args.category as string;
    if (args.code) params.code = args.code as string;
    if (args.date) params.date = args.date as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Observation', params);
  }

  private async getObservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.observationId) return { content: [{ type: 'text', text: 'connectionId and observationId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Observation/${encodeURIComponent(args.observationId as string)}`);
  }

  private async listConditions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.clinicalStatus) params['clinical-status'] = args.clinicalStatus as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Condition', params);
  }

  private async getCondition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.conditionId) return { content: [{ type: 'text', text: 'connectionId and conditionId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Condition/${encodeURIComponent(args.conditionId as string)}`);
  }

  private async listMedications(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.status) params.status = args.status as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'MedicationRequest', params);
  }

  private async getMedicationRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.medicationRequestId) return { content: [{ type: 'text', text: 'connectionId and medicationRequestId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `MedicationRequest/${encodeURIComponent(args.medicationRequestId as string)}`);
  }

  private async listAllergies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.clinicalStatus) params['clinical-status'] = args.clinicalStatus as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'AllergyIntolerance', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.organizationId) return { content: [{ type: 'text', text: 'connectionId and organizationId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Organization/${encodeURIComponent(args.organizationId as string)}`);
  }

  private async listPractitioners(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.name) params.name = args.name as string;
    if (args.identifier) params.identifier = args.identifier as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Practitioner', params);
  }
}
