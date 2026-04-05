/**
 * AWS Redshift MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://redshift.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4), service=redshift
// API: Query API (Action=X&Version=2012-12-01), XML responses
// Docs: https://docs.aws.amazon.com/redshift/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSRedshiftConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export class AWSRedshiftMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSRedshiftConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-redshift',
      displayName: 'AWS Redshift',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'redshift', 'amazon', 'data warehouse', 'analytics', 'sql',
        'clusters', 'snapshots', 'columnar', 'petabyte',
      ],
      toolNames: [
        'describe_clusters', 'create_cluster', 'delete_cluster', 'modify_cluster',
        'describe_cluster_snapshots', 'pause_cluster', 'resume_cluster',
      ],
      description: 'AWS Redshift data warehouse: manage clusters and snapshots, pause and resume clusters, and configure data warehouse settings.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'describe_clusters',
        description: 'List all Redshift clusters or describe a specific cluster by identifier',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_identifier: { type: 'string', description: 'Specific cluster identifier to describe (omit for all clusters)' },
            max_records: { type: 'number', description: 'Maximum number of clusters to return (max 100)' },
            marker: { type: 'string', description: 'Pagination marker from a previous response' },
          },
        },
      },
      {
        name: 'create_cluster',
        description: 'Create a new Redshift cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_identifier: { type: 'string', description: 'Unique cluster identifier' },
            node_type: { type: 'string', description: 'Node type (e.g. ra3.xlplus, dc2.large, ds2.xlarge)' },
            master_username: { type: 'string', description: 'Admin username for the cluster database' },
            master_user_password: { type: 'string', description: 'Admin password (min 8 chars, at least one uppercase, lowercase, number)' },
            cluster_type: { type: 'string', description: 'single-node or multi-node (default: single-node)' },
            number_of_nodes: { type: 'number', description: 'Number of nodes (required for multi-node, min 2)' },
            db_name: { type: 'string', description: 'Name of the default database (default: dev)' },
            port: { type: 'number', description: 'Database port (default: 5439)' },
          },
          required: ['cluster_identifier', 'node_type', 'master_username', 'master_user_password'],
        },
      },
      {
        name: 'delete_cluster',
        description: 'Delete a Redshift cluster with optional final snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_identifier: { type: 'string', description: 'Cluster identifier to delete' },
            skip_final_cluster_snapshot: { type: 'boolean', description: 'Skip creating a final snapshot before deletion (default: false)' },
            final_cluster_snapshot_identifier: { type: 'string', description: 'Name for the final snapshot (required if skip_final_cluster_snapshot=false)' },
          },
          required: ['cluster_identifier'],
        },
      },
      {
        name: 'modify_cluster',
        description: 'Modify settings for an existing Redshift cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_identifier: { type: 'string', description: 'Cluster identifier to modify' },
            master_user_password: { type: 'string', description: 'New admin password' },
            node_type: { type: 'string', description: 'New node type (triggers resize)' },
            number_of_nodes: { type: 'number', description: 'New number of nodes (triggers resize)' },
            cluster_type: { type: 'string', description: 'New cluster type: single-node or multi-node' },
            allow_version_upgrade: { type: 'boolean', description: 'Allow automatic version upgrades' },
            automated_snapshot_retention_period: { type: 'number', description: 'Days to retain automated snapshots (0-35)' },
          },
          required: ['cluster_identifier'],
        },
      },
      {
        name: 'describe_cluster_snapshots',
        description: 'List automated or manual snapshots for a Redshift cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_identifier: { type: 'string', description: 'Filter snapshots by cluster identifier' },
            snapshot_identifier: { type: 'string', description: 'Specific snapshot identifier to describe' },
            snapshot_type: { type: 'string', description: 'Filter by type: automated or manual' },
            max_records: { type: 'number', description: 'Maximum number of snapshots to return' },
            marker: { type: 'string', description: 'Pagination marker' },
          },
        },
      },
      {
        name: 'pause_cluster',
        description: 'Pause a running Redshift cluster to stop compute charges while preserving data',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_identifier: { type: 'string', description: 'Cluster identifier to pause' },
          },
          required: ['cluster_identifier'],
        },
      },
      {
        name: 'resume_cluster',
        description: 'Resume a paused Redshift cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_identifier: { type: 'string', description: 'Cluster identifier to resume' },
          },
          required: ['cluster_identifier'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'describe_clusters': return this.describeClusters(args);
        case 'create_cluster': return this.createCluster(args);
        case 'delete_cluster': return this.deleteCluster(args);
        case 'modify_cluster': return this.modifyCluster(args);
        case 'describe_cluster_snapshots': return this.describeClusterSnapshots(args);
        case 'pause_cluster': return this.pauseCluster(args);
        case 'resume_cluster': return this.resumeCluster(args);
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
    const kService = this.hmac(kRegion, 'redshift');
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

    const credentialScope = `${dateStamp}/${this.region}/redshift/aws4_request`;
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

  private async rsRequest(params: Record<string, string>): Promise<Response> {
    params.Version = '2012-12-01';
    const body = new URLSearchParams(params).toString();
    const url = `https://redshift.${this.region}.amazonaws.com/`;
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const signed = this.signRequest('POST', url, headers, body);
    return this.fetchWithRetry(url, { method: 'POST', headers: signed, body });
  }

  private async xmlResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Redshift error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async describeClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'DescribeClusters' };
    if (args.cluster_identifier) params.ClusterIdentifier = args.cluster_identifier as string;
    if (args.max_records) params.MaxRecords = String(args.max_records);
    if (args.marker) params.Marker = args.marker as string;
    return this.xmlResult(await this.rsRequest(params));
  }

  private async createCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_identifier || !args.node_type || !args.master_username || !args.master_user_password) {
      return { content: [{ type: 'text', text: 'cluster_identifier, node_type, master_username, and master_user_password are required' }], isError: true };
    }
    const params: Record<string, string> = {
      Action: 'CreateCluster',
      ClusterIdentifier: args.cluster_identifier as string,
      NodeType: args.node_type as string,
      MasterUsername: args.master_username as string,
      MasterUserPassword: args.master_user_password as string,
    };
    if (args.cluster_type) params.ClusterType = args.cluster_type as string;
    if (args.number_of_nodes !== undefined) params.NumberOfNodes = String(args.number_of_nodes);
    if (args.db_name) params.DBName = args.db_name as string;
    if (args.port !== undefined) params.Port = String(args.port);
    return this.xmlResult(await this.rsRequest(params));
  }

  private async deleteCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_identifier) return { content: [{ type: 'text', text: 'cluster_identifier is required' }], isError: true };
    const params: Record<string, string> = {
      Action: 'DeleteCluster',
      ClusterIdentifier: args.cluster_identifier as string,
      SkipFinalClusterSnapshot: String(args.skip_final_cluster_snapshot ?? false),
    };
    if (args.final_cluster_snapshot_identifier) {
      params.FinalClusterSnapshotIdentifier = args.final_cluster_snapshot_identifier as string;
    }
    return this.xmlResult(await this.rsRequest(params));
  }

  private async modifyCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_identifier) return { content: [{ type: 'text', text: 'cluster_identifier is required' }], isError: true };
    const params: Record<string, string> = { Action: 'ModifyCluster', ClusterIdentifier: args.cluster_identifier as string };
    if (args.master_user_password) params.MasterUserPassword = args.master_user_password as string;
    if (args.node_type) params.NodeType = args.node_type as string;
    if (args.number_of_nodes !== undefined) params.NumberOfNodes = String(args.number_of_nodes);
    if (args.cluster_type) params.ClusterType = args.cluster_type as string;
    if (args.allow_version_upgrade !== undefined) params.AllowVersionUpgrade = String(args.allow_version_upgrade);
    if (args.automated_snapshot_retention_period !== undefined) params.AutomatedSnapshotRetentionPeriod = String(args.automated_snapshot_retention_period);
    return this.xmlResult(await this.rsRequest(params));
  }

  private async describeClusterSnapshots(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { Action: 'DescribeClusterSnapshots' };
    if (args.cluster_identifier) params.ClusterIdentifier = args.cluster_identifier as string;
    if (args.snapshot_identifier) params.SnapshotIdentifier = args.snapshot_identifier as string;
    if (args.snapshot_type) params.SnapshotType = args.snapshot_type as string;
    if (args.max_records) params.MaxRecords = String(args.max_records);
    if (args.marker) params.Marker = args.marker as string;
    return this.xmlResult(await this.rsRequest(params));
  }

  private async pauseCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_identifier) return { content: [{ type: 'text', text: 'cluster_identifier is required' }], isError: true };
    return this.xmlResult(await this.rsRequest({ Action: 'PauseCluster', ClusterIdentifier: args.cluster_identifier as string }));
  }

  private async resumeCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_identifier) return { content: [{ type: 'text', text: 'cluster_identifier is required' }], isError: true };
    return this.xmlResult(await this.rsRequest({ Action: 'ResumeCluster', ClusterIdentifier: args.cluster_identifier as string }));
  }
}
