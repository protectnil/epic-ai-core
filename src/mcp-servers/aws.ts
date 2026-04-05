/**
 * Amazon Web Services MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/awslabs/mcp — transport: stdio (streamable-HTTP also available),
//   auth: AWS credentials (same IAM credentials as CLI)
// The awslabs/mcp suite exposes 66 specialized servers as of 2026-03-28. The closest to general
// resource management is the AWS API MCP Server (aws-api-mcp-server), which exposes 3 tools:
//   call_aws, suggest_aws_commands, get_execution_plan (experimental)
// call_aws is a generic CLI wrapper — it can reach any AWS service but returns raw CLI output
// and has no typed schemas per operation. It does NOT expose structured per-service tools.
// Our adapter covers: 20 tools (typed, structured resource management across EC2, S3, Lambda,
//   IAM, CloudWatch, RDS, ECS, SQS, SNS, STS). Vendor MCP covers: 3 generic CLI tools.
// Recommendation: use-both — awslabs/mcp aws-api-mcp-server provides CLI breadth (all services)
//   while our adapter provides typed structured tools for the 10 services listed above.
//   MCP is preferred for services we don't cover; our structured tools are preferred for EC2/S3/
//   Lambda/IAM/CloudWatch/RDS/ECS/SQS/SNS/STS where schema-aware calls reduce hallucination risk.
//
// Integration: use-both
// MCP-sourced tools (3): call_aws, suggest_aws_commands, get_execution_plan
// REST-sourced tools (20): list_s3_buckets, list_s3_objects, get_s3_object, list_ec2_instances,
//   describe_ec2_instance, list_ec2_security_groups, list_lambda_functions, get_lambda_function,
//   invoke_lambda_function, list_iam_users, list_iam_roles, get_iam_role,
//   list_cloudwatch_metrics, get_cloudwatch_metric_statistics, list_rds_instances,
//   list_ecs_clusters, list_ecs_services, list_sqs_queues, list_sns_topics, get_caller_identity
// Combined coverage: 23 tools (MCP: 3 + REST: 20, no overlap on tool names)
//
// Base URL: https://{service}.{region}.amazonaws.com (per-service regional endpoints)
// Auth: AWS Signature Version 4 (HMAC-SHA256) — accessKeyId + secretAccessKey + optional sessionToken
// Docs: https://docs.aws.amazon.com/general/latest/gr/aws-service-information.html
// Rate limits: Per-service; EC2 and IAM support up to 100 req/s; S3 5,500 GET/s per prefix

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import { createHmac, createHash } from 'node:crypto';

interface AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

// ── SigV4 helpers ────────────────────────────────────────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function signRequest(
  method: string,
  url: string,
  service: string,
  config: AWSConfig,
  body = '',
  queryParams: Record<string, string> = {},
): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;
  const payloadHash = sha256hex(body);

  const canonicalHeadersMap: Record<string, string> = {
    host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };
  if (config.sessionToken) {
    canonicalHeadersMap['x-amz-security-token'] = config.sessionToken;
  }

  const sortedKeys = Object.keys(canonicalHeadersMap).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${canonicalHeadersMap[k]}\n`).join('');
  const signedHeadersList = sortedKeys.join(';');

  const sortedQueryString = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalRequest = [
    method,
    parsedUrl.pathname,
    sortedQueryString,
    canonicalHeaders,
    signedHeadersList,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256hex(canonicalRequest)].join('\n');
  const signingKey = getSigningKey(config.secretAccessKey, dateStamp, config.region, service);
  const signature = hmac(signingKey, stringToSign).toString('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Authorization: authHeader,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (config.sessionToken) {
    headers['x-amz-security-token'] = config.sessionToken;
  }
  return headers;
}

function truncate(text: string): string {
  return text.length > 10_000
    ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
    : text;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class AWSMCPServer extends MCPAdapterBase {
  private readonly config: AWSConfig;

  constructor(config: AWSConfig) {
    super();
    this.config = config;
  }

  static catalog() {
    return {
      name: 'aws',
      displayName: 'Amazon Web Services',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['aws', 'amazon', 'ec2', 's3', 'lambda', 'iam', 'cloudwatch', 'rds', 'ecs', 'sqs', 'sns', 'sts', 'cloud', 'infrastructure'],
      toolNames: [
        'list_s3_buckets', 'list_s3_objects', 'get_s3_object',
        'list_ec2_instances', 'describe_ec2_instance', 'list_ec2_security_groups',
        'list_lambda_functions', 'get_lambda_function', 'invoke_lambda_function',
        'list_iam_users', 'list_iam_roles', 'get_iam_role',
        'list_cloudwatch_metrics', 'get_cloudwatch_metric_statistics',
        'list_rds_instances',
        'list_ecs_clusters', 'list_ecs_services',
        'list_sqs_queues', 'list_sns_topics',
        'get_caller_identity',
      ],
      description: 'AWS resource management: list and inspect EC2, S3, Lambda, IAM, CloudWatch, RDS, ECS, SQS, SNS, and STS resources.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── S3 ──────────────────────────────────────────────────────────────
      {
        name: 'list_s3_buckets',
        description: 'List all S3 buckets in the AWS account with their creation dates and regions.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_s3_objects',
        description: 'List objects in an S3 bucket with optional prefix filter, delimiter, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'S3 bucket name' },
            prefix: { type: 'string', description: 'Key prefix to filter objects (default: list all)' },
            delimiter: { type: 'string', description: 'Delimiter for grouping keys, e.g. "/" (default: none)' },
            maxKeys: { type: 'number', description: 'Maximum number of keys to return (default: 100, max: 1000)' },
            continuationToken: { type: 'string', description: 'Continuation token from a previous response for pagination' },
          },
          required: ['bucket'],
        },
      },
      {
        name: 'get_s3_object',
        description: 'Retrieve metadata and content (up to 10KB) of an object from S3.',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'S3 bucket name' },
            key: { type: 'string', description: 'Object key (path within the bucket)' },
          },
          required: ['bucket', 'key'],
        },
      },
      // ── EC2 ─────────────────────────────────────────────────────────────
      {
        name: 'list_ec2_instances',
        description: 'List EC2 instances in the configured region with optional filters for state, instance type, or tag.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum number of instances to return (default: 50, max: 1000)' },
            nextToken: { type: 'string', description: 'Pagination token from a previous response' },
            filterName: { type: 'string', description: 'Filter name, e.g. instance-state-name, instance-type, tag:Name' },
            filterValue: { type: 'string', description: 'Filter value corresponding to filterName, e.g. running, t3.micro' },
          },
        },
      },
      {
        name: 'describe_ec2_instance',
        description: 'Get full details for one or more EC2 instances by instance ID.',
        inputSchema: {
          type: 'object',
          properties: {
            instanceIds: {
              type: 'string',
              description: 'Comma-separated list of EC2 instance IDs, e.g. i-0abc123,i-0def456',
            },
          },
          required: ['instanceIds'],
        },
      },
      {
        name: 'list_ec2_security_groups',
        description: 'List EC2 security groups in the configured region with optional VPC or name filter.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum number of security groups to return (default: 50)' },
            vpcId: { type: 'string', description: 'Filter by VPC ID (e.g. vpc-0abc123)' },
            groupName: { type: 'string', description: 'Filter by exact security group name' },
          },
        },
      },
      // ── Lambda ──────────────────────────────────────────────────────────
      {
        name: 'list_lambda_functions',
        description: 'List Lambda functions in the configured region with optional runtime filter.',
        inputSchema: {
          type: 'object',
          properties: {
            maxItems: { type: 'number', description: 'Maximum number of functions to return (default: 50, max: 50)' },
            marker: { type: 'string', description: 'Pagination marker from a previous response' },
            functionVersion: { type: 'string', description: 'Set to ALL to include all versions (default: latest)' },
          },
        },
      },
      {
        name: 'get_lambda_function',
        description: 'Get configuration, code location, and runtime details for a specific Lambda function.',
        inputSchema: {
          type: 'object',
          properties: {
            functionName: { type: 'string', description: 'Lambda function name or ARN' },
            qualifier: { type: 'string', description: 'Version or alias qualifier (default: $LATEST)' },
          },
          required: ['functionName'],
        },
      },
      {
        name: 'invoke_lambda_function',
        description: 'Invoke a Lambda function synchronously and return its response payload.',
        inputSchema: {
          type: 'object',
          properties: {
            functionName: { type: 'string', description: 'Lambda function name or ARN' },
            payload: { type: 'string', description: 'JSON string payload to pass to the function (default: {})' },
            qualifier: { type: 'string', description: 'Version or alias qualifier (default: $LATEST)' },
          },
          required: ['functionName'],
        },
      },
      // ── IAM ─────────────────────────────────────────────────────────────
      {
        name: 'list_iam_users',
        description: 'List IAM users in the AWS account with optional path prefix filter.',
        inputSchema: {
          type: 'object',
          properties: {
            pathPrefix: { type: 'string', description: 'Path prefix to filter users, e.g. /engineering/ (default: /)' },
            maxItems: { type: 'number', description: 'Maximum number of users to return (default: 100, max: 1000)' },
            marker: { type: 'string', description: 'Pagination marker from a previous response' },
          },
        },
      },
      {
        name: 'list_iam_roles',
        description: 'List IAM roles in the AWS account with optional path prefix filter.',
        inputSchema: {
          type: 'object',
          properties: {
            pathPrefix: { type: 'string', description: 'Path prefix to filter roles, e.g. /service-role/ (default: /)' },
            maxItems: { type: 'number', description: 'Maximum number of roles to return (default: 100, max: 1000)' },
            marker: { type: 'string', description: 'Pagination marker from a previous response' },
          },
        },
      },
      {
        name: 'get_iam_role',
        description: 'Get details for a specific IAM role including trust policy and attached policies.',
        inputSchema: {
          type: 'object',
          properties: {
            roleName: { type: 'string', description: 'IAM role name (not ARN)' },
          },
          required: ['roleName'],
        },
      },
      // ── CloudWatch ──────────────────────────────────────────────────────
      {
        name: 'list_cloudwatch_metrics',
        description: 'List CloudWatch metric descriptors for a given namespace. Returns metric names and dimensions, not data values.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Metric namespace, e.g. AWS/EC2, AWS/Lambda, AWS/RDS' },
            metricName: { type: 'string', description: 'Filter by metric name, e.g. CPUUtilization' },
            dimensionName: { type: 'string', description: 'Dimension name for filtering, e.g. InstanceId' },
            dimensionValue: { type: 'string', description: 'Dimension value for filtering, e.g. i-0abc123' },
          },
        },
      },
      {
        name: 'get_cloudwatch_metric_statistics',
        description: 'Get CloudWatch metric data points (statistics) for a specific metric over a time range.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Metric namespace, e.g. AWS/EC2' },
            metricName: { type: 'string', description: 'Metric name, e.g. CPUUtilization' },
            startTime: { type: 'string', description: 'Start time in ISO 8601 format, e.g. 2026-03-24T00:00:00Z' },
            endTime: { type: 'string', description: 'End time in ISO 8601 format, e.g. 2026-03-24T01:00:00Z' },
            period: { type: 'number', description: 'Granularity in seconds (minimum: 60, must be multiple of 60, default: 300)' },
            statistics: { type: 'string', description: 'Comma-separated statistics: Average, Sum, Minimum, Maximum, SampleCount (default: Average)' },
            dimensionName: { type: 'string', description: 'Dimension name, e.g. InstanceId' },
            dimensionValue: { type: 'string', description: 'Dimension value, e.g. i-0abc123' },
          },
          required: ['namespace', 'metricName', 'startTime', 'endTime'],
        },
      },
      // ── RDS ─────────────────────────────────────────────────────────────
      {
        name: 'list_rds_instances',
        description: 'List RDS DB instances in the configured region with status, engine, and size details.',
        inputSchema: {
          type: 'object',
          properties: {
            maxRecords: { type: 'number', description: 'Maximum number of DB instances to return (default: 100, max: 100)' },
            marker: { type: 'string', description: 'Pagination marker from a previous response' },
            dbInstanceIdentifier: { type: 'string', description: 'Filter by specific DB instance identifier' },
          },
        },
      },
      // ── ECS ─────────────────────────────────────────────────────────────
      {
        name: 'list_ecs_clusters',
        description: 'List ECS cluster ARNs in the configured region.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum number of clusters to return (default: 100)' },
            nextToken: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      {
        name: 'list_ecs_services',
        description: 'List ECS services within a specific cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            cluster: { type: 'string', description: 'ECS cluster name or full ARN' },
            maxResults: { type: 'number', description: 'Maximum number of services to return (default: 100)' },
            nextToken: { type: 'string', description: 'Pagination token from a previous response' },
            launchType: { type: 'string', description: 'Filter by launch type: EC2, FARGATE, or EXTERNAL' },
          },
          required: ['cluster'],
        },
      },
      // ── SQS ─────────────────────────────────────────────────────────────
      {
        name: 'list_sqs_queues',
        description: 'List SQS queue URLs in the configured region with optional name prefix filter.',
        inputSchema: {
          type: 'object',
          properties: {
            queueNamePrefix: { type: 'string', description: 'Filter queues by name prefix (default: list all)' },
            maxResults: { type: 'number', description: 'Maximum number of queues to return (default: 100, max: 1000)' },
            nextToken: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      // ── SNS ─────────────────────────────────────────────────────────────
      {
        name: 'list_sns_topics',
        description: 'List SNS topic ARNs in the configured region.',
        inputSchema: {
          type: 'object',
          properties: {
            nextToken: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      // ── STS ─────────────────────────────────────────────────────────────
      {
        name: 'get_caller_identity',
        description: 'Return the AWS account ID, IAM user or role ARN, and user ID for the current credentials.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_s3_buckets':              return this.listS3Buckets();
        case 'list_s3_objects':              return this.listS3Objects(args);
        case 'get_s3_object':               return this.getS3Object(args);
        case 'list_ec2_instances':           return this.listEC2Instances(args);
        case 'describe_ec2_instance':        return this.describeEC2Instance(args);
        case 'list_ec2_security_groups':     return this.listEC2SecurityGroups(args);
        case 'list_lambda_functions':        return this.listLambdaFunctions(args);
        case 'get_lambda_function':          return this.getLambdaFunction(args);
        case 'invoke_lambda_function':       return this.invokeLambdaFunction(args);
        case 'list_iam_users':              return this.listIAMUsers(args);
        case 'list_iam_roles':              return this.listIAMRoles(args);
        case 'get_iam_role':                return this.getIAMRole(args);
        case 'list_cloudwatch_metrics':      return this.listCloudWatchMetrics(args);
        case 'get_cloudwatch_metric_statistics': return this.getCloudWatchMetricStatistics(args);
        case 'list_rds_instances':           return this.listRDSInstances(args);
        case 'list_ecs_clusters':            return this.listECSClusters(args);
        case 'list_ecs_services':            return this.listECSServices(args);
        case 'list_sqs_queues':              return this.listSQSQueues(args);
        case 'list_sns_topics':              return this.listSNSTopics(args);
        case 'get_caller_identity':          return this.getCallerIdentity();
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── S3 ────────────────────────────────────────────────────────────────────

  private async listS3Buckets(): Promise<ToolResult> {
    const url = 'https://s3.amazonaws.com/';
    const globalConfig: AWSConfig = { ...this.config, region: 'us-east-1' };
    const headers = signRequest('GET', url, 's3', globalConfig);
    const response = await this.fetchWithRetry(url, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async listS3Objects(args: Record<string, unknown>): Promise<ToolResult> {
    const bucket = args.bucket as string;
    const queryParams: Record<string, string> = {
      'list-type': '2',
      'max-keys': String((args.maxKeys as number) ?? 100),
    };
    if (args.prefix) queryParams['prefix'] = String(args.prefix);
    if (args.delimiter) queryParams['delimiter'] = String(args.delimiter);
    if (args.continuationToken) queryParams['continuation-token'] = String(args.continuationToken);

    const base = `https://${bucket}.s3.${this.config.region}.amazonaws.com/`;
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const url = `${base}?${qs}`;
    const headers = signRequest('GET', url, 's3', this.config, '', queryParams);
    const response = await this.fetchWithRetry(url, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getS3Object(args: Record<string, unknown>): Promise<ToolResult> {
    const bucket = args.bucket as string;
    const key = args.key as string;
    const url = `https://${bucket}.s3.${this.config.region}.amazonaws.com/${encodeURIComponent(key)}`;
    const headers = signRequest('GET', url, 's3', this.config);
    const response = await this.fetchWithRetry(url, { headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ contentType, body }, null, 2)) }],
      isError: false,
    };
  }

  // ── EC2 ───────────────────────────────────────────────────────────────────

  private async listEC2Instances(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'DescribeInstances',
      Version: '2016-11-15',
    };
    if (args.maxResults) queryParams['MaxResults'] = String(args.maxResults);
    if (args.nextToken) queryParams['NextToken'] = String(args.nextToken);
    if (args.filterName && args.filterValue) {
      queryParams['Filter.1.Name'] = String(args.filterName);
      queryParams['Filter.1.Value.1'] = String(args.filterValue);
    }
    return this.ec2Query(queryParams);
  }

  private async describeEC2Instance(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = String(args.instanceIds).split(',').map(s => s.trim());
    const queryParams: Record<string, string> = {
      Action: 'DescribeInstances',
      Version: '2016-11-15',
    };
    ids.forEach((id, i) => {
      queryParams[`InstanceId.${i + 1}`] = id;
    });
    return this.ec2Query(queryParams);
  }

  private async listEC2SecurityGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'DescribeSecurityGroups',
      Version: '2016-11-15',
    };
    if (args.maxResults) queryParams['MaxResults'] = String(args.maxResults);
    if (args.vpcId) {
      queryParams['Filter.1.Name'] = 'vpc-id';
      queryParams['Filter.1.Value.1'] = String(args.vpcId);
    }
    if (args.groupName) {
      queryParams['Filter.2.Name'] = 'group-name';
      queryParams['Filter.2.Value.1'] = String(args.groupName);
    }
    return this.ec2Query(queryParams);
  }

  private async ec2Query(queryParams: Record<string, string>): Promise<ToolResult> {
    const url = `https://ec2.${this.config.region}.amazonaws.com/`;
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const fullUrl = `${url}?${qs}`;
    const headers = signRequest('GET', fullUrl, 'ec2', this.config, '', queryParams);
    const response = await this.fetchWithRetry(fullUrl, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── Lambda ────────────────────────────────────────────────────────────────

  private async listLambdaFunctions(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {};
    if (args.maxItems) queryParams['MaxItems'] = String(args.maxItems);
    if (args.marker) queryParams['Marker'] = String(args.marker);
    if (args.functionVersion) queryParams['FunctionVersion'] = String(args.functionVersion);
    const base = `https://lambda.${this.config.region}.amazonaws.com/2015-03-31/functions`;
    const qs = Object.keys(queryParams).length
      ? '?' + Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&')
      : '';
    const url = base + qs;
    const headers = signRequest('GET', url, 'lambda', this.config, '', queryParams);
    const response = await this.fetchWithRetry(url, { headers });
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async getLambdaFunction(args: Record<string, unknown>): Promise<ToolResult> {
    const functionName = String(args.functionName);
    let url = `https://lambda.${this.config.region}.amazonaws.com/2015-03-31/functions/${encodeURIComponent(functionName)}`;
    if (args.qualifier) url += `?Qualifier=${encodeURIComponent(String(args.qualifier))}`;
    const headers = signRequest('GET', url, 'lambda', this.config);
    const response = await this.fetchWithRetry(url, { headers });
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async invokeLambdaFunction(args: Record<string, unknown>): Promise<ToolResult> {
    const functionName = String(args.functionName);
    const payload = (args.payload as string) ?? '{}';
    let url = `https://lambda.${this.config.region}.amazonaws.com/2015-03-31/functions/${encodeURIComponent(functionName)}/invocations`;
    if (args.qualifier) url += `?Qualifier=${encodeURIComponent(String(args.qualifier))}`;
    const headers = signRequest('POST', url, 'lambda', this.config, payload);
    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body: payload });
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── IAM ───────────────────────────────────────────────────────────────────

  private async listIAMUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'ListUsers',
      Version: '2010-05-08',
    };
    if (args.pathPrefix) queryParams['PathPrefix'] = String(args.pathPrefix);
    if (args.maxItems) queryParams['MaxItems'] = String(args.maxItems);
    if (args.marker) queryParams['Marker'] = String(args.marker);
    return this.iamQuery(queryParams);
  }

  private async listIAMRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'ListRoles',
      Version: '2010-05-08',
    };
    if (args.pathPrefix) queryParams['PathPrefix'] = String(args.pathPrefix);
    if (args.maxItems) queryParams['MaxItems'] = String(args.maxItems);
    if (args.marker) queryParams['Marker'] = String(args.marker);
    return this.iamQuery(queryParams);
  }

  private async getIAMRole(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'GetRole',
      Version: '2010-05-08',
      RoleName: String(args.roleName),
    };
    return this.iamQuery(queryParams);
  }

  private async iamQuery(queryParams: Record<string, string>): Promise<ToolResult> {
    const iamConfig: AWSConfig = { ...this.config, region: 'us-east-1' };
    const url = 'https://iam.amazonaws.com/';
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const fullUrl = `${url}?${qs}`;
    const headers = signRequest('GET', fullUrl, 'iam', iamConfig, '', queryParams);
    const response = await this.fetchWithRetry(fullUrl, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── CloudWatch ────────────────────────────────────────────────────────────

  private async listCloudWatchMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'ListMetrics',
      Version: '2010-08-01',
    };
    if (args.namespace) queryParams['Namespace'] = String(args.namespace);
    if (args.metricName) queryParams['MetricName'] = String(args.metricName);
    if (args.dimensionName && args.dimensionValue) {
      queryParams['Dimensions.member.1.Name'] = String(args.dimensionName);
      queryParams['Dimensions.member.1.Value'] = String(args.dimensionValue);
    }
    return this.cloudwatchQuery(queryParams);
  }

  private async getCloudWatchMetricStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    const period = (args.period as number) ?? 300;
    const statistics = (args.statistics as string) ?? 'Average';
    const queryParams: Record<string, string> = {
      Action: 'GetMetricStatistics',
      Version: '2010-08-01',
      Namespace: String(args.namespace),
      MetricName: String(args.metricName),
      StartTime: String(args.startTime),
      EndTime: String(args.endTime),
      Period: String(period),
    };
    statistics.split(',').map(s => s.trim()).forEach((stat, i) => {
      queryParams[`Statistics.member.${i + 1}`] = stat;
    });
    if (args.dimensionName && args.dimensionValue) {
      queryParams['Dimensions.member.1.Name'] = String(args.dimensionName);
      queryParams['Dimensions.member.1.Value'] = String(args.dimensionValue);
    }
    return this.cloudwatchQuery(queryParams);
  }

  private async cloudwatchQuery(queryParams: Record<string, string>): Promise<ToolResult> {
    const url = `https://monitoring.${this.config.region}.amazonaws.com/`;
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const fullUrl = `${url}?${qs}`;
    const headers = signRequest('GET', fullUrl, 'monitoring', this.config, '', queryParams);
    const response = await this.fetchWithRetry(fullUrl, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── RDS ───────────────────────────────────────────────────────────────────

  private async listRDSInstances(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'DescribeDBInstances',
      Version: '2014-10-31',
    };
    if (args.maxRecords) queryParams['MaxRecords'] = String(args.maxRecords);
    if (args.marker) queryParams['Marker'] = String(args.marker);
    if (args.dbInstanceIdentifier) queryParams['DBInstanceIdentifier'] = String(args.dbInstanceIdentifier);
    const url = `https://rds.${this.config.region}.amazonaws.com/`;
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const fullUrl = `${url}?${qs}`;
    const headers = signRequest('GET', fullUrl, 'rds', this.config, '', queryParams);
    const response = await this.fetchWithRetry(fullUrl, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── ECS ───────────────────────────────────────────────────────────────────

  private async listECSClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.maxResults) body.maxResults = args.maxResults;
    if (args.nextToken) body.nextToken = args.nextToken;
    return this.ecsPost('ListClusters', body);
  }

  private async listECSServices(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { cluster: String(args.cluster) };
    if (args.maxResults) body.maxResults = args.maxResults;
    if (args.nextToken) body.nextToken = args.nextToken;
    if (args.launchType) body.launchType = args.launchType;
    return this.ecsPost('ListServices', body);
  }

  private async ecsPost(action: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `https://ecs.${this.config.region}.amazonaws.com/`;
    const bodyStr = JSON.stringify(body);
    const headers = {
      ...signRequest('POST', url, 'ecs', this.config, bodyStr),
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AmazonEC2ContainerServiceV20141113.${action}`,
    };
    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body: bodyStr });
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── SQS ───────────────────────────────────────────────────────────────────

  private async listSQSQueues(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'ListQueues',
      Version: '2012-11-05',
    };
    if (args.queueNamePrefix) queryParams['QueueNamePrefix'] = String(args.queueNamePrefix);
    if (args.maxResults) queryParams['MaxResults'] = String(args.maxResults);
    if (args.nextToken) queryParams['NextToken'] = String(args.nextToken);
    const url = `https://sqs.${this.config.region}.amazonaws.com/`;
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const fullUrl = `${url}?${qs}`;
    const headers = signRequest('GET', fullUrl, 'sqs', this.config, '', queryParams);
    const response = await this.fetchWithRetry(fullUrl, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── SNS ───────────────────────────────────────────────────────────────────

  private async listSNSTopics(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'ListTopics',
      Version: '2010-03-31',
    };
    if (args.nextToken) queryParams['NextToken'] = String(args.nextToken);
    const url = `https://sns.${this.config.region}.amazonaws.com/`;
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const fullUrl = `${url}?${qs}`;
    const headers = signRequest('GET', fullUrl, 'sns', this.config, '', queryParams);
    const response = await this.fetchWithRetry(fullUrl, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── STS ───────────────────────────────────────────────────────────────────

  private async getCallerIdentity(): Promise<ToolResult> {
    const queryParams: Record<string, string> = {
      Action: 'GetCallerIdentity',
      Version: '2011-06-15',
    };
    const url = 'https://sts.amazonaws.com/';
    const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
    const fullUrl = `${url}?${qs}`;
    const stsConfig: AWSConfig = { ...this.config, region: 'us-east-1' };
    const headers = signRequest('GET', fullUrl, 'sts', stsConfig, '', queryParams);
    const response = await this.fetchWithRetry(fullUrl, { headers });
    const text = await response.text();
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify({ status: response.status, body: text }, null, 2)) }],
      isError: !response.ok,
    };
  }
}
