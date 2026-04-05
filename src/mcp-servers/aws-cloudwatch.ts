/**
 * AWS CloudWatch MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://monitoring.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4), service=monitoring
// API: Query API (Action=X&Version=2010-08-01), XML responses
// Docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSCloudWatchConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSCloudWatchMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSCloudWatchConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-cloudwatch',
      displayName: 'AWS CloudWatch',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'cloudwatch', 'amazon', 'monitoring', 'metrics', 'alarms',
        'dashboards', 'observability', 'logs', 'alerting',
      ],
      toolNames: [
        'list_metrics', 'get_metric_data', 'get_metric_statistics',
        'describe_alarms', 'put_metric_alarm', 'delete_alarms',
        'list_dashboards', 'get_dashboard',
      ],
      description: 'AWS CloudWatch monitoring: list metrics, get metric data and statistics, manage alarms and dashboards.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_metrics',
        description: 'List CloudWatch metrics available in the account, optionally filtered by namespace or metric name',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Filter by namespace (e.g. AWS/EC2, AWS/Lambda)' },
            metric_name: { type: 'string', description: 'Filter by metric name (e.g. CPUUtilization)' },
            next_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'get_metric_data',
        description: 'Retrieve time-series metric data for one or more metrics using metric data queries',
        inputSchema: {
          type: 'object',
          properties: {
            metric_data_queries: { type: 'string', description: 'JSON array of MetricDataQuery objects' },
            start_time: { type: 'string', description: 'Start time in ISO 8601 format' },
            end_time: { type: 'string', description: 'End time in ISO 8601 format' },
            max_datapoints: { type: 'number', description: 'Maximum number of data points to return' },
          },
          required: ['metric_data_queries', 'start_time', 'end_time'],
        },
      },
      {
        name: 'get_metric_statistics',
        description: 'Get statistics for a specific CloudWatch metric over a time period',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Metric namespace (e.g. AWS/EC2)' },
            metric_name: { type: 'string', description: 'Metric name (e.g. CPUUtilization)' },
            start_time: { type: 'string', description: 'Start time in ISO 8601 format' },
            end_time: { type: 'string', description: 'End time in ISO 8601 format' },
            period: { type: 'number', description: 'Data granularity in seconds (minimum 60, must be multiple of 60)' },
            statistics: { type: 'string', description: 'Comma-separated statistics: SampleCount, Average, Sum, Minimum, Maximum' },
            dimensions: { type: 'string', description: 'JSON array of dimension filters: [{Name:str, Value:str}]' },
          },
          required: ['namespace', 'metric_name', 'start_time', 'end_time', 'period', 'statistics'],
        },
      },
      {
        name: 'describe_alarms',
        description: 'List CloudWatch alarms with optional filters by name prefix, state, or action prefix',
        inputSchema: {
          type: 'object',
          properties: {
            alarm_name_prefix: { type: 'string', description: 'Filter alarms by name prefix' },
            alarm_names: { type: 'string', description: 'Comma-separated list of specific alarm names' },
            state_value: { type: 'string', description: 'Filter by state: OK, ALARM, or INSUFFICIENT_DATA' },
            max_records: { type: 'number', description: 'Maximum alarms to return (max 100)' },
            next_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'put_metric_alarm',
        description: 'Create or update a CloudWatch alarm for a metric threshold',
        inputSchema: {
          type: 'object',
          properties: {
            alarm_name: { type: 'string', description: 'Alarm name' },
            namespace: { type: 'string', description: 'Metric namespace' },
            metric_name: { type: 'string', description: 'Metric name to alarm on' },
            comparison_operator: { type: 'string', description: 'GreaterThanThreshold, GreaterThanOrEqualToThreshold, LessThanThreshold, LessThanOrEqualToThreshold' },
            threshold: { type: 'number', description: 'Threshold value' },
            evaluation_periods: { type: 'number', description: 'Number of periods to evaluate' },
            period: { type: 'number', description: 'Period in seconds' },
            statistic: { type: 'string', description: 'SampleCount, Average, Sum, Minimum, or Maximum' },
            alarm_actions: { type: 'string', description: 'Comma-separated ARNs of actions to take when ALARM (SNS topics, Auto Scaling, etc.)' },
            ok_actions: { type: 'string', description: 'Comma-separated ARNs of actions to take when OK' },
            alarm_description: { type: 'string', description: 'Human-readable description of the alarm' },
          },
          required: ['alarm_name', 'namespace', 'metric_name', 'comparison_operator', 'threshold', 'evaluation_periods', 'period', 'statistic'],
        },
      },
      {
        name: 'delete_alarms',
        description: 'Delete one or more CloudWatch alarms',
        inputSchema: {
          type: 'object',
          properties: {
            alarm_names: { type: 'string', description: 'Comma-separated list of alarm names to delete' },
          },
          required: ['alarm_names'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List CloudWatch dashboards in the account',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_name_prefix: { type: 'string', description: 'Filter dashboards by name prefix' },
            next_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get the definition and widgets for a CloudWatch dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_name: { type: 'string', description: 'Name of the dashboard to retrieve' },
          },
          required: ['dashboard_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_metrics': return this.listMetrics(args);
        case 'get_metric_data': return this.getMetricData(args);
        case 'get_metric_statistics': return this.getMetricStatistics(args);
        case 'describe_alarms': return this.describeAlarms(args);
        case 'put_metric_alarm': return this.putMetricAlarm(args);
        case 'delete_alarms': return this.deleteAlarms(args);
        case 'list_dashboards': return this.listDashboards(args);
        case 'get_dashboard': return this.getDashboard(args);
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
    const kService = this.hmac(kRegion, 'monitoring');
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

    const credentialScope = `${dateStamp}/${this.region}/monitoring/aws4_request`;
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

  private async cwRequest(params: Record<string, string>): Promise<Response> {
    params.Version = '2010-08-01';
    const body = new URLSearchParams(params).toString();
    const url = `https://monitoring.${this.region}.amazonaws.com/`;
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const signed = this.signRequest('POST', url, headers, body);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body });
  }

  private async xmlResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `CloudWatch error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListMetrics' };
    if (args.namespace) params.Namespace = args.namespace as string;
    if (args.metric_name) params.MetricName = args.metric_name as string;
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.xmlResult(await this.cwRequest(params));
  }

  private async getMetricData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metric_data_queries || !args.start_time || !args.end_time) {
      return { content: [{ type: 'text', text: 'metric_data_queries, start_time, and end_time are required' }], isError: true };
    }
    let queries: unknown[];
    try { queries = JSON.parse(args.metric_data_queries as string); } catch { return { content: [{ type: 'text', text: 'metric_data_queries must be valid JSON' }], isError: true }; }
    const params: Record<string, string> = {
      Action: 'GetMetricData',
      StartTime: args.start_time as string,
      EndTime: args.end_time as string,
    };
    (queries as Record<string, unknown>[]).forEach((q, i) => {
      const idx = i + 1;
      params[`MetricDataQueries.member.${idx}.Id`] = (q.Id ?? q.id ?? `m${idx}`) as string;
      if (q.Expression ?? q.expression) params[`MetricDataQueries.member.${idx}.Expression`] = (q.Expression ?? q.expression) as string;
    });
    if (args.max_datapoints) params.MaxDatapoints = String(args.max_datapoints);
    return this.xmlResult(await this.cwRequest(params));
  }

  private async getMetricStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.namespace || !args.metric_name || !args.start_time || !args.end_time || !args.period || !args.statistics) {
      return { content: [{ type: 'text', text: 'namespace, metric_name, start_time, end_time, period, and statistics are required' }], isError: true };
    }
    const params: Record<string, string> = {
      Action: 'GetMetricStatistics',
      Namespace: args.namespace as string,
      MetricName: args.metric_name as string,
      StartTime: args.start_time as string,
      EndTime: args.end_time as string,
      Period: String(args.period),
    };
    (args.statistics as string).split(',').map(s => s.trim()).forEach((stat, i) => {
      params[`Statistics.member.${i + 1}`] = stat;
    });
    if (args.dimensions) {
      let dims: { Name: string; Value: string }[];
      try { dims = JSON.parse(args.dimensions as string); } catch { return { content: [{ type: 'text', text: 'dimensions must be valid JSON' }], isError: true }; }
      dims.forEach((d, i) => {
        params[`Dimensions.member.${i + 1}.Name`] = d.Name;
        params[`Dimensions.member.${i + 1}.Value`] = d.Value;
      });
    }
    return this.xmlResult(await this.cwRequest(params));
  }

  private async describeAlarms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'DescribeAlarms' };
    if (args.alarm_name_prefix) params.AlarmNamePrefix = args.alarm_name_prefix as string;
    if (args.alarm_names) {
      (args.alarm_names as string).split(',').map(s => s.trim()).forEach((n, i) => {
        params[`AlarmNames.member.${i + 1}`] = n;
      });
    }
    if (args.state_value) params.StateValue = args.state_value as string;
    if (args.max_records) params.MaxRecords = String(args.max_records);
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.xmlResult(await this.cwRequest(params));
  }

  private async putMetricAlarm(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['alarm_name', 'namespace', 'metric_name', 'comparison_operator', 'threshold', 'evaluation_periods', 'period', 'statistic'];
    for (const f of required) {
      if (args[f] === undefined || args[f] === null || args[f] === '') {
        return { content: [{ type: 'text', text: `${f} is required` }], isError: true };
      }
    }
    const params: Record<string, string> = {
      Action: 'PutMetricAlarm',
      AlarmName: args.alarm_name as string,
      Namespace: args.namespace as string,
      MetricName: args.metric_name as string,
      ComparisonOperator: args.comparison_operator as string,
      Threshold: String(args.threshold),
      EvaluationPeriods: String(args.evaluation_periods),
      Period: String(args.period),
      Statistic: args.statistic as string,
    };
    if (args.alarm_actions) {
      (args.alarm_actions as string).split(',').map(s => s.trim()).forEach((a, i) => {
        params[`AlarmActions.member.${i + 1}`] = a;
      });
    }
    if (args.ok_actions) {
      (args.ok_actions as string).split(',').map(s => s.trim()).forEach((a, i) => {
        params[`OKActions.member.${i + 1}`] = a;
      });
    }
    if (args.alarm_description) params.AlarmDescription = args.alarm_description as string;
    return this.xmlResult(await this.cwRequest(params));
  }

  private async deleteAlarms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alarm_names) return { content: [{ type: 'text', text: 'alarm_names is required' }], isError: true };
    const params: Record<string, string> = { Action: 'DeleteAlarms' };
    (args.alarm_names as string).split(',').map(s => s.trim()).forEach((n, i) => {
      params[`AlarmNames.member.${i + 1}`] = n;
    });
    return this.xmlResult(await this.cwRequest(params));
  }

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'ListDashboards' };
    if (args.dashboard_name_prefix) params.DashboardNamePrefix = args.dashboard_name_prefix as string;
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.xmlResult(await this.cwRequest(params));
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dashboard_name) return { content: [{ type: 'text', text: 'dashboard_name is required' }], isError: true };
    return this.xmlResult(await this.cwRequest({ Action: 'GetDashboard', DashboardName: args.dashboard_name as string }));
  }
}
