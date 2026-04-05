/**
 * TwineHealth MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. TwineHealth has not published an official MCP server.
//
// Base URL: https://api.twinehealth.com/pub
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   Token obtained via POST /oauth/token
// Docs: https://developer.twinehealth.com/
// Spec: https://api.apis.guru/v2/specs/twinehealth.com/v7.78.1/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TwineHealthConfig {
  accessToken: string;
  baseUrl?: string;
}

export class TwineHealthMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: TwineHealthConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.twinehealth.com/pub';
  }

  static catalog() {
    return {
      name: 'twinehealth',
      displayName: 'TwineHealth',
      version: '1.0.0',
      category: 'healthcare' as const,
      keywords: ['twinehealth', 'patient', 'health', 'coaching', 'wellness', 'health metrics', 'care plan', 'reward', 'calendar', 'healthcare'],
      toolNames: [
        'list_patients', 'get_patient', 'create_patient', 'update_patient',
        'list_patient_health_metrics', 'get_patient_health_metric', 'create_patient_health_metric',
        'list_patient_plan_summaries', 'get_patient_plan_summary', 'update_patient_plan_summary',
        'list_patient_health_results', 'get_patient_health_result',
        'list_coaches', 'get_coach',
        'list_calendar_events', 'get_calendar_event', 'create_calendar_event', 'update_calendar_event', 'delete_calendar_event',
        'list_groups', 'get_group', 'create_group',
        'list_health_profiles', 'get_health_profile',
        'list_rewards', 'get_reward', 'create_reward',
        'list_reward_earnings', 'get_reward_earning', 'create_reward_earning',
        'list_reward_programs', 'get_reward_program', 'create_reward_program',
      ],
      description: 'Manage TwineHealth patient coaching: patients, health metrics, care plans, coaches, calendar events, groups, health profiles, and reward programs via the TwineHealth REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Patients ──────────────────────────────────────────────────────────
      {
        name: 'list_patients',
        description: 'List patients in the TwineHealth organization, with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter_groups: { type: 'string', description: 'Comma-separated group IDs to filter by' },
            filter_coaches: { type: 'string', description: 'Comma-separated coach IDs to filter by' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_patient',
        description: 'Get a single patient by their patient ID',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'The TwineHealth patient ID' },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'create_patient',
        description: 'Create a new patient record in TwineHealth',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Patient first name' },
            last_name: { type: 'string', description: 'Patient last name' },
            email: { type: 'string', description: 'Patient email address' },
            birth_date: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
            gender: { type: 'string', description: 'Patient gender (e.g. male, female, other)' },
            group_id: { type: 'string', description: 'Group ID to enroll the patient in' },
          },
          required: ['first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'update_patient',
        description: 'Update an existing patient record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'The TwineHealth patient ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            birth_date: { type: 'string', description: 'Updated date of birth in YYYY-MM-DD format' },
          },
          required: ['patient_id'],
        },
      },
      // ── Patient Health Metrics ─────────────────────────────────────────────
      {
        name: 'list_patient_health_metrics',
        description: 'List health metrics for patients (e.g. weight, blood pressure, steps)',
        inputSchema: {
          type: 'object',
          properties: {
            filter_patient: { type: 'string', description: 'Filter by patient ID' },
            filter_metric_type: { type: 'string', description: 'Filter by metric type (e.g. weight, blood_pressure)' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_patient_health_metric',
        description: 'Get a single patient health metric record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            metric_id: { type: 'string', description: 'The health metric record ID' },
          },
          required: ['metric_id'],
        },
      },
      {
        name: 'create_patient_health_metric',
        description: 'Record a new health metric measurement for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'The patient ID to record the metric for' },
            metric_type: { type: 'string', description: 'Type of metric (e.g. weight, blood_pressure_systolic)' },
            value: { type: 'number', description: 'Numeric value of the measurement' },
            unit: { type: 'string', description: 'Unit of measurement (e.g. kg, mmHg)' },
            recorded_at: { type: 'string', description: 'ISO 8601 timestamp of when the metric was recorded' },
          },
          required: ['patient_id', 'metric_type', 'value'],
        },
      },
      // ── Patient Plan Summaries ─────────────────────────────────────────────
      {
        name: 'list_patient_plan_summaries',
        description: 'List care plan summaries for patients, showing adherence and progress',
        inputSchema: {
          type: 'object',
          properties: {
            filter_patient: { type: 'string', description: 'Filter by patient ID' },
            filter_active: { type: 'boolean', description: 'Filter by active plans only' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_patient_plan_summary',
        description: 'Get the care plan summary for a specific patient plan by ID',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The patient plan summary ID' },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'update_patient_plan_summary',
        description: 'Update a patient plan summary (e.g. mark goals as complete)',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The patient plan summary ID to update' },
            adherence: { type: 'number', description: 'Adherence score (0-100)' },
          },
          required: ['plan_id'],
        },
      },
      // ── Patient Health Results ─────────────────────────────────────────────
      {
        name: 'list_patient_health_results',
        description: 'List health results (assessments, questionnaire outcomes) for patients',
        inputSchema: {
          type: 'object',
          properties: {
            filter_patient: { type: 'string', description: 'Filter by patient ID' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_patient_health_result',
        description: 'Get a single patient health result by ID',
        inputSchema: {
          type: 'object',
          properties: {
            result_id: { type: 'string', description: 'The health result ID' },
          },
          required: ['result_id'],
        },
      },
      // ── Coaches ───────────────────────────────────────────────────────────
      {
        name: 'list_coaches',
        description: 'List coaches in the TwineHealth organization',
        inputSchema: {
          type: 'object',
          properties: {
            filter_groups: { type: 'string', description: 'Filter by group ID' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_coach',
        description: 'Get a single coach by their coach ID',
        inputSchema: {
          type: 'object',
          properties: {
            coach_id: { type: 'string', description: 'The TwineHealth coach ID' },
          },
          required: ['coach_id'],
        },
      },
      // ── Calendar Events ───────────────────────────────────────────────────
      {
        name: 'list_calendar_events',
        description: 'List calendar events (appointments, check-ins) for patients and coaches',
        inputSchema: {
          type: 'object',
          properties: {
            filter_patient: { type: 'string', description: 'Filter by patient ID' },
            filter_attendees: { type: 'string', description: 'Filter by attendee user ID' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_calendar_event',
        description: 'Get a single calendar event by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'The calendar event ID' },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'create_calendar_event',
        description: 'Create a new calendar event (appointment or check-in) for a patient',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'Patient ID for the event (required)' },
            title: { type: 'string', description: 'Event title' },
            start_at: { type: 'string', description: 'Start datetime in ISO 8601 format (required)' },
            end_at: { type: 'string', description: 'End datetime in ISO 8601 format' },
            all_day: { type: 'boolean', description: 'Whether this is an all-day event' },
            description: { type: 'string', description: 'Event description or notes' },
          },
          required: ['patient_id', 'start_at'],
        },
      },
      {
        name: 'update_calendar_event',
        description: 'Update an existing calendar event by ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'The calendar event ID to update' },
            title: { type: 'string', description: 'Updated title' },
            start_at: { type: 'string', description: 'Updated start datetime in ISO 8601 format' },
            end_at: { type: 'string', description: 'Updated end datetime in ISO 8601 format' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'delete_calendar_event',
        description: 'Delete a calendar event by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'The calendar event ID to delete' },
          },
          required: ['event_id'],
        },
      },
      // ── Groups ────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List groups (care programs or cohorts) in the TwineHealth organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get a single group by its group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The group ID' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new group (care program or cohort) in TwineHealth',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Group name (required)' },
            description: { type: 'string', description: 'Group description' },
          },
          required: ['name'],
        },
      },
      // ── Health Profiles ───────────────────────────────────────────────────
      {
        name: 'list_health_profiles',
        description: 'List health profiles for patients containing demographic and clinical data',
        inputSchema: {
          type: 'object',
          properties: {
            filter_patient: { type: 'string', description: 'Filter by patient ID' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_health_profile',
        description: 'Get a single health profile by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'The health profile ID' },
          },
          required: ['profile_id'],
        },
      },
      // ── Rewards ───────────────────────────────────────────────────────────
      {
        name: 'list_rewards',
        description: 'List available rewards that patients can earn through health activities',
        inputSchema: {
          type: 'object',
          properties: {
            filter_groups: { type: 'string', description: 'Filter by group ID' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_reward',
        description: 'Get a single reward by its reward ID',
        inputSchema: {
          type: 'object',
          properties: {
            reward_id: { type: 'string', description: 'The reward ID' },
          },
          required: ['reward_id'],
        },
      },
      {
        name: 'create_reward',
        description: 'Create a new reward for a patient health activity incentive',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Reward name (required)' },
            description: { type: 'string', description: 'Reward description' },
            points: { type: 'number', description: 'Points value for this reward' },
          },
          required: ['name'],
        },
      },
      // ── Reward Earnings ───────────────────────────────────────────────────
      {
        name: 'list_reward_earnings',
        description: 'List reward earnings — rewards that patients have earned',
        inputSchema: {
          type: 'object',
          properties: {
            filter_patient: { type: 'string', description: 'Filter by patient ID' },
            filter_reward: { type: 'string', description: 'Filter by reward ID' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_reward_earning',
        description: 'Get a single reward earning record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            earning_id: { type: 'string', description: 'The reward earning ID' },
          },
          required: ['earning_id'],
        },
      },
      {
        name: 'create_reward_earning',
        description: 'Record that a patient has earned a reward',
        inputSchema: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', description: 'The patient ID who earned the reward (required)' },
            reward_id: { type: 'string', description: 'The reward ID that was earned (required)' },
            earned_at: { type: 'string', description: 'ISO 8601 timestamp when the reward was earned' },
          },
          required: ['patient_id', 'reward_id'],
        },
      },
      // ── Reward Programs ───────────────────────────────────────────────────
      {
        name: 'list_reward_programs',
        description: 'List reward programs — structured incentive programs tied to health goals',
        inputSchema: {
          type: 'object',
          properties: {
            filter_groups: { type: 'string', description: 'Filter by group ID' },
            page_number: { type: 'number', description: 'Page number for pagination' },
            page_size: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_reward_program',
        description: 'Get a single reward program by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            program_id: { type: 'string', description: 'The reward program ID' },
          },
          required: ['program_id'],
        },
      },
      {
        name: 'create_reward_program',
        description: 'Create a new reward program linked to a group',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Program name (required)' },
            group_id: { type: 'string', description: 'Group ID to associate with this program' },
            description: { type: 'string', description: 'Program description' },
          },
          required: ['name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_patients':                  return await this.listPatients(args);
        case 'get_patient':                    return await this.getPatient(args);
        case 'create_patient':                 return await this.createPatient(args);
        case 'update_patient':                 return await this.updatePatient(args);
        case 'list_patient_health_metrics':    return await this.listPatientHealthMetrics(args);
        case 'get_patient_health_metric':      return await this.getPatientHealthMetric(args);
        case 'create_patient_health_metric':   return await this.createPatientHealthMetric(args);
        case 'list_patient_plan_summaries':    return await this.listPatientPlanSummaries(args);
        case 'get_patient_plan_summary':       return await this.getPatientPlanSummary(args);
        case 'update_patient_plan_summary':    return await this.updatePatientPlanSummary(args);
        case 'list_patient_health_results':    return await this.listPatientHealthResults(args);
        case 'get_patient_health_result':      return await this.getPatientHealthResult(args);
        case 'list_coaches':                   return await this.listCoaches(args);
        case 'get_coach':                      return await this.getCoach(args);
        case 'list_calendar_events':           return await this.listCalendarEvents(args);
        case 'get_calendar_event':             return await this.getCalendarEvent(args);
        case 'create_calendar_event':          return await this.createCalendarEvent(args);
        case 'update_calendar_event':          return await this.updateCalendarEvent(args);
        case 'delete_calendar_event':          return await this.deleteCalendarEvent(args);
        case 'list_groups':                    return await this.listGroups(args);
        case 'get_group':                      return await this.getGroup(args);
        case 'create_group':                   return await this.createGroup(args);
        case 'list_health_profiles':           return await this.listHealthProfiles(args);
        case 'get_health_profile':             return await this.getHealthProfile(args);
        case 'list_rewards':                   return await this.listRewards(args);
        case 'get_reward':                     return await this.getReward(args);
        case 'create_reward':                  return await this.createReward(args);
        case 'list_reward_earnings':           return await this.listRewardEarnings(args);
        case 'get_reward_earning':             return await this.getRewardEarning(args);
        case 'create_reward_earning':          return await this.createRewardEarning(args);
        case 'list_reward_programs':           return await this.listRewardPrograms(args);
        case 'get_reward_program':             return await this.getRewardProgram(args);
        case 'create_reward_program':          return await this.createRewardProgram(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    };
  }

  private pageParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
    if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));
    return params;
  }

  private async twineRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `TwineHealth API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `TwineHealth returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private buildJsonApiPayload(type: string, attributes: Record<string, unknown>): string {
    // Remove undefined values
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attributes)) {
      if (v !== undefined) cleaned[k] = v;
    }
    return JSON.stringify({ data: { type, attributes: cleaned } });
  }

  // ── Patients ──────────────────────────────────────────────────────────────

  private async listPatients(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_groups) params.set('filter[groups]', args.filter_groups as string);
    if (args.filter_coaches) params.set('filter[coaches]', args.filter_coaches as string);
    const qs = params.toString();
    return this.twineRequest(`/patient${qs ? '?' + qs : ''}`);
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/patient/${encodeURIComponent(args.patient_id as string)}`);
  }

  private async createPatient(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
    };
    if (args.birth_date) attributes.birth_date = args.birth_date;
    if (args.gender) attributes.gender = args.gender;
    const body = JSON.stringify({
      data: {
        type: 'patient',
        attributes,
        ...(args.group_id ? { relationships: { groups: { data: [{ type: 'group', id: args.group_id }] } } } : {}),
      },
    });
    return this.twineRequest('/patient', { method: 'POST', body });
  }

  private async updatePatient(args: Record<string, unknown>): Promise<ToolResult> {
    const { patient_id, ...rest } = args;
    const attributes: Record<string, unknown> = {};
    if (rest.first_name) attributes.first_name = rest.first_name;
    if (rest.last_name) attributes.last_name = rest.last_name;
    if (rest.email) attributes.email = rest.email;
    if (rest.birth_date) attributes.birth_date = rest.birth_date;
    return this.twineRequest(
      `/patient/${encodeURIComponent(patient_id as string)}`,
      { method: 'PATCH', body: this.buildJsonApiPayload('patient', attributes) },
    );
  }

  // ── Patient Health Metrics ─────────────────────────────────────────────────

  private async listPatientHealthMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_patient) params.set('filter[patient]', args.filter_patient as string);
    if (args.filter_metric_type) params.set('filter[type]', args.filter_metric_type as string);
    const qs = params.toString();
    return this.twineRequest(`/patient_health_metric${qs ? '?' + qs : ''}`);
  }

  private async getPatientHealthMetric(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/patient_health_metric/${encodeURIComponent(args.metric_id as string)}`);
  }

  private async createPatientHealthMetric(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {
      type: args.metric_type,
      value: args.value,
    };
    if (args.unit) attributes.unit = args.unit;
    if (args.recorded_at) attributes.recorded_at = args.recorded_at;
    const body = JSON.stringify({
      data: {
        type: 'patient_health_metric',
        attributes,
        relationships: { patient: { data: { type: 'patient', id: args.patient_id } } },
      },
    });
    return this.twineRequest('/patient_health_metric', { method: 'POST', body });
  }

  // ── Patient Plan Summaries ─────────────────────────────────────────────────

  private async listPatientPlanSummaries(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_patient) params.set('filter[patient]', args.filter_patient as string);
    if (args.filter_active !== undefined) params.set('filter[active]', String(args.filter_active));
    const qs = params.toString();
    return this.twineRequest(`/patient_plan_summary${qs ? '?' + qs : ''}`);
  }

  private async getPatientPlanSummary(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/patient_plan_summary/${encodeURIComponent(args.plan_id as string)}`);
  }

  private async updatePatientPlanSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const { plan_id, ...rest } = args;
    const attributes: Record<string, unknown> = {};
    if (rest.adherence !== undefined) attributes.adherence = rest.adherence;
    return this.twineRequest(
      `/patient_plan_summary/${encodeURIComponent(plan_id as string)}`,
      { method: 'PATCH', body: this.buildJsonApiPayload('patient_plan_summary', attributes) },
    );
  }

  // ── Patient Health Results ─────────────────────────────────────────────────

  private async listPatientHealthResults(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_patient) params.set('filter[patient]', args.filter_patient as string);
    const qs = params.toString();
    return this.twineRequest(`/result${qs ? '?' + qs : ''}`);
  }

  private async getPatientHealthResult(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/result/${encodeURIComponent(args.result_id as string)}`);
  }

  // ── Coaches ───────────────────────────────────────────────────────────────

  private async listCoaches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_groups) params.set('filter[groups]', args.filter_groups as string);
    const qs = params.toString();
    return this.twineRequest(`/coach${qs ? '?' + qs : ''}`);
  }

  private async getCoach(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/coach/${encodeURIComponent(args.coach_id as string)}`);
  }

  // ── Calendar Events ───────────────────────────────────────────────────────

  private async listCalendarEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_patient) params.set('filter[patient]', args.filter_patient as string);
    if (args.filter_attendees) params.set('filter[attendees]', args.filter_attendees as string);
    const qs = params.toString();
    return this.twineRequest(`/calendar_event${qs ? '?' + qs : ''}`);
  }

  private async getCalendarEvent(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/calendar_event/${encodeURIComponent(args.event_id as string)}`);
  }

  private async createCalendarEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {
      start_at: args.start_at,
    };
    if (args.title) attributes.title = args.title;
    if (args.end_at) attributes.end_at = args.end_at;
    if (args.all_day !== undefined) attributes.all_day = args.all_day;
    if (args.description) attributes.description = args.description;
    const body = JSON.stringify({
      data: {
        type: 'calendar_event',
        attributes,
        relationships: { patient: { data: { type: 'patient', id: args.patient_id } } },
      },
    });
    return this.twineRequest('/calendar_event', { method: 'POST', body });
  }

  private async updateCalendarEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const { event_id, ...rest } = args;
    const attributes: Record<string, unknown> = {};
    if (rest.title) attributes.title = rest.title;
    if (rest.start_at) attributes.start_at = rest.start_at;
    if (rest.end_at) attributes.end_at = rest.end_at;
    if (rest.description) attributes.description = rest.description;
    return this.twineRequest(
      `/calendar_event/${encodeURIComponent(event_id as string)}`,
      { method: 'PATCH', body: this.buildJsonApiPayload('calendar_event', attributes) },
    );
  }

  private async deleteCalendarEvent(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(
      `/calendar_event/${encodeURIComponent(args.event_id as string)}`,
      { method: 'DELETE' },
    );
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    const qs = params.toString();
    return this.twineRequest(`/group${qs ? '?' + qs : ''}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/group/${encodeURIComponent(args.group_id as string)}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = { name: args.name };
    if (args.description) attributes.description = args.description;
    return this.twineRequest('/group', {
      method: 'POST',
      body: this.buildJsonApiPayload('group', attributes),
    });
  }

  // ── Health Profiles ───────────────────────────────────────────────────────

  private async listHealthProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_patient) params.set('filter[patient]', args.filter_patient as string);
    const qs = params.toString();
    return this.twineRequest(`/health_profile${qs ? '?' + qs : ''}`);
  }

  private async getHealthProfile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/health_profile/${encodeURIComponent(args.profile_id as string)}`);
  }

  // ── Rewards ───────────────────────────────────────────────────────────────

  private async listRewards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_groups) params.set('filter[groups]', args.filter_groups as string);
    const qs = params.toString();
    return this.twineRequest(`/reward${qs ? '?' + qs : ''}`);
  }

  private async getReward(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/reward/${encodeURIComponent(args.reward_id as string)}`);
  }

  private async createReward(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = { name: args.name };
    if (args.description) attributes.description = args.description;
    if (args.points !== undefined) attributes.points = args.points;
    return this.twineRequest('/reward', {
      method: 'POST',
      body: this.buildJsonApiPayload('reward', attributes),
    });
  }

  // ── Reward Earnings ───────────────────────────────────────────────────────

  private async listRewardEarnings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_patient) params.set('filter[patient]', args.filter_patient as string);
    if (args.filter_reward) params.set('filter[reward]', args.filter_reward as string);
    const qs = params.toString();
    return this.twineRequest(`/reward_earning${qs ? '?' + qs : ''}`);
  }

  private async getRewardEarning(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/reward_earning/${encodeURIComponent(args.earning_id as string)}`);
  }

  private async createRewardEarning(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {};
    if (args.earned_at) attributes.earned_at = args.earned_at;
    const body = JSON.stringify({
      data: {
        type: 'reward_earning',
        attributes,
        relationships: {
          patient: { data: { type: 'patient', id: args.patient_id } },
          reward: { data: { type: 'reward', id: args.reward_id } },
        },
      },
    });
    return this.twineRequest('/reward_earning', { method: 'POST', body });
  }

  // ── Reward Programs ───────────────────────────────────────────────────────

  private async listRewardPrograms(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.pageParams(args);
    if (args.filter_groups) params.set('filter[groups]', args.filter_groups as string);
    const qs = params.toString();
    return this.twineRequest(`/reward_program${qs ? '?' + qs : ''}`);
  }

  private async getRewardProgram(args: Record<string, unknown>): Promise<ToolResult> {
    return this.twineRequest(`/reward_program/${encodeURIComponent(args.program_id as string)}`);
  }

  private async createRewardProgram(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = { name: args.name };
    if (args.description) attributes.description = args.description;
    const body = JSON.stringify({
      data: {
        type: 'reward_program',
        attributes,
        ...(args.group_id ? { relationships: { group: { data: { type: 'group', id: args.group_id } } } } : {}),
      },
    });
    return this.twineRequest('/reward_program', { method: 'POST', body });
  }
}
