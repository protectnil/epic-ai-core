/**
 * Orthanc Server MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://demo.orthanc-server.com (configurable — self-hosted DICOM server)
// Auth: HTTP Basic Auth (username + password). Some instances allow anonymous access.
// Docs: https://book.orthanc-server.com/users/rest.html
// Spec: https://api.orthanc-server.com/orthanc-openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OrthancServerConfig {
  baseUrl?: string;
  username?: string;
  password?: string;
}

export class OrthancServerMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(config: OrthancServerConfig) {
    super();
    this.baseUrl = config.baseUrl || 'https://demo.orthanc-server.com';
    this.username = config.username || '';
    this.password = config.password || '';
  }

  static catalog() {
    return {
      name: 'orthanc-server',
      displayName: 'Orthanc DICOM Server',
      version: '1.0.0',
      category: 'healthcare' as const,
      keywords: [
        'orthanc', 'dicom', 'medical imaging', 'radiology', 'pacs',
        'instances', 'series', 'studies', 'patients', 'healthcare',
        'modality', 'peer', 'c-store', 'c-find', 'c-move',
      ],
      toolNames: [
        'get_system',
        'get_statistics',
        'list_patients',
        'get_patient',
        'delete_patient',
        'get_patient_studies',
        'get_patient_instances',
        'get_patient_statistics',
        'list_studies',
        'get_study',
        'delete_study',
        'get_study_series',
        'get_study_instances',
        'get_study_statistics',
        'list_series',
        'get_series',
        'delete_series',
        'get_series_instances',
        'get_series_statistics',
        'list_instances',
        'upload_instance',
        'get_instance',
        'delete_instance',
        'get_instance_tags',
        'get_instance_simplified_tags',
        'get_instance_statistics',
        'list_changes',
        'clear_changes',
        'list_exports',
        'list_modalities',
        'modality_echo',
        'modality_find',
        'modality_store',
        'list_peers',
        'peer_store',
        'list_jobs',
        'get_job',
        'cancel_job',
        'tools_find',
        'tools_lookup',
        'tools_generate_uid',
        'tools_now',
        'tools_create_dicom',
      ],
      description: 'Interact with an Orthanc DICOM server: manage patients, studies, series, instances, remote modalities, peers, and system tools via the Orthanc REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── System ────────────────────────────────────────────────────────────
      {
        name: 'get_system',
        description: 'Get Orthanc server system information including version, API version, and capabilities',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_statistics',
        description: 'Get database statistics including counts of patients, studies, series, and instances',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Patients ──────────────────────────────────────────────────────────
      {
        name: 'list_patients',
        description: 'List all available DICOM patients, optionally with expanded details',
        inputSchema: {
          type: 'object',
          properties: {
            expand: { type: 'string', description: 'If present, retrieve detailed information about each patient' },
          },
        },
      },
      {
        name: 'get_patient',
        description: 'Get detailed information about a DICOM patient by Orthanc ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc patient ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_patient',
        description: 'Delete a DICOM patient and all associated studies, series, and instances',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc patient ID to delete (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_patient_studies',
        description: 'Get all studies belonging to a specific DICOM patient',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc patient ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_patient_instances',
        description: 'Get all DICOM instances (images) belonging to a specific patient',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc patient ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_patient_statistics',
        description: 'Get statistics for a specific patient including disk size and number of studies/instances',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc patient ID (required)' },
          },
          required: ['id'],
        },
      },
      // ── Studies ───────────────────────────────────────────────────────────
      {
        name: 'list_studies',
        description: 'List all available DICOM studies, optionally with expanded details',
        inputSchema: {
          type: 'object',
          properties: {
            expand: { type: 'string', description: 'If present, retrieve detailed information about each study' },
          },
        },
      },
      {
        name: 'get_study',
        description: 'Get detailed information about a DICOM study by Orthanc ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc study ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_study',
        description: 'Delete a DICOM study and all its series and instances',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc study ID to delete (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_study_series',
        description: 'Get all series belonging to a specific DICOM study',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc study ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_study_instances',
        description: 'Get all DICOM instances (images) belonging to a specific study',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc study ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_study_statistics',
        description: 'Get statistics for a specific study including disk size and instance count',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc study ID (required)' },
          },
          required: ['id'],
        },
      },
      // ── Series ────────────────────────────────────────────────────────────
      {
        name: 'list_series',
        description: 'List all available DICOM series, optionally with expanded details',
        inputSchema: {
          type: 'object',
          properties: {
            expand: { type: 'string', description: 'If present, retrieve detailed information about each series' },
          },
        },
      },
      {
        name: 'get_series',
        description: 'Get detailed information about a DICOM series by Orthanc ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc series ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_series',
        description: 'Delete a DICOM series and all its instances',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc series ID to delete (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_series_instances',
        description: 'Get all DICOM instances (images) belonging to a specific series',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc series ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_series_statistics',
        description: 'Get statistics for a specific series including disk size and instance count',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc series ID (required)' },
          },
          required: ['id'],
        },
      },
      // ── Instances ─────────────────────────────────────────────────────────
      {
        name: 'list_instances',
        description: 'List all available DICOM instances, optionally with expanded details',
        inputSchema: {
          type: 'object',
          properties: {
            expand: { type: 'string', description: 'If present, retrieve detailed information about each instance' },
          },
        },
      },
      {
        name: 'upload_instance',
        description: 'Upload a DICOM instance to the Orthanc server',
        inputSchema: {
          type: 'object',
          properties: {
            dicomData: { type: 'string', description: 'Base64-encoded DICOM file content (required)' },
          },
          required: ['dicomData'],
        },
      },
      {
        name: 'get_instance',
        description: 'Get detailed information about a DICOM instance by Orthanc ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc instance ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_instance',
        description: 'Delete a specific DICOM instance by Orthanc ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc instance ID to delete (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_instance_tags',
        description: 'Get the full DICOM tags for a specific instance in machine-readable format',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc instance ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_instance_simplified_tags',
        description: 'Get human-readable DICOM tags for a specific instance with symbolic tag names',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc instance ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_instance_statistics',
        description: 'Get statistics for a specific DICOM instance including file size on disk',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc instance ID (required)' },
          },
          required: ['id'],
        },
      },
      // ── Changes & Exports ─────────────────────────────────────────────────
      {
        name: 'list_changes',
        description: 'List changes recorded in the Orthanc changes log for auto-routing and event tracking',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Limit the number of results returned' },
            since: { type: 'number', description: 'Show only changes since this sequence index' },
          },
        },
      },
      {
        name: 'clear_changes',
        description: 'Clear the full history stored in the Orthanc changes log',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_exports',
        description: 'List exports recorded in the Orthanc exports log for medical traceability',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Limit the number of results returned' },
            since: { type: 'number', description: 'Show only exports since this sequence index' },
          },
        },
      },
      // ── Modalities (DICOM networking) ─────────────────────────────────────
      {
        name: 'list_modalities',
        description: 'List all configured DICOM remote modalities (AE titles)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'modality_echo',
        description: 'Trigger a C-ECHO SCU ping to verify connectivity with a remote DICOM modality',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Modality AE title / Orthanc modality ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'modality_find',
        description: 'Perform a hierarchical C-FIND SCU query on a remote DICOM modality',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Modality ID to query (required)' },
            level: { type: 'string', description: 'Query level: Patient, Study, Series, or Instance (required)' },
            query: { type: 'object', description: 'DICOM query attributes as key-value pairs (e.g. PatientName, StudyDate)' },
          },
          required: ['id', 'level'],
        },
      },
      {
        name: 'modality_store',
        description: 'Trigger a C-STORE SCU to send DICOM resources to a remote modality',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Modality ID to send to (required)' },
            resources: {
              type: 'array',
              description: 'List of Orthanc IDs (patients, studies, series, or instances) to send (required)',
              items: { type: 'string' },
            },
          },
          required: ['id', 'resources'],
        },
      },
      // ── Peers ─────────────────────────────────────────────────────────────
      {
        name: 'list_peers',
        description: 'List all configured Orthanc peer servers for peer-to-peer DICOM transfer',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'peer_store',
        description: 'Send DICOM resources to a remote Orthanc peer server',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc peer ID to send to (required)' },
            resources: {
              type: 'array',
              description: 'List of Orthanc IDs to send (required)',
              items: { type: 'string' },
            },
          },
          required: ['id', 'resources'],
        },
      },
      // ── Jobs ──────────────────────────────────────────────────────────────
      {
        name: 'list_jobs',
        description: 'List all asynchronous jobs running or queued in the Orthanc job engine',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_job',
        description: 'Get the status and details of a specific Orthanc job by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc job ID (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Cancel a running or pending Orthanc job',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Orthanc job ID to cancel (required)' },
          },
          required: ['id'],
        },
      },
      // ── Tools ─────────────────────────────────────────────────────────────
      {
        name: 'tools_find',
        description: 'Search for local DICOM resources using attribute-based queries (patient name, study date, modality, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            level: { type: 'string', description: 'Resource level to search: Patient, Study, Series, or Instance (required)' },
            query: { type: 'object', description: 'DICOM query attributes as key-value pairs (e.g. PatientName, StudyDate)' },
            expand: { type: 'boolean', description: 'If true, return full resource details instead of just IDs' },
            limit: { type: 'number', description: 'Maximum number of results to return' },
          },
          required: ['level'],
        },
      },
      {
        name: 'tools_lookup',
        description: 'Look up Orthanc resource IDs from DICOM identifiers (PatientID, StudyInstanceUID, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            dicomUid: { type: 'string', description: 'DICOM UID to look up (required)' },
          },
          required: ['dicomUid'],
        },
      },
      {
        name: 'tools_generate_uid',
        description: 'Generate a new DICOM UID for use in creating DICOM objects',
        inputSchema: {
          type: 'object',
          properties: {
            level: { type: 'string', description: 'UID level: patient, study, series, or instance' },
          },
        },
      },
      {
        name: 'tools_now',
        description: 'Get the current UTC time from the Orthanc server',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'tools_create_dicom',
        description: 'Create a new DICOM instance from JSON-encoded DICOM tags and optional content',
        inputSchema: {
          type: 'object',
          properties: {
            tags: { type: 'object', description: 'DICOM tags as key-value pairs for the new instance (required)' },
            parentId: { type: 'string', description: 'Orthanc ID of the parent series to attach to' },
            content: { type: 'string', description: 'Base64-encoded pixel data or content for the instance' },
          },
          required: ['tags'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_system':                  return await this.getSystem();
        case 'get_statistics':              return await this.getStatistics();
        case 'list_patients':               return await this.listPatients(args);
        case 'get_patient':                 return await this.getPatient(args);
        case 'delete_patient':              return await this.deletePatient(args);
        case 'get_patient_studies':         return await this.getPatientStudies(args);
        case 'get_patient_instances':       return await this.getPatientInstances(args);
        case 'get_patient_statistics':      return await this.getPatientStatistics(args);
        case 'list_studies':                return await this.listStudies(args);
        case 'get_study':                   return await this.getStudy(args);
        case 'delete_study':                return await this.deleteStudy(args);
        case 'get_study_series':            return await this.getStudySeries(args);
        case 'get_study_instances':         return await this.getStudyInstances(args);
        case 'get_study_statistics':        return await this.getStudyStatistics(args);
        case 'list_series':                 return await this.listSeries(args);
        case 'get_series':                  return await this.getSeries(args);
        case 'delete_series':               return await this.deleteSeries(args);
        case 'get_series_instances':        return await this.getSeriesInstances(args);
        case 'get_series_statistics':       return await this.getSeriesStatistics(args);
        case 'list_instances':              return await this.listInstances(args);
        case 'upload_instance':             return await this.uploadInstance(args);
        case 'get_instance':                return await this.getInstance(args);
        case 'delete_instance':             return await this.deleteInstance(args);
        case 'get_instance_tags':           return await this.getInstanceTags(args);
        case 'get_instance_simplified_tags': return await this.getInstanceSimplifiedTags(args);
        case 'get_instance_statistics':     return await this.getInstanceStatistics(args);
        case 'list_changes':                return await this.listChanges(args);
        case 'clear_changes':               return await this.clearChanges();
        case 'list_exports':                return await this.listExports(args);
        case 'list_modalities':             return await this.listModalities();
        case 'modality_echo':               return await this.modalityEcho(args);
        case 'modality_find':               return await this.modalityFind(args);
        case 'modality_store':              return await this.modalityStore(args);
        case 'list_peers':                  return await this.listPeers();
        case 'peer_store':                  return await this.peerStore(args);
        case 'list_jobs':                   return await this.listJobs();
        case 'get_job':                     return await this.getJob(args);
        case 'cancel_job':                  return await this.cancelJob(args);
        case 'tools_find':                  return await this.toolsFind(args);
        case 'tools_lookup':                return await this.toolsLookup(args);
        case 'tools_generate_uid':          return await this.toolsGenerateUid(args);
        case 'tools_now':                   return await this.toolsNow();
        case 'tools_create_dicom':          return await this.toolsCreateDicom(args);
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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.username) {
      const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }
    return headers;
  }

  private async orthancRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Orthanc API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Orthanc returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  }

  // ── System ────────────────────────────────────────────────────────────────

  private async getSystem(): Promise<ToolResult> {
    return this.orthancRequest('/system');
  }

  private async getStatistics(): Promise<ToolResult> {
    return this.orthancRequest('/statistics');
  }

  // ── Patients ──────────────────────────────────────────────────────────────

  private async listPatients(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({ expand: args.expand });
    return this.orthancRequest(`/patients${qs}`);
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/patients/${args.id}`);
  }

  private async deletePatient(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/patients/${args.id}`, { method: 'DELETE' });
  }

  private async getPatientStudies(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/patients/${args.id}/studies`);
  }

  private async getPatientInstances(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/patients/${args.id}/instances`);
  }

  private async getPatientStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/patients/${args.id}/statistics`);
  }

  // ── Studies ───────────────────────────────────────────────────────────────

  private async listStudies(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({ expand: args.expand });
    return this.orthancRequest(`/studies${qs}`);
  }

  private async getStudy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/studies/${args.id}`);
  }

  private async deleteStudy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/studies/${args.id}`, { method: 'DELETE' });
  }

  private async getStudySeries(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/studies/${args.id}/series`);
  }

  private async getStudyInstances(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/studies/${args.id}/instances`);
  }

  private async getStudyStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/studies/${args.id}/statistics`);
  }

  // ── Series ────────────────────────────────────────────────────────────────

  private async listSeries(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({ expand: args.expand });
    return this.orthancRequest(`/series${qs}`);
  }

  private async getSeries(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/series/${args.id}`);
  }

  private async deleteSeries(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/series/${args.id}`, { method: 'DELETE' });
  }

  private async getSeriesInstances(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/series/${args.id}/instances`);
  }

  private async getSeriesStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/series/${args.id}/statistics`);
  }

  // ── Instances ─────────────────────────────────────────────────────────────

  private async listInstances(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({ expand: args.expand });
    return this.orthancRequest(`/instances${qs}`);
  }

  private async uploadInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const body = Buffer.from(args.dicomData as string, 'base64');
    const url = `${this.baseUrl}/instances`;
    const headers = { ...this.buildHeaders(), 'Content-Type': 'application/dicom' };
    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body });
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Orthanc upload error ${response.status}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getInstance(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/instances/${args.id}`);
  }

  private async deleteInstance(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/instances/${args.id}`, { method: 'DELETE' });
  }

  private async getInstanceTags(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/instances/${args.id}/tags`);
  }

  private async getInstanceSimplifiedTags(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/instances/${args.id}/simplified-tags`);
  }

  private async getInstanceStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/instances/${args.id}/statistics`);
  }

  // ── Changes & Exports ─────────────────────────────────────────────────────

  private async listChanges(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({ limit: args.limit, since: args.since });
    return this.orthancRequest(`/changes${qs}`);
  }

  private async clearChanges(): Promise<ToolResult> {
    return this.orthancRequest('/changes', { method: 'DELETE' });
  }

  private async listExports(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({ limit: args.limit, since: args.since });
    return this.orthancRequest(`/exports${qs}`);
  }

  // ── Modalities ────────────────────────────────────────────────────────────

  private async listModalities(): Promise<ToolResult> {
    return this.orthancRequest('/modalities');
  }

  private async modalityEcho(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/modalities/${args.id}/echo`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  private async modalityFind(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/modalities/${args.id}/find`, {
      method: 'POST',
      body: JSON.stringify({ Level: args.level, Query: args.query ?? {} }),
    });
  }

  private async modalityStore(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/modalities/${args.id}/store`, {
      method: 'POST',
      body: JSON.stringify(args.resources),
    });
  }

  // ── Peers ─────────────────────────────────────────────────────────────────

  private async listPeers(): Promise<ToolResult> {
    return this.orthancRequest('/peers');
  }

  private async peerStore(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/peers/${args.id}/store`, {
      method: 'POST',
      body: JSON.stringify(args.resources),
    });
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  private async listJobs(): Promise<ToolResult> {
    return this.orthancRequest('/jobs');
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/jobs/${args.id}`);
  }

  private async cancelJob(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest(`/jobs/${args.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // ── Tools ─────────────────────────────────────────────────────────────────

  private async toolsFind(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { Level: args.level, Query: args.query ?? {} };
    if (args.expand !== undefined) body['Expand'] = args.expand;
    if (args.limit !== undefined) body['Limit'] = args.limit;
    return this.orthancRequest('/tools/find', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async toolsLookup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.orthancRequest('/tools/lookup', {
      method: 'POST',
      body: JSON.stringify(args.dicomUid),
    });
  }

  private async toolsGenerateUid(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({ level: args.level });
    return this.orthancRequest(`/tools/generate-uid${qs}`);
  }

  private async toolsNow(): Promise<ToolResult> {
    return this.orthancRequest('/tools/now');
  }

  private async toolsCreateDicom(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { Tags: args.tags };
    if (args.parentId) body['Parent'] = args.parentId;
    if (args.content) body['Content'] = args.content;
    return this.orthancRequest('/tools/create-dicom', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
