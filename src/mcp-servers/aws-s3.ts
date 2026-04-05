/**
 * AWS S3 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/awslabs/mcp — transport: stdio, auth: AWS credentials
//   The awslabs/mcp repo contains an S3 Tables MCP server (s3-tables-mcp-server) focused on
//   S3 Tables/Iceberg analytics workloads, not general-purpose object storage operations.
//   A community sample also exists at https://github.com/aws-samples/sample-mcp-server-s3.
// Our adapter covers: 15 tools (general S3 object storage operations).
// Recommendation: Use awslabs s3-tables-mcp-server for Iceberg/analytics workloads. Use this adapter for
//   general bucket/object operations (list, get, put, delete, copy, presign) and air-gapped deployments.
//
// Base URL: https://{bucket}.s3.{region}.amazonaws.com (path-style: https://s3.{region}.amazonaws.com/{bucket})
// Auth: AWS Signature Version 4 (SigV4) — all requests signed with HMAC-SHA256.
//   Required credentials: accessKeyId, secretAccessKey, region. Optional: sessionToken (for temporary credentials).
// Docs: https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html
// Rate limits: S3 scales automatically. Prefix-level: 3,500 PUT/COPY/POST/DELETE/sec, 5,500 GET/HEAD/sec.

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSS3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
  forcePathStyle?: boolean;
}

export class AWSS3MCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;
  private readonly forcePathStyle: boolean;

  constructor(config: AWSS3Config) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
    this.forcePathStyle = config.forcePathStyle ?? false;
  }

  static catalog() {
    return {
      name: 'aws-s3',
      displayName: 'AWS S3',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'aws', 's3', 'amazon', 'object storage', 'bucket', 'blob', 'storage',
        'upload', 'download', 'file', 'object', 'presigned url', 'multipart',
        'versioning', 'replication', 'lifecycle',
      ],
      toolNames: [
        'list_buckets', 'create_bucket', 'delete_bucket', 'get_bucket_location',
        'get_bucket_versioning', 'put_bucket_versioning',
        'list_objects', 'get_object', 'put_object', 'delete_object', 'delete_objects',
        'copy_object', 'head_object',
        'generate_presigned_url',
        'get_bucket_lifecycle',
      ],
      description: 'AWS S3 object storage: manage buckets and objects, upload/download files, copy objects, configure versioning, and generate presigned URLs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_buckets',
        description: 'List all S3 buckets in the AWS account accessible to the configured credentials',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_bucket',
        description: 'Create a new S3 bucket in the configured region with optional ACL settings',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Globally unique bucket name (3-63 chars, lowercase letters, numbers, hyphens)',
            },
            acl: {
              type: 'string',
              description: 'Canned ACL: private (default), public-read, public-read-write, authenticated-read',
            },
          },
          required: ['bucket'],
        },
      },
      {
        name: 'delete_bucket',
        description: 'Delete an empty S3 bucket. The bucket must be empty before it can be deleted.',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to delete',
            },
          },
          required: ['bucket'],
        },
      },
      {
        name: 'get_bucket_location',
        description: 'Get the AWS region where an S3 bucket is located',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to query',
            },
          },
          required: ['bucket'],
        },
      },
      {
        name: 'get_bucket_versioning',
        description: 'Get the versioning configuration (Enabled, Suspended, or unset) for an S3 bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to query versioning status for',
            },
          },
          required: ['bucket'],
        },
      },
      {
        name: 'put_bucket_versioning',
        description: 'Enable or suspend versioning for an S3 bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to configure versioning for',
            },
            status: {
              type: 'string',
              description: 'Versioning status: Enabled or Suspended',
            },
          },
          required: ['bucket', 'status'],
        },
      },
      {
        name: 'list_objects',
        description: 'List objects in an S3 bucket with optional prefix, delimiter, and pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to list objects in',
            },
            prefix: {
              type: 'string',
              description: 'Filter objects whose keys begin with this prefix (e.g. logs/2024/)',
            },
            delimiter: {
              type: 'string',
              description: 'Group keys by delimiter for folder-like hierarchy (e.g. /)',
            },
            max_keys: {
              type: 'number',
              description: 'Maximum number of objects to return per request (default: 1000, max: 1000)',
            },
            continuation_token: {
              type: 'string',
              description: 'Token from a previous list response NextContinuationToken field for pagination',
            },
            start_after: {
              type: 'string',
              description: 'Return keys that appear alphabetically after this key',
            },
          },
          required: ['bucket'],
        },
      },
      {
        name: 'get_object',
        description: 'Retrieve an S3 object and return its content as a UTF-8 string (suitable for text files up to 10KB)',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket containing the object',
            },
            key: {
              type: 'string',
              description: 'Full object key (path) within the bucket',
            },
            version_id: {
              type: 'string',
              description: 'Specific version ID to retrieve (for versioned buckets)',
            },
          },
          required: ['bucket', 'key'],
        },
      },
      {
        name: 'put_object',
        description: 'Upload a text or JSON object to an S3 bucket with optional content type and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to upload the object to',
            },
            key: {
              type: 'string',
              description: 'Object key (path) within the bucket (e.g. data/report.json)',
            },
            body: {
              type: 'string',
              description: 'Object content as a UTF-8 string',
            },
            content_type: {
              type: 'string',
              description: 'MIME type of the object (default: application/octet-stream)',
            },
            acl: {
              type: 'string',
              description: 'Canned ACL: private (default), public-read, authenticated-read',
            },
            cache_control: {
              type: 'string',
              description: 'Cache-Control header value (e.g. max-age=3600)',
            },
          },
          required: ['bucket', 'key', 'body'],
        },
      },
      {
        name: 'delete_object',
        description: 'Delete a single object from an S3 bucket by key, with optional version ID for versioned buckets',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket containing the object',
            },
            key: {
              type: 'string',
              description: 'Object key to delete',
            },
            version_id: {
              type: 'string',
              description: 'Specific version ID to delete (for versioned buckets)',
            },
          },
          required: ['bucket', 'key'],
        },
      },
      {
        name: 'delete_objects',
        description: 'Delete up to 1000 objects from an S3 bucket in a single batch request',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to delete objects from',
            },
            keys: {
              type: 'string',
              description: 'Comma-separated list of object keys to delete (max 1000)',
            },
          },
          required: ['bucket', 'keys'],
        },
      },
      {
        name: 'copy_object',
        description: 'Copy an S3 object from one location to another within S3, optionally across buckets or regions',
        inputSchema: {
          type: 'object',
          properties: {
            source_bucket: {
              type: 'string',
              description: 'Name of the source bucket',
            },
            source_key: {
              type: 'string',
              description: 'Object key in the source bucket',
            },
            destination_bucket: {
              type: 'string',
              description: 'Name of the destination bucket',
            },
            destination_key: {
              type: 'string',
              description: 'Object key in the destination bucket',
            },
            acl: {
              type: 'string',
              description: 'Canned ACL for the copied object (default: private)',
            },
          },
          required: ['source_bucket', 'source_key', 'destination_bucket', 'destination_key'],
        },
      },
      {
        name: 'head_object',
        description: 'Get metadata for an S3 object (size, content type, ETag, last modified) without downloading its content',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket containing the object',
            },
            key: {
              type: 'string',
              description: 'Object key to retrieve metadata for',
            },
            version_id: {
              type: 'string',
              description: 'Specific version ID (for versioned buckets)',
            },
          },
          required: ['bucket', 'key'],
        },
      },
      {
        name: 'generate_presigned_url',
        description: 'Generate a time-limited presigned URL for GET or PUT access to an S3 object without requiring AWS credentials',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket',
            },
            key: {
              type: 'string',
              description: 'Object key to generate the URL for',
            },
            method: {
              type: 'string',
              description: 'HTTP method: GET (download) or PUT (upload) — default: GET',
            },
            expires_in: {
              type: 'number',
              description: 'URL expiry in seconds (default: 3600, max: 604800 = 7 days)',
            },
            content_type: {
              type: 'string',
              description: 'Content-Type for PUT presigned URLs (must match when uploading)',
            },
          },
          required: ['bucket', 'key'],
        },
      },
      {
        name: 'get_bucket_lifecycle',
        description: 'Get the lifecycle configuration rules for an S3 bucket (expiration, transitions to Glacier, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Name of the bucket to retrieve lifecycle rules for',
            },
          },
          required: ['bucket'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_buckets':
          return this.listBuckets();
        case 'create_bucket':
          return this.createBucket(args);
        case 'delete_bucket':
          return this.deleteBucket(args);
        case 'get_bucket_location':
          return this.getBucketLocation(args);
        case 'get_bucket_versioning':
          return this.getBucketVersioning(args);
        case 'put_bucket_versioning':
          return this.putBucketVersioning(args);
        case 'list_objects':
          return this.listObjects(args);
        case 'get_object':
          return this.getObject(args);
        case 'put_object':
          return this.putObject(args);
        case 'delete_object':
          return this.deleteObject(args);
        case 'delete_objects':
          return this.deleteObjects(args);
        case 'copy_object':
          return this.copyObject(args);
        case 'head_object':
          return this.headObject(args);
        case 'generate_presigned_url':
          return this.generatePresignedUrl(args);
        case 'get_bucket_lifecycle':
          return this.getBucketLifecycle(args);
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

  private bucketUrl(bucket: string, key?: string, queryString?: string): string {
    const encodedKey = key ? `/${key.split('/').map(encodeURIComponent).join('/')}` : '';
    const qs = queryString ? `?${queryString}` : '';
    if (this.forcePathStyle) {
      return `https://s3.${this.region}.amazonaws.com/${bucket}${encodedKey}${qs}`;
    }
    return `https://${bucket}.s3.${this.region}.amazonaws.com${encodedKey}${qs}`;
  }

  private serviceUrl(queryString?: string): string {
    const qs = queryString ? `?${queryString}` : '';
    return `https://s3.${this.region}.amazonaws.com/${qs}`;
  }

  private hmac(key: Buffer | string, data: string): Buffer {
    return createHmac('sha256', key).update(data, 'utf8').digest();
  }

  private sha256(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private getSigningKey(dateStamp: string): Buffer {
    const kDate = this.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmac(kDate, this.region);
    const kService = this.hmac(kRegion, 's3');
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

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
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

    return {
      ...allHeaders,
      Authorization: authorization,
    };
  }

  private async s3Request(
    method: string,
    url: string,
    extraHeaders: Record<string, string> = {},
    body = '',
  ): Promise<Response> {
    const signed = this.signRequest(method, url, extraHeaders, body);
    return fetch(url, {
      method,
      headers: signed,
      body: body.length > 0 ? body : undefined,
    });
  }

  private async xmlResult(response: Response): Promise<ToolResult> {
    if (!response.ok) {
      const body = await response.text();
      return { content: [{ type: 'text', text: `S3 error ${response.status}: ${this.truncate(body)}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // --- Tool implementations ---

  private async listBuckets(): Promise<ToolResult> {
    const url = this.serviceUrl();
    const response = await this.s3Request('GET', url);
    return this.xmlResult(response);
  }

  private async createBucket(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket) return { content: [{ type: 'text', text: 'bucket is required' }], isError: true };
    const url = this.bucketUrl(args.bucket as string);
    const headers: Record<string, string> = { 'Content-Type': 'application/xml' };
    if (args.acl) headers['x-amz-acl'] = args.acl as string;
    // For regions other than us-east-1, we must send a CreateBucketConfiguration body
    let body = '';
    if (this.region !== 'us-east-1') {
      body = `<?xml version="1.0" encoding="UTF-8"?><CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>${this.region}</LocationConstraint></CreateBucketConfiguration>`;
    }
    const response = await this.s3Request('PUT', url, headers, body);
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `S3 error ${response.status}: ${text}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, bucket: args.bucket, region: this.region }) }], isError: false };
  }

  private async deleteBucket(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket) return { content: [{ type: 'text', text: 'bucket is required' }], isError: true };
    const url = this.bucketUrl(args.bucket as string);
    const response = await this.s3Request('DELETE', url);
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `S3 error ${response.status}: ${text}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted_bucket: args.bucket }) }], isError: false };
  }

  private async getBucketLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket) return { content: [{ type: 'text', text: 'bucket is required' }], isError: true };
    const url = this.bucketUrl(args.bucket as string, undefined, 'location');
    const response = await this.s3Request('GET', url);
    return this.xmlResult(response);
  }

  private async getBucketVersioning(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket) return { content: [{ type: 'text', text: 'bucket is required' }], isError: true };
    const url = this.bucketUrl(args.bucket as string, undefined, 'versioning');
    const response = await this.s3Request('GET', url);
    return this.xmlResult(response);
  }

  private async putBucketVersioning(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket || !args.status) return { content: [{ type: 'text', text: 'bucket and status are required' }], isError: true };
    const status = args.status as string;
    if (!['Enabled', 'Suspended'].includes(status)) {
      return { content: [{ type: 'text', text: 'status must be Enabled or Suspended' }], isError: true };
    }
    const url = this.bucketUrl(args.bucket as string, undefined, 'versioning');
    const body = `<?xml version="1.0" encoding="UTF-8"?><VersioningConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Status>${status}</Status></VersioningConfiguration>`;
    const response = await this.s3Request('PUT', url, { 'Content-Type': 'application/xml' }, body);
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `S3 error ${response.status}: ${text}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, bucket: args.bucket, versioning: status }) }], isError: false };
  }

  private async listObjects(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket) return { content: [{ type: 'text', text: 'bucket is required' }], isError: true };
    const params: Record<string, string> = { 'list-type': '2' };
    if (args.prefix) params.prefix = args.prefix as string;
    if (args.delimiter) params.delimiter = args.delimiter as string;
    if (args.max_keys !== undefined) params['max-keys'] = String(args.max_keys);
    if (args.continuation_token) params['continuation-token'] = args.continuation_token as string;
    if (args.start_after) params['start-after'] = args.start_after as string;
    const qs = new URLSearchParams(params).toString();
    const url = this.bucketUrl(args.bucket as string, undefined, qs);
    const response = await this.s3Request('GET', url);
    return this.xmlResult(response);
  }

  private async getObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket || !args.key) return { content: [{ type: 'text', text: 'bucket and key are required' }], isError: true };
    let qs: string | undefined;
    if (args.version_id) qs = `versionId=${encodeURIComponent(args.version_id as string)}`;
    const url = this.bucketUrl(args.bucket as string, args.key as string, qs);
    const response = await this.s3Request('GET', url);
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `S3 error ${response.status}: ${text}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();
    const result = {
      key: args.key,
      content_type: contentType,
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified'),
      content_length: response.headers.get('content-length'),
      body: text,
    };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(result, null, 2)) }], isError: false };
  }

  private async putObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket || !args.key || args.body === undefined) {
      return { content: [{ type: 'text', text: 'bucket, key, and body are required' }], isError: true };
    }
    const url = this.bucketUrl(args.bucket as string, args.key as string);
    const headers: Record<string, string> = {
      'Content-Type': (args.content_type as string) ?? 'application/octet-stream',
    };
    if (args.acl) headers['x-amz-acl'] = args.acl as string;
    if (args.cache_control) headers['Cache-Control'] = args.cache_control as string;
    const response = await this.s3Request('PUT', url, headers, args.body as string);
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `S3 error ${response.status}: ${text}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, bucket: args.bucket, key: args.key, etag: response.headers.get('etag') }) }], isError: false };
  }

  private async deleteObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket || !args.key) return { content: [{ type: 'text', text: 'bucket and key are required' }], isError: true };
    let qs: string | undefined;
    if (args.version_id) qs = `versionId=${encodeURIComponent(args.version_id as string)}`;
    const url = this.bucketUrl(args.bucket as string, args.key as string, qs);
    const response = await this.s3Request('DELETE', url);
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `S3 error ${response.status}: ${text}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, bucket: args.bucket, key: args.key }) }], isError: false };
  }

  private async deleteObjects(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket || !args.keys) return { content: [{ type: 'text', text: 'bucket and keys are required' }], isError: true };
    const keys = (args.keys as string).split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return { content: [{ type: 'text', text: 'keys list is empty' }], isError: true };
    if (keys.length > 1000) return { content: [{ type: 'text', text: 'Maximum 1000 keys per batch delete' }], isError: true };
    const objectsXml = keys.map(k => `<Object><Key>${k.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Key></Object>`).join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?><Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Quiet>false</Quiet>${objectsXml}</Delete>`;
    const url = this.bucketUrl(args.bucket as string, undefined, 'delete');
    const md5 = createHash('md5').update(body).digest('base64');
    const response = await this.s3Request('POST', url, { 'Content-Type': 'application/xml', 'Content-MD5': md5 }, body);
    return this.xmlResult(response);
  }

  private async copyObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_bucket || !args.source_key || !args.destination_bucket || !args.destination_key) {
      return { content: [{ type: 'text', text: 'source_bucket, source_key, destination_bucket, and destination_key are required' }], isError: true };
    }
    const url = this.bucketUrl(args.destination_bucket as string, args.destination_key as string);
    // x-amz-copy-source must be "bucket/key" URL-encoded (no leading slash per AWS docs)
    const rawCopySource = `${args.source_bucket as string}/${args.source_key as string}`;
    const headers: Record<string, string> = { 'x-amz-copy-source': encodeURIComponent(rawCopySource) };
    if (args.acl) headers['x-amz-acl'] = args.acl as string;
    const response = await this.s3Request('PUT', url, headers);
    return this.xmlResult(response);
  }

  private async headObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket || !args.key) return { content: [{ type: 'text', text: 'bucket and key are required' }], isError: true };
    let qs: string | undefined;
    if (args.version_id) qs = `versionId=${encodeURIComponent(args.version_id as string)}`;
    const url = this.bucketUrl(args.bucket as string, args.key as string, qs);
    const response = await this.s3Request('HEAD', url);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `S3 error ${response.status}: object not found or no access` }], isError: true };
    }
    const metadata: Record<string, string | null> = {
      key: args.key as string,
      bucket: args.bucket as string,
      etag: response.headers.get('etag'),
      content_type: response.headers.get('content-type'),
      content_length: response.headers.get('content-length'),
      last_modified: response.headers.get('last-modified'),
      version_id: response.headers.get('x-amz-version-id'),
      storage_class: response.headers.get('x-amz-storage-class'),
      server_side_encryption: response.headers.get('x-amz-server-side-encryption'),
    };
    return { content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }], isError: false };
  }

  private async generatePresignedUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket || !args.key) return { content: [{ type: 'text', text: 'bucket and key are required' }], isError: true };
    const method = ((args.method as string) ?? 'GET').toUpperCase();
    const expiresIn = (args.expires_in as number) ?? 3600;
    if (expiresIn > 604800) return { content: [{ type: 'text', text: 'expires_in cannot exceed 604800 (7 days)' }], isError: true };

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const credential = `${this.accessKeyId}/${credentialScope}`;

    // Build the canonical query string for the presigned URL
    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
    };
    if (this.sessionToken) {
      queryParams['X-Amz-Security-Token'] = this.sessionToken;
    }

    const bucket = args.bucket as string;
    const key = args.key as string;
    const host = this.forcePathStyle
      ? `s3.${this.region}.amazonaws.com`
      : `${bucket}.s3.${this.region}.amazonaws.com`;
    const path = this.forcePathStyle ? `/${bucket}/${key}` : `/${key}`;

    const sortedParams = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedParams
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = this.hmac(signingKey, stringToSign).toString('hex');

    const presignedUrl = `https://${host}${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          presigned_url: presignedUrl,
          method,
          expires_in_seconds: expiresIn,
          bucket,
          key,
        }, null, 2),
      }],
      isError: false,
    };
  }

  private async getBucketLifecycle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bucket) return { content: [{ type: 'text', text: 'bucket is required' }], isError: true };
    const url = this.bucketUrl(args.bucket as string, undefined, 'lifecycle');
    const response = await this.s3Request('GET', url);
    return this.xmlResult(response);
  }
}
