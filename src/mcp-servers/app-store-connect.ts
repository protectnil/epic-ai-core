/**
 * Apple App Store Connect MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None from Apple. Multiple community implementations exist:
//   https://github.com/JoshuaRileyDev/app-store-connect-mcp-server — transport: stdio,
//   auth: JWT (same as our adapter); 30+ tools including analytics, localizations, screenshots,
//   sales/finance reports, Xcode schemes; last updated Feb 2026.
//   https://github.com/TrialAndErrorAI/appstore-connect-mcp (TS, analytics + sales focus, Aug 2025)
//   https://github.com/gjeltep/app-store-connect-mcp (models from Apple's official OpenAPI spec)
//   None meet all four criteria for vendor MCP adoption (no official Apple source).
// Our adapter covers: 20 tools (apps, builds, TestFlight, users, devices, bundle IDs, review).
//   JoshuaRileyDev MCP covers 30+ tools including analytics and localization not in our adapter.
// Recommendation: use-rest-api — no official Apple MCP exists. Monitor JoshuaRileyDev server
//   for potential use-both evaluation if analytics/localization tools are needed in the future.
//
// Base URL: https://api.appstoreconnect.apple.com
// Auth: JWT (ES256) — signed with App Store Connect API private key.
//   Required: keyId (from App Store Connect), issuerId (from App Store Connect), private key (PEM).
//   Token expiry: max 20 minutes. Audience: appstoreconnect-v1.
// Docs: https://developer.apple.com/documentation/appstoreconnectapi
// Rate limits: Not publicly documented. Practical limit ~3,500 req/min observed.

import { createSign } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppStoreConnectConfig {
  keyId: string;
  issuerId: string;
  privateKey: string;
  baseUrl?: string;
}

export class AppStoreConnectMCPServer extends MCPAdapterBase {
  private readonly keyId: string;
  private readonly issuerId: string;
  private readonly privateKey: string;
  private readonly baseUrl: string;
  private jwtToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AppStoreConnectConfig) {
    super();
    this.keyId = config.keyId;
    this.issuerId = config.issuerId;
    this.privateKey = config.privateKey;
    this.baseUrl = config.baseUrl ?? 'https://api.appstoreconnect.apple.com';
  }

  static catalog() {
    return {
      name: 'app-store-connect',
      displayName: 'App Store Connect',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'apple', 'app store', 'app store connect', 'ios', 'macos', 'tvos', 'watchos', 'visionos',
        'testflight', 'beta testing', 'builds', 'bundle id', 'certificates', 'provisioning',
        'app review', 'release', 'version', 'users', 'roles', 'devices',
      ],
      toolNames: [
        'list_apps', 'get_app', 'list_app_store_versions', 'get_app_info',
        'list_builds', 'get_build', 'expire_build',
        'list_beta_groups', 'get_beta_group', 'create_beta_group', 'add_beta_testers_to_group', 'list_beta_testers',
        'list_devices', 'register_device',
        'list_bundle_ids', 'get_bundle_id', 'register_bundle_id',
        'list_users', 'invite_user',
        'get_app_review_submission',
      ],
      description: 'Apple App Store Connect: manage iOS/macOS apps, builds, TestFlight beta groups and testers, devices, bundle IDs, users, and app review submissions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_apps',
        description: 'List all apps in App Store Connect with optional bundle ID and name filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter_bundle_id: {
              type: 'string',
              description: 'Filter by bundle ID (e.g. com.example.myapp)',
            },
            filter_name: {
              type: 'string',
              description: 'Filter by app name (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 200, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_app',
        description: 'Get details about a single app by its App Store Connect app ID',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'App Store Connect app resource ID (not the Apple ID or bundle ID)',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'list_app_store_versions',
        description: 'List App Store versions for an app with optional platform and state filters',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'App resource ID',
            },
            filter_platform: {
              type: 'string',
              description: 'Platform filter: IOS, MAC_OS, TV_OS, VISION_OS (default: IOS)',
            },
            filter_app_store_state: {
              type: 'string',
              description: 'State filter: READY_FOR_SALE, PREPARE_FOR_SUBMISSION, WAITING_FOR_REVIEW, IN_REVIEW, etc.',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10)',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'get_app_info',
        description: 'Get app-level metadata (categories, age rating, content rights) for an app',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'App resource ID to get info for',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'list_builds',
        description: 'List builds with optional filters for app, version, pre-release version, and processing state',
        inputSchema: {
          type: 'object',
          properties: {
            filter_app: {
              type: 'string',
              description: 'Filter by app resource ID',
            },
            filter_version: {
              type: 'string',
              description: 'Filter by build version number (e.g. 42)',
            },
            filter_pre_release_version_version: {
              type: 'string',
              description: 'Filter by marketing version string (e.g. 2.1.0)',
            },
            filter_processing_state: {
              type: 'string',
              description: 'Filter by processing state: PROCESSING, FAILED, INVALID, VALID',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 200, default: 25)',
            },
            sort: {
              type: 'string',
              description: 'Sort field: uploadedDate, -uploadedDate (default: -uploadedDate)',
            },
          },
        },
      },
      {
        name: 'get_build',
        description: 'Get details about a specific build by its resource ID including processing state and TestFlight info',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'Build resource ID',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'expire_build',
        description: 'Expire a build to prevent it from being used in TestFlight or App Store submission',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'Build resource ID to expire',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'list_beta_groups',
        description: 'List TestFlight beta groups for an app with tester counts and public link status',
        inputSchema: {
          type: 'object',
          properties: {
            filter_app: {
              type: 'string',
              description: 'Filter by app resource ID',
            },
            filter_name: {
              type: 'string',
              description: 'Filter by beta group name',
            },
            filter_is_internal_group: {
              type: 'boolean',
              description: 'Filter to only internal (true) or external (false) groups',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_beta_group',
        description: 'Get details about a specific TestFlight beta group by resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            beta_group_id: {
              type: 'string',
              description: 'Beta group resource ID',
            },
          },
          required: ['beta_group_id'],
        },
      },
      {
        name: 'create_beta_group',
        description: 'Create a new TestFlight beta group for an app',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'App resource ID to create the group for',
            },
            name: {
              type: 'string',
              description: 'Beta group name',
            },
            public_link_enabled: {
              type: 'boolean',
              description: 'Enable a public TestFlight link for this group (default: false)',
            },
            feedback_enabled: {
              type: 'boolean',
              description: 'Allow testers to submit feedback (default: true)',
            },
          },
          required: ['app_id', 'name'],
        },
      },
      {
        name: 'add_beta_testers_to_group',
        description: 'Add one or more beta testers to a TestFlight beta group by email addresses',
        inputSchema: {
          type: 'object',
          properties: {
            beta_group_id: {
              type: 'string',
              description: 'Beta group resource ID to add testers to',
            },
            testers: {
              type: 'string',
              description: 'JSON array of tester objects with email, firstName, lastName fields',
            },
          },
          required: ['beta_group_id', 'testers'],
        },
      },
      {
        name: 'list_beta_testers',
        description: 'List beta testers with optional filters for email, first/last name, and associated app or group',
        inputSchema: {
          type: 'object',
          properties: {
            filter_email: {
              type: 'string',
              description: 'Filter by email address',
            },
            filter_apps: {
              type: 'string',
              description: 'Filter by app resource ID',
            },
            filter_beta_groups: {
              type: 'string',
              description: 'Filter by beta group resource ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 200, default: 25)',
            },
          },
        },
      },
      {
        name: 'list_devices',
        description: 'List registered devices with optional filters for platform, status, and device class',
        inputSchema: {
          type: 'object',
          properties: {
            filter_platform: {
              type: 'string',
              description: 'Filter by platform: IOS, MAC_OS',
            },
            filter_status: {
              type: 'string',
              description: 'Filter by status: ENABLED, DISABLED',
            },
            filter_device_class: {
              type: 'string',
              description: 'Filter by class: APPLE_WATCH, IPAD, IPHONE, IPOD, APPLE_TV, MAC, VISION_PRO',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 200, default: 20)',
            },
          },
        },
      },
      {
        name: 'register_device',
        description: 'Register a new device for development and distribution by UDID',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Device name (e.g. "Michael Jabara iPhone 16 Pro")',
            },
            udid: {
              type: 'string',
              description: 'Device UDID (40-character hex string)',
            },
            platform: {
              type: 'string',
              description: 'Platform: IOS or MAC_OS (default: IOS)',
            },
          },
          required: ['name', 'udid'],
        },
      },
      {
        name: 'list_bundle_ids',
        description: 'List registered bundle IDs with optional platform and identifier filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter_identifier: {
              type: 'string',
              description: 'Filter by bundle ID string (e.g. com.example.*)',
            },
            filter_platform: {
              type: 'string',
              description: 'Filter by platform: IOS, MAC_OS, UNIVERSAL',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_bundle_id',
        description: 'Get details and capabilities for a registered bundle ID by resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            bundle_id: {
              type: 'string',
              description: 'Bundle ID resource ID (not the identifier string)',
            },
          },
          required: ['bundle_id'],
        },
      },
      {
        name: 'register_bundle_id',
        description: 'Register a new bundle ID for app development',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Bundle ID string (e.g. com.example.myapp)',
            },
            name: {
              type: 'string',
              description: 'Display name for this bundle ID',
            },
            platform: {
              type: 'string',
              description: 'Platform: IOS, MAC_OS, or UNIVERSAL (default: UNIVERSAL)',
            },
            seed_id: {
              type: 'string',
              description: 'Team seed ID prefix — optional, used for explicit team control',
            },
          },
          required: ['identifier', 'name'],
        },
      },
      {
        name: 'list_users',
        description: 'List users with App Store Connect access, including their roles and assigned apps',
        inputSchema: {
          type: 'object',
          properties: {
            filter_roles: {
              type: 'string',
              description: 'Filter by role: ACCOUNT_HOLDER, ADMIN, APP_MANAGER, DEVELOPER, FINANCE, MARKETING, SALES, SUPPORT, TECHNICAL',
            },
            filter_username: {
              type: 'string',
              description: 'Filter by username (email address)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 20)',
            },
          },
        },
      },
      {
        name: 'invite_user',
        description: 'Invite a new user to App Store Connect with specified roles and optional app access',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: "User's first name",
            },
            last_name: {
              type: 'string',
              description: "User's last name",
            },
            email: {
              type: 'string',
              description: "User's email address",
            },
            roles: {
              type: 'string',
              description: 'Comma-separated roles: ADMIN, APP_MANAGER, DEVELOPER, FINANCE, MARKETING, SALES, SUPPORT, TECHNICAL',
            },
            all_apps_visible: {
              type: 'boolean',
              description: 'Grant access to all apps (default: true)',
            },
          },
          required: ['first_name', 'last_name', 'email', 'roles'],
        },
      },
      {
        name: 'get_app_review_submission',
        description: 'Get the current App Store review submission status for an app version',
        inputSchema: {
          type: 'object',
          properties: {
            app_store_version_id: {
              type: 'string',
              description: 'App Store version resource ID to check review status for',
            },
          },
          required: ['app_store_version_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_apps':
          return this.listApps(args);
        case 'get_app':
          return this.getApp(args);
        case 'list_app_store_versions':
          return this.listAppStoreVersions(args);
        case 'get_app_info':
          return this.getAppInfo(args);
        case 'list_builds':
          return this.listBuilds(args);
        case 'get_build':
          return this.getBuild(args);
        case 'expire_build':
          return this.expireBuild(args);
        case 'list_beta_groups':
          return this.listBetaGroups(args);
        case 'get_beta_group':
          return this.getBetaGroup(args);
        case 'create_beta_group':
          return this.createBetaGroup(args);
        case 'add_beta_testers_to_group':
          return this.addBetaTestersToGroup(args);
        case 'list_beta_testers':
          return this.listBetaTesters(args);
        case 'list_devices':
          return this.listDevices(args);
        case 'register_device':
          return this.registerDevice(args);
        case 'list_bundle_ids':
          return this.listBundleIds(args);
        case 'get_bundle_id':
          return this.getBundleId(args);
        case 'register_bundle_id':
          return this.registerBundleId(args);
        case 'list_users':
          return this.listUsers(args);
        case 'invite_user':
          return this.inviteUser(args);
        case 'get_app_review_submission':
          return this.getAppReviewSubmission(args);
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

  // ---- JWT generation ----

  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + (19 * 60); // 19 minutes — 1 minute before max 20-minute limit

    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: this.keyId, typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: this.issuerId,
      iat: now,
      exp: expiry,
      aud: 'appstoreconnect-v1',
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;
    const signer = createSign('SHA256');
    signer.update(signingInput);
    const signature = signer.sign(this.privateKey, 'base64url');

    return `${signingInput}.${signature}`;
  }

  private getOrRefreshToken(): string {
    const now = Date.now();
    if (this.jwtToken && this.tokenExpiry > now) {
      return this.jwtToken;
    }
    this.jwtToken = this.generateToken();
    this.tokenExpiry = now + (18 * 60 * 1000); // refresh after 18 minutes
    return this.jwtToken;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getOrRefreshToken()}`,
      'Content-Type': 'application/json',
    };
  }

  private async ascGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ascPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ascPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ---- Tool implementations ----

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
    };
    if (args.filter_bundle_id) params['filter[bundleId]'] = args.filter_bundle_id as string;
    if (args.filter_name) params['filter[name]'] = args.filter_name as string;
    return this.ascGet('/v1/apps', params);
  }

  private async getApp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.ascGet(`/v1/apps/${encodeURIComponent(args.app_id as string)}`);
  }

  private async listAppStoreVersions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 10),
    };
    if (args.filter_platform) params['filter[platform]'] = args.filter_platform as string;
    if (args.filter_app_store_state) params['filter[appStoreState]'] = args.filter_app_store_state as string;
    return this.ascGet(`/v1/apps/${encodeURIComponent(args.app_id as string)}/appStoreVersions`, params);
  }

  private async getAppInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.ascGet(`/v1/apps/${encodeURIComponent(args.app_id as string)}/appInfos`);
  }

  private async listBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      sort: (args.sort as string) ?? '-uploadedDate',
    };
    if (args.filter_app) params['filter[app]'] = args.filter_app as string;
    if (args.filter_version) params['filter[version]'] = args.filter_version as string;
    if (args.filter_pre_release_version_version) params['filter[preReleaseVersion.version]'] = args.filter_pre_release_version_version as string;
    if (args.filter_processing_state) params['filter[processingState]'] = args.filter_processing_state as string;
    return this.ascGet('/v1/builds', params);
  }

  private async getBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.ascGet(`/v1/builds/${encodeURIComponent(args.build_id as string)}`);
  }

  private async expireBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.ascPatch(`/v1/builds/${encodeURIComponent(args.build_id as string)}`, {
      data: {
        type: 'builds',
        id: args.build_id,
        attributes: { expired: true },
      },
    });
  }

  private async listBetaGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
    };
    if (args.filter_app) params['filter[app]'] = args.filter_app as string;
    if (args.filter_name) params['filter[name]'] = args.filter_name as string;
    if (typeof args.filter_is_internal_group === 'boolean') {
      params['filter[isInternalGroup]'] = String(args.filter_is_internal_group);
    }
    return this.ascGet('/v1/betaGroups', params);
  }

  private async getBetaGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.beta_group_id) return { content: [{ type: 'text', text: 'beta_group_id is required' }], isError: true };
    return this.ascGet(`/v1/betaGroups/${encodeURIComponent(args.beta_group_id as string)}`);
  }

  private async createBetaGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id || !args.name) {
      return { content: [{ type: 'text', text: 'app_id and name are required' }], isError: true };
    }
    return this.ascPost('/v1/betaGroups', {
      data: {
        type: 'betaGroups',
        attributes: {
          name: args.name,
          publicLinkEnabled: (args.public_link_enabled as boolean) ?? false,
          feedbackEnabled: (args.feedback_enabled as boolean) ?? true,
        },
        relationships: {
          app: { data: { type: 'apps', id: args.app_id } },
        },
      },
    });
  }

  private async addBetaTestersToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.beta_group_id || !args.testers) {
      return { content: [{ type: 'text', text: 'beta_group_id and testers are required' }], isError: true };
    }
    let parsedTesters: unknown;
    try {
      parsedTesters = JSON.parse(args.testers as string);
    } catch {
      return { content: [{ type: 'text', text: 'testers must be a valid JSON array' }], isError: true };
    }
    return this.ascPost(`/v1/betaGroups/${encodeURIComponent(args.beta_group_id as string)}/relationships/betaTesters`, {
      data: parsedTesters,
    });
  }

  private async listBetaTesters(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.filter_email) params['filter[email]'] = args.filter_email as string;
    if (args.filter_apps) params['filter[apps]'] = args.filter_apps as string;
    if (args.filter_beta_groups) params['filter[betaGroups]'] = args.filter_beta_groups as string;
    return this.ascGet('/v1/betaTesters', params);
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
    };
    if (args.filter_platform) params['filter[platform]'] = args.filter_platform as string;
    if (args.filter_status) params['filter[status]'] = args.filter_status as string;
    if (args.filter_device_class) params['filter[deviceClass]'] = args.filter_device_class as string;
    return this.ascGet('/v1/devices', params);
  }

  private async registerDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.udid) {
      return { content: [{ type: 'text', text: 'name and udid are required' }], isError: true };
    }
    return this.ascPost('/v1/devices', {
      data: {
        type: 'devices',
        attributes: {
          name: args.name,
          udid: args.udid,
          platform: (args.platform as string) ?? 'IOS',
        },
      },
    });
  }

  private async listBundleIds(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
    };
    if (args.filter_identifier) params['filter[identifier]'] = args.filter_identifier as string;
    if (args.filter_platform) params['filter[platform]'] = args.filter_platform as string;
    return this.ascGet('/v1/bundleIds', params);
  }

  private async getBundleId(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bundle_id) return { content: [{ type: 'text', text: 'bundle_id is required' }], isError: true };
    return this.ascGet(`/v1/bundleIds/${encodeURIComponent(args.bundle_id as string)}`);
  }

  private async registerBundleId(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier || !args.name) {
      return { content: [{ type: 'text', text: 'identifier and name are required' }], isError: true };
    }
    const attrs: Record<string, unknown> = {
      identifier: args.identifier,
      name: args.name,
      platform: (args.platform as string) ?? 'UNIVERSAL',
    };
    if (args.seed_id) attrs.seedId = args.seed_id;
    return this.ascPost('/v1/bundleIds', {
      data: { type: 'bundleIds', attributes: attrs },
    });
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
    };
    if (args.filter_roles) params['filter[roles]'] = args.filter_roles as string;
    if (args.filter_username) params['filter[username]'] = args.filter_username as string;
    return this.ascGet('/v1/users', params);
  }

  private async inviteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.email || !args.roles) {
      return { content: [{ type: 'text', text: 'first_name, last_name, email, and roles are required' }], isError: true };
    }
    const roles = (args.roles as string).split(',').map(r => r.trim());
    return this.ascPost('/v1/userInvitations', {
      data: {
        type: 'userInvitations',
        attributes: {
          firstName: args.first_name,
          lastName: args.last_name,
          email: args.email,
          roles,
          allAppsVisible: (args.all_apps_visible as boolean) ?? true,
        },
      },
    });
  }

  private async getAppReviewSubmission(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_store_version_id) {
      return { content: [{ type: 'text', text: 'app_store_version_id is required' }], isError: true };
    }
    return this.ascGet(`/v1/appStoreVersions/${encodeURIComponent(args.app_store_version_id as string)}/appStoreReviewDetail`);
  }
}
