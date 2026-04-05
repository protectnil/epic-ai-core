/**
 * AWS Cost Explorer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://ce.us-east-1.amazonaws.com (always us-east-1)
// Auth: AWS Signature Version 4 (SigV4), service=ce, region=us-east-1
// API: JSON API, X-Amz-Target: AWSInsightsIndexService.{Action}
// Docs: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSCostExplorerConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

export class AWSCostExplorerMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSCostExplorerConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = 'us-east-1'; // Cost Explorer is always us-east-1
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-cost-explorer',
      displayName: 'AWS Cost Explorer',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'cost', 'billing', 'amazon', 'spending', 'forecast',
        'budget', 'cost-explorer', 'anomaly', 'savings',
      ],
      toolNames: [
        'get_cost_and_usage', 'get_cost_forecast', 'get_dimension_values',
        'get_tags', 'get_anomalies',
      ],
      description: 'AWS Cost Explorer billing and cost analysis: query cost and usage, forecast spending, explore dimensions and tags, and detect anomalies.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_cost_and_usage',
        description: 'Retrieve AWS cost and usage data for a time period, grouped by service, region, account, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            time_period_start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            time_period_end: { type: 'string', description: 'End date in YYYY-MM-DD format (exclusive)' },
            granularity: { type: 'string', description: 'DAILY, MONTHLY, or HOURLY' },
            metrics: { type: 'string', description: 'Comma-separated metrics: BlendedCost, UnblendedCost, UsageQuantity, AmortizedCost, etc.' },
            group_by: { type: 'string', description: 'JSON array of GroupDefinition: [{Type:DIMENSION|TAG|COST_CATEGORY, Key:str}]' },
            filter: { type: 'string', description: 'JSON cost expression filter object' },
          },
          required: ['time_period_start', 'time_period_end', 'granularity', 'metrics'],
        },
      },
      {
        name: 'get_cost_forecast',
        description: 'Get a forecast of AWS costs for a future time period based on historical usage',
        inputSchema: {
          type: 'object',
          properties: {
            time_period_start: { type: 'string', description: 'Start date for forecast in YYYY-MM-DD format' },
            time_period_end: { type: 'string', description: 'End date for forecast in YYYY-MM-DD format (max 12 months)' },
            metric: { type: 'string', description: 'BLENDED_COST, UNBLENDED_COST, AMORTIZED_COST, or NET_AMORTIZED_COST' },
            granularity: { type: 'string', description: 'DAILY or MONTHLY' },
            prediction_interval_level: { type: 'number', description: 'Confidence interval percentage 51-99 (default: 80)' },
          },
          required: ['time_period_start', 'time_period_end', 'metric', 'granularity'],
        },
      },
      {
        name: 'get_dimension_values',
        description: 'Get the available dimension values (like service names, regions) for filtering and grouping',
        inputSchema: {
          type: 'object',
          properties: {
            time_period_start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            time_period_end: { type: 'string', description: 'End date in YYYY-MM-DD format' },
            dimension: { type: 'string', description: 'Dimension key: SERVICE, REGION, LINKED_ACCOUNT, AZ, INSTANCE_TYPE, USAGE_TYPE, etc.' },
            search_string: { type: 'string', description: 'Filter dimension values by this string' },
          },
          required: ['time_period_start', 'time_period_end', 'dimension'],
        },
      },
      {
        name: 'get_tags',
        description: 'Get the tag keys and values used in your AWS environment for cost allocation',
        inputSchema: {
          type: 'object',
          properties: {
            time_period_start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            time_period_end: { type: 'string', description: 'End date in YYYY-MM-DD format' },
            tag_key: { type: 'string', description: 'Specific tag key to retrieve values for (omit for all tag keys)' },
            search_string: { type: 'string', description: 'Filter tag values by this string' },
          },
          required: ['time_period_start', 'time_period_end'],
        },
      },
      {
        name: 'get_anomalies',
        description: 'Retrieve cost anomalies detected by AWS Cost Anomaly Detection',
        inputSchema: {
          type: 'object',
          properties: {
            date_interval_start: { type: 'string', description: 'Start date for anomaly search in YYYY-MM-DD format' },
            date_interval_end: { type: 'string', description: 'End date for anomaly search in YYYY-MM-DD format' },
            max_results: { type: 'number', description: 'Maximum number of anomalies to return' },
            next_page_token: { type: 'string', description: 'Pagination token' },
          },
          required: ['date_interval_start', 'date_interval_end'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_cost_and_usage': return this.getCostAndUsage(args);
        case 'get_cost_forecast': return this.getCostForecast(args);
        case 'get_dimension_values': return this.getDimensionValues(args);
        case 'get_tags': return this.getTags(args);
        case 'get_anomalies': return this.getAnomalies(args);
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
    const kService = this.hmac(kRegion, 'ce');
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

    const credentialScope = `${dateStamp}/${this.region}/ce/aws4_request`;
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

  private async ceRequest(action: string, body: Record<string, unknown>): Promise<Response> {
    const url = 'https://ce.us-east-1.amazonaws.com/';
    const bodyStr = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSInsightsIndexService.${action}`,
    };
    const signed = this.signRequest('POST', url, headers, bodyStr);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body: bodyStr });
  }

  private async jsonResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Cost Explorer error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async getCostAndUsage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.time_period_start || !args.time_period_end || !args.granularity || !args.metrics) {
      return { content: [{ type: 'text', text: 'time_period_start, time_period_end, granularity, and metrics are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      TimePeriod: { Start: args.time_period_start, End: args.time_period_end },
      Granularity: args.granularity,
      Metrics: (args.metrics as string).split(',').map(s => s.trim()),
    };
    if (args.group_by) {
      try { body.GroupBy = JSON.parse(args.group_by as string); } catch { return { content: [{ type: 'text', text: 'group_by must be valid JSON' }], isError: true }; }
    }
    if (args.filter) {
      try { body.Filter = JSON.parse(args.filter as string); } catch { return { content: [{ type: 'text', text: 'filter must be valid JSON' }], isError: true }; }
    }
    return this.jsonResult(await this.ceRequest('GetCostAndUsage', body));
  }

  private async getCostForecast(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.time_period_start || !args.time_period_end || !args.metric || !args.granularity) {
      return { content: [{ type: 'text', text: 'time_period_start, time_period_end, metric, and granularity are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      TimePeriod: { Start: args.time_period_start, End: args.time_period_end },
      Metric: args.metric,
      Granularity: args.granularity,
    };
    if (args.prediction_interval_level !== undefined) body.PredictionIntervalLevel = args.prediction_interval_level;
    return this.jsonResult(await this.ceRequest('GetCostForecast', body));
  }

  private async getDimensionValues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.time_period_start || !args.time_period_end || !args.dimension) {
      return { content: [{ type: 'text', text: 'time_period_start, time_period_end, and dimension are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      TimePeriod: { Start: args.time_period_start, End: args.time_period_end },
      Dimension: args.dimension,
    };
    if (args.search_string) body.SearchString = args.search_string;
    return this.jsonResult(await this.ceRequest('GetDimensionValues', body));
  }

  private async getTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.time_period_start || !args.time_period_end) {
      return { content: [{ type: 'text', text: 'time_period_start and time_period_end are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      TimePeriod: { Start: args.time_period_start, End: args.time_period_end },
    };
    if (args.tag_key) body.TagKey = args.tag_key;
    if (args.search_string) body.SearchString = args.search_string;
    return this.jsonResult(await this.ceRequest('GetTags', body));
  }

  private async getAnomalies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.date_interval_start || !args.date_interval_end) {
      return { content: [{ type: 'text', text: 'date_interval_start and date_interval_end are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      DateInterval: { StartDate: args.date_interval_start, EndDate: args.date_interval_end },
    };
    if (args.max_results) body.MaxResults = args.max_results;
    if (args.next_page_token) body.NextPageToken = args.next_page_token;
    return this.jsonResult(await this.ceRequest('GetAnomalies', body));
  }
}
