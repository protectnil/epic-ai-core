/**
 * AWS Lambda MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://lambda.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4)
// API: REST /2015-03-31/functions/*
// Docs: https://docs.aws.amazon.com/lambda/latest/api/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSLambdaConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSLambdaMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSLambdaConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-lambda',
      displayName: 'AWS Lambda',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'lambda', 'amazon', 'serverless', 'function', 'faas',
        'invoke', 'deploy', 'event-driven', 'compute',
      ],
      toolNames: [
        'list_functions', 'get_function', 'invoke_function', 'create_function',
        'update_function_code', 'delete_function', 'list_layers', 'list_aliases',
      ],
      description: 'AWS Lambda serverless functions: list, invoke, create, update, and delete functions, manage layers and aliases.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_functions',
        description: 'List all Lambda functions in the configured AWS region',
        inputSchema: {
          type: 'object',
          properties: {
            max_items: { type: 'number', description: 'Maximum number of functions to return' },
            marker: { type: 'string', description: 'Pagination token from a previous response' },
            function_version: { type: 'string', description: 'Set to ALL to include all published versions' },
          },
        },
      },
      {
        name: 'get_function',
        description: 'Get configuration and deployment details for a Lambda function',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: 'Function name or ARN' },
            qualifier: { type: 'string', description: 'Version number or alias name' },
          },
          required: ['function_name'],
        },
      },
      {
        name: 'invoke_function',
        description: 'Invoke a Lambda function synchronously and return its response',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: 'Function name or ARN' },
            payload: { type: 'string', description: 'JSON payload to pass to the function' },
            invocation_type: { type: 'string', description: 'RequestResponse (sync, default), Event (async), DryRun' },
            qualifier: { type: 'string', description: 'Version number or alias name' },
            log_type: { type: 'string', description: 'Tail to include last 4KB of execution log in response' },
          },
          required: ['function_name'],
        },
      },
      {
        name: 'create_function',
        description: 'Create a new Lambda function from a ZIP archive in S3 or inline ZIP bytes',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: 'Name for the new function' },
            runtime: { type: 'string', description: 'Runtime identifier (e.g. nodejs22.x, python3.13, java21)' },
            role: { type: 'string', description: 'ARN of the IAM execution role' },
            handler: { type: 'string', description: 'Function handler (e.g. index.handler)' },
            s3_bucket: { type: 'string', description: 'S3 bucket containing the deployment ZIP' },
            s3_key: { type: 'string', description: 'S3 key of the deployment ZIP' },
            description: { type: 'string', description: 'Description of the function' },
            timeout: { type: 'number', description: 'Function timeout in seconds (max 900)' },
            memory_size: { type: 'number', description: 'Memory allocation in MB (128-10240)' },
          },
          required: ['function_name', 'runtime', 'role', 'handler', 's3_bucket', 's3_key'],
        },
      },
      {
        name: 'update_function_code',
        description: 'Update the code of an existing Lambda function from a new S3 ZIP artifact',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: 'Function name or ARN' },
            s3_bucket: { type: 'string', description: 'S3 bucket containing the new deployment ZIP' },
            s3_key: { type: 'string', description: 'S3 key of the new deployment ZIP' },
            publish: { type: 'boolean', description: 'Set true to publish a new version after update' },
          },
          required: ['function_name', 's3_bucket', 's3_key'],
        },
      },
      {
        name: 'delete_function',
        description: 'Delete a Lambda function (and optionally a specific version)',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: 'Function name or ARN' },
            qualifier: { type: 'string', description: 'Version number to delete (omit to delete all versions)' },
          },
          required: ['function_name'],
        },
      },
      {
        name: 'list_layers',
        description: 'List Lambda layers available in the configured region',
        inputSchema: {
          type: 'object',
          properties: {
            compatible_runtime: { type: 'string', description: 'Filter by compatible runtime (e.g. python3.13)' },
            max_items: { type: 'number', description: 'Maximum number of layers to return' },
          },
        },
      },
      {
        name: 'list_aliases',
        description: 'List aliases for a Lambda function',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: 'Function name or ARN' },
            function_version: { type: 'string', description: 'Filter aliases pointing to this version' },
          },
          required: ['function_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_functions': return this.listFunctions(args);
        case 'get_function': return this.getFunction(args);
        case 'invoke_function': return this.invokeFunction(args);
        case 'create_function': return this.createFunction(args);
        case 'update_function_code': return this.updateFunctionCode(args);
        case 'delete_function': return this.deleteFunction(args);
        case 'list_layers': return this.listLayers(args);
        case 'list_aliases': return this.listAliases(args);
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
    const kService = this.hmac(kRegion, 'lambda');
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

    const credentialScope = `${dateStamp}/${this.region}/lambda/aws4_request`;
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

  private baseUrl(): string {
    return `https://lambda.${this.region}.amazonaws.com`;
  }

  private async lambdaRequest(method: string, path: string, body = '', extraHeaders: Record<string, string> = {}): Promise<Response> {
    const url = `${this.baseUrl()}${path}`;
    const headers: Record<string, string> = { ...extraHeaders };
    if (body) headers['Content-Type'] = 'application/json';
    const signed = this.signRequest(method, url, headers, body);
    return this.fetchWithRetry(url, { method, headers: signed, body: body || undefined });
  }

  private async jsonResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Lambda error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listFunctions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_items) params.set('MaxItems', String(args.max_items));
    if (args.marker) params.set('Marker', args.marker as string);
    if (args.function_version) params.set('FunctionVersion', args.function_version as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.jsonResult(await this.lambdaRequest('GET', `/2015-03-31/functions${qs}`));
  }

  private async getFunction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.function_name) return { content: [{ type: 'text', text: 'function_name is required' }], isError: true };
    const qs = args.qualifier ? `?Qualifier=${encodeURIComponent(args.qualifier as string)}` : '';
    return this.jsonResult(await this.lambdaRequest('GET', `/2015-03-31/functions/${encodeURIComponent(args.function_name as string)}${qs}`));
  }

  private async invokeFunction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.function_name) return { content: [{ type: 'text', text: 'function_name is required' }], isError: true };
    const qs = args.qualifier ? `?Qualifier=${encodeURIComponent(args.qualifier as string)}` : '';
    const invocationType = (args.invocation_type as string) ?? 'RequestResponse';
    const extraHeaders: Record<string, string> = { 'X-Amz-Invocation-Type': invocationType };
    if (args.log_type) extraHeaders['X-Amz-Log-Type'] = args.log_type as string;
    const body = args.payload ? (args.payload as string) : '';
    return this.jsonResult(await this.lambdaRequest('POST', `/2015-03-31/functions/${encodeURIComponent(args.function_name as string)}/invocations${qs}`, body, extraHeaders));
  }

  private async createFunction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.function_name || !args.runtime || !args.role || !args.handler || !args.s3_bucket || !args.s3_key) {
      return { content: [{ type: 'text', text: 'function_name, runtime, role, handler, s3_bucket, s3_key are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      FunctionName: args.function_name,
      Runtime: args.runtime,
      Role: args.role,
      Handler: args.handler,
      Code: { S3Bucket: args.s3_bucket, S3Key: args.s3_key },
    };
    if (args.description) body.Description = args.description;
    if (args.timeout) body.Timeout = args.timeout;
    if (args.memory_size) body.MemorySize = args.memory_size;
    return this.jsonResult(await this.lambdaRequest('POST', '/2015-03-31/functions', JSON.stringify(body)));
  }

  private async updateFunctionCode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.function_name || !args.s3_bucket || !args.s3_key) {
      return { content: [{ type: 'text', text: 'function_name, s3_bucket, and s3_key are required' }], isError: true };
    }
    const body: Record<string, unknown> = { S3Bucket: args.s3_bucket, S3Key: args.s3_key };
    if (args.publish !== undefined) body.Publish = args.publish;
    return this.jsonResult(await this.lambdaRequest('PUT', `/2015-03-31/functions/${encodeURIComponent(args.function_name as string)}/code`, JSON.stringify(body)));
  }

  private async deleteFunction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.function_name) return { content: [{ type: 'text', text: 'function_name is required' }], isError: true };
    const qs = args.qualifier ? `?Qualifier=${encodeURIComponent(args.qualifier as string)}` : '';
    return this.jsonResult(await this.lambdaRequest('DELETE', `/2015-03-31/functions/${encodeURIComponent(args.function_name as string)}${qs}`));
  }

  private async listLayers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.compatible_runtime) params.set('CompatibleRuntime', args.compatible_runtime as string);
    if (args.max_items) params.set('MaxItems', String(args.max_items));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.jsonResult(await this.lambdaRequest('GET', `/2015-03-31/layers${qs}`));
  }

  private async listAliases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.function_name) return { content: [{ type: 'text', text: 'function_name is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.function_version) params.set('FunctionVersion', args.function_version as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.jsonResult(await this.lambdaRequest('GET', `/2015-03-31/functions/${encodeURIComponent(args.function_name as string)}/aliases${qs}`));
  }
}
