/**
 * ETSI MEC010-2 AppPkgMgmt MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None known.
// Our adapter covers: 16 tools (app package lifecycle, subscriptions, notifications).
// Spec: ETSI GS MEC 010-2 v2.1.1 — Application lifecycle, rules and requirements management.
//
// Base URL: https://localhost/app_pkgm/v1
// Auth: No authentication defined in spec — configure bearer token via bearerToken config if required.
// Docs: https://www.etsi.org/deliver/etsi_gs/MEC/001_099/01002/02.01.01_60/gs_MEC01002v020101p.pdf

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EtsiMec010AppPkgMgmtConfig {
  /** Base URL of the MEC orchestrator (default: https://localhost/app_pkgm/v1) */
  baseUrl?: string;
  /** Optional Bearer token for authenticated deployments */
  bearerToken?: string;
}

export class EtsiMec0102AppPkgMgmtMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly bearerToken?: string;

  constructor(config: EtsiMec010AppPkgMgmtConfig) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://localhost/app_pkgm/v1';
    this.bearerToken = config.bearerToken;
  }

  static catalog() {
    return {
      name: 'etsi-mec010-2-apppkgmgmt',
      displayName: 'ETSI MEC010-2 App Package Management',
      version: '2.1.1',
      category: 'telecom',
      keywords: [
        'etsi', 'mec', 'multi-access edge computing', 'telecom', '5g', 'lte',
        'app package', 'onboarding', 'lifecycle', 'appd', 'meo', 'orchestrator',
        'edge', 'subscription', 'notification',
      ],
      toolNames: [
        'list_app_packages', 'create_app_package', 'delete_app_package',
        'get_app_package', 'update_app_package_state', 'get_app_descriptor',
        'get_app_package_content', 'upload_app_package_content',
        'get_onboarded_app_descriptor', 'get_onboarded_package_content',
        'upload_onboarded_package_content',
        'list_subscriptions', 'create_subscription',
        'delete_subscription', 'get_subscription',
        'send_notification',
      ],
      description: 'ETSI GS MEC 010-2 application package management: on-board, query, and manage MEC application packages on a Multi-access Edge Computing orchestrator (MEO), including app descriptors, package content upload, and lifecycle change subscriptions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_app_packages',
        description: 'Query information about on-boarded application packages in the MEO, with optional attribute-based filtering',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Attribute-based filtering expression per ETSI GS MEC 009 (e.g. "appName.eq=myApp")',
            },
            all_fields: {
              type: 'string',
              description: 'Set to any value to include all complex attributes in the response',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of AppPkgInfo complex attributes to include',
            },
            exclude_fields: {
              type: 'string',
              description: 'Comma-separated list of AppPkgInfo complex attributes to exclude',
            },
            exclude_default: {
              type: 'string',
              description: 'Set to any value to exclude default complex attributes from the response',
            },
          },
        },
      },
      {
        name: 'create_app_package',
        description: 'Create a resource to on-board a new application package to the MEO',
        inputSchema: {
          type: 'object',
          properties: {
            appPkgName: {
              type: 'string',
              description: 'Name of the application package',
            },
            appPkgVersion: {
              type: 'string',
              description: 'Version of the application package',
            },
            appProvider: {
              type: 'string',
              description: 'Provider of the application package',
            },
            appPkgPath: {
              type: 'string',
              description: 'URI path where the application package content can be fetched',
            },
            userDefinedData: {
              type: 'object',
              description: 'User-defined key-value data to associate with the package',
            },
          },
          required: ['appPkgName', 'appPkgVersion'],
        },
      },
      {
        name: 'delete_app_package',
        description: 'Delete an individual on-boarded application package from the MEO',
        inputSchema: {
          type: 'object',
          properties: {
            appPkgId: {
              type: 'string',
              description: 'Identifier of the application package to delete',
            },
          },
          required: ['appPkgId'],
        },
      },
      {
        name: 'get_app_package',
        description: 'Retrieve information about a specific on-boarded application package',
        inputSchema: {
          type: 'object',
          properties: {
            appPkgId: {
              type: 'string',
              description: 'Identifier of the application package',
            },
          },
          required: ['appPkgId'],
        },
      },
      {
        name: 'update_app_package_state',
        description: 'Update the operational state of an application package (enable or disable)',
        inputSchema: {
          type: 'object',
          properties: {
            appPkgId: {
              type: 'string',
              description: 'Identifier of the application package to update',
            },
            operationalState: {
              type: 'string',
              description: 'New operational state: ENABLED or DISABLED',
              enum: ['ENABLED', 'DISABLED'],
            },
          },
          required: ['appPkgId', 'operationalState'],
        },
      },
      {
        name: 'get_app_descriptor',
        description: 'Retrieve the application descriptor (AppD) of an on-boarded application package',
        inputSchema: {
          type: 'object',
          properties: {
            appPkgId: {
              type: 'string',
              description: 'Identifier of the application package',
            },
            filter: {
              type: 'string',
              description: 'Attribute-based filtering expression',
            },
            all_fields: {
              type: 'string',
              description: 'Set to any value to include all complex attributes',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of complex attributes to include',
            },
            exclude_fields: {
              type: 'string',
              description: 'Comma-separated list of complex attributes to exclude',
            },
            exclude_default: {
              type: 'string',
              description: 'Set to any value to exclude default complex attributes',
            },
          },
          required: ['appPkgId'],
        },
      },
      {
        name: 'get_app_package_content',
        description: 'Fetch the binary content (zip archive) of an on-boarded application package',
        inputSchema: {
          type: 'object',
          properties: {
            appPkgId: {
              type: 'string',
              description: 'Identifier of the application package',
            },
          },
          required: ['appPkgId'],
        },
      },
      {
        name: 'upload_app_package_content',
        description: 'Upload the binary content (zip archive) for an on-boarded application package',
        inputSchema: {
          type: 'object',
          properties: {
            appPkgId: {
              type: 'string',
              description: 'Identifier of the application package to upload content for',
            },
            contentUrl: {
              type: 'string',
              description: 'URI from which the MEO should fetch the package content',
            },
          },
          required: ['appPkgId'],
        },
      },
      {
        name: 'get_onboarded_app_descriptor',
        description: 'Retrieve the application descriptor (AppD) for an already-onboarded app, addressed by AppD ID',
        inputSchema: {
          type: 'object',
          properties: {
            appDId: {
              type: 'string',
              description: 'Application descriptor identifier of the onboarded app',
            },
            filter: {
              type: 'string',
              description: 'Attribute-based filtering expression',
            },
            all_fields: {
              type: 'string',
              description: 'Set to any value to include all complex attributes',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of complex attributes to include',
            },
            exclude_fields: {
              type: 'string',
              description: 'Comma-separated list of complex attributes to exclude',
            },
            exclude_default: {
              type: 'string',
              description: 'Set to any value to exclude default complex attributes',
            },
          },
          required: ['appDId'],
        },
      },
      {
        name: 'get_onboarded_package_content',
        description: 'Fetch the binary package content for an already-onboarded app, addressed by AppD ID',
        inputSchema: {
          type: 'object',
          properties: {
            appDId: {
              type: 'string',
              description: 'Application descriptor identifier of the onboarded app',
            },
          },
          required: ['appDId'],
        },
      },
      {
        name: 'upload_onboarded_package_content',
        description: 'Upload binary package content for an already-onboarded app, addressed by AppD ID',
        inputSchema: {
          type: 'object',
          properties: {
            appDId: {
              type: 'string',
              description: 'Application descriptor identifier of the onboarded app',
            },
            contentUrl: {
              type: 'string',
              description: 'URI from which the MEO should fetch the package content',
            },
          },
          required: ['appDId'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List all active app package lifecycle change subscriptions registered with the MEO',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_subscription',
        description: 'Subscribe to app package lifecycle change notifications from the MEO',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionType: {
              type: 'string',
              description: 'Type of subscription (e.g. AppPkgNotification)',
            },
            callbackUri: {
              type: 'string',
              description: 'URI where the MEO will POST lifecycle change notifications',
            },
            filter: {
              type: 'object',
              description: 'Optional filter criteria for which package events to receive',
            },
          },
          required: ['callbackUri'],
        },
      },
      {
        name: 'delete_subscription',
        description: 'Cancel and delete an app package lifecycle change subscription',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'Identifier of the subscription to delete',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve details of a specific app package lifecycle change subscription',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'Identifier of the subscription to retrieve',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'send_notification',
        description: 'Send a user-defined notification to the MEO app package notification endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            notificationType: {
              type: 'string',
              description: 'Type of notification event (e.g. AppPkgOnBoardingNotification)',
            },
            subscriptionId: {
              type: 'string',
              description: 'Subscription ID this notification is associated with',
            },
            appPkgId: {
              type: 'string',
              description: 'Identifier of the application package this notification concerns',
            },
            operationalState: {
              type: 'string',
              description: 'New operational state that triggered the notification',
            },
          },
          required: ['notificationType'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_app_packages':            return this.listAppPackages(args);
        case 'create_app_package':           return this.createAppPackage(args);
        case 'delete_app_package':           return this.deleteAppPackage(args);
        case 'get_app_package':              return this.getAppPackage(args);
        case 'update_app_package_state':     return this.updateAppPackageState(args);
        case 'get_app_descriptor':           return this.getAppDescriptor(args);
        case 'get_app_package_content':      return this.getAppPackageContent(args);
        case 'upload_app_package_content':   return this.uploadAppPackageContent(args);
        case 'get_onboarded_app_descriptor': return this.getOnboardedAppDescriptor(args);
        case 'get_onboarded_package_content': return this.getOnboardedPackageContent(args);
        case 'upload_onboarded_package_content': return this.uploadOnboardedPackageContent(args);
        case 'list_subscriptions':           return this.listSubscriptions();
        case 'create_subscription':          return this.createSubscription(args);
        case 'delete_subscription':          return this.deleteSubscription(args);
        case 'get_subscription':             return this.getSubscription(args);
        case 'send_notification':            return this.sendNotification(args);
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

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (this.bearerToken) h['Authorization'] = `Bearer ${this.bearerToken}`;
    return h;
  }

  private async request(method: string, path: string, query?: Record<string, string | undefined>, body?: unknown): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) qs.set(k, v);
      }
      const qstr = qs.toString();
      if (qstr) url += `?${qstr}`;
    }
    const init: RequestInit = { method, headers: this.headers() };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Success (non-JSON response, HTTP ${response.status})` }], isError: false }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAppPackages(args: Record<string, unknown>): Promise<ToolResult> {
    const query: Record<string, string | undefined> = {
      filter: args.filter as string | undefined,
      all_fields: args.all_fields as string | undefined,
      fields: args.fields as string | undefined,
      exclude_fields: args.exclude_fields as string | undefined,
      exclude_default: args.exclude_default as string | undefined,
    };
    return this.request('GET', '/app_packages', query);
  }

  private async createAppPackage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.appPkgName) body.appPkgName = args.appPkgName;
    if (args.appPkgVersion) body.appPkgVersion = args.appPkgVersion;
    if (args.appProvider) body.appProvider = args.appProvider;
    if (args.appPkgPath) body.appPkgPath = args.appPkgPath;
    if (args.userDefinedData) body.userDefinedData = args.userDefinedData;
    return this.request('POST', '/app_packages', undefined, body);
  }

  private async deleteAppPackage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appPkgId) return { content: [{ type: 'text', text: 'appPkgId is required' }], isError: true };
    return this.request('DELETE', `/app_packages/${encodeURIComponent(args.appPkgId as string)}`);
  }

  private async getAppPackage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appPkgId) return { content: [{ type: 'text', text: 'appPkgId is required' }], isError: true };
    return this.request('GET', `/app_packages/${encodeURIComponent(args.appPkgId as string)}`);
  }

  private async updateAppPackageState(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appPkgId) return { content: [{ type: 'text', text: 'appPkgId is required' }], isError: true };
    if (!args.operationalState) return { content: [{ type: 'text', text: 'operationalState is required' }], isError: true };
    const body = { operationalState: args.operationalState };
    return this.request('PATCH', `/app_packages/${encodeURIComponent(args.appPkgId as string)}`, undefined, body);
  }

  private async getAppDescriptor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appPkgId) return { content: [{ type: 'text', text: 'appPkgId is required' }], isError: true };
    const query: Record<string, string | undefined> = {
      filter: args.filter as string | undefined,
      all_fields: args.all_fields as string | undefined,
      fields: args.fields as string | undefined,
      exclude_fields: args.exclude_fields as string | undefined,
      exclude_default: args.exclude_default as string | undefined,
    };
    return this.request('GET', `/app_packages/${encodeURIComponent(args.appPkgId as string)}/appd`, query);
  }

  private async getAppPackageContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appPkgId) return { content: [{ type: 'text', text: 'appPkgId is required' }], isError: true };
    return this.request('GET', `/app_packages/${encodeURIComponent(args.appPkgId as string)}/package_content`);
  }

  private async uploadAppPackageContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appPkgId) return { content: [{ type: 'text', text: 'appPkgId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.contentUrl) body.contentUrl = args.contentUrl;
    return this.request('PUT', `/app_packages/${encodeURIComponent(args.appPkgId as string)}/package_content`, undefined, body);
  }

  private async getOnboardedAppDescriptor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appDId) return { content: [{ type: 'text', text: 'appDId is required' }], isError: true };
    const query: Record<string, string | undefined> = {
      filter: args.filter as string | undefined,
      all_fields: args.all_fields as string | undefined,
      fields: args.fields as string | undefined,
      exclude_fields: args.exclude_fields as string | undefined,
      exclude_default: args.exclude_default as string | undefined,
    };
    return this.request('GET', `/onboarded_app_packages/${encodeURIComponent(args.appDId as string)}/appd`, query);
  }

  private async getOnboardedPackageContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appDId) return { content: [{ type: 'text', text: 'appDId is required' }], isError: true };
    return this.request('GET', `/onboarded_app_packages/${encodeURIComponent(args.appDId as string)}/package_content`);
  }

  private async uploadOnboardedPackageContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appDId) return { content: [{ type: 'text', text: 'appDId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.contentUrl) body.contentUrl = args.contentUrl;
    return this.request('PUT', `/onboarded_app_packages/${encodeURIComponent(args.appDId as string)}/package_content`, undefined, body);
  }

  private async listSubscriptions(): Promise<ToolResult> {
    return this.request('GET', '/subscriptions');
  }

  private async createSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.callbackUri) return { content: [{ type: 'text', text: 'callbackUri is required' }], isError: true };
    const body: Record<string, unknown> = { callbackUri: args.callbackUri };
    if (args.subscriptionType) body.subscriptionType = args.subscriptionType;
    if (args.filter) body.filter = args.filter;
    return this.request('POST', '/subscriptions', undefined, body);
  }

  private async deleteSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subscriptionId) return { content: [{ type: 'text', text: 'subscriptionId is required' }], isError: true };
    return this.request('DELETE', `/subscriptions/${encodeURIComponent(args.subscriptionId as string)}`);
  }

  private async getSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subscriptionId) return { content: [{ type: 'text', text: 'subscriptionId is required' }], isError: true };
    return this.request('GET', `/subscriptions/${encodeURIComponent(args.subscriptionId as string)}`);
  }

  private async sendNotification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.notificationType) return { content: [{ type: 'text', text: 'notificationType is required' }], isError: true };
    const body: Record<string, unknown> = { notificationType: args.notificationType };
    if (args.subscriptionId) body.subscriptionId = args.subscriptionId;
    if (args.appPkgId) body.appPkgId = args.appPkgId;
    if (args.operationalState) body.operationalState = args.operationalState;
    return this.request('POST', '/user_defined_notification', undefined, body);
  }
}
