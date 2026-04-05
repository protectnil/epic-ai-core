/**
 * BrowserStack MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/browserstack/mcp-server — transport: stdio, auth: Basic (username + access key)
// Vendor MCP (@browserstack/mcp-server v1.2.13, published 2026-03-27) covers: 20 tools — test management, AI agents,
//   live/browser sessions, accessibility scans, app automate runs. All MCP tools are workflow-oriented (AI test creation,
//   debugging, live device sessions). MCP does NOT expose REST API CRUD for builds/sessions/plan/browsers/workers.
//
// Integration: use-both
// MCP-sourced tools (20): createProjectOrFolder, createTestCase, listTestCases, createTestRun, listTestRuns,
//   updateTestRun, runBrowserLiveSession, runAppLiveSession, takeAppScreenshot, runAppTestsOnBrowserStack,
//   accessibilityExpert, startAccessibilityScan, fetchSelfHealedSelectors, createLCASteps,
//   (+ remaining tools per vendor docs up to 20 total)
// REST-sourced tools (17): list_automate_builds, get_automate_build, delete_automate_build,
//   list_automate_sessions, get_automate_session, update_automate_session, delete_automate_session,
//   get_automate_plan, get_automate_browsers, get_automate_workers,
//   list_app_automate_builds, get_app_automate_build, delete_app_automate_build,
//   list_app_automate_sessions, get_app_automate_session, update_app_automate_session, get_account_plan
// Combined coverage: 37 tools (MCP: 20 + REST: 17, zero shared — fully non-overlapping domains)
//
// Base URL: https://api.browserstack.com (Automate), https://api-cloud.browserstack.com (App Automate)
// Auth: HTTP Basic Auth — username and access key (from BrowserStack account settings)
// Docs: https://www.browserstack.com/docs/automate/api-reference/selenium/introduction
// Rate limits: App Automate APIs — 90 req/second per user; App/Test suite uploads — 5 req/min per user.
//   Automate APIs — not explicitly documented; apply same 90 req/s guidance.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrowserStackConfig {
  username: string;
  accessKey: string;
  automateBaseUrl?: string;
  appAutomateBaseUrl?: string;
}

export class BrowserStackMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly accessKey: string;
  private readonly automateBaseUrl: string;
  private readonly appAutomateBaseUrl: string;

  constructor(config: BrowserStackConfig) {
    super();
    this.username = config.username;
    this.accessKey = config.accessKey;
    this.automateBaseUrl = config.automateBaseUrl || 'https://api.browserstack.com';
    this.appAutomateBaseUrl = config.appAutomateBaseUrl || 'https://api-cloud.browserstack.com';
  }

  static catalog() {
    return {
      name: 'browserstack',
      displayName: 'BrowserStack',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'browserstack', 'cross-browser', 'browser testing', 'selenium', 'automation',
        'build', 'session', 'test', 'mobile', 'app automate', 'parallel', 'workers',
        'real device', 'cloud testing', 'qa',
      ],
      toolNames: [
        'list_automate_builds', 'get_automate_build', 'delete_automate_build',
        'list_automate_sessions', 'get_automate_session', 'update_automate_session', 'delete_automate_session',
        'get_automate_plan', 'get_automate_browsers',
        'get_automate_workers',
        'list_app_automate_builds', 'get_app_automate_build', 'delete_app_automate_build',
        'list_app_automate_sessions', 'get_app_automate_session', 'update_app_automate_session',
        'get_account_plan',
      ],
      description: 'BrowserStack cross-browser testing cloud: manage Automate builds and sessions, App Automate mobile builds, parallel worker usage, and account plan/usage details.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_automate_builds',
        description: 'List recent Selenium Automate builds with optional filters for status and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of builds to return (default: 10, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by build status: done, running, failed, timeout (optional)',
            },
          },
        },
      },
      {
        name: 'get_automate_build',
        description: 'Get detailed information about a specific Selenium Automate build by build ID',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'The unique build ID (hashed string from BrowserStack)',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'delete_automate_build',
        description: 'Delete a Selenium Automate build and all sessions it contains — this is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'The build ID to delete',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'list_automate_sessions',
        description: 'List sessions within a specific Selenium Automate build, with optional limit and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'The build ID to list sessions from',
            },
            limit: {
              type: 'number',
              description: 'Number of sessions to return (default: 10, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by session status: done, running, failed, error, timeout (optional)',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'get_automate_session',
        description: 'Get details of a specific Selenium Automate session including browser, OS, logs, and test status',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The unique session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'update_automate_session',
        description: 'Update the name or status of a Selenium Automate session (mark as passed or failed)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the session',
            },
            status: {
              type: 'string',
              description: 'New status: passed or failed',
            },
            reason: {
              type: 'string',
              description: 'Reason for the status update (shown in the BrowserStack dashboard)',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'delete_automate_session',
        description: 'Delete a specific Selenium Automate session by session ID — this is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID to delete',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'get_automate_plan',
        description: 'Get the current Automate plan details including parallel limit and active parallel sessions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_automate_browsers',
        description: 'List all browsers and operating systems available for Selenium Automate testing',
        inputSchema: {
          type: 'object',
          properties: {
            flat: {
              type: 'boolean',
              description: 'Return a flat list instead of nested OS/browser hierarchy (default: false)',
            },
          },
        },
      },
      {
        name: 'get_automate_workers',
        description: 'Get the current number of active parallel Automate workers and available capacity',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_app_automate_builds',
        description: 'List recent App Automate (Appium/mobile) builds with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of builds to return (default: 10, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: done, running, failed, timeout (optional)',
            },
          },
        },
      },
      {
        name: 'get_app_automate_build',
        description: 'Get details of a specific App Automate mobile test build by build ID',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'The App Automate build ID',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'delete_app_automate_build',
        description: 'Delete an App Automate build and all sessions it contains — this is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'The App Automate build ID to delete',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'list_app_automate_sessions',
        description: 'List sessions within a specific App Automate build, with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            build_id: {
              type: 'string',
              description: 'The App Automate build ID',
            },
            limit: {
              type: 'number',
              description: 'Number of sessions to return (default: 10, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: done, running, failed, error, timeout (optional)',
            },
          },
          required: ['build_id'],
        },
      },
      {
        name: 'get_app_automate_session',
        description: 'Get details of a specific App Automate session including device, OS, test status, and logs',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The App Automate session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'update_app_automate_session',
        description: 'Update the name or status of an App Automate session (mark as passed or failed)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The App Automate session ID to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the session',
            },
            status: {
              type: 'string',
              description: 'New status: passed or failed',
            },
            reason: {
              type: 'string',
              description: 'Reason for the status update',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'get_account_plan',
        description: 'Get BrowserStack Automate plan details including plan name, max parallel sessions, currently running parallel sessions, and queued sessions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_automate_builds':
          return this.listAutomateBuilds(args);
        case 'get_automate_build':
          return this.getAutomateBuild(args);
        case 'delete_automate_build':
          return this.deleteAutomateBuild(args);
        case 'list_automate_sessions':
          return this.listAutomateSessions(args);
        case 'get_automate_session':
          return this.getAutomateSession(args);
        case 'update_automate_session':
          return this.updateAutomateSession(args);
        case 'delete_automate_session':
          return this.deleteAutomateSession(args);
        case 'get_automate_plan':
          return this.getAutomatePlan();
        case 'get_automate_browsers':
          return this.getAutomateBrowsers(args);
        case 'get_automate_workers':
          return this.getAutomateWorkers();
        case 'list_app_automate_builds':
          return this.listAppAutomateBuilds(args);
        case 'get_app_automate_build':
          return this.getAppAutomateBuild(args);
        case 'delete_app_automate_build':
          return this.deleteAppAutomateBuild(args);
        case 'list_app_automate_sessions':
          return this.listAppAutomateSessions(args);
        case 'get_app_automate_session':
          return this.getAppAutomateSession(args);
        case 'update_app_automate_session':
          return this.updateAppAutomateSession(args);
        case 'get_account_plan':
          return this.getAccountPlan();
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

  private get authHeader(): string {
    return `Basic ${btoa(`${this.username}:${this.accessKey}`)}`;
  }

  private async bsGet(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bsPut(url: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bsDelete(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAutomateBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 10));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.status) params.set('status', args.status as string);
    return this.bsGet(`${this.automateBaseUrl}/automate/builds.json?${params}`);
  }

  private async getAutomateBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.bsGet(`${this.automateBaseUrl}/automate/builds/${encodeURIComponent(args.build_id as string)}.json`);
  }

  private async deleteAutomateBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.bsDelete(`${this.automateBaseUrl}/automate/builds/${encodeURIComponent(args.build_id as string)}.json`);
  }

  private async listAutomateSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 10));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.status) params.set('status', args.status as string);
    return this.bsGet(`${this.automateBaseUrl}/automate/builds/${encodeURIComponent(args.build_id as string)}/sessions.json?${params}`);
  }

  private async getAutomateSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.bsGet(`${this.automateBaseUrl}/automate/sessions/${encodeURIComponent(args.session_id as string)}.json`);
  }

  private async updateAutomateSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    if (args.reason) body.reason = args.reason;
    return this.bsPut(`${this.automateBaseUrl}/automate/sessions/${encodeURIComponent(args.session_id as string)}.json`, body);
  }

  private async deleteAutomateSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.bsDelete(`${this.automateBaseUrl}/automate/sessions/${encodeURIComponent(args.session_id as string)}.json`);
  }

  private async getAutomatePlan(): Promise<ToolResult> {
    return this.bsGet(`${this.automateBaseUrl}/automate/plan.json`);
  }

  private async getAutomateBrowsers(args: Record<string, unknown>): Promise<ToolResult> {
    const flat = args.flat === true ? '1' : '0';
    return this.bsGet(`${this.automateBaseUrl}/automate/browsers.json?flat=${flat}`);
  }

  private async getAutomateWorkers(): Promise<ToolResult> {
    return this.bsGet(`${this.automateBaseUrl}/automate/workers.json`);
  }

  private async listAppAutomateBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 10));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.status) params.set('status', args.status as string);
    return this.bsGet(`${this.appAutomateBaseUrl}/app-automate/builds.json?${params}`);
  }

  private async getAppAutomateBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.bsGet(`${this.appAutomateBaseUrl}/app-automate/builds/${encodeURIComponent(args.build_id as string)}.json`);
  }

  private async deleteAppAutomateBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    return this.bsDelete(`${this.appAutomateBaseUrl}/app-automate/builds/${encodeURIComponent(args.build_id as string)}.json`);
  }

  private async listAppAutomateSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.build_id) return { content: [{ type: 'text', text: 'build_id is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 10));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.status) params.set('status', args.status as string);
    return this.bsGet(`${this.appAutomateBaseUrl}/app-automate/builds/${encodeURIComponent(args.build_id as string)}/sessions.json?${params}`);
  }

  private async getAppAutomateSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.bsGet(`${this.appAutomateBaseUrl}/app-automate/sessions/${encodeURIComponent(args.session_id as string)}.json`);
  }

  private async updateAppAutomateSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    if (args.reason) body.reason = args.reason;
    return this.bsPut(`${this.appAutomateBaseUrl}/app-automate/sessions/${encodeURIComponent(args.session_id as string)}.json`, body);
  }

  private async getAccountPlan(): Promise<ToolResult> {
    return this.bsGet(`${this.automateBaseUrl}/automate/plan.json`);
  }
}
