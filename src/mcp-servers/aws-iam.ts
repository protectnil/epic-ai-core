/**
 * AWS IAM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://iam.amazonaws.com (global, no region)
// Auth: AWS Signature Version 4 (SigV4), service=iam, region=us-east-1
// API: Query API (Action=X&Version=2010-05-08), XML responses
// Docs: https://docs.aws.amazon.com/IAM/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSIAMConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

export class AWSIAMMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSIAMConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = 'us-east-1'; // IAM is global, always us-east-1 for signing
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-iam',
      displayName: 'AWS IAM',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'iam', 'amazon', 'identity', 'access', 'users', 'roles',
        'policies', 'permissions', 'security', 'credentials',
      ],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'delete_user',
        'list_roles', 'list_policies', 'list_access_keys',
        'create_access_key', 'get_account_summary',
      ],
      description: 'AWS IAM identity and access management: manage users, roles, policies, and access keys.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List all IAM users in the AWS account',
        inputSchema: {
          type: 'object',
          properties: {
            path_prefix: { type: 'string', description: 'Path prefix to filter users (e.g. /division_abc/)' },
            max_items: { type: 'number', description: 'Maximum number of users to return (max 1000)' },
            marker: { type: 'string', description: 'Pagination marker from a previous response' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific IAM user including path, ARN, and creation date',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'IAM username (omit to get the calling user)' },
          },
        },
      },
      {
        name: 'create_user',
        description: 'Create a new IAM user',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'Name for the new IAM user' },
            path: { type: 'string', description: 'Path for the user (default: /)' },
          },
          required: ['user_name'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete an IAM user (must have no attached policies, groups, or access keys)',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'Name of the IAM user to delete' },
          },
          required: ['user_name'],
        },
      },
      {
        name: 'list_roles',
        description: 'List all IAM roles in the AWS account with optional path prefix filter',
        inputSchema: {
          type: 'object',
          properties: {
            path_prefix: { type: 'string', description: 'Path prefix to filter roles' },
            max_items: { type: 'number', description: 'Maximum number of roles to return' },
            marker: { type: 'string', description: 'Pagination marker' },
          },
        },
      },
      {
        name: 'list_policies',
        description: 'List IAM policies (managed policies) in the account or AWS-managed policies',
        inputSchema: {
          type: 'object',
          properties: {
            scope: { type: 'string', description: 'All (default), AWS, or Local (customer-managed only)' },
            path_prefix: { type: 'string', description: 'Path prefix to filter policies' },
            max_items: { type: 'number', description: 'Maximum number of policies to return' },
          },
        },
      },
      {
        name: 'list_access_keys',
        description: 'List access key metadata for an IAM user',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'IAM username (omit for the calling user)' },
            max_items: { type: 'number', description: 'Maximum number of access keys to return' },
          },
        },
      },
      {
        name: 'create_access_key',
        description: 'Create a new access key pair for an IAM user. Returns the secret access key once — store it securely.',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'IAM username (omit for the calling user)' },
          },
        },
      },
      {
        name: 'get_account_summary',
        description: 'Get a summary of the AWS account including counts of users, groups, roles, and policies',
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
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'create_user': return this.createUser(args);
        case 'delete_user': return this.deleteUser(args);
        case 'list_roles': return this.listRoles(args);
        case 'list_policies': return this.listPolicies(args);
        case 'list_access_keys': return this.listAccessKeys(args);
        case 'create_access_key': return this.createAccessKey(args);
        case 'get_account_summary': return this.getAccountSummary();
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

  // --- SigV4 signing implementation ---

  private hmac(key: Buffer | string, data: string): Buffer {
    return createHmac('sha256', key).update(data, 'utf8').digest();
  }

  private sha256(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private getSigningKey(dateStamp: string): Buffer {
    const kDate = this.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmac(kDate, this.region);
    const kService = this.hmac(kRegion, 'iam');
    return this.hmac(kService, 'aws4_request');
  }

  private signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string,
  ): Record<string, string> {
    const parsed = new URL(url);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = this.sha256(body);

    const allHeaders: Record<string, string> = {
      ...headers,
      host: parsed.host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };
    if (this.sessionToken) {
      allHeaders['x-amz-security-token'] = this.sessionToken;
    }

    const sortedHeaderKeys = Object.keys(allHeaders).sort();
    const canonicalHeaders = sortedHeaderKeys
      .map(k => `${k.toLowerCase()}:${allHeaders[k].trim()}`)
      .join('\n') + '\n';
    const signedHeaders = sortedHeaderKeys.map(k => k.toLowerCase()).join(';');

    const canonicalQueryString = parsed.search
      ? parsed.search.slice(1).split('&').sort().join('&')
      : '';
    const canonicalUri = parsed.pathname || '/';

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/iam/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = this.hmac(signingKey, stringToSign).toString('hex');

    const authorization = [
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    return { ...allHeaders, Authorization: authorization };
  }

  private async iamRequest(params: Record<string, string>): Promise<Response> {
    params.Version = '2010-05-08';
    const body = new URLSearchParams(params).toString();
    const url = 'https://iam.amazonaws.com/';
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const signed = this.signRequest('POST', url, headers, body);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body });
  }

  private async xmlResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `IAM error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListUsers' };
    if (args.path_prefix) params.PathPrefix = args.path_prefix as string;
    if (args.max_items) params.MaxItems = String(args.max_items);
    if (args.marker) params.Marker = args.marker as string;
    return this.xmlResult(await this.iamRequest(params));
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'GetUser' };
    if (args.user_name) params.UserName = args.user_name as string;
    return this.xmlResult(await this.iamRequest(params));
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_name) return { content: [{ type: 'text', text: 'user_name is required' }], isError: true };
    const params: Record<string, string> = { Action: 'CreateUser', UserName: args.user_name as string };
    if (args.path) params.Path = args.path as string;
    return this.xmlResult(await this.iamRequest(params));
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_name) return { content: [{ type: 'text', text: 'user_name is required' }], isError: true };
    return this.xmlResult(await this.iamRequest({ Action: 'DeleteUser', UserName: args.user_name as string }));
  }

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListRoles' };
    if (args.path_prefix) params.PathPrefix = args.path_prefix as string;
    if (args.max_items) params.MaxItems = String(args.max_items);
    if (args.marker) params.Marker = args.marker as string;
    return this.xmlResult(await this.iamRequest(params));
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListPolicies' };
    if (args.scope) params.Scope = args.scope as string;
    if (args.path_prefix) params.PathPrefix = args.path_prefix as string;
    if (args.max_items) params.MaxItems = String(args.max_items);
    return this.xmlResult(await this.iamRequest(params));
  }

  private async listAccessKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListAccessKeys' };
    if (args.user_name) params.UserName = args.user_name as string;
    if (args.max_items) params.MaxItems = String(args.max_items);
    return this.xmlResult(await this.iamRequest(params));
  }

  private async createAccessKey(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'CreateAccessKey' };
    if (args.user_name) params.UserName = args.user_name as string;
    return this.xmlResult(await this.iamRequest(params));
  }

  private async getAccountSummary(): Promise<ToolResult> {
    return this.xmlResult(await this.iamRequest({ Action: 'GetAccountSummary' }));
  }
}
