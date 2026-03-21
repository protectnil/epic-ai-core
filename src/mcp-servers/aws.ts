/**
 * AWS MCP Server
 * Adapter for AWS REST APIs using Signature V4 authentication
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';
import * as crypto from 'crypto';

interface AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function hash(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSignatureKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}

function signRequest(
  method: string,
  url: string,
  service: string,
  config: AWSConfig,
  body: string = '',
  queryParams: Record<string, string> = {}
): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;

  const sortedQueryString = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const payloadHash = hash(body);

  const canonicalHeadersMap: Record<string, string> = {
    host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };
  if (config.sessionToken) {
    canonicalHeadersMap['x-amz-security-token'] = config.sessionToken;
  }

  const canonicalHeaders = Object.keys(canonicalHeadersMap)
    .sort()
    .map(k => `${k}:${canonicalHeadersMap[k]}\n`)
    .join('');
  const signedHeadersList = Object.keys(canonicalHeadersMap).sort().join(';');

  const canonicalRequest = [
    method,
    parsedUrl.pathname,
    sortedQueryString,
    canonicalHeaders,
    signedHeadersList,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hash(canonicalRequest)].join('\n');

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, service);
  const signature = hmac(signingKey, stringToSign).toString('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  const requestHeaders: Record<string, string> = {
    Authorization: authHeader,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };
  if (config.sessionToken) {
    requestHeaders['x-amz-security-token'] = config.sessionToken;
  }

  return requestHeaders;
}

export class AWSMCPServer {
  private config: AWSConfig;

  constructor(config: AWSConfig) {
    this.config = config;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_s3_buckets',
        description: 'List all S3 buckets in the AWS account',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_ec2_instances',
        description: 'List EC2 instances in the configured region',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum number of results to return' },
          },
          required: [],
        },
      },
      {
        name: 'list_lambda_functions',
        description: 'List Lambda functions in the configured region',
        inputSchema: {
          type: 'object',
          properties: {
            maxItems: { type: 'number', description: 'Maximum number of functions to return' },
            functionVersion: { type: 'string', description: 'Version qualifier: ALL or specific version' },
          },
          required: [],
        },
      },
      {
        name: 'get_cloudwatch_metrics',
        description: 'List CloudWatch metrics for a given namespace and metric name',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'CloudWatch metric namespace (e.g. AWS/EC2)' },
            metricName: { type: 'string', description: 'Name of the metric' },
            dimensionName: { type: 'string', description: 'Dimension name for filtering' },
            dimensionValue: { type: 'string', description: 'Dimension value for filtering' },
          },
          required: ['namespace', 'metricName'],
        },
      },
      {
        name: 'get_iam_users',
        description: 'List IAM users in the AWS account',
        inputSchema: {
          type: 'object',
          properties: {
            pathPrefix: { type: 'string', description: 'Path prefix for filtering users' },
            maxItems: { type: 'number', description: 'Maximum number of users to return' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_s3_buckets': {
          const url = `https://s3.${this.config.region}.amazonaws.com/`;
          const headers = signRequest('GET', url, 's3', this.config);
          const response = await fetch(url, { headers });
          const text = await response.text();
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: response.status, body: text }, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_ec2_instances': {
          const queryParams: Record<string, string> = {
            Action: 'DescribeInstances',
            Version: '2016-11-15',
          };
          if (args.maxResults) queryParams['MaxResults'] = String(args.maxResults);
          const url = `https://ec2.${this.config.region}.amazonaws.com/`;
          const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
          const fullUrl = `${url}?${qs}`;
          const headers = signRequest('GET', fullUrl, 'ec2', this.config, '', queryParams);
          const response = await fetch(fullUrl, { headers });
          const text = await response.text();
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: response.status, body: text }, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_lambda_functions': {
          const queryParams: Record<string, string> = {};
          if (args.maxItems) queryParams['MaxItems'] = String(args.maxItems);
          if (args.functionVersion) queryParams['FunctionVersion'] = String(args.functionVersion);
          const base = `https://lambda.${this.config.region}.amazonaws.com/2015-03-31/functions`;
          const qs = Object.keys(queryParams).length
            ? '?' + Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&')
            : '';
          const url = base + qs;
          const headers = signRequest('GET', url, 'lambda', this.config, '', queryParams);
          const response = await fetch(url, { headers });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'get_cloudwatch_metrics': {
          const queryParams: Record<string, string> = {
            Action: 'ListMetrics',
            Version: '2010-08-01',
            Namespace: String(args.namespace),
            MetricName: String(args.metricName),
          };
          if (args.dimensionName && args.dimensionValue) {
            queryParams['Dimensions.member.1.Name'] = String(args.dimensionName);
            queryParams['Dimensions.member.1.Value'] = String(args.dimensionValue);
          }
          const url = `https://monitoring.${this.config.region}.amazonaws.com/`;
          const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
          const fullUrl = `${url}?${qs}`;
          const headers = signRequest('GET', fullUrl, 'monitoring', this.config, '', queryParams);
          const response = await fetch(fullUrl, { headers });
          const text = await response.text();
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: response.status, body: text }, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'get_iam_users': {
          const queryParams: Record<string, string> = {
            Action: 'ListUsers',
            Version: '2010-05-08',
          };
          if (args.pathPrefix) queryParams['PathPrefix'] = String(args.pathPrefix);
          if (args.maxItems) queryParams['MaxItems'] = String(args.maxItems);
          const url = 'https://iam.amazonaws.com/';
          const qs = Object.keys(queryParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
          const fullUrl = `${url}?${qs}`;
          const headers = signRequest('GET', fullUrl, 'iam', this.config, '', queryParams);
          const response = await fetch(fullUrl, { headers });
          const text = await response.text();
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: response.status, body: text }, null, 2) }],
            isError: !response.ok,
          };
        }

        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
