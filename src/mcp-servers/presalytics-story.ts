/**
 * Presalytics Story MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Presalytics has not published an official MCP server.
//
// Base URL: https://api.presalytics.io/story
// Auth: JWT Bearer token — Authorization: Bearer <token>
// Docs: https://presalytics.io/docs/
// Spec: https://api.apis.guru/v2/specs/presalytics.io/story/0.3.1/openapi.json
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PresalyticsStoryConfig {
  accessToken: string;
  baseUrl?: string;
}

export class PresalyticsStoryMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PresalyticsStoryConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.presalytics.io/story';
  }

  static catalog() {
    return {
      name: 'presalytics-story',
      displayName: 'Presalytics Story',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'presalytics', 'story', 'presentation', 'analytics', 'dashboard',
        'outline', 'collaborator', 'session', 'view', 'event', 'message',
        'reveal', 'slideshow', 'publish', 'permission', 'cache',
      ],
      toolNames: [
        'list_stories', 'create_story', 'get_story', 'update_story', 'delete_story',
        'get_story_outline', 'post_story_outline',
        'get_story_status', 'get_story_analytics',
        'list_collaborators', 'add_collaborator', 'get_collaborator',
        'update_collaborator', 'remove_collaborator',
        'check_collaborator_permission',
        'list_sessions', 'create_session', 'get_session', 'delete_session',
        'list_session_views', 'create_session_view',
        'get_view', 'delete_view',
        'list_events', 'post_events',
        'list_messages', 'send_message',
        'get_story_reveal', 'get_story_public',
        'get_permission_types',
        'cache_subdocument', 'get_cached_subdocument',
      ],
      description: 'Manage Presalytics analytics stories: create and edit presentations, manage collaborators and permissions, handle sessions, views, events, and conversation messages via the Presalytics Story REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Stories ----------------------------------------------------------
      {
        name: 'list_stories',
        description: 'List all stories for the authenticated user, with optional outline and relationship data',
        inputSchema: {
          type: 'object',
          properties: {
            include_relationships: { type: 'boolean', description: 'Include related resource data in the response' },
            include_outline: { type: 'boolean', description: 'Include the full story outline in the response' },
          },
        },
      },
      {
        name: 'create_story',
        description: 'Upload and create a new story by providing a story outline JSON object',
        inputSchema: {
          type: 'object',
          properties: {
            outline: { type: 'object', description: 'A story outline JSON object defining the story structure and content' },
            include_outline: { type: 'boolean', description: 'Include the outline in the response' },
          },
          required: ['outline'],
        },
      },
      {
        name: 'get_story',
        description: 'Get a specific story by ID, with optional outline and relationship data',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            include_relationships: { type: 'boolean', description: 'Include related resource data' },
            include_outline: { type: 'boolean', description: 'Include the full story outline' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'update_story',
        description: 'Modify an existing story by ID with updated outline or metadata',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID to update' },
            outline: { type: 'object', description: 'Updated story outline JSON object' },
          },
          required: ['story_id', 'outline'],
        },
      },
      {
        name: 'delete_story',
        description: 'Permanently delete a story by ID',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID to delete' },
          },
          required: ['story_id'],
        },
      },
      // -- Outline ----------------------------------------------------------
      {
        name: 'get_story_outline',
        description: 'Retrieve the story outline (structure and content definition) for a specific story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'post_story_outline',
        description: 'Upload or replace the story outline for an existing story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            outline: { type: 'object', description: 'The story outline JSON object to post' },
          },
          required: ['story_id', 'outline'],
        },
      },
      // -- Status & Analytics -----------------------------------------------
      {
        name: 'get_story_status',
        description: 'Get the current processing/rendering status of a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'get_story_analytics',
        description: 'Retrieve view analytics data for a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      // -- Collaborators ----------------------------------------------------
      {
        name: 'list_collaborators',
        description: 'List all collaborators and their access permissions for a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'add_collaborator',
        description: 'Add a new user as a collaborator on a story with specified permission type',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            user_id: { type: 'string', description: 'The user ID to add as collaborator' },
            permission_type: { type: 'string', description: 'Permission level to grant (e.g. viewer, editor, owner)' },
            email: { type: 'string', description: 'Email address of the user to invite' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'get_collaborator',
        description: 'Get access permissions for a specific collaborator on a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            collaborator_user_id: { type: 'string', description: 'The user ID of the collaborator' },
          },
          required: ['story_id', 'collaborator_user_id'],
        },
      },
      {
        name: 'update_collaborator',
        description: 'Edit access rights for an existing story collaborator',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            collaborator_user_id: { type: 'string', description: 'The user ID of the collaborator to update' },
            permission_type: { type: 'string', description: 'New permission level to assign' },
          },
          required: ['story_id', 'collaborator_user_id', 'permission_type'],
        },
      },
      {
        name: 'remove_collaborator',
        description: 'Remove a user from a story collaborator list',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            collaborator_user_id: { type: 'string', description: 'The user ID of the collaborator to remove' },
          },
          required: ['story_id', 'collaborator_user_id'],
        },
      },
      {
        name: 'check_collaborator_permission',
        description: 'Check whether a specific user is authorized for a given permission type on a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            collaborator_user_id: { type: 'string', description: 'The user ID to check' },
            permission_type: { type: 'string', description: 'The permission type to check authorization for' },
          },
          required: ['story_id', 'collaborator_user_id', 'permission_type'],
        },
      },
      // -- Sessions ---------------------------------------------------------
      {
        name: 'list_sessions',
        description: 'List all sessions for a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'create_session',
        description: 'Create a new rendering session for a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'get_session',
        description: 'Get details of a specific story session by session ID',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The session ID' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'delete_session',
        description: 'Delete a story session by session ID',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The session ID to delete' },
          },
          required: ['session_id'],
        },
      },
      // -- Views ------------------------------------------------------------
      {
        name: 'list_session_views',
        description: 'List all views recorded for a specific session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The session ID' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'create_session_view',
        description: 'Record a new view event for a session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The session ID' },
            view_data: { type: 'object', description: 'View data payload to record' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'get_view',
        description: 'Get a specific view record by view ID',
        inputSchema: {
          type: 'object',
          properties: {
            view_id: { type: 'string', description: 'The view ID' },
          },
          required: ['view_id'],
        },
      },
      {
        name: 'delete_view',
        description: 'Delete a view record by view ID',
        inputSchema: {
          type: 'object',
          properties: {
            view_id: { type: 'string', description: 'The view ID to delete' },
          },
          required: ['view_id'],
        },
      },
      // -- Events -----------------------------------------------------------
      {
        name: 'list_events',
        description: 'List events recorded for a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'post_events',
        description: 'Post or manage events for a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            event_data: { type: 'object', description: 'Event data payload' },
          },
          required: ['story_id'],
        },
      },
      // -- Messages ---------------------------------------------------------
      {
        name: 'list_messages',
        description: 'List conversation messages for a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a new conversation message on a story',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
            content: { type: 'string', description: 'Message content to send' },
          },
          required: ['story_id', 'content'],
        },
      },
      // -- Presentation -----------------------------------------------------
      {
        name: 'get_story_reveal',
        description: 'Get the story rendered as a Reveal.js presentation document',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'get_story_public',
        description: 'Get the public link to a story Reveal.js presentation',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: { type: 'string', description: 'The story ID' },
          },
          required: ['story_id'],
        },
      },
      // -- Permissions ------------------------------------------------------
      {
        name: 'get_permission_types',
        description: 'List all available permission types for story access control',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // -- Cache ------------------------------------------------------------
      {
        name: 'cache_subdocument',
        description: 'Cache an HTML subdocument for retrieval by the browser via a nonce token (expires after 1 minute)',
        inputSchema: {
          type: 'object',
          properties: {
            document_data: { type: 'object', description: 'Parameters identifying the subdocument to cache' },
          },
          required: ['document_data'],
        },
      },
      {
        name: 'get_cached_subdocument',
        description: 'Retrieve a cached HTML subdocument by its nonce token',
        inputSchema: {
          type: 'object',
          properties: {
            nonce: { type: 'string', description: 'The nonce token identifying the cached subdocument' },
          },
          required: ['nonce'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_stories':                   return await this.listStories(args);
        case 'create_story':                   return await this.createStory(args);
        case 'get_story':                      return await this.getStory(args);
        case 'update_story':                   return await this.updateStory(args);
        case 'delete_story':                   return await this.deleteStory(args);
        case 'get_story_outline':              return await this.getStoryOutline(args);
        case 'post_story_outline':             return await this.postStoryOutline(args);
        case 'get_story_status':               return await this.getStoryStatus(args);
        case 'get_story_analytics':            return await this.getStoryAnalytics(args);
        case 'list_collaborators':             return await this.listCollaborators(args);
        case 'add_collaborator':               return await this.addCollaborator(args);
        case 'get_collaborator':               return await this.getCollaborator(args);
        case 'update_collaborator':            return await this.updateCollaborator(args);
        case 'remove_collaborator':            return await this.removeCollaborator(args);
        case 'check_collaborator_permission':  return await this.checkCollaboratorPermission(args);
        case 'list_sessions':                  return await this.listSessions(args);
        case 'create_session':                 return await this.createSession(args);
        case 'get_session':                    return await this.getSession(args);
        case 'delete_session':                 return await this.deleteSession(args);
        case 'list_session_views':             return await this.listSessionViews(args);
        case 'create_session_view':            return await this.createSessionView(args);
        case 'get_view':                       return await this.getView(args);
        case 'delete_view':                    return await this.deleteView(args);
        case 'list_events':                    return await this.listEvents(args);
        case 'post_events':                    return await this.postEvents(args);
        case 'list_messages':                  return await this.listMessages(args);
        case 'send_message':                   return await this.sendMessage(args);
        case 'get_story_reveal':               return await this.getStoryReveal(args);
        case 'get_story_public':               return await this.getStoryPublic(args);
        case 'get_permission_types':           return await this.getPermissionTypes();
        case 'cache_subdocument':              return await this.cacheSubdocument(args);
        case 'get_cached_subdocument':         return await this.getCachedSubdocument(args);
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

  // -- Private helpers ------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const mergedHeaders = { ...this.buildHeaders(), ...(options.headers as Record<string, string> | undefined) };
    const response = await this.fetchWithRetry(url, { ...options, headers: mergedHeaders });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Presalytics Story API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
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
      const text = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: text || `Success (HTTP ${response.status})` }], isError: false };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // -- Stories --------------------------------------------------------------

  private async listStories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include_relationships !== undefined) params.set('include_relationships', String(args.include_relationships));
    if (args.include_outline !== undefined) params.set('include_outline', String(args.include_outline));
    const qs = params.toString();
    return this.request(this.url(`/${qs ? '?' + qs : ''}`));
  }

  private async createStory(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include_outline !== undefined) params.set('include_outline', String(args.include_outline));
    const qs = params.toString();
    return this.request(
      this.url(`/${qs ? '?' + qs : ''}`),
      { method: 'POST', body: JSON.stringify(args.outline) },
    );
  }

  private async getStory(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include_relationships !== undefined) params.set('include_relationships', String(args.include_relationships));
    if (args.include_outline !== undefined) params.set('include_outline', String(args.include_outline));
    const qs = params.toString();
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}${qs ? '?' + qs : ''}`));
  }

  private async updateStory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}`),
      { method: 'PUT', body: JSON.stringify(args.outline) },
    );
  }

  private async deleteStory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}`),
      { method: 'DELETE' },
    );
  }

  // -- Outline --------------------------------------------------------------

  private async getStoryOutline(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/outline`));
  }

  private async postStoryOutline(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/outline`),
      { method: 'POST', body: JSON.stringify(args.outline) },
    );
  }

  // -- Status & Analytics ---------------------------------------------------

  private async getStoryStatus(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/status`));
  }

  private async getStoryAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/analytics`));
  }

  // -- Collaborators --------------------------------------------------------

  private async listCollaborators(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/collaborators`));
  }

  private async addCollaborator(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.user_id) body.user_id = args.user_id;
    if (args.permission_type) body.permission_type = args.permission_type;
    if (args.email) body.email = args.email;
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/collaborators`),
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async getCollaborator(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/collaborators/${encodeURIComponent(args.collaborator_user_id as string)}`),
    );
  }

  private async updateCollaborator(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/collaborators/${encodeURIComponent(args.collaborator_user_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ permission_type: args.permission_type }) },
    );
  }

  private async removeCollaborator(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/collaborators/${encodeURIComponent(args.collaborator_user_id as string)}`),
      { method: 'DELETE' },
    );
  }

  private async checkCollaboratorPermission(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/collaborators/authorize/${encodeURIComponent(args.collaborator_user_id as string)}/${encodeURIComponent(args.permission_type as string)}`),
    );
  }

  // -- Sessions -------------------------------------------------------------

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/sessions`));
  }

  private async createSession(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/sessions`),
      { method: 'POST', body: JSON.stringify({}) },
    );
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/sessions/${encodeURIComponent(args.session_id as string)}`));
  }

  private async deleteSession(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/sessions/${encodeURIComponent(args.session_id as string)}`),
      { method: 'DELETE' },
    );
  }

  // -- Views ----------------------------------------------------------------

  private async listSessionViews(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/sessions/${encodeURIComponent(args.session_id as string)}/views`));
  }

  private async createSessionView(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/sessions/${encodeURIComponent(args.session_id as string)}/views`),
      { method: 'POST', body: JSON.stringify(args.view_data || {}) },
    );
  }

  private async getView(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/views/${encodeURIComponent(args.view_id as string)}`));
  }

  private async deleteView(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/views/${encodeURIComponent(args.view_id as string)}`),
      { method: 'DELETE' },
    );
  }

  // -- Events ---------------------------------------------------------------

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/events`));
  }

  private async postEvents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/events`),
      { method: 'POST', body: JSON.stringify(args.event_data || {}) },
    );
  }

  // -- Messages -------------------------------------------------------------

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/messages`));
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/${encodeURIComponent(args.story_id as string)}/messages`),
      { method: 'POST', body: JSON.stringify({ content: args.content }) },
    );
  }

  // -- Presentation ---------------------------------------------------------

  private async getStoryReveal(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/reveal`));
  }

  private async getStoryPublic(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/${encodeURIComponent(args.story_id as string)}/public/`));
  }

  // -- Permissions ----------------------------------------------------------

  private async getPermissionTypes(): Promise<ToolResult> {
    return this.request(this.url('/permission_types'));
  }

  // -- Cache ----------------------------------------------------------------

  private async cacheSubdocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url('/cache'),
      { method: 'POST', body: JSON.stringify(args.document_data) },
    );
  }

  private async getCachedSubdocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/cache/${encodeURIComponent(args.nonce as string)}`),
      { headers: { Authorization: `Bearer ${this.accessToken}`, Accept: 'text/html' } },
    );
  }
}
