/**
 * AWS CloudTrail MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://cloudtrail.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4), service=cloudtrail
// API: JSON API, X-Amz-Target: com.amazonaws.cloudtrail.v20131101.CloudTrail_20131101.{Action}
// Docs: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSCloudTrailConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSCloudTrailMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSCloudTrailConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-cloudtrail',
      displayName: 'AWS CloudTrail',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'cloudtrail', 'amazon', 'audit', 'compliance', 'logging',
        'events', 'trails', 'governance', 'security',
      ],
      toolNames: [
        'lookup_events', 'describe_trails', 'get_trail_status',
        'create_trail', 'start_logging', 'stop_logging',
      ],
      description: 'AWS CloudTrail audit logging: look up API events, manage trails, and control logging for compliance and security auditing.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'lookup_events',
        description: 'Search CloudTrail events by attribute (event name, user, resource, etc.) within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            lookup_attributes: { type: 'string', description: 'JSON array of lookup attributes: [{AttributeKey:str, AttributeValue:str}]. Keys: EventId, EventName, ReadOnly, Username, ResourceType, ResourceName, EventSource, AccessKeyId' },
            start_time: { type: 'string', description: 'Start time in ISO 8601 format (default: 7 days ago)' },
            end_time: { type: 'string', description: 'End time in ISO 8601 format (default: now)' },
            max_results: { type: 'number', description: 'Maximum events to return (max 50)' },
            next_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'describe_trails',
        description: 'Get settings for one or more CloudTrail trails',
        inputSchema: {
          type: 'object',
          properties: {
            trail_name_list: { type: 'string', description: 'Comma-separated list of trail ARNs or names (omit for all trails)' },
            include_shadow_trails: { type: 'boolean', description: 'Include shadow trails from other regions (default: true)' },
          },
        },
      },
      {
        name: 'get_trail_status',
        description: 'Get the logging status and recent delivery errors for a CloudTrail trail',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Trail ARN or name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_trail',
        description: 'Create a new CloudTrail trail to log API calls to an S3 bucket',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Trail name (3-128 chars)' },
            s3_bucket_name: { type: 'string', description: 'S3 bucket to deliver log files to' },
            include_global_service_events: { type: 'boolean', description: 'Include global service events like IAM (default: true)' },
            is_multi_region_trail: { type: 'boolean', description: 'Record events in all regions (default: false)' },
            enable_log_file_validation: { type: 'boolean', description: 'Enable log file integrity validation (default: false)' },
            cloud_watch_logs_log_group_arn: { type: 'string', description: 'CloudWatch Logs log group ARN for streaming' },
            cloud_watch_logs_role_arn: { type: 'string', description: 'IAM role ARN to deliver to CloudWatch Logs' },
          },
          required: ['name', 's3_bucket_name'],
        },
      },
      {
        name: 'start_logging',
        description: 'Start logging API calls for a CloudTrail trail',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Trail ARN or name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'stop_logging',
        description: 'Stop logging API calls for a CloudTrail trail (trail is preserved but no events are recorded)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Trail ARN or name' },
          },
          required: ['name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'lookup_events': return this.lookupEvents(args);
        case 'describe_trails': return this.describeTrails(args);
        case 'get_trail_status': return this.getTrailStatus(args);
        case 'create_trail': return this.createTrail(args);
        case 'start_logging': return this.startLogging(args);
        case 'stop_logging': return this.stopLogging(args);
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
    const kService = this.hmac(kRegion, 'cloudtrail');
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

    const credentialScope = `${dateStamp}/${this.region}/cloudtrail/aws4_request`;
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

  private async ctRequest(action: string, body: Record<string, unknown>): Promise<Response> {
    const url = `https://cloudtrail.${this.region}.amazonaws.com/`;
    const bodyStr = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `com.amazonaws.cloudtrail.v20131101.CloudTrail_20131101.${action}`,
    };
    const signed = this.signRequest('POST', url, headers, bodyStr);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body: bodyStr });
  }

  private async jsonResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `CloudTrail error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async lookupEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.lookup_attributes) {
      try { body.LookupAttributes = JSON.parse(args.lookup_attributes as string); } catch { return { content: [{ type: 'text', text: 'lookup_attributes must be valid JSON' }], isError: true }; }
    }
    if (args.start_time) body.StartTime = args.start_time;
    if (args.end_time) body.EndTime = args.end_time;
    if (args.max_results) body.MaxResults = args.max_results;
    if (args.next_token) body.NextToken = args.next_token;
    return this.jsonResult(await this.ctRequest('LookupEvents', body));
  }

  private async describeTrails(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.trail_name_list) body.trailNameList = (args.trail_name_list as string).split(',').map(s => s.trim());
    if (args.include_shadow_trails !== undefined) body.includeShadowTrails = args.include_shadow_trails;
    return this.jsonResult(await this.ctRequest('DescribeTrails', body));
  }

  private async getTrailStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.jsonResult(await this.ctRequest('GetTrailStatus', { Name: args.name }));
  }

  private async createTrail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.s3_bucket_name) return { content: [{ type: 'text', text: 'name and s3_bucket_name are required' }], isError: true };
    const body: Record<string, unknown> = { Name: args.name, S3BucketName: args.s3_bucket_name };
    if (args.include_global_service_events !== undefined) body.IncludeGlobalServiceEvents = args.include_global_service_events;
    if (args.is_multi_region_trail !== undefined) body.IsMultiRegionTrail = args.is_multi_region_trail;
    if (args.enable_log_file_validation !== undefined) body.EnableLogFileValidation = args.enable_log_file_validation;
    if (args.cloud_watch_logs_log_group_arn) body.CloudWatchLogsLogGroupArn = args.cloud_watch_logs_log_group_arn;
    if (args.cloud_watch_logs_role_arn) body.CloudWatchLogsRoleArn = args.cloud_watch_logs_role_arn;
    return this.jsonResult(await this.ctRequest('CreateTrail', body));
  }

  private async startLogging(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.jsonResult(await this.ctRequest('StartLogging', { Name: args.name }));
  }

  private async stopLogging(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.jsonResult(await this.ctRequest('StopLogging', { Name: args.name }));
  }
}
