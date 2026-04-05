/**
 * VisageCloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official VisageCloud MCP server was found on GitHub.
//
// Base URL: https://visagecloud.com
// Auth: accessKey + secretKey — passed as query parameters on each request
// Docs: https://visagecloud.com/developer/
// Rate limits: Not publicly documented; depends on account tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VisageCloudConfig {
  accessKey: string;
  secretKey: string;
}

export class VisageCloudMCPServer extends MCPAdapterBase {
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://visagecloud.com';

  constructor(config: VisageCloudConfig) {
    super();
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Analysis ─────────────────────────────────────────────────────────────
      {
        name: 'detect_faces',
        description: 'Perform face detection on a picture URL or uploaded image — returns bounding boxes, landmarks, and attributes',
        inputSchema: {
          type: 'object',
          properties: {
            picture_url: { type: 'string', description: 'Publicly accessible URL of the image to analyze' },
            attributes_enabled: { type: 'boolean', description: 'Include facial attributes (age, gender, emotion, etc.) in response (default: true)' },
          },
          required: ['picture_url'],
        },
      },
      {
        name: 'recognize_faces',
        description: 'Perform labeled face recognition on a picture — identifies faces against enrolled profiles in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            picture_url: { type: 'string', description: 'Publicly accessible URL of the image' },
            collection_id: { type: 'string', description: 'Collection ID to search for matches' },
            limit: { type: 'number', description: 'Max number of matches to return per detected face (default: 1)' },
          },
          required: ['picture_url', 'collection_id'],
        },
      },
      {
        name: 'compare_faces',
        description: 'Compare faces identified by their faceHash values to compute similarity scores',
        inputSchema: {
          type: 'object',
          properties: {
            face_hashes: { type: 'array', items: { type: 'string' }, description: 'List of faceHash values to compare' },
          },
          required: ['face_hashes'],
        },
      },
      {
        name: 'retrieve_analysis',
        description: 'Retrieve a complete analysis result (detection + recognition) by analysis ID',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_id: { type: 'string', description: 'Analysis ID returned by a prior detect or recognize operation' },
          },
          required: ['analysis_id'],
        },
      },
      {
        name: 'list_latest_analyses',
        description: 'Retrieve the most recent analysis operations for the account',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of recent analyses to retrieve (default: 10)' },
          },
        },
      },
      // ── Collections ───────────────────────────────────────────────────────────
      {
        name: 'list_collections',
        description: 'List all face collections in the account',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_collection',
        description: 'Create a new empty face collection',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Collection name' },
            purpose: { type: 'string', description: 'Purpose: ENROLL, RECOGNIZE, or BOTH' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_collection',
        description: 'Get the contents and metadata of a face collection by ID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a face collection and all associated profiles and faces',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to delete' },
          },
          required: ['collection_id'],
        },
      },
      // ── Profiles ─────────────────────────────────────────────────────────────
      {
        name: 'create_profile',
        description: 'Create a new empty profile (person identity) in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection to add the profile to' },
            external_id: { type: 'string', description: 'Your external ID for this person' },
            display_name: { type: 'string', description: 'Display name for the profile' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'get_profile',
        description: 'Get profile details by profile ID',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'delete_profile',
        description: 'Delete a profile and unmap all associated faces',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to delete' },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'map_faces_to_profile',
        description: 'Associate (enroll) detected face hashes to a profile for later recognition',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to enroll faces into' },
            collection_id: { type: 'string', description: 'Collection containing the profile' },
            face_hashes: { type: 'array', items: { type: 'string' }, description: 'Face hashes to associate with the profile' },
          },
          required: ['profile_id', 'collection_id', 'face_hashes'],
        },
      },
      {
        name: 'get_faces_from_profile',
        description: 'Get all faceHashes currently associated to a profile',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
            collection_id: { type: 'string', description: 'Collection ID' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      {
        name: 'get_enrollment_status',
        description: 'Check if a profile has enough face samples enrolled to be used for recognition',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
            collection_id: { type: 'string', description: 'Collection ID' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      // ── Classifiers ───────────────────────────────────────────────────────────
      {
        name: 'add_svm_classifier',
        description: 'Create a new SVM face classifier for a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to train the classifier on' },
            name: { type: 'string', description: 'Classifier name' },
          },
          required: ['collection_id', 'name'],
        },
      },
      {
        name: 'get_classifier_status',
        description: 'Get the training status of an SVM classifier',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID' },
          },
          required: ['collection_id'],
        },
      },
      // ── Account ───────────────────────────────────────────────────────────────
      {
        name: 'get_account',
        description: 'Get account information including plan, usage, and limits',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'detect_faces': return await this.detectFaces(args);
        case 'recognize_faces': return await this.recognizeFaces(args);
        case 'compare_faces': return await this.compareFaces(args);
        case 'retrieve_analysis': return await this.retrieveAnalysis(args);
        case 'list_latest_analyses': return await this.listLatestAnalyses(args);
        case 'list_collections': return await this.listCollections();
        case 'create_collection': return await this.createCollection(args);
        case 'get_collection': return await this.getCollection(args);
        case 'delete_collection': return await this.deleteCollection(args);
        case 'create_profile': return await this.createProfile(args);
        case 'get_profile': return await this.getProfile(args);
        case 'delete_profile': return await this.deleteProfile(args);
        case 'map_faces_to_profile': return await this.mapFacesToProfile(args);
        case 'get_faces_from_profile': return await this.getFacesFromProfile(args);
        case 'get_enrollment_status': return await this.getEnrollmentStatus(args);
        case 'add_svm_classifier': return await this.addSVMClassifier(args);
        case 'get_classifier_status': return await this.getClassifierStatus(args);
        case 'get_account': return await this.getAccount();
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

  private authParams(): URLSearchParams {
    return new URLSearchParams({ accessKey: this.accessKey, secretKey: this.secretKey });
  }


  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers as Record<string, string> ?? {}) };
    const response = await this.fetchWithRetry(url, { ...init, headers });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async detectFaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('pictureURL', String(args.picture_url));
    if (args.attributes_enabled === false) params.set('attributesEnabled', 'false');
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/analysis/detection`, { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }

  private async recognizeFaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('pictureURL', String(args.picture_url));
    params.set('collectionId', String(args.collection_id));
    if (args.limit) params.set('limit', String(args.limit));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/analysis/recognition`, { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }

  private async compareFaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    (args.face_hashes as string[]).forEach(h => params.append('faceHash', h));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/analysis/compare?${params}`);
  }

  private async retrieveAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('analysisId', String(args.analysis_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/analysis/retrieve?${params}`);
  }

  private async listLatestAnalyses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('count', String((args.count as number) ?? 10));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/analysis/listLatest?${params}`);
  }

  private async listCollections(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/collection/?${this.authParams()}`);
  }

  private async createCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('name', String(args.name));
    if (args.purpose) params.set('purpose', String(args.purpose));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/collection/`, { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }

  private async getCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('id', String(args.collection_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/collection/${encodeURIComponent(String(args.collection_id))}?${params}`);
  }

  private async deleteCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('id', String(args.collection_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/collection/${encodeURIComponent(String(args.collection_id))}?${params}`, { method: 'DELETE' });
  }

  private async createProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('collectionId', String(args.collection_id));
    if (args.external_id) params.set('externalId', String(args.external_id));
    if (args.display_name) params.set('displayName', String(args.display_name));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/profile/profile`, { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('id', String(args.profile_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/profile/${encodeURIComponent(String(args.profile_id))}?${params}`);
  }

  private async deleteProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('id', String(args.profile_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/profile/${encodeURIComponent(String(args.profile_id))}?${params}`, { method: 'DELETE' });
  }

  private async mapFacesToProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('profileId', String(args.profile_id));
    params.set('collectionId', String(args.collection_id));
    (args.face_hashes as string[]).forEach(h => params.append('faceHash', h));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/profile/map`, { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }

  private async getFacesFromProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('profileId', String(args.profile_id));
    params.set('collectionId', String(args.collection_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/profile/map?${params}`);
  }

  private async getEnrollmentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('profileId', String(args.profile_id));
    params.set('collectionId', String(args.collection_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/profile/enrollmentStatus?${params}`);
  }

  private async addSVMClassifier(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('collectionId', String(args.collection_id));
    params.set('name', String(args.name));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/classifier/svm`, { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }

  private async getClassifierStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.authParams();
    params.set('collectionId', String(args.collection_id));
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/classifier/svm/status?${params}`);
  }

  private async getAccount(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/rest/v1.1/account/account?${this.authParams()}`);
  }

  static catalog() {
    return {
      name: 'visagecloud',
      displayName: 'VisageCloud',
      version: '1.0.0',
      category: 'ai' as const,
      keywords: ['visagecloud', 'face recognition', 'facial analysis', 'biometrics', 'computer vision', 'face detection', 'ai'],
      toolNames: [
        'detect_faces', 'recognize_faces', 'compare_faces', 'retrieve_analysis', 'list_latest_analyses',
        'list_collections', 'create_collection', 'get_collection', 'delete_collection',
        'create_profile', 'get_profile', 'delete_profile', 'map_faces_to_profile', 'get_faces_from_profile', 'get_enrollment_status',
        'add_svm_classifier', 'get_classifier_status', 'get_account',
      ],
      description: 'VisageCloud face recognition and biometric AI: detect faces, recognize and enroll profiles, compare face hashes, and manage collections for identification.',
      author: 'protectnil' as const,
    };
  }
}
