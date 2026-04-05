/**
 * AWS ECS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://ecs.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4), service=ecs
// API: JSON API, X-Amz-Target: AmazonEC2ContainerServiceV20141113.{Action}
// Docs: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSECSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSECSMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSECSConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-ecs',
      displayName: 'AWS ECS',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'ecs', 'amazon', 'containers', 'docker', 'fargate',
        'clusters', 'services', 'tasks', 'container orchestration',
      ],
      toolNames: [
        'list_clusters', 'describe_clusters', 'list_services', 'describe_services',
        'list_tasks', 'describe_tasks', 'run_task', 'stop_task', 'update_service',
      ],
      description: 'AWS ECS container orchestration: manage clusters, services, and tasks with Fargate or EC2 launch types.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clusters',
        description: 'List all ECS clusters in the configured AWS region',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Maximum number of clusters to return' },
            next_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'describe_clusters',
        description: 'Describe one or more ECS clusters by ARN or name',
        inputSchema: {
          type: 'object',
          properties: {
            clusters: { type: 'string', description: 'Comma-separated list of cluster ARNs or names' },
            include: { type: 'string', description: 'Comma-separated additional data to include: ATTACHMENTS, CONFIGURATIONS, SETTINGS, STATISTICS, TAGS' },
          },
        },
      },
      {
        name: 'list_services',
        description: 'List services in an ECS cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster: { type: 'string', description: 'Cluster ARN or name (default: default cluster)' },
            max_results: { type: 'number', description: 'Maximum number of services to return' },
            next_token: { type: 'string', description: 'Pagination token' },
            launch_type: { type: 'string', description: 'Filter by launch type: EC2, FARGATE, or EXTERNAL' },
          },
        },
      },
      {
        name: 'describe_services',
        description: 'Describe one or more ECS services in a cluster',
        inputSchema: {
          type: 'object',
          properties: {
            services: { type: 'string', description: 'Comma-separated list of service ARNs or names' },
            cluster: { type: 'string', description: 'Cluster ARN or name (default: default cluster)' },
          },
          required: ['services'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks in an ECS cluster, optionally filtered by service or status',
        inputSchema: {
          type: 'object',
          properties: {
            cluster: { type: 'string', description: 'Cluster ARN or name' },
            service_name: { type: 'string', description: 'Filter tasks by service name' },
            desired_status: { type: 'string', description: 'Filter by status: RUNNING, PENDING, or STOPPED' },
            max_results: { type: 'number', description: 'Maximum number of tasks to return' },
            next_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'describe_tasks',
        description: 'Describe one or more ECS tasks by ARN',
        inputSchema: {
          type: 'object',
          properties: {
            tasks: { type: 'string', description: 'Comma-separated list of task ARNs' },
            cluster: { type: 'string', description: 'Cluster ARN or name' },
          },
          required: ['tasks'],
        },
      },
      {
        name: 'run_task',
        description: 'Run a new ECS task using a task definition',
        inputSchema: {
          type: 'object',
          properties: {
            task_definition: { type: 'string', description: 'Task definition ARN or family:revision' },
            cluster: { type: 'string', description: 'Cluster ARN or name (default: default cluster)' },
            launch_type: { type: 'string', description: 'FARGATE or EC2 (default: EC2)' },
            count: { type: 'number', description: 'Number of task instances to run (default: 1)' },
            network_configuration: { type: 'string', description: 'JSON NetworkConfiguration for Fargate tasks' },
          },
          required: ['task_definition'],
        },
      },
      {
        name: 'stop_task',
        description: 'Stop a running ECS task',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Task ARN or ID to stop' },
            cluster: { type: 'string', description: 'Cluster ARN or name' },
            reason: { type: 'string', description: 'Reason for stopping the task' },
          },
          required: ['task'],
        },
      },
      {
        name: 'update_service',
        description: 'Update an ECS service — change desired count, task definition, or deployment configuration',
        inputSchema: {
          type: 'object',
          properties: {
            service: { type: 'string', description: 'Service ARN or name' },
            cluster: { type: 'string', description: 'Cluster ARN or name' },
            desired_count: { type: 'number', description: 'New desired task count' },
            task_definition: { type: 'string', description: 'New task definition ARN or family:revision' },
            force_new_deployment: { type: 'boolean', description: 'Force a new deployment even if no changes (default: false)' },
          },
          required: ['service'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_clusters': return this.listClusters(args);
        case 'describe_clusters': return this.describeClusters(args);
        case 'list_services': return this.listServices(args);
        case 'describe_services': return this.describeServices(args);
        case 'list_tasks': return this.listTasks(args);
        case 'describe_tasks': return this.describeTasks(args);
        case 'run_task': return this.runTask(args);
        case 'stop_task': return this.stopTask(args);
        case 'update_service': return this.updateService(args);
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
    const kService = this.hmac(kRegion, 'ecs');
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

    const credentialScope = `${dateStamp}/${this.region}/ecs/aws4_request`;
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

  private async ecsRequest(action: string, body: Record<string, unknown>): Promise<Response> {
    const url = `https://ecs.${this.region}.amazonaws.com/`;
    const bodyStr = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AmazonEC2ContainerServiceV20141113.${action}`,
    };
    const signed = this.signRequest('POST', url, headers, bodyStr);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body: bodyStr });
  }

  private async jsonResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `ECS error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.max_results) body.maxResults = args.max_results;
    if (args.next_token) body.nextToken = args.next_token;
    return this.jsonResult(await this.ecsRequest('ListClusters', body));
  }

  private async describeClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.clusters) body.clusters = (args.clusters as string).split(',').map(s => s.trim());
    if (args.include) body.include = (args.include as string).split(',').map(s => s.trim());
    return this.jsonResult(await this.ecsRequest('DescribeClusters', body));
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.cluster) body.cluster = args.cluster;
    if (args.max_results) body.maxResults = args.max_results;
    if (args.next_token) body.nextToken = args.next_token;
    if (args.launch_type) body.launchType = args.launch_type;
    return this.jsonResult(await this.ecsRequest('ListServices', body));
  }

  private async describeServices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.services) return { content: [{ type: 'text', text: 'services is required' }], isError: true };
    const body: Record<string, unknown> = { services: (args.services as string).split(',').map(s => s.trim()) };
    if (args.cluster) body.cluster = args.cluster;
    return this.jsonResult(await this.ecsRequest('DescribeServices', body));
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.cluster) body.cluster = args.cluster;
    if (args.service_name) body.serviceName = args.service_name;
    if (args.desired_status) body.desiredStatus = args.desired_status;
    if (args.max_results) body.maxResults = args.max_results;
    if (args.next_token) body.nextToken = args.next_token;
    return this.jsonResult(await this.ecsRequest('ListTasks', body));
  }

  private async describeTasks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tasks) return { content: [{ type: 'text', text: 'tasks is required' }], isError: true };
    const body: Record<string, unknown> = { tasks: (args.tasks as string).split(',').map(s => s.trim()) };
    if (args.cluster) body.cluster = args.cluster;
    return this.jsonResult(await this.ecsRequest('DescribeTasks', body));
  }

  private async runTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.task_definition) return { content: [{ type: 'text', text: 'task_definition is required' }], isError: true };
    const body: Record<string, unknown> = { taskDefinition: args.task_definition };
    if (args.cluster) body.cluster = args.cluster;
    if (args.launch_type) body.launchType = args.launch_type;
    if (args.count) body.count = args.count;
    if (args.network_configuration) {
      try { body.networkConfiguration = JSON.parse(args.network_configuration as string); } catch { return { content: [{ type: 'text', text: 'network_configuration must be valid JSON' }], isError: true }; }
    }
    return this.jsonResult(await this.ecsRequest('RunTask', body));
  }

  private async stopTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.task) return { content: [{ type: 'text', text: 'task is required' }], isError: true };
    const body: Record<string, unknown> = { task: args.task };
    if (args.cluster) body.cluster = args.cluster;
    if (args.reason) body.reason = args.reason;
    return this.jsonResult(await this.ecsRequest('StopTask', body));
  }

  private async updateService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service) return { content: [{ type: 'text', text: 'service is required' }], isError: true };
    const body: Record<string, unknown> = { service: args.service };
    if (args.cluster) body.cluster = args.cluster;
    if (args.desired_count !== undefined) body.desiredCount = args.desired_count;
    if (args.task_definition) body.taskDefinition = args.task_definition;
    if (args.force_new_deployment !== undefined) body.forceNewDeployment = args.force_new_deployment;
    return this.jsonResult(await this.ecsRequest('UpdateService', body));
  }
}
