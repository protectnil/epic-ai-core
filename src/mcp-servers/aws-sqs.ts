/**
 * AWS SQS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://sqs.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4), service=sqs
// API: Query API (Action=X&Version=2012-11-05), XML responses
// Docs: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSSQSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSSQSMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSSQSConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-sqs',
      displayName: 'AWS SQS',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'sqs', 'amazon', 'queue', 'messaging', 'fifo',
        'message queue', 'async', 'decoupling', 'worker',
      ],
      toolNames: [
        'list_queues', 'create_queue', 'delete_queue',
        'send_message', 'receive_message', 'delete_message',
        'get_queue_url', 'purge_queue',
      ],
      description: 'AWS SQS message queuing: create queues, send and receive messages, delete messages, and manage queue lifecycle.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_queues',
        description: 'List all SQS queues in the configured AWS region with optional name prefix filter',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name_prefix: { type: 'string', description: 'Filter queues by name prefix' },
            max_results: { type: 'number', description: 'Maximum number of queues to return (max 1000)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      {
        name: 'create_queue',
        description: 'Create a new SQS queue (standard or FIFO)',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: { type: 'string', description: 'Queue name. FIFO queues must end in .fifo' },
            visibility_timeout: { type: 'number', description: 'Message visibility timeout in seconds (0-43200, default: 30)' },
            message_retention_period: { type: 'number', description: 'Message retention in seconds (60-1209600, default: 345600=4 days)' },
            fifo_queue: { type: 'boolean', description: 'Set true to create a FIFO queue' },
            delay_seconds: { type: 'number', description: 'Delivery delay in seconds (0-900, default: 0)' },
          },
          required: ['queue_name'],
        },
      },
      {
        name: 'delete_queue',
        description: 'Delete an SQS queue and all its messages',
        inputSchema: {
          type: 'object',
          properties: {
            queue_url: { type: 'string', description: 'URL of the queue to delete' },
          },
          required: ['queue_url'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a message to an SQS queue',
        inputSchema: {
          type: 'object',
          properties: {
            queue_url: { type: 'string', description: 'URL of the target queue' },
            message_body: { type: 'string', description: 'Message body text (max 256KB)' },
            delay_seconds: { type: 'number', description: 'Delivery delay in seconds (0-900)' },
            message_group_id: { type: 'string', description: 'Message group ID (required for FIFO queues)' },
            message_deduplication_id: { type: 'string', description: 'Deduplication ID for FIFO queues' },
          },
          required: ['queue_url', 'message_body'],
        },
      },
      {
        name: 'receive_message',
        description: 'Receive one or more messages from an SQS queue',
        inputSchema: {
          type: 'object',
          properties: {
            queue_url: { type: 'string', description: 'URL of the queue to receive messages from' },
            max_number_of_messages: { type: 'number', description: 'Maximum messages to return (1-10, default: 1)' },
            visibility_timeout: { type: 'number', description: 'Visibility timeout override in seconds' },
            wait_time_seconds: { type: 'number', description: 'Long polling wait time (0-20 seconds, default: 0)' },
            attribute_names: { type: 'string', description: 'Comma-separated attributes to return: All, ApproximateReceiveCount, etc.' },
          },
          required: ['queue_url'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from an SQS queue after processing (using receipt handle)',
        inputSchema: {
          type: 'object',
          properties: {
            queue_url: { type: 'string', description: 'URL of the queue containing the message' },
            receipt_handle: { type: 'string', description: 'Receipt handle from a previous ReceiveMessage call' },
          },
          required: ['queue_url', 'receipt_handle'],
        },
      },
      {
        name: 'get_queue_url',
        description: 'Get the URL of an SQS queue by name',
        inputSchema: {
          type: 'object',
          properties: {
            queue_name: { type: 'string', description: 'Name of the queue' },
            queue_owner_aws_account_id: { type: 'string', description: 'AWS account ID of the queue owner (for cross-account access)' },
          },
          required: ['queue_name'],
        },
      },
      {
        name: 'purge_queue',
        description: 'Delete all messages in an SQS queue without deleting the queue itself',
        inputSchema: {
          type: 'object',
          properties: {
            queue_url: { type: 'string', description: 'URL of the queue to purge' },
          },
          required: ['queue_url'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_queues': return this.listQueues(args);
        case 'create_queue': return this.createQueue(args);
        case 'delete_queue': return this.deleteQueue(args);
        case 'send_message': return this.sendMessage(args);
        case 'receive_message': return this.receiveMessage(args);
        case 'delete_message': return this.deleteMessage(args);
        case 'get_queue_url': return this.getQueueUrl(args);
        case 'purge_queue': return this.purgeQueue(args);
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
    const kService = this.hmac(kRegion, 'sqs');
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

    const credentialScope = `${dateStamp}/${this.region}/sqs/aws4_request`;
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

  private async sqsRequest(params: Record<string, string>, queueUrl?: string): Promise<Response> {
    params.Version = '2012-11-05';
    const body = new URLSearchParams(params).toString();
    const url = queueUrl ?? `https://sqs.${this.region}.amazonaws.com/`;
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const signed = this.signRequest('POST', url, headers, body);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body });
  }

  private async xmlResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `SQS error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listQueues(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListQueues' };
    if (args.queue_name_prefix) params.QueueNamePrefix = args.queue_name_prefix as string;
    if (args.max_results) params.MaxResults = String(args.max_results);
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.xmlResult(await this.sqsRequest(params));
  }

  private async createQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    const params: Record<string, string> = { Action: 'CreateQueue', QueueName: args.queue_name as string };
    let attrIdx = 1;
    if (args.visibility_timeout !== undefined) {
      params[`Attribute.${attrIdx}.Name`] = 'VisibilityTimeout';
      params[`Attribute.${attrIdx}.Value`] = String(args.visibility_timeout);
      attrIdx++;
    }
    if (args.message_retention_period !== undefined) {
      params[`Attribute.${attrIdx}.Name`] = 'MessageRetentionPeriod';
      params[`Attribute.${attrIdx}.Value`] = String(args.message_retention_period);
      attrIdx++;
    }
    if (args.fifo_queue) {
      params[`Attribute.${attrIdx}.Name`] = 'FifoQueue';
      params[`Attribute.${attrIdx}.Value`] = 'true';
      attrIdx++;
    }
    if (args.delay_seconds !== undefined) {
      params[`Attribute.${attrIdx}.Name`] = 'DelaySeconds';
      params[`Attribute.${attrIdx}.Value`] = String(args.delay_seconds);
    }
    return this.xmlResult(await this.sqsRequest(params));
  }

  private async deleteQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_url) return { content: [{ type: 'text', text: 'queue_url is required' }], isError: true };
    return this.xmlResult(await this.sqsRequest({ Action: 'DeleteQueue' }, args.queue_url as string));
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_url || !args.message_body) return { content: [{ type: 'text', text: 'queue_url and message_body are required' }], isError: true };
    const params: Record<string, string> = { Action: 'SendMessage', MessageBody: args.message_body as string };
    if (args.delay_seconds !== undefined) params.DelaySeconds = String(args.delay_seconds);
    if (args.message_group_id) params.MessageGroupId = args.message_group_id as string;
    if (args.message_deduplication_id) params.MessageDeduplicationId = args.message_deduplication_id as string;
    return this.xmlResult(await this.sqsRequest(params, args.queue_url as string));
  }

  private async receiveMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_url) return { content: [{ type: 'text', text: 'queue_url is required' }], isError: true };
    const params: Record<string, string> = { Action: 'ReceiveMessage' };
    if (args.max_number_of_messages) params.MaxNumberOfMessages = String(args.max_number_of_messages);
    if (args.visibility_timeout !== undefined) params.VisibilityTimeout = String(args.visibility_timeout);
    if (args.wait_time_seconds !== undefined) params.WaitTimeSeconds = String(args.wait_time_seconds);
    if (args.attribute_names) {
      (args.attribute_names as string).split(',').map(a => a.trim()).forEach((attr, i) => {
        params[`AttributeName.${i + 1}`] = attr;
      });
    }
    return this.xmlResult(await this.sqsRequest(params, args.queue_url as string));
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_url || !args.receipt_handle) return { content: [{ type: 'text', text: 'queue_url and receipt_handle are required' }], isError: true };
    return this.xmlResult(await this.sqsRequest({ Action: 'DeleteMessage', ReceiptHandle: args.receipt_handle as string }, args.queue_url as string));
  }

  private async getQueueUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_name) return { content: [{ type: 'text', text: 'queue_name is required' }], isError: true };
    const params: Record<string, string> = { Action: 'GetQueueUrl', QueueName: args.queue_name as string };
    if (args.queue_owner_aws_account_id) params.QueueOwnerAWSAccountId = args.queue_owner_aws_account_id as string;
    return this.xmlResult(await this.sqsRequest(params));
  }

  private async purgeQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queue_url) return { content: [{ type: 'text', text: 'queue_url is required' }], isError: true };
    return this.xmlResult(await this.sqsRequest({ Action: 'PurgeQueue' }, args.queue_url as string));
  }
}
