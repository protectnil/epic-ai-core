/**
 * AWS SNS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://sns.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4), service=sns
// API: Query API (Action=X&Version=2010-03-31), XML responses
// Docs: https://docs.aws.amazon.com/sns/latest/api/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSSNSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSSNSMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSSNSConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-sns',
      displayName: 'AWS SNS',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'sns', 'amazon', 'notifications', 'pub-sub', 'messaging',
        'topics', 'subscriptions', 'push', 'fanout',
      ],
      toolNames: [
        'list_topics', 'create_topic', 'delete_topic',
        'publish', 'subscribe', 'unsubscribe', 'list_subscriptions',
      ],
      description: 'AWS SNS pub/sub messaging: create topics, publish messages, manage subscriptions, and send push notifications.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_topics',
        description: 'List all SNS topics in the configured AWS region',
        inputSchema: {
          type: 'object',
          properties: {
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      {
        name: 'create_topic',
        description: 'Create a new SNS topic',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Topic name (1-256 chars, alphanumeric, hyphens, underscores). FIFO topics must end in .fifo' },
            fifo_topic: { type: 'string', description: 'Set to true to create a FIFO topic' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_topic',
        description: 'Delete an SNS topic and all its subscriptions',
        inputSchema: {
          type: 'object',
          properties: {
            topic_arn: { type: 'string', description: 'ARN of the topic to delete' },
          },
          required: ['topic_arn'],
        },
      },
      {
        name: 'publish',
        description: 'Publish a message to an SNS topic or directly to a phone number (SMS)',
        inputSchema: {
          type: 'object',
          properties: {
            topic_arn: { type: 'string', description: 'ARN of the target topic (use this OR target_arn OR phone_number)' },
            target_arn: { type: 'string', description: 'ARN of a specific endpoint or topic' },
            phone_number: { type: 'string', description: 'Phone number in E.164 format for SMS (e.g. +12125551234)' },
            message: { type: 'string', description: 'Message to publish' },
            subject: { type: 'string', description: 'Subject for email subscriptions' },
            message_structure: { type: 'string', description: 'Set to json to send different messages per protocol' },
          },
          required: ['message'],
        },
      },
      {
        name: 'subscribe',
        description: 'Subscribe an endpoint to an SNS topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic_arn: { type: 'string', description: 'ARN of the topic to subscribe to' },
            protocol: { type: 'string', description: 'Protocol: http, https, email, email-json, sms, sqs, lambda, firehose, application' },
            endpoint: { type: 'string', description: 'Endpoint to subscribe (URL, email address, phone number, SQS ARN, Lambda ARN, etc.)' },
          },
          required: ['topic_arn', 'protocol', 'endpoint'],
        },
      },
      {
        name: 'unsubscribe',
        description: 'Remove a subscription from an SNS topic',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_arn: { type: 'string', description: 'ARN of the subscription to remove' },
          },
          required: ['subscription_arn'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List all SNS subscriptions in the account or filtered by topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic_arn: { type: 'string', description: 'Filter subscriptions by topic ARN' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_topics': return this.listTopics(args);
        case 'create_topic': return this.createTopic(args);
        case 'delete_topic': return this.deleteTopic(args);
        case 'publish': return this.publishMessage(args);
        case 'subscribe': return this.subscribe(args);
        case 'unsubscribe': return this.unsubscribe(args);
        case 'list_subscriptions': return this.listSubscriptions(args);
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
    const kService = this.hmac(kRegion, 'sns');
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

    const credentialScope = `${dateStamp}/${this.region}/sns/aws4_request`;
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

  private async snsRequest(params: Record<string, string>): Promise<Response> {
    params.Version = '2010-03-31';
    const body = new URLSearchParams(params).toString();
    const url = `https://sns.${this.region}.amazonaws.com/`;
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const signed = this.signRequest('POST', url, headers, body);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body });
  }

  private async xmlResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `SNS error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listTopics(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListTopics' };
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.xmlResult(await this.snsRequest(params));
  }

  private async createTopic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const params: Record<string, string> = { Action: 'CreateTopic', Name: args.name as string };
    if (args.fifo_topic) params['Attributes.entry.1.key'] = 'FifoTopic', params['Attributes.entry.1.value'] = args.fifo_topic as string;
    return this.xmlResult(await this.snsRequest(params));
  }

  private async deleteTopic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.topic_arn) return { content: [{ type: 'text', text: 'topic_arn is required' }], isError: true };
    return this.xmlResult(await this.snsRequest({ Action: 'DeleteTopic', TopicArn: args.topic_arn as string }));
  }

  private async publishMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message) return { content: [{ type: 'text', text: 'message is required' }], isError: true };
    const params: Record<string, string> = { Action: 'Publish', Message: args.message as string };
    if (args.topic_arn) params.TopicArn = args.topic_arn as string;
    if (args.target_arn) params.TargetArn = args.target_arn as string;
    if (args.phone_number) params.PhoneNumber = args.phone_number as string;
    if (args.subject) params.Subject = args.subject as string;
    if (args.message_structure) params.MessageStructure = args.message_structure as string;
    return this.xmlResult(await this.snsRequest(params));
  }

  private async subscribe(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.topic_arn || !args.protocol || !args.endpoint) {
      return { content: [{ type: 'text', text: 'topic_arn, protocol, and endpoint are required' }], isError: true };
    }
    return this.xmlResult(await this.snsRequest({
      Action: 'Subscribe',
      TopicArn: args.topic_arn as string,
      Protocol: args.protocol as string,
      Endpoint: args.endpoint as string,
    }));
  }

  private async unsubscribe(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subscription_arn) return { content: [{ type: 'text', text: 'subscription_arn is required' }], isError: true };
    return this.xmlResult(await this.snsRequest({ Action: 'Unsubscribe', SubscriptionArn: args.subscription_arn as string }));
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = args.topic_arn
      ? { Action: 'ListSubscriptionsByTopic', TopicArn: args.topic_arn as string }
      : { Action: 'ListSubscriptions' };
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.xmlResult(await this.snsRequest(params));
  }
}
