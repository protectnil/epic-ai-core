/**
 * AWS DynamoDB MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://dynamodb.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4) — all requests signed with HMAC-SHA256.
// API: JSON API with X-Amz-Target header (DynamoDB_20120810.{Action})
// Docs: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSDynamoDBConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSDynamoDBMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSDynamoDBConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-dynamodb',
      displayName: 'AWS DynamoDB',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'dynamodb', 'amazon', 'nosql', 'database', 'table', 'item',
        'query', 'scan', 'key-value', 'document', 'serverless',
      ],
      toolNames: [
        'list_tables', 'describe_table', 'get_item', 'put_item', 'delete_item',
        'query', 'scan', 'create_table', 'delete_table', 'update_item',
        'batch_get_items', 'batch_write_items',
      ],
      description: 'AWS DynamoDB NoSQL database: manage tables and items, query and scan data, batch operations, and table lifecycle management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tables',
        description: 'List all DynamoDB tables in the configured AWS region',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of tables to return (default: 100)' },
            exclusive_start_table_name: { type: 'string', description: 'Pagination token — last table name from a previous response' },
          },
        },
      },
      {
        name: 'describe_table',
        description: 'Get detailed information about a DynamoDB table including key schema, indexes, and provisioned throughput',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the DynamoDB table' },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'get_item',
        description: 'Retrieve a single item from a DynamoDB table by its primary key',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the DynamoDB table' },
            key: { type: 'string', description: 'JSON object representing the primary key (e.g. {"pk":{"S":"val"}})' },
            projection_expression: { type: 'string', description: 'Comma-separated list of attributes to retrieve' },
          },
          required: ['table_name', 'key'],
        },
      },
      {
        name: 'put_item',
        description: 'Create or replace an item in a DynamoDB table',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the DynamoDB table' },
            item: { type: 'string', description: 'JSON object of DynamoDB-typed attributes (e.g. {"pk":{"S":"val"},"count":{"N":"1"}})' },
            condition_expression: { type: 'string', description: 'Conditional expression to control the put (e.g. attribute_not_exists(pk))' },
          },
          required: ['table_name', 'item'],
        },
      },
      {
        name: 'delete_item',
        description: 'Delete a single item from a DynamoDB table by its primary key',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the DynamoDB table' },
            key: { type: 'string', description: 'JSON object representing the primary key' },
            condition_expression: { type: 'string', description: 'Optional condition that must be true for the delete to proceed' },
          },
          required: ['table_name', 'key'],
        },
      },
      {
        name: 'query',
        description: 'Query items in a DynamoDB table using a key condition expression',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the DynamoDB table' },
            key_condition_expression: { type: 'string', description: 'Key condition expression (e.g. pk = :pk)' },
            expression_attribute_values: { type: 'string', description: 'JSON map of expression attribute values (e.g. {":pk":{"S":"val"}})' },
            filter_expression: { type: 'string', description: 'Additional filter expression applied after key condition' },
            index_name: { type: 'string', description: 'Name of a global or local secondary index to query' },
            limit: { type: 'number', description: 'Maximum number of items to evaluate (before filter)' },
            scan_index_forward: { type: 'boolean', description: 'Sort order: true=ascending (default), false=descending' },
          },
          required: ['table_name', 'key_condition_expression', 'expression_attribute_values'],
        },
      },
      {
        name: 'scan',
        description: 'Scan all items in a DynamoDB table with optional filter expression',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the DynamoDB table' },
            filter_expression: { type: 'string', description: 'Filter expression to apply after reading all items' },
            expression_attribute_values: { type: 'string', description: 'JSON map of expression attribute values' },
            limit: { type: 'number', description: 'Maximum number of items to evaluate' },
            index_name: { type: 'string', description: 'Name of a secondary index to scan' },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'create_table',
        description: 'Create a new DynamoDB table with specified key schema and billing mode',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name for the new table' },
            attribute_definitions: { type: 'string', description: 'JSON array of attribute definitions (e.g. [{"AttributeName":"pk","AttributeType":"S"}])' },
            key_schema: { type: 'string', description: 'JSON array of key schema elements (e.g. [{"AttributeName":"pk","KeyType":"HASH"}])' },
            billing_mode: { type: 'string', description: 'PAY_PER_REQUEST (default) or PROVISIONED' },
            read_capacity_units: { type: 'number', description: 'Read capacity units (required if billing_mode=PROVISIONED)' },
            write_capacity_units: { type: 'number', description: 'Write capacity units (required if billing_mode=PROVISIONED)' },
          },
          required: ['table_name', 'attribute_definitions', 'key_schema'],
        },
      },
      {
        name: 'delete_table',
        description: 'Delete a DynamoDB table and all its data permanently',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the table to delete' },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'update_item',
        description: 'Update attributes of an existing item in a DynamoDB table',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the DynamoDB table' },
            key: { type: 'string', description: 'JSON object representing the primary key' },
            update_expression: { type: 'string', description: 'Update expression (e.g. SET #name = :val)' },
            expression_attribute_values: { type: 'string', description: 'JSON map of expression attribute values' },
            expression_attribute_names: { type: 'string', description: 'JSON map of expression attribute name placeholders' },
            condition_expression: { type: 'string', description: 'Optional condition expression' },
            return_values: { type: 'string', description: 'What to return: NONE, ALL_OLD, UPDATED_OLD, ALL_NEW, UPDATED_NEW' },
          },
          required: ['table_name', 'key', 'update_expression', 'expression_attribute_values'],
        },
      },
      {
        name: 'batch_get_items',
        description: 'Retrieve multiple items from one or more DynamoDB tables in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            request_items: { type: 'string', description: 'JSON map of table names to keys to fetch (e.g. {"TableName":{"Keys":[{"pk":{"S":"v"}}]}})' },
          },
          required: ['request_items'],
        },
      },
      {
        name: 'batch_write_items',
        description: 'Put or delete multiple items across one or more DynamoDB tables in a single request (max 25 requests)',
        inputSchema: {
          type: 'object',
          properties: {
            request_items: { type: 'string', description: 'JSON map of table names to arrays of PutRequest or DeleteRequest operations' },
          },
          required: ['request_items'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tables': return this.listTables(args);
        case 'describe_table': return this.describeTable(args);
        case 'get_item': return this.getItem(args);
        case 'put_item': return this.putItem(args);
        case 'delete_item': return this.deleteItem(args);
        case 'query': return this.queryItems(args);
        case 'scan': return this.scanItems(args);
        case 'create_table': return this.createTable(args);
        case 'delete_table': return this.deleteTable(args);
        case 'update_item': return this.updateItem(args);
        case 'batch_get_items': return this.batchGetItems(args);
        case 'batch_write_items': return this.batchWriteItems(args);
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
    const kService = this.hmac(kRegion, 'dynamodb');
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

    const credentialScope = `${dateStamp}/${this.region}/dynamodb/aws4_request`;
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

  private async dynamoRequest(action: string, body: Record<string, unknown>): Promise<Response> {
    const url = `https://dynamodb.${this.region}.amazonaws.com/`;
    const bodyStr = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': `DynamoDB_20120810.${action}`,
    };
    const signed = this.signRequest('POST', url, headers, bodyStr);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body: bodyStr });
  }

  private async jsonResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `DynamoDB error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.limit) body.Limit = args.limit;
    if (args.exclusive_start_table_name) body.ExclusiveStartTableName = args.exclusive_start_table_name;
    return this.jsonResult(await this.dynamoRequest('ListTables', body));
  }

  private async describeTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    return this.jsonResult(await this.dynamoRequest('DescribeTable', { TableName: args.table_name }));
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name || !args.key) return { content: [{ type: 'text', text: 'table_name and key are required' }], isError: true };
    let key: unknown;
    try { key = JSON.parse(args.key as string); } catch { return { content: [{ type: 'text', text: 'key must be valid JSON' }], isError: true }; }
    const body: Record<string, unknown> = { TableName: args.table_name, Key: key };
    if (args.projection_expression) body.ProjectionExpression = args.projection_expression;
    return this.jsonResult(await this.dynamoRequest('GetItem', body));
  }

  private async putItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name || !args.item) return { content: [{ type: 'text', text: 'table_name and item are required' }], isError: true };
    let item: unknown;
    try { item = JSON.parse(args.item as string); } catch { return { content: [{ type: 'text', text: 'item must be valid JSON' }], isError: true }; }
    const body: Record<string, unknown> = { TableName: args.table_name, Item: item };
    if (args.condition_expression) body.ConditionExpression = args.condition_expression;
    return this.jsonResult(await this.dynamoRequest('PutItem', body));
  }

  private async deleteItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name || !args.key) return { content: [{ type: 'text', text: 'table_name and key are required' }], isError: true };
    let key: unknown;
    try { key = JSON.parse(args.key as string); } catch { return { content: [{ type: 'text', text: 'key must be valid JSON' }], isError: true }; }
    const body: Record<string, unknown> = { TableName: args.table_name, Key: key };
    if (args.condition_expression) body.ConditionExpression = args.condition_expression;
    return this.jsonResult(await this.dynamoRequest('DeleteItem', body));
  }

  private async queryItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name || !args.key_condition_expression || !args.expression_attribute_values) {
      return { content: [{ type: 'text', text: 'table_name, key_condition_expression, and expression_attribute_values are required' }], isError: true };
    }
    let eav: unknown;
    try { eav = JSON.parse(args.expression_attribute_values as string); } catch { return { content: [{ type: 'text', text: 'expression_attribute_values must be valid JSON' }], isError: true }; }
    const body: Record<string, unknown> = {
      TableName: args.table_name,
      KeyConditionExpression: args.key_condition_expression,
      ExpressionAttributeValues: eav,
    };
    if (args.filter_expression) body.FilterExpression = args.filter_expression;
    if (args.index_name) body.IndexName = args.index_name;
    if (args.limit) body.Limit = args.limit;
    if (args.scan_index_forward !== undefined) body.ScanIndexForward = args.scan_index_forward;
    return this.jsonResult(await this.dynamoRequest('Query', body));
  }

  private async scanItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    const body: Record<string, unknown> = { TableName: args.table_name };
    if (args.filter_expression) body.FilterExpression = args.filter_expression;
    if (args.expression_attribute_values) {
      try { body.ExpressionAttributeValues = JSON.parse(args.expression_attribute_values as string); } catch { return { content: [{ type: 'text', text: 'expression_attribute_values must be valid JSON' }], isError: true }; }
    }
    if (args.limit) body.Limit = args.limit;
    if (args.index_name) body.IndexName = args.index_name;
    return this.jsonResult(await this.dynamoRequest('Scan', body));
  }

  private async createTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name || !args.attribute_definitions || !args.key_schema) {
      return { content: [{ type: 'text', text: 'table_name, attribute_definitions, and key_schema are required' }], isError: true };
    }
    let attrDefs: unknown, keySchema: unknown;
    try { attrDefs = JSON.parse(args.attribute_definitions as string); } catch { return { content: [{ type: 'text', text: 'attribute_definitions must be valid JSON' }], isError: true }; }
    try { keySchema = JSON.parse(args.key_schema as string); } catch { return { content: [{ type: 'text', text: 'key_schema must be valid JSON' }], isError: true }; }
    const billingMode = (args.billing_mode as string) ?? 'PAY_PER_REQUEST';
    const body: Record<string, unknown> = {
      TableName: args.table_name,
      AttributeDefinitions: attrDefs,
      KeySchema: keySchema,
      BillingMode: billingMode,
    };
    if (billingMode === 'PROVISIONED') {
      body.ProvisionedThroughput = {
        ReadCapacityUnits: args.read_capacity_units ?? 5,
        WriteCapacityUnits: args.write_capacity_units ?? 5,
      };
    }
    return this.jsonResult(await this.dynamoRequest('CreateTable', body));
  }

  private async deleteTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    return this.jsonResult(await this.dynamoRequest('DeleteTable', { TableName: args.table_name }));
  }

  private async updateItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name || !args.key || !args.update_expression || !args.expression_attribute_values) {
      return { content: [{ type: 'text', text: 'table_name, key, update_expression, and expression_attribute_values are required' }], isError: true };
    }
    let key: unknown, eav: unknown;
    try { key = JSON.parse(args.key as string); } catch { return { content: [{ type: 'text', text: 'key must be valid JSON' }], isError: true }; }
    try { eav = JSON.parse(args.expression_attribute_values as string); } catch { return { content: [{ type: 'text', text: 'expression_attribute_values must be valid JSON' }], isError: true }; }
    const body: Record<string, unknown> = {
      TableName: args.table_name,
      Key: key,
      UpdateExpression: args.update_expression,
      ExpressionAttributeValues: eav,
    };
    if (args.expression_attribute_names) {
      try { body.ExpressionAttributeNames = JSON.parse(args.expression_attribute_names as string); } catch { return { content: [{ type: 'text', text: 'expression_attribute_names must be valid JSON' }], isError: true }; }
    }
    if (args.condition_expression) body.ConditionExpression = args.condition_expression;
    if (args.return_values) body.ReturnValues = args.return_values;
    return this.jsonResult(await this.dynamoRequest('UpdateItem', body));
  }

  private async batchGetItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.request_items) return { content: [{ type: 'text', text: 'request_items is required' }], isError: true };
    let requestItems: unknown;
    try { requestItems = JSON.parse(args.request_items as string); } catch { return { content: [{ type: 'text', text: 'request_items must be valid JSON' }], isError: true }; }
    return this.jsonResult(await this.dynamoRequest('BatchGetItem', { RequestItems: requestItems }));
  }

  private async batchWriteItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.request_items) return { content: [{ type: 'text', text: 'request_items is required' }], isError: true };
    let requestItems: unknown;
    try { requestItems = JSON.parse(args.request_items as string); } catch { return { content: [{ type: 'text', text: 'request_items must be valid JSON' }], isError: true }; }
    return this.jsonResult(await this.dynamoRequest('BatchWriteItem', { RequestItems: requestItems }));
  }
}
