/**
 * AWS Route 53 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://route53.amazonaws.com (global, no region)
// Auth: AWS Signature Version 4 (SigV4), service=route53, region=us-east-1
// API: XML REST /2013-04-01/*
// Docs: https://docs.aws.amazon.com/Route53/latest/APIReference/

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSRoute53Config {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

export class AWSRoute53MCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;

  constructor(config: AWSRoute53Config) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = 'us-east-1'; // Route53 is global, always us-east-1 for signing
    this.sessionToken = config.sessionToken;
  }

  static catalog() {
    return {
      name: 'aws-route53',
      displayName: 'AWS Route 53',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 'route53', 'amazon', 'dns', 'domain', 'hosted zone',
        'record sets', 'health checks', 'routing',
      ],
      toolNames: [
        'list_hosted_zones', 'get_hosted_zone', 'create_hosted_zone',
        'list_resource_record_sets', 'change_resource_record_sets', 'list_health_checks',
      ],
      description: 'AWS Route 53 DNS management: manage hosted zones, DNS record sets, and health checks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_hosted_zones',
        description: 'List all Route 53 hosted zones in the AWS account',
        inputSchema: {
          type: 'object',
          properties: {
            max_items: { type: 'string', description: 'Maximum number of hosted zones to return' },
            marker: { type: 'string', description: 'Pagination marker from a previous response' },
          },
        },
      },
      {
        name: 'get_hosted_zone',
        description: 'Get details for a specific Route 53 hosted zone including delegation set',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Hosted zone ID (e.g. Z1234ABCDEFG or /hostedzone/Z1234ABCDEFG)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_hosted_zone',
        description: 'Create a new Route 53 hosted zone for a domain',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Domain name for the hosted zone (e.g. example.com)' },
            caller_reference: { type: 'string', description: 'Unique string to ensure idempotency (e.g. timestamp or UUID)' },
            comment: { type: 'string', description: 'Optional comment describing the hosted zone' },
            private_zone: { type: 'boolean', description: 'Set true to create a private hosted zone (requires vpc_id and vpc_region)' },
            vpc_id: { type: 'string', description: 'VPC ID for private hosted zone' },
            vpc_region: { type: 'string', description: 'VPC region for private hosted zone' },
          },
          required: ['name', 'caller_reference'],
        },
      },
      {
        name: 'list_resource_record_sets',
        description: 'List DNS record sets in a Route 53 hosted zone',
        inputSchema: {
          type: 'object',
          properties: {
            hosted_zone_id: { type: 'string', description: 'Hosted zone ID' },
            start_record_name: { type: 'string', description: 'Start listing from this record name' },
            start_record_type: { type: 'string', description: 'Start listing from this record type (A, AAAA, CNAME, etc.)' },
            max_items: { type: 'string', description: 'Maximum number of record sets to return' },
          },
          required: ['hosted_zone_id'],
        },
      },
      {
        name: 'change_resource_record_sets',
        description: 'Create, update, or delete DNS record sets in a Route 53 hosted zone',
        inputSchema: {
          type: 'object',
          properties: {
            hosted_zone_id: { type: 'string', description: 'Hosted zone ID' },
            changes: { type: 'string', description: 'JSON array of change objects: [{Action:CREATE|DELETE|UPSERT, ResourceRecordSet:{Name,Type,TTL,ResourceRecords:[{Value:str}]}}]' },
            comment: { type: 'string', description: 'Comment for this change batch' },
          },
          required: ['hosted_zone_id', 'changes'],
        },
      },
      {
        name: 'list_health_checks',
        description: 'List Route 53 health checks in the account',
        inputSchema: {
          type: 'object',
          properties: {
            marker: { type: 'string', description: 'Pagination marker' },
            max_items: { type: 'string', description: 'Maximum number of health checks to return' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_hosted_zones': return this.listHostedZones(args);
        case 'get_hosted_zone': return this.getHostedZone(args);
        case 'create_hosted_zone': return this.createHostedZone(args);
        case 'list_resource_record_sets': return this.listResourceRecordSets(args);
        case 'change_resource_record_sets': return this.changeResourceRecordSets(args);
        case 'list_health_checks': return this.listHealthChecks(args);
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
    const kService = this.hmac(kRegion, 'route53');
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

    const credentialScope = `${dateStamp}/${this.region}/route53/aws4_request`;
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

  private normalizeZoneId(id: string): string {
    return id.replace('/hostedzone/', '');
  }

  private async r53Request(method: string, path: string, body = '', extraHeaders: Record<string, string> = {}): Promise<Response> {
    const url = `https://route53.amazonaws.com${path}`;
    const headers: Record<string, string> = { ...extraHeaders };
    if (body) headers['Content-Type'] = 'application/xml';
    const signed = this.signRequest(method, url, headers, body);
    return this.fetchWithRetry(url, { method, headers: signed, body: body || undefined });
  }

  private async xmlResult(response: Response): Promise<ToolResult> {
    const text = await response.text();
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Route53 error ${response.status}: ${this.truncate(text)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listHostedZones(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_items) params.set('maxitems', args.max_items as string);
    if (args.marker) params.set('marker', args.marker as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.xmlResult(await this.r53Request('GET', `/2013-04-01/hostedzone${qs}`));
  }

  private async getHostedZone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const id = this.normalizeZoneId(args.id as string);
    return this.xmlResult(await this.r53Request('GET', `/2013-04-01/hostedzone/${id}`));
  }

  private async createHostedZone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.caller_reference) return { content: [{ type: 'text', text: 'name and caller_reference are required' }], isError: true };
    let vpcXml = '';
    if (args.private_zone && args.vpc_id && args.vpc_region) {
      vpcXml = `<VPC><VPCRegion>${args.vpc_region}</VPCRegion><VPCId>${args.vpc_id}</VPCId></VPC>`;
    }
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<CreateHostedZoneRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
  <Name>${args.name}</Name>
  <CallerReference>${args.caller_reference}</CallerReference>
  ${args.comment ? `<HostedZoneConfig><Comment>${args.comment}</Comment><PrivateZone>${args.private_zone ?? false}</PrivateZone></HostedZoneConfig>` : ''}
  ${vpcXml}
</CreateHostedZoneRequest>`;
    return this.xmlResult(await this.r53Request('POST', '/2013-04-01/hostedzone', body));
  }

  private async listResourceRecordSets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hosted_zone_id) return { content: [{ type: 'text', text: 'hosted_zone_id is required' }], isError: true };
    const id = this.normalizeZoneId(args.hosted_zone_id as string);
    const params = new URLSearchParams();
    if (args.start_record_name) params.set('name', args.start_record_name as string);
    if (args.start_record_type) params.set('type', args.start_record_type as string);
    if (args.max_items) params.set('maxitems', args.max_items as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.xmlResult(await this.r53Request('GET', `/2013-04-01/hostedzone/${id}/rrset${qs}`));
  }

  private async changeResourceRecordSets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hosted_zone_id || !args.changes) return { content: [{ type: 'text', text: 'hosted_zone_id and changes are required' }], isError: true };
    let changes: { Action: string; ResourceRecordSet: { Name: string; Type: string; TTL?: number; ResourceRecords?: { Value: string }[] } }[];
    try { changes = JSON.parse(args.changes as string); } catch { return { content: [{ type: 'text', text: 'changes must be valid JSON' }], isError: true }; }
    const id = this.normalizeZoneId(args.hosted_zone_id as string);
    const changesXml = changes.map(c => {
      const rrs = c.ResourceRecordSet.ResourceRecords
        ? c.ResourceRecordSet.ResourceRecords.map(r => `<ResourceRecord><Value>${r.Value}</Value></ResourceRecord>`).join('')
        : '';
      return `<Change>
  <Action>${c.Action}</Action>
  <ResourceRecordSet>
    <Name>${c.ResourceRecordSet.Name}</Name>
    <Type>${c.ResourceRecordSet.Type}</Type>
    ${c.ResourceRecordSet.TTL !== undefined ? `<TTL>${c.ResourceRecordSet.TTL}</TTL>` : ''}
    ${rrs ? `<ResourceRecords>${rrs}</ResourceRecords>` : ''}
  </ResourceRecordSet>
</Change>`;
    }).join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
  <ChangeBatch>
    ${args.comment ? `<Comment>${args.comment}</Comment>` : ''}
    <Changes>${changesXml}</Changes>
  </ChangeBatch>
</ChangeResourceRecordSetsRequest>`;
    return this.xmlResult(await this.r53Request('POST', `/2013-04-01/hostedzone/${id}/rrset`, body));
  }

  private async listHealthChecks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.marker) params.set('marker', args.marker as string);
    if (args.max_items) params.set('maxitems', args.max_items as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.xmlResult(await this.r53Request('GET', `/2013-04-01/healthcheck${qs}`));
  }
}
