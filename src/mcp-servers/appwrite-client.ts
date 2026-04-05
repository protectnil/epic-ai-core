/**
 * Appwrite Client API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Appwrite Client MCP server was found on GitHub. We build a full REST wrapper
// for complete Client API coverage.
//
// Base URL: https://appwrite.io/v1
// Auth: Project ID (X-Appwrite-Project header) + JWT (X-Appwrite-JWT header) for authenticated requests
// Docs: https://appwrite.io/docs
// Spec: https://api.apis.guru/v2/specs/appwrite.io/client/0.9.3/openapi.json
// Category: cloud
// Rate limits: See Appwrite docs — varies by endpoint and plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppwriteClientConfig {
  projectId: string;
  jwt?: string;
  locale?: string;
  baseUrl?: string;
}

export class AppwriteClientMCPServer extends MCPAdapterBase {
  private readonly projectId: string;
  private readonly jwt: string | undefined;
  private readonly locale: string | undefined;
  private readonly baseUrl: string;

  constructor(config: AppwriteClientConfig) {
    super();
    this.projectId = config.projectId;
    this.jwt = config.jwt;
    this.locale = config.locale;
    this.baseUrl = config.baseUrl || 'https://appwrite.io/v1';
  }

  static catalog() {
    return {
      name: 'appwrite-client',
      displayName: 'Appwrite Client',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'appwrite', 'baas', 'backend as a service', 'database', 'storage',
        'authentication', 'account', 'session', 'oauth2', 'teams', 'membership',
        'functions', 'execution', 'files', 'avatar', 'locale', 'realtime',
        'open source', 'self-hosted', 'document', 'collection',
      ],
      toolNames: [
        // Account
        'get_account', 'create_account', 'delete_account',
        'update_account_email', 'update_account_name', 'update_account_password', 'update_account_prefs',
        'create_jwt',
        'get_account_logs', 'get_account_sessions',
        'create_session', 'delete_session', 'get_session', 'delete_all_sessions',
        'create_anonymous_session', 'create_oauth2_session',
        'create_email_verification', 'complete_email_verification',
        'create_password_recovery', 'complete_password_recovery',
        // Database
        'list_documents', 'get_document', 'create_document', 'update_document', 'delete_document',
        // Storage
        'list_files', 'get_file', 'create_file', 'update_file', 'delete_file',
        'get_file_download', 'get_file_preview', 'get_file_view',
        // Teams
        'list_teams', 'get_team', 'create_team', 'update_team', 'delete_team',
        'get_team_memberships', 'create_team_membership', 'update_membership_roles', 'delete_team_membership',
        // Functions
        'list_executions', 'get_execution', 'create_execution',
        // Avatars
        'get_browser_icon', 'get_credit_card_icon', 'get_favicon',
        'get_flag', 'get_image', 'get_initials', 'get_qr_code',
        // Locale
        'get_locale', 'list_continents', 'list_countries', 'list_eu_countries',
        'list_country_phone_codes', 'list_currencies', 'list_languages',
      ],
      description: 'Appwrite Client API: manage user accounts, sessions, OAuth2, database documents, file storage, team memberships, serverless function executions, avatars, and locale data for Appwrite-powered apps.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Account ────────────────────────────────────────────────────────────
      {
        name: 'get_account',
        description: 'Get the currently authenticated user account details including email, name, status, and preferences',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_account',
        description: 'Create a new Appwrite user account with email, password, and optional display name',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email address' },
            password: { type: 'string', description: 'User password (6-32 characters)' },
            name: { type: 'string', description: 'Display name for the user (max 128 chars)' },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'delete_account',
        description: 'Permanently delete the currently authenticated user account and all associated data',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_account_email',
        description: "Update the currently authenticated user's email address — requires current password for confirmation",
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'New email address' },
            password: { type: 'string', description: 'Current account password for confirmation' },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'update_account_name',
        description: "Update the currently authenticated user's display name",
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'New display name (max 128 chars)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_account_password',
        description: "Update the currently authenticated user's password — requires current password; new password must be 6-32 chars",
        inputSchema: {
          type: 'object',
          properties: {
            password: { type: 'string', description: 'New password (6-32 characters)' },
            oldPassword: { type: 'string', description: 'Current password for confirmation' },
          },
          required: ['password'],
        },
      },
      {
        name: 'update_account_prefs',
        description: "Update the currently authenticated user's preferences as a key-value JSON object",
        inputSchema: {
          type: 'object',
          properties: {
            prefs: {
              type: 'object',
              description: 'Key-value preferences object (any JSON-serializable values)',
            },
          },
          required: ['prefs'],
        },
      },
      {
        name: 'create_jwt',
        description: 'Create a JSON Web Token for the currently authenticated user session — can be used to authenticate subsequent requests via the X-Appwrite-JWT header',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_account_logs',
        description: 'Get activity logs for the currently authenticated user account — returns recent sign-ins, password changes, and other account events',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_account_sessions',
        description: 'List all active sessions for the currently authenticated user account, including device info and location',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_session',
        description: 'Create a new user session by signing in with email and password — returns a session object with token details',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email address' },
            password: { type: 'string', description: 'User password (6-32 characters)' },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'delete_session',
        description: 'Delete a specific user session by session ID — logs out the user on that device',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session ID to delete. Use "current" to delete the active session.',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'get_session',
        description: 'Get details for a specific user session by session ID including creation time, device, and IP',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID to retrieve' },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'delete_all_sessions',
        description: 'Delete all active sessions for the currently authenticated user — logs out from all devices',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_anonymous_session',
        description: 'Create an anonymous guest session — allows using the app without signing up; session can be converted to a full account later',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_oauth2_session',
        description: 'Initiate an OAuth2 sign-in flow for a given provider — returns a redirect URL to the provider authorization page',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              description: 'OAuth2 provider name (e.g. google, github, facebook, twitter, apple)',
            },
            success: {
              type: 'string',
              description: 'URL to redirect to after successful OAuth2 sign-in',
            },
            failure: {
              type: 'string',
              description: 'URL to redirect to if OAuth2 sign-in fails',
            },
            scopes: {
              type: 'array',
              description: 'Additional OAuth2 scopes to request from the provider',
              items: { type: 'string' },
            },
          },
          required: ['provider'],
        },
      },
      {
        name: 'create_email_verification',
        description: 'Send an email verification message to the currently authenticated user — provide a URL to redirect to after verification',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Redirect URL appended with userId and secret query params after the user clicks the verification link',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'complete_email_verification',
        description: "Complete the email verification flow using the userId and secret from the verification link — marks the user's email as verified",
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User unique ID from the verification link' },
            secret: { type: 'string', description: 'Verification secret token from the verification link' },
          },
          required: ['userId', 'secret'],
        },
      },
      {
        name: 'create_password_recovery',
        description: "Initiate a password recovery flow for the given email address — sends a recovery link to the user's email",
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address of the account to recover' },
            url: {
              type: 'string',
              description: 'Redirect URL appended with userId and secret after the user clicks the recovery link',
            },
          },
          required: ['email', 'url'],
        },
      },
      {
        name: 'complete_password_recovery',
        description: 'Complete the password recovery flow using the userId and secret from the recovery link — sets a new password for the account',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User unique ID from the recovery link' },
            secret: { type: 'string', description: 'Valid reset token from the recovery link' },
            password: { type: 'string', description: 'New password (6-32 characters)' },
            passwordAgain: { type: 'string', description: 'New password repeated for confirmation' },
          },
          required: ['userId', 'secret', 'password', 'passwordAgain'],
        },
      },
      // ── Database ───────────────────────────────────────────────────────────
      {
        name: 'list_documents',
        description: 'List documents in an Appwrite collection with optional filters, sorting, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID to list documents from' },
            filters: {
              type: 'array',
              description: 'Array of filter strings (e.g. ["field=value", "age>18"])',
              items: { type: 'string' },
            },
            limit: { type: 'integer', description: 'Maximum number of documents to return (default: 25)' },
            offset: { type: 'integer', description: 'Number of documents to skip for pagination' },
            orderField: { type: 'string', description: 'Field name to order results by' },
            orderType: { type: 'string', description: 'Sort direction: ASC or DESC' },
            orderCast: { type: 'string', description: 'Cast type for ordering: int, string, date, time, or datetime' },
            search: { type: 'string', description: 'Full-text search query string' },
          },
          required: ['collectionId'],
        },
      },
      {
        name: 'get_document',
        description: 'Get a single document by ID from an Appwrite collection',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID containing the document' },
            documentId: { type: 'string', description: 'Document ID to retrieve' },
          },
          required: ['collectionId', 'documentId'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new document in an Appwrite collection with the provided data and optional read/write permissions',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID to create the document in' },
            data: { type: 'object', description: 'Document data as a JSON object' },
            read: {
              type: 'array',
              description: 'Array of read permission strings (e.g. ["user:userId", "role:all"]). Defaults to current user only.',
              items: { type: 'string' },
            },
            write: {
              type: 'array',
              description: 'Array of write permission strings. Defaults to current user only.',
              items: { type: 'string' },
            },
            parentDocument: { type: 'string', description: 'Parent document unique ID for nested documents' },
            parentProperty: { type: 'string', description: 'Parent document property name for the nested relationship' },
            parentPropertyType: {
              type: 'string',
              description: 'Parent document property connection type: assign, prepend, or append',
            },
          },
          required: ['collectionId', 'data'],
        },
      },
      {
        name: 'update_document',
        description: 'Update an existing document in an Appwrite collection — replaces specified fields and optionally updates read/write permissions',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID containing the document' },
            documentId: { type: 'string', description: 'Document ID to update' },
            data: { type: 'object', description: 'Updated document data as a JSON object' },
            read: {
              type: 'array',
              description: 'Updated read permission strings. Inherits existing permissions if omitted.',
              items: { type: 'string' },
            },
            write: {
              type: 'array',
              description: 'Updated write permission strings. Inherits existing permissions if omitted.',
              items: { type: 'string' },
            },
          },
          required: ['collectionId', 'documentId', 'data'],
        },
      },
      {
        name: 'delete_document',
        description: 'Permanently delete a document from an Appwrite collection by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID containing the document' },
            documentId: { type: 'string', description: 'Document ID to delete' },
          },
          required: ['collectionId', 'documentId'],
        },
      },
      // ── Storage ────────────────────────────────────────────────────────────
      {
        name: 'list_files',
        description: 'List files in Appwrite storage with optional search, pagination, and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search string to filter files by name' },
            limit: { type: 'integer', description: 'Maximum number of files to return (default: 25)' },
            offset: { type: 'integer', description: 'Number of files to skip for pagination' },
            orderType: { type: 'string', description: 'Sort direction: ASC or DESC' },
          },
        },
      },
      {
        name: 'get_file',
        description: 'Get file metadata by file ID — returns name, size, MIME type, permissions, and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID to retrieve metadata for' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'create_file',
        description: 'Upload a new file to Appwrite storage with optional read/write permissions — file content must be provided as base64-encoded binary',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Base64-encoded binary file content' },
            read: {
              type: 'array',
              description: 'Array of read permission strings. Defaults to current user only.',
              items: { type: 'string' },
            },
            write: {
              type: 'array',
              description: 'Array of write permission strings. Defaults to current user only.',
              items: { type: 'string' },
            },
          },
          required: ['file'],
        },
      },
      {
        name: 'update_file',
        description: 'Update read and write permissions for an existing file in Appwrite storage',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID to update permissions for' },
            read: {
              type: 'array',
              description: 'New read permission strings — no user is granted access if omitted',
              items: { type: 'string' },
            },
            write: {
              type: 'array',
              description: 'New write permission strings — no user is granted access if omitted',
              items: { type: 'string' },
            },
          },
          required: ['fileId', 'read', 'write'],
        },
      },
      {
        name: 'delete_file',
        description: 'Permanently delete a file from Appwrite storage by file ID',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID to delete' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'get_file_download',
        description: 'Get a direct download URL for a file in Appwrite storage — the URL forces a browser download',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID to get the download URL for' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'get_file_preview',
        description: 'Get a URL for a preview/thumbnail of an image file in Appwrite storage — supports resize, crop, quality, border, rotation, background, and output format options',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID to preview' },
            width: { type: 'integer', description: 'Preview width in pixels' },
            height: { type: 'integer', description: 'Preview height in pixels' },
            gravity: { type: 'string', description: 'Image crop gravity (e.g. center, top, bottom)' },
            quality: { type: 'integer', description: 'Image quality 0-100 (for JPEG/WebP output)' },
            borderWidth: { type: 'integer', description: 'Border width in pixels' },
            borderColor: { type: 'string', description: 'Border color as hex (e.g. ff0000)' },
            borderRadius: { type: 'integer', description: 'Border radius in pixels' },
            opacity: { type: 'number', description: 'Image opacity 0-1' },
            rotation: { type: 'integer', description: 'Image rotation in degrees (0, 90, 180, 270)' },
            background: { type: 'string', description: 'Background color as hex for transparent areas' },
            output: { type: 'string', description: 'Output format: jpg, jpeg, png, gif, or webp' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'get_file_view',
        description: 'Get a URL to view a file inline in the browser (without forcing a download) — suitable for images and PDFs',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID to view' },
          },
          required: ['fileId'],
        },
      },
      // ── Teams ──────────────────────────────────────────────────────────────
      {
        name: 'list_teams',
        description: 'List all teams the currently authenticated user belongs to, with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search string to filter teams by name' },
            limit: { type: 'integer', description: 'Maximum number of teams to return (default: 25)' },
            offset: { type: 'integer', description: 'Number of teams to skip for pagination' },
            orderType: { type: 'string', description: 'Sort direction: ASC or DESC' },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get details for a specific team by team ID — returns name, member count, and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID to retrieve' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'create_team',
        description: 'Create a new team with the given name — the current user is automatically added as owner with all roles',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Team name (max 128 chars)' },
            roles: {
              type: 'array',
              description: 'Array of role strings to assign to the team creator (default: ["owner"])',
              items: { type: 'string' },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_team',
        description: 'Update the name of an existing team by team ID',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID to update' },
            name: { type: 'string', description: 'New team name (max 128 chars)' },
          },
          required: ['teamId', 'name'],
        },
      },
      {
        name: 'delete_team',
        description: 'Permanently delete a team by team ID — all memberships are also deleted',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID to delete' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'get_team_memberships',
        description: 'List all memberships for a team with member details, roles, and invitation status',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID to list memberships for' },
            search: { type: 'string', description: 'Search string to filter memberships by name or email' },
            limit: { type: 'integer', description: 'Maximum number of memberships to return (default: 25)' },
            offset: { type: 'integer', description: 'Number of memberships to skip for pagination' },
            orderType: { type: 'string', description: 'Sort direction: ASC or DESC' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'create_team_membership',
        description: 'Invite a user to a team by email — sends an invitation email with a link to join and assigns the specified roles',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID to invite the user to' },
            email: { type: 'string', description: 'Email address of the user to invite' },
            roles: {
              type: 'array',
              description: 'Array of roles to assign to the new member (e.g. ["admin","editor"])',
              items: { type: 'string' },
            },
            url: {
              type: 'string',
              description: 'Redirect URL in the invitation email — user is redirected here after accepting',
            },
            name: { type: 'string', description: 'Display name of the invited user (optional, max 128 chars)' },
          },
          required: ['teamId', 'email', 'roles', 'url'],
        },
      },
      {
        name: 'update_membership_roles',
        description: "Update the roles assigned to a team member by membership ID",
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID containing the membership' },
            membershipId: { type: 'string', description: 'Membership ID to update roles for' },
            roles: {
              type: 'array',
              description: 'New array of role strings for the member (replaces existing roles)',
              items: { type: 'string' },
            },
          },
          required: ['teamId', 'membershipId', 'roles'],
        },
      },
      {
        name: 'delete_team_membership',
        description: 'Remove a member from a team by membership ID — the user loses access to team resources',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID containing the membership' },
            membershipId: { type: 'string', description: 'Membership ID to delete' },
          },
          required: ['teamId', 'membershipId'],
        },
      },
      // ── Functions ──────────────────────────────────────────────────────────
      {
        name: 'list_executions',
        description: 'List execution logs for an Appwrite Cloud Function with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            functionId: { type: 'string', description: 'Function ID to list executions for' },
            search: { type: 'string', description: 'Search string to filter executions' },
            limit: { type: 'integer', description: 'Maximum number of executions to return (default: 25)' },
            offset: { type: 'integer', description: 'Number of executions to skip for pagination' },
            orderType: { type: 'string', description: 'Sort direction: ASC or DESC' },
          },
          required: ['functionId'],
        },
      },
      {
        name: 'get_execution',
        description: 'Get details for a specific function execution by execution ID — returns status, output, error, and timing',
        inputSchema: {
          type: 'object',
          properties: {
            functionId: { type: 'string', description: 'Function ID that owns the execution' },
            executionId: { type: 'string', description: 'Execution ID to retrieve' },
          },
          required: ['functionId', 'executionId'],
        },
      },
      {
        name: 'create_execution',
        description: 'Trigger an Appwrite Cloud Function execution with optional custom data payload',
        inputSchema: {
          type: 'object',
          properties: {
            functionId: { type: 'string', description: 'Function ID to execute' },
            data: { type: 'string', description: 'Custom string data to pass to the function (max 8192 chars)' },
          },
          required: ['functionId'],
        },
      },
      // ── Avatars ────────────────────────────────────────────────────────────
      {
        name: 'get_browser_icon',
        description: 'Get a URL for a browser icon image by browser code — returns a PNG/WebP icon at the requested dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Browser code (e.g. chrome, firefox, safari, edge)' },
            width: { type: 'integer', description: 'Icon width in pixels (default: 100)' },
            height: { type: 'integer', description: 'Icon height in pixels (default: 100)' },
            quality: { type: 'integer', description: 'Image quality 0-100' },
          },
          required: ['code'],
        },
      },
      {
        name: 'get_credit_card_icon',
        description: 'Get a URL for a credit card brand icon by card code — returns a PNG/WebP image at the requested dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Credit card code (e.g. visa, mastercard, amex, discover)' },
            width: { type: 'integer', description: 'Icon width in pixels (default: 100)' },
            height: { type: 'integer', description: 'Icon height in pixels (default: 100)' },
            quality: { type: 'integer', description: 'Image quality 0-100' },
          },
          required: ['code'],
        },
      },
      {
        name: 'get_favicon',
        description: 'Fetch and return the favicon for any website URL as an image — useful for showing site icons',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Website URL to fetch the favicon for (e.g. https://example.com)' },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_flag',
        description: 'Get a URL for a country flag image by ISO 3166-1 country code at the requested dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. US, GB, DE)' },
            width: { type: 'integer', description: 'Flag width in pixels (default: 100)' },
            height: { type: 'integer', description: 'Flag height in pixels (default: 100)' },
            quality: { type: 'integer', description: 'Image quality 0-100' },
          },
          required: ['code'],
        },
      },
      {
        name: 'get_image',
        description: 'Fetch and resize a remote image by URL — useful for safely proxying external images at controlled dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Remote image URL to fetch and resize' },
            width: { type: 'integer', description: 'Output width in pixels (default: 400)' },
            height: { type: 'integer', description: 'Output height in pixels (default: 400)' },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_initials',
        description: 'Generate an avatar image from a name by rendering the initials — supports custom dimensions, text color, and background color',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name to extract initials from (e.g. "John Doe")' },
            width: { type: 'integer', description: 'Avatar width in pixels (default: 500)' },
            height: { type: 'integer', description: 'Avatar height in pixels (default: 500)' },
            color: { type: 'string', description: 'Text color as hex (e.g. ffffff)' },
            background: { type: 'string', description: 'Background color as hex (e.g. 000000)' },
          },
        },
      },
      {
        name: 'get_qr_code',
        description: 'Generate a QR code image for any text or URL — supports custom size, margin, and optional download mode',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text or URL to encode in the QR code' },
            size: { type: 'integer', description: 'QR code size in pixels (default: 400, max: 1000)' },
            margin: { type: 'integer', description: 'QR code margin (quiet zone) in pixels (default: 1)' },
            download: {
              type: 'boolean',
              description: 'Whether the response should force a file download (default: false)',
            },
          },
          required: ['text'],
        },
      },
      // ── Locale ─────────────────────────────────────────────────────────────
      {
        name: 'get_locale',
        description: 'Get the current user locale based on their IP address — returns country, country code, continent, and currency',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_continents',
        description: 'List all continents with their names and two-letter codes',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_countries',
        description: 'List all countries with their names and ISO 3166-1 alpha-2 codes',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_eu_countries',
        description: 'List all European Union member countries with their names and ISO 3166-1 alpha-2 codes',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_country_phone_codes',
        description: 'List all countries with their international phone dial codes',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_currencies',
        description: 'List all world currencies with their names, symbols, and ISO 4217 currency codes',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_languages',
        description: 'List all languages with their names and ISO 639-1 language codes',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // Account
        case 'get_account':                return this.getAccount();
        case 'create_account':             return this.createAccount(args);
        case 'delete_account':             return this.deleteAccount();
        case 'update_account_email':       return this.updateAccountEmail(args);
        case 'update_account_name':        return this.updateAccountName(args);
        case 'update_account_password':    return this.updateAccountPassword(args);
        case 'update_account_prefs':       return this.updateAccountPrefs(args);
        case 'create_jwt':                 return this.createJWT();
        case 'get_account_logs':           return this.getAccountLogs();
        case 'get_account_sessions':       return this.getAccountSessions();
        case 'create_session':             return this.createSession(args);
        case 'delete_session':             return this.deleteSession(args);
        case 'get_session':                return this.getSession(args);
        case 'delete_all_sessions':        return this.deleteAllSessions();
        case 'create_anonymous_session':   return this.createAnonymousSession();
        case 'create_oauth2_session':      return this.createOAuth2Session(args);
        case 'create_email_verification':  return this.createEmailVerification(args);
        case 'complete_email_verification':return this.completeEmailVerification(args);
        case 'create_password_recovery':   return this.createPasswordRecovery(args);
        case 'complete_password_recovery': return this.completePasswordRecovery(args);
        // Database
        case 'list_documents':   return this.listDocuments(args);
        case 'get_document':     return this.getDocument(args);
        case 'create_document':  return this.createDocument(args);
        case 'update_document':  return this.updateDocument(args);
        case 'delete_document':  return this.deleteDocument(args);
        // Storage
        case 'list_files':          return this.listFiles(args);
        case 'get_file':            return this.getFile(args);
        case 'create_file':         return this.createFile(args);
        case 'update_file':         return this.updateFile(args);
        case 'delete_file':         return this.deleteFile(args);
        case 'get_file_download':   return this.getFileDownload(args);
        case 'get_file_preview':    return this.getFilePreview(args);
        case 'get_file_view':       return this.getFileView(args);
        // Teams
        case 'list_teams':              return this.listTeams(args);
        case 'get_team':                return this.getTeam(args);
        case 'create_team':             return this.createTeam(args);
        case 'update_team':             return this.updateTeam(args);
        case 'delete_team':             return this.deleteTeam(args);
        case 'get_team_memberships':    return this.getTeamMemberships(args);
        case 'create_team_membership':  return this.createTeamMembership(args);
        case 'update_membership_roles': return this.updateMembershipRoles(args);
        case 'delete_team_membership':  return this.deleteTeamMembership(args);
        // Functions
        case 'list_executions':  return this.listExecutions(args);
        case 'get_execution':    return this.getExecution(args);
        case 'create_execution': return this.createExecution(args);
        // Avatars
        case 'get_browser_icon':    return this.getBrowserIcon(args);
        case 'get_credit_card_icon':return this.getCreditCardIcon(args);
        case 'get_favicon':         return this.getFavicon(args);
        case 'get_flag':            return this.getFlag(args);
        case 'get_image':           return this.getImage(args);
        case 'get_initials':        return this.getInitials(args);
        case 'get_qr_code':         return this.getQRCode(args);
        // Locale
        case 'get_locale':              return this.getLocale();
        case 'list_continents':         return this.listContinents();
        case 'list_countries':          return this.listCountries();
        case 'list_eu_countries':       return this.listEUCountries();
        case 'list_country_phone_codes':return this.listCountryPhoneCodes();
        case 'list_currencies':         return this.listCurrencies();
        case 'list_languages':          return this.listLanguages();
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

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'X-Appwrite-Project': this.projectId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.jwt) h['X-Appwrite-JWT'] = this.jwt;
    if (this.locale) h['X-Appwrite-Locale'] = this.locale;
    return h;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, unknown>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) params.append(`${k}[]`, String(item));
        } else {
          params.append(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    const init: RequestInit = { method, headers: this.headers };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    // Some avatar/storage endpoints return binary — return URL hint instead
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return { content: [{ type: 'text', text: `{"url":"${url}","contentType":"${ct}"}` }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Account ────────────────────────────────────────────────────────────────

  private async getAccount(): Promise<ToolResult> {
    return this.request('GET', '/account');
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password) {
      return { content: [{ type: 'text', text: 'email and password are required' }], isError: true };
    }
    const { email, password, name } = args;
    const body: Record<string, unknown> = { email, password };
    if (name) body.name = name;
    return this.request('POST', '/account', body);
  }

  private async deleteAccount(): Promise<ToolResult> {
    return this.request('DELETE', '/account');
  }

  private async updateAccountEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password) {
      return { content: [{ type: 'text', text: 'email and password are required' }], isError: true };
    }
    return this.request('PATCH', '/account/email', { email: args.email, password: args.password });
  }

  private async updateAccountName(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('PATCH', '/account/name', { name: args.name });
  }

  private async updateAccountPassword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.password) {
      return { content: [{ type: 'text', text: 'password is required' }], isError: true };
    }
    const body: Record<string, unknown> = { password: args.password };
    if (args.oldPassword) body.oldPassword = args.oldPassword;
    return this.request('PATCH', '/account/password', body);
  }

  private async updateAccountPrefs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.prefs) {
      return { content: [{ type: 'text', text: 'prefs is required' }], isError: true };
    }
    return this.request('PATCH', '/account/prefs', { prefs: args.prefs });
  }

  private async createJWT(): Promise<ToolResult> {
    return this.request('POST', '/account/jwt');
  }

  private async getAccountLogs(): Promise<ToolResult> {
    return this.request('GET', '/account/logs');
  }

  private async getAccountSessions(): Promise<ToolResult> {
    return this.request('GET', '/account/sessions');
  }

  private async createSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password) {
      return { content: [{ type: 'text', text: 'email and password are required' }], isError: true };
    }
    return this.request('POST', '/account/sessions', { email: args.email, password: args.password });
  }

  private async deleteSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sessionId) {
      return { content: [{ type: 'text', text: 'sessionId is required' }], isError: true };
    }
    return this.request('DELETE', `/account/sessions/${encodeURIComponent(args.sessionId as string)}`);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sessionId) {
      return { content: [{ type: 'text', text: 'sessionId is required' }], isError: true };
    }
    return this.request('GET', `/account/sessions/${encodeURIComponent(args.sessionId as string)}`);
  }

  private async deleteAllSessions(): Promise<ToolResult> {
    return this.request('DELETE', '/account/sessions');
  }

  private async createAnonymousSession(): Promise<ToolResult> {
    return this.request('POST', '/account/sessions/anonymous');
  }

  private async createOAuth2Session(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.provider) {
      return { content: [{ type: 'text', text: 'provider is required' }], isError: true };
    }
    const query: Record<string, unknown> = {};
    if (args.success) query.success = args.success;
    if (args.failure) query.failure = args.failure;
    if (args.scopes) query.scopes = args.scopes;
    return this.request('GET', `/account/sessions/oauth2/${encodeURIComponent(args.provider as string)}`, undefined, query);
  }

  private async createEmailVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) {
      return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    }
    return this.request('POST', '/account/verification', { url: args.url });
  }

  private async completeEmailVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userId || !args.secret) {
      return { content: [{ type: 'text', text: 'userId and secret are required' }], isError: true };
    }
    return this.request('PUT', '/account/verification', { userId: args.userId, secret: args.secret });
  }

  private async createPasswordRecovery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.url) {
      return { content: [{ type: 'text', text: 'email and url are required' }], isError: true };
    }
    return this.request('POST', '/account/recovery', { email: args.email, url: args.url });
  }

  private async completePasswordRecovery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userId || !args.secret || !args.password || !args.passwordAgain) {
      return { content: [{ type: 'text', text: 'userId, secret, password, and passwordAgain are required' }], isError: true };
    }
    return this.request('PUT', '/account/recovery', {
      userId: args.userId,
      secret: args.secret,
      password: args.password,
      passwordAgain: args.passwordAgain,
    });
  }

  // ── Database ───────────────────────────────────────────────────────────────

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collectionId) {
      return { content: [{ type: 'text', text: 'collectionId is required' }], isError: true };
    }
    const { collectionId, ...query } = args;
    return this.request('GET', `/database/collections/${encodeURIComponent(collectionId as string)}/documents`, undefined, query);
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collectionId || !args.documentId) {
      return { content: [{ type: 'text', text: 'collectionId and documentId are required' }], isError: true };
    }
    return this.request('GET', `/database/collections/${encodeURIComponent(args.collectionId as string)}/documents/${encodeURIComponent(args.documentId as string)}`);
  }

  private async createDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collectionId || !args.data) {
      return { content: [{ type: 'text', text: 'collectionId and data are required' }], isError: true };
    }
    const { collectionId, ...body } = args;
    return this.request('POST', `/database/collections/${encodeURIComponent(collectionId as string)}/documents`, body as Record<string, unknown>);
  }

  private async updateDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collectionId || !args.documentId || !args.data) {
      return { content: [{ type: 'text', text: 'collectionId, documentId, and data are required' }], isError: true };
    }
    const { collectionId, documentId, ...body } = args;
    return this.request('PATCH', `/database/collections/${encodeURIComponent(collectionId as string)}/documents/${encodeURIComponent(documentId as string)}`, body as Record<string, unknown>);
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collectionId || !args.documentId) {
      return { content: [{ type: 'text', text: 'collectionId and documentId are required' }], isError: true };
    }
    return this.request('DELETE', `/database/collections/${encodeURIComponent(args.collectionId as string)}/documents/${encodeURIComponent(args.documentId as string)}`);
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/storage/files', undefined, args);
  }

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) {
      return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    }
    return this.request('GET', `/storage/files/${encodeURIComponent(args.fileId as string)}`);
  }

  private async createFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file) {
      return { content: [{ type: 'text', text: 'file is required' }], isError: true };
    }
    return this.request('POST', '/storage/files', args);
  }

  private async updateFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId || !args.read || !args.write) {
      return { content: [{ type: 'text', text: 'fileId, read, and write are required' }], isError: true };
    }
    const { fileId, ...body } = args;
    return this.request('PUT', `/storage/files/${encodeURIComponent(fileId as string)}`, body as Record<string, unknown>);
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) {
      return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    }
    return this.request('DELETE', `/storage/files/${encodeURIComponent(args.fileId as string)}`);
  }

  private async getFileDownload(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) {
      return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    }
    return this.request('GET', `/storage/files/${encodeURIComponent(args.fileId as string)}/download`);
  }

  private async getFilePreview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) {
      return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    }
    const { fileId, ...query } = args;
    return this.request('GET', `/storage/files/${encodeURIComponent(fileId as string)}/preview`, undefined, query);
  }

  private async getFileView(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) {
      return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    }
    return this.request('GET', `/storage/files/${encodeURIComponent(args.fileId as string)}/view`);
  }

  // ── Teams ──────────────────────────────────────────────────────────────────

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/teams', undefined, args);
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId) {
      return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };
    }
    return this.request('GET', `/teams/${encodeURIComponent(args.teamId as string)}`);
  }

  private async createTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('POST', '/teams', args);
  }

  private async updateTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId || !args.name) {
      return { content: [{ type: 'text', text: 'teamId and name are required' }], isError: true };
    }
    const { teamId, ...body } = args;
    return this.request('PUT', `/teams/${encodeURIComponent(teamId as string)}`, body as Record<string, unknown>);
  }

  private async deleteTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId) {
      return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };
    }
    return this.request('DELETE', `/teams/${encodeURIComponent(args.teamId as string)}`);
  }

  private async getTeamMemberships(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId) {
      return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };
    }
    const { teamId, ...query } = args;
    return this.request('GET', `/teams/${encodeURIComponent(teamId as string)}/memberships`, undefined, query);
  }

  private async createTeamMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId || !args.email || !args.roles || !args.url) {
      return { content: [{ type: 'text', text: 'teamId, email, roles, and url are required' }], isError: true };
    }
    const { teamId, ...body } = args;
    return this.request('POST', `/teams/${encodeURIComponent(teamId as string)}/memberships`, body as Record<string, unknown>);
  }

  private async updateMembershipRoles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId || !args.membershipId || !args.roles) {
      return { content: [{ type: 'text', text: 'teamId, membershipId, and roles are required' }], isError: true };
    }
    const { teamId, membershipId, ...body } = args;
    return this.request('PATCH', `/teams/${encodeURIComponent(teamId as string)}/memberships/${encodeURIComponent(membershipId as string)}`, body as Record<string, unknown>);
  }

  private async deleteTeamMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.teamId || !args.membershipId) {
      return { content: [{ type: 'text', text: 'teamId and membershipId are required' }], isError: true };
    }
    return this.request('DELETE', `/teams/${encodeURIComponent(args.teamId as string)}/memberships/${encodeURIComponent(args.membershipId as string)}`);
  }

  // ── Functions ──────────────────────────────────────────────────────────────

  private async listExecutions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.functionId) {
      return { content: [{ type: 'text', text: 'functionId is required' }], isError: true };
    }
    const { functionId, ...query } = args;
    return this.request('GET', `/functions/${encodeURIComponent(functionId as string)}/executions`, undefined, query);
  }

  private async getExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.functionId || !args.executionId) {
      return { content: [{ type: 'text', text: 'functionId and executionId are required' }], isError: true };
    }
    return this.request('GET', `/functions/${encodeURIComponent(args.functionId as string)}/executions/${encodeURIComponent(args.executionId as string)}`);
  }

  private async createExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.functionId) {
      return { content: [{ type: 'text', text: 'functionId is required' }], isError: true };
    }
    const { functionId, ...body } = args;
    return this.request('POST', `/functions/${encodeURIComponent(functionId as string)}/executions`, Object.keys(body).length > 0 ? body as Record<string, unknown> : undefined);
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private async getBrowserIcon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.code) {
      return { content: [{ type: 'text', text: 'code is required' }], isError: true };
    }
    const { code, ...query } = args;
    return this.request('GET', `/avatars/browsers/${encodeURIComponent(code as string)}`, undefined, query);
  }

  private async getCreditCardIcon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.code) {
      return { content: [{ type: 'text', text: 'code is required' }], isError: true };
    }
    const { code, ...query } = args;
    return this.request('GET', `/avatars/credit-cards/${encodeURIComponent(code as string)}`, undefined, query);
  }

  private async getFavicon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) {
      return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    }
    return this.request('GET', '/avatars/favicon', undefined, { url: args.url });
  }

  private async getFlag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.code) {
      return { content: [{ type: 'text', text: 'code is required' }], isError: true };
    }
    const { code, ...query } = args;
    return this.request('GET', `/avatars/flags/${encodeURIComponent(code as string)}`, undefined, query);
  }

  private async getImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) {
      return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    }
    return this.request('GET', '/avatars/image', undefined, args);
  }

  private async getInitials(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/avatars/initials', undefined, args);
  }

  private async getQRCode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text) {
      return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    }
    return this.request('GET', '/avatars/qr', undefined, args);
  }

  // ── Locale ─────────────────────────────────────────────────────────────────

  private async getLocale(): Promise<ToolResult> {
    return this.request('GET', '/locale');
  }

  private async listContinents(): Promise<ToolResult> {
    return this.request('GET', '/locale/continents');
  }

  private async listCountries(): Promise<ToolResult> {
    return this.request('GET', '/locale/countries');
  }

  private async listEUCountries(): Promise<ToolResult> {
    return this.request('GET', '/locale/countries/eu');
  }

  private async listCountryPhoneCodes(): Promise<ToolResult> {
    return this.request('GET', '/locale/countries/phones');
  }

  private async listCurrencies(): Promise<ToolResult> {
    return this.request('GET', '/locale/currencies');
  }

  private async listLanguages(): Promise<ToolResult> {
    return this.request('GET', '/locale/languages');
  }
}
