/**
 * Runscope MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Runscope is an API testing and monitoring platform. No official MCP server.
// Our adapter covers: 18 tools — get_account, list_buckets, create_bucket, get_bucket, delete_bucket,
//   list_bucket_messages, get_message, create_message, delete_messages, list_errors,
//   list_tests, get_test, create_test, update_test, delete_test, get_test_metrics,
//   list_test_steps, list_shared_environments.
//
// Integration: rest-only
// Base URL: https://api.runscope.com
// Auth: OAuth2 Bearer token
// Docs: https://www.runscope.com/docs/api
// Rate limits: Not publicly documented; standard API throttling applies

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RunscopeConfig {
  /** Runscope OAuth2 access token */
  accessToken: string;
  /** Optional base URL override (default: https://api.runscope.com) */
  baseUrl?: string;
}

export class RunscopeMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: RunscopeConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.runscope.com';
  }

  static catalog() {
    return {
      name: 'runscope',
      displayName: 'Runscope',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['runscope', 'api-testing', 'monitoring', 'test', 'bucket', 'webhook', 'devops', 'qa'],
      toolNames: [
        'get_account',
        'list_buckets', 'create_bucket', 'get_bucket', 'delete_bucket',
        'list_bucket_messages', 'get_message', 'create_message', 'delete_messages', 'list_errors',
        'list_tests', 'get_test', 'create_test', 'update_test', 'delete_test', 'get_test_metrics',
        'list_test_steps',
        'list_shared_environments',
      ],
      description: 'API testing and monitoring via the Runscope REST API — buckets, tests, messages, errors, and environments.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_account',
        description: 'Retrieve the current Runscope account details including team information.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_buckets',
        description: 'List all Runscope buckets accessible by the authenticated account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_bucket',
        description: 'Create a new Runscope bucket for capturing and replaying API requests.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Bucket name (required)' },
            team_uuid: { type: 'string', description: 'Team UUID to associate the bucket with' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_bucket',
        description: 'Retrieve details for a specific Runscope bucket by key.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
          },
          required: ['bucketKey'],
        },
      },
      {
        name: 'delete_bucket',
        description: 'Delete a Runscope bucket and all its captured messages.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier to delete' },
          },
          required: ['bucketKey'],
        },
      },
      {
        name: 'list_bucket_messages',
        description: 'List captured API messages in a Runscope bucket with optional time filters.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            count: { type: 'number', description: 'Number of messages to return' },
            since: { type: 'number', description: 'Return messages after this Unix timestamp' },
            before: { type: 'number', description: 'Return messages before this Unix timestamp' },
          },
          required: ['bucketKey'],
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve a single captured API message from a Runscope bucket by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            messageId: { type: 'string', description: 'Message ID to retrieve' },
          },
          required: ['bucketKey', 'messageId'],
        },
      },
      {
        name: 'create_message',
        description: 'Submit a new API request/response message to a Runscope bucket.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            request: { type: 'object', description: 'Request object (method, url, headers, body)' },
            response: { type: 'object', description: 'Response object (status, headers, body)' },
          },
          required: ['bucketKey'],
        },
      },
      {
        name: 'delete_messages',
        description: 'Delete all captured messages from a Runscope bucket.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier to clear' },
          },
          required: ['bucketKey'],
        },
      },
      {
        name: 'list_errors',
        description: 'List error messages captured in a Runscope bucket with optional time filters.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            count: { type: 'number', description: 'Number of errors to return' },
            since: { type: 'number', description: 'Return errors after this Unix timestamp' },
            before: { type: 'number', description: 'Return errors before this Unix timestamp' },
          },
          required: ['bucketKey'],
        },
      },
      {
        name: 'list_tests',
        description: 'List all API tests in a Runscope bucket.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
          },
          required: ['bucketKey'],
        },
      },
      {
        name: 'get_test',
        description: 'Retrieve details for a specific Runscope test including steps and environments.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            testId: { type: 'string', description: 'Test ID' },
          },
          required: ['bucketKey', 'testId'],
        },
      },
      {
        name: 'create_test',
        description: 'Create a new API test in a Runscope bucket.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            name: { type: 'string', description: 'Test name (required)' },
            description: { type: 'string', description: 'Test description' },
            default_environment_id: { type: 'string', description: 'Default environment ID for the test' },
          },
          required: ['bucketKey', 'name'],
        },
      },
      {
        name: 'update_test',
        description: 'Update an existing Runscope test name, description, or default environment.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            testId: { type: 'string', description: 'Test ID to update' },
            name: { type: 'string', description: 'New test name' },
            description: { type: 'string', description: 'New test description' },
            default_environment_id: { type: 'string', description: 'New default environment ID' },
          },
          required: ['bucketKey', 'testId'],
        },
      },
      {
        name: 'delete_test',
        description: 'Delete a Runscope test and all its steps.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            testId: { type: 'string', description: 'Test ID to delete' },
          },
          required: ['bucketKey', 'testId'],
        },
      },
      {
        name: 'get_test_metrics',
        description: 'Get performance metrics for a Runscope test — response times and pass/fail rates.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            testId: { type: 'string', description: 'Test ID' },
          },
          required: ['bucketKey', 'testId'],
        },
      },
      {
        name: 'list_test_steps',
        description: 'List all steps in a Runscope test including request configuration and assertions.',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
            testId: { type: 'string', description: 'Test ID' },
          },
          required: ['bucketKey', 'testId'],
        },
      },
      {
        name: 'list_shared_environments',
        description: 'List shared environments for a Runscope bucket (available to all tests in the bucket).',
        inputSchema: {
          type: 'object',
          properties: {
            bucketKey: { type: 'string', description: 'Bucket key identifier' },
          },
          required: ['bucketKey'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account': return await this.getAccount();
        case 'list_buckets': return await this.listBuckets();
        case 'create_bucket': return await this.createBucket(args);
        case 'get_bucket': return await this.getBucket(args);
        case 'delete_bucket': return await this.deleteBucket(args);
        case 'list_bucket_messages': return await this.listBucketMessages(args);
        case 'get_message': return await this.getMessage(args);
        case 'create_message': return await this.createMessage(args);
        case 'delete_messages': return await this.deleteMessages(args);
        case 'list_errors': return await this.listErrors(args);
        case 'list_tests': return await this.listTests(args);
        case 'get_test': return await this.getTest(args);
        case 'create_test': return await this.createTest(args);
        case 'update_test': return await this.updateTest(args);
        case 'delete_test': return await this.deleteTest(args);
        case 'get_test_metrics': return await this.getTestMetrics(args);
        case 'list_test_steps': return await this.listTestSteps(args);
        case 'list_shared_environments': return await this.listSharedEnvironments(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error calling ${name}: ${message}` }], isError: true };
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Runscope API error ${res.status}: ${text.slice(0, 500)}`);
    }
    if (!text) return {};
    const data = JSON.parse(text);
    const str = JSON.stringify(data);
    return str.length > 10240 ? JSON.parse(str.slice(0, 10240) + '"') : data;
  }

  private ok(data: unknown): ToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private buildQuery(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  }

  private async getAccount(): Promise<ToolResult> {
    return this.ok(await this.request('GET', '/account'));
  }

  private async listBuckets(): Promise<ToolResult> {
    return this.ok(await this.request('GET', '/buckets'));
  }

  private async createBucket(args: Record<string, unknown>): Promise<ToolResult> {
    const { bucketKey: _unused, ...body } = args;
    return this.ok(await this.request('POST', '/buckets', body));
  }

  private async getBucket(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}`));
  }

  private async deleteBucket(args: Record<string, unknown>): Promise<ToolResult> {
    await this.request('DELETE', `/buckets/${args.bucketKey}`);
    return this.ok({ deleted: true, bucketKey: args.bucketKey });
  }

  private async listBucketMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ count: args.count, since: args.since, before: args.before });
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/messages${q}`));
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/messages/${args.messageId}`));
  }

  private async createMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const { bucketKey, ...body } = args;
    return this.ok(await this.request('POST', `/buckets/${bucketKey}/messages`, body));
  }

  private async deleteMessages(args: Record<string, unknown>): Promise<ToolResult> {
    await this.request('DELETE', `/buckets/${args.bucketKey}/messages`);
    return this.ok({ deleted: true, bucketKey: args.bucketKey });
  }

  private async listErrors(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ count: args.count, since: args.since, before: args.before });
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/errors${q}`));
  }

  private async listTests(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/tests`));
  }

  private async getTest(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/tests/${args.testId}`));
  }

  private async createTest(args: Record<string, unknown>): Promise<ToolResult> {
    const { bucketKey, ...body } = args;
    return this.ok(await this.request('POST', `/buckets/${bucketKey}/tests`, body));
  }

  private async updateTest(args: Record<string, unknown>): Promise<ToolResult> {
    const { bucketKey, testId, ...body } = args;
    return this.ok(await this.request('PUT', `/buckets/${bucketKey}/tests/${testId}`, body));
  }

  private async deleteTest(args: Record<string, unknown>): Promise<ToolResult> {
    await this.request('DELETE', `/buckets/${args.bucketKey}/tests/${args.testId}`);
    return this.ok({ deleted: true, testId: args.testId });
  }

  private async getTestMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/tests/${args.testId}/metrics`));
  }

  private async listTestSteps(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/tests/${args.testId}/steps`));
  }

  private async listSharedEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ok(await this.request('GET', `/buckets/${args.bucketKey}/environments`));
  }
}
