/**
 * AWS Textract MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official AWS Textract-specific MCP server was found. The awslabs/mcp repository
// (https://github.com/awslabs/mcp) contains 66 specialized servers but none for Textract.
// The awslabs/document-loader-mcp-server parses local files via pdfplumber/markitdown —
// it does NOT call Textract APIs. This adapter is the only REST wrapper for Textract.
// Recommendation: use-rest-api — no viable MCP alternative exists.
//
// Base URL: https://textract.{region}.amazonaws.com (default region: us-east-1)
// Auth: AWS Signature Version 4 (HMAC-SHA256). Requires accessKeyId, secretAccessKey, region.
//       Optionally sessionToken for temporary credentials.
// Docs: https://docs.aws.amazon.com/textract/latest/dg/API_Reference.html
// Rate limits (us-east-1 defaults, soft limits — request increases via Service Quotas console):
//   Sync: DetectDocumentText 25 TPS, AnalyzeDocument 10 TPS, AnalyzeExpense 5 TPS, AnalyzeID 5 TPS
//   Async Start*: StartDocumentTextDetection 15 TPS, StartDocumentAnalysis 10 TPS,
//                 StartExpenseAnalysis 5 TPS, StartLendingAnalysis 5 TPS
//   Async Get*: GetDocumentTextDetection 25 TPS, GetDocumentAnalysis 10 TPS,
//               GetExpenseAnalysis 5 TPS, GetLendingAnalysis 25 TPS
// X-Amz-Target header format: Textract.{OperationName}
// Service name for SigV4: textract

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AWSTextractConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
  baseUrl?: string;
}

export class AWSTextractMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: AWSTextractConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region || 'us-east-1';
    this.sessionToken = config.sessionToken;
    this.baseUrl = config.baseUrl || `https://textract.${this.region}.amazonaws.com`;
  }

  static catalog() {
    return {
      name: 'aws-textract',
      displayName: 'AWS Textract',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'aws', 'textract', 'ocr', 'document', 'extraction', 'text detection',
        'form parsing', 'table extraction', 'invoice', 'receipt', 'expense',
        'identity document', 'pdf', 'image', 'scan', 'amazon',
      ],
      toolNames: [
        'detect_document_text',
        'analyze_document',
        'analyze_expense',
        'analyze_id',
        'start_document_text_detection',
        'get_document_text_detection',
        'start_document_analysis',
        'get_document_analysis',
        'start_expense_analysis',
        'get_expense_analysis',
        'start_lending_analysis',
        'get_lending_analysis',
        'get_lending_analysis_summary',
        'list_adapters',
        'get_adapter',
        'create_adapter',
        'update_adapter',
        'delete_adapter',
        'list_adapter_versions',
        'get_adapter_version',
        'delete_adapter_version',
      ],
      description: 'AWS Textract document OCR and extraction: detect text, analyze forms, tables, expenses, identity documents, and lending packages; run async jobs; manage custom adapters and adapter versions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'detect_document_text',
        description: 'Synchronously detect and extract all text (words, lines) from a document image stored in S3 or provided as base64 bytes. Best for simple text extraction without structure.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket name containing the document. Use with s3_key. Mutually exclusive with bytes.',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key (file path) of the document within the bucket.',
            },
            s3_version: {
              type: 'string',
              description: 'S3 object version ID if versioning is enabled on the bucket.',
            },
            bytes: {
              type: 'string',
              description: 'Base64-encoded document bytes (JPEG or PNG only). Mutually exclusive with s3_bucket/s3_key.',
            },
          },
        },
      },
      {
        name: 'analyze_document',
        description: 'Synchronously analyze a document for forms (key-value pairs), tables, queries, and signatures. Returns structured Block objects for detected elements.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket name containing the document.',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key of the document.',
            },
            bytes: {
              type: 'string',
              description: 'Base64-encoded document bytes. JPEG or PNG only for sync operation.',
            },
            feature_types: {
              type: 'string',
              description: 'Comma-separated analysis features: TABLES, FORMS, QUERIES, SIGNATURES (e.g. "TABLES,FORMS")',
            },
            queries: {
              type: 'string',
              description: 'JSON array of query objects with "Text" and optional "Alias" fields when QUERIES is in feature_types (e.g. \'[{"Text":"What is the invoice date?","Alias":"invoice_date"}]\')',
            },
          },
          required: ['feature_types'],
        },
      },
      {
        name: 'analyze_expense',
        description: 'Synchronously extract financial data from invoices and receipts: line items, totals, vendor name, tax, and summary fields. Supports JPEG, PNG, PDF.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket name containing the invoice or receipt.',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key of the invoice or receipt.',
            },
            bytes: {
              type: 'string',
              description: 'Base64-encoded document bytes (JPEG or PNG only for sync).',
            },
          },
        },
      },
      {
        name: 'analyze_id',
        description: 'Synchronously extract fields from US driver\'s licenses and passports: name, date of birth, address, expiration date, document number. Supports JPEG and PNG.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket name containing the identity document image.',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key of the identity document image.',
            },
            bytes: {
              type: 'string',
              description: 'Base64-encoded JPEG or PNG bytes of the identity document.',
            },
          },
        },
      },
      {
        name: 'start_document_text_detection',
        description: 'Start an asynchronous text detection job for a multi-page PDF or TIFF stored in S3. Returns a JobId to poll with get_document_text_detection.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket containing the document (required for async).',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key of the document.',
            },
            client_request_token: {
              type: 'string',
              description: 'Idempotency token — reuse to avoid duplicate jobs on retry.',
            },
            job_tag: {
              type: 'string',
              description: 'Arbitrary tag for the job, returned in SNS notifications.',
            },
            notification_channel_role_arn: {
              type: 'string',
              description: 'IAM role ARN for SNS notifications on job completion.',
            },
            notification_channel_sns_topic_arn: {
              type: 'string',
              description: 'SNS topic ARN to notify when the job completes.',
            },
          },
          required: ['s3_bucket', 's3_key'],
        },
      },
      {
        name: 'get_document_text_detection',
        description: 'Get results from a previously started async text detection job by JobId. Paginate with NextToken when more pages are available.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Job identifier returned by start_document_text_detection.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of Block objects to return per call (default: 1000, max: 1000).',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous get_document_text_detection response.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'start_document_analysis',
        description: 'Start an asynchronous document analysis job for multi-page PDFs or TIFFs stored in S3. Analyzes for TABLES, FORMS, QUERIES, and/or SIGNATURES. Returns a JobId.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket containing the document.',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key of the document.',
            },
            feature_types: {
              type: 'string',
              description: 'Comma-separated features: TABLES, FORMS, QUERIES, SIGNATURES (e.g. "TABLES,FORMS")',
            },
            client_request_token: {
              type: 'string',
              description: 'Idempotency token to avoid duplicate jobs on retry.',
            },
            job_tag: {
              type: 'string',
              description: 'Tag for the job, returned in SNS notifications.',
            },
          },
          required: ['s3_bucket', 's3_key', 'feature_types'],
        },
      },
      {
        name: 'get_document_analysis',
        description: 'Get results from a previously started async document analysis job by JobId. Returns Block objects for forms, tables, and queries. Paginate with NextToken.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Job identifier returned by start_document_analysis.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of Block objects to return per call (max: 1000).',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous get_document_analysis response.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'start_expense_analysis',
        description: 'Start an asynchronous expense analysis job for invoices and receipts stored in S3 (PDF or TIFF). Returns a JobId to poll with get_expense_analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket containing the invoice or receipt document.',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key of the invoice or receipt document.',
            },
            client_request_token: {
              type: 'string',
              description: 'Idempotency token to avoid duplicate jobs on retry.',
            },
            job_tag: {
              type: 'string',
              description: 'Tag for the job, returned in SNS notifications.',
            },
          },
          required: ['s3_bucket', 's3_key'],
        },
      },
      {
        name: 'get_expense_analysis',
        description: 'Get results from a previously started async expense analysis job by JobId. Returns line items, totals, vendor information, and summary fields.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Job identifier returned by start_expense_analysis.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of ExpenseDocument objects per call (max: 20).',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous get_expense_analysis response.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'start_lending_analysis',
        description: 'Start an async Textract Analyze Lending job for mortgage/loan documents stored in S3, classifying pages and extracting fields. Returns a JobId.',
        inputSchema: {
          type: 'object',
          properties: {
            s3_bucket: {
              type: 'string',
              description: 'S3 bucket containing the lending document (PDF, JPEG, or PNG).',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key of the lending document.',
            },
            client_request_token: {
              type: 'string',
              description: 'Idempotency token to avoid duplicate jobs on retry.',
            },
            job_tag: {
              type: 'string',
              description: 'Tag for the job, returned in SNS notifications.',
            },
            notification_channel_role_arn: {
              type: 'string',
              description: 'IAM role ARN for SNS notifications on job completion.',
            },
            notification_channel_sns_topic_arn: {
              type: 'string',
              description: 'SNS topic ARN to notify when the job completes.',
            },
          },
          required: ['s3_bucket', 's3_key'],
        },
      },
      {
        name: 'get_lending_analysis',
        description: 'Get per-page results from a completed async Analyze Lending job by JobId, including classified page types and extracted field data. Paginate with NextToken.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Job identifier returned by start_lending_analysis.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results per call (default: 30, max: 30).',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous get_lending_analysis response.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_lending_analysis_summary',
        description: 'Get a high-level summary of a completed async Analyze Lending job by JobId, including document-level classifications and aggregate field extractions.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Job identifier returned by start_lending_analysis.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_adapters',
        description: 'List Textract adapters (custom models) available in the account, with optional filter by adapter name and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_name: {
              type: 'string',
              description: 'Filter adapters by name prefix.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of adapters to return (default: 100).',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous list_adapters response.',
            },
          },
        },
      },
      {
        name: 'get_adapter',
        description: 'Get details about a specific Textract adapter (custom model) by its adapter ID, including version information and configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_id: {
              type: 'string',
              description: 'Unique identifier of the Textract adapter.',
            },
          },
          required: ['adapter_id'],
        },
      },
      {
        name: 'create_adapter',
        description: 'Create a new Textract custom adapter fine-tuned for QUERIES feature type on user-provided documents. Returns an AdapterId.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_name: {
              type: 'string',
              description: 'Name for the new adapter (1-128 chars, alphanumeric, hyphens, underscores).',
            },
            description: {
              type: 'string',
              description: 'Optional description for the adapter.',
            },
            auto_update: {
              type: 'string',
              description: 'Whether Textract automatically updates the adapter: ENABLED or DISABLED (default: DISABLED).',
            },
            client_request_token: {
              type: 'string',
              description: 'Idempotency token to avoid creating duplicate adapters on retry.',
            },
          },
          required: ['adapter_name'],
        },
      },
      {
        name: 'update_adapter',
        description: 'Update the name, description, or auto-update setting of an existing Textract custom adapter.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_id: {
              type: 'string',
              description: 'Unique identifier of the Textract adapter to update.',
            },
            description: {
              type: 'string',
              description: 'New description for the adapter.',
            },
            adapter_name: {
              type: 'string',
              description: 'New name for the adapter.',
            },
            auto_update: {
              type: 'string',
              description: 'New auto-update setting: ENABLED or DISABLED.',
            },
          },
          required: ['adapter_id'],
        },
      },
      {
        name: 'delete_adapter',
        description: 'Permanently delete a Textract custom adapter and all its versions by adapter ID.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_id: {
              type: 'string',
              description: 'Unique identifier of the Textract adapter to delete.',
            },
          },
          required: ['adapter_id'],
        },
      },
      {
        name: 'list_adapter_versions',
        description: 'List versions of a specific Textract adapter, with optional status filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_id: {
              type: 'string',
              description: 'Unique identifier of the Textract adapter whose versions to list.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of adapter versions to return (default: 100).',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous list_adapter_versions response.',
            },
          },
          required: ['adapter_id'],
        },
      },
      {
        name: 'get_adapter_version',
        description: 'Get configuration and evaluation metrics for a specific Textract adapter version by adapter ID and version string.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_id: {
              type: 'string',
              description: 'Unique identifier of the Textract adapter.',
            },
            adapter_version: {
              type: 'string',
              description: 'Version string of the adapter version to retrieve.',
            },
          },
          required: ['adapter_id', 'adapter_version'],
        },
      },
      {
        name: 'delete_adapter_version',
        description: 'Permanently delete a specific version of a Textract custom adapter.',
        inputSchema: {
          type: 'object',
          properties: {
            adapter_id: {
              type: 'string',
              description: 'Unique identifier of the Textract adapter.',
            },
            adapter_version: {
              type: 'string',
              description: 'Version string of the adapter version to delete.',
            },
          },
          required: ['adapter_id', 'adapter_version'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'detect_document_text':
          return this.detectDocumentText(args);
        case 'analyze_document':
          return this.analyzeDocument(args);
        case 'analyze_expense':
          return this.analyzeExpense(args);
        case 'analyze_id':
          return this.analyzeId(args);
        case 'start_document_text_detection':
          return this.startDocumentTextDetection(args);
        case 'get_document_text_detection':
          return this.getDocumentTextDetection(args);
        case 'start_document_analysis':
          return this.startDocumentAnalysis(args);
        case 'get_document_analysis':
          return this.getDocumentAnalysis(args);
        case 'start_expense_analysis':
          return this.startExpenseAnalysis(args);
        case 'get_expense_analysis':
          return this.getExpenseAnalysis(args);
        case 'start_lending_analysis':
          return this.startLendingAnalysis(args);
        case 'get_lending_analysis':
          return this.getLendingAnalysis(args);
        case 'get_lending_analysis_summary':
          return this.getLendingAnalysisSummary(args);
        case 'list_adapters':
          return this.listAdapters(args);
        case 'get_adapter':
          return this.getAdapter(args);
        case 'create_adapter':
          return this.createAdapter(args);
        case 'update_adapter':
          return this.updateAdapter(args);
        case 'delete_adapter':
          return this.deleteAdapter(args);
        case 'list_adapter_versions':
          return this.listAdapterVersions(args);
        case 'get_adapter_version':
          return this.getAdapterVersion(args);
        case 'delete_adapter_version':
          return this.deleteAdapterVersion(args);
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

  // ── SigV4 signing ─────────────────────────────────────────────────────────

  private hmac(key: Buffer | string, data: string): Buffer {
    return createHmac('sha256', key).update(data, 'utf8').digest();
  }

  private sha256hex(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private getSigningKey(dateStamp: string): Buffer {
    const kDate = this.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmac(kDate, this.region);
    const kService = this.hmac(kRegion, 'textract');
    return this.hmac(kService, 'aws4_request');
  }

  private buildAuthHeaders(operation: string, body: string): Record<string, string> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = this.sha256hex(body);
    const host = new URL(this.baseUrl).host;

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': `Textract.${operation}`,
      'Host': host,
    };
    if (this.sessionToken) {
      headers['X-Amz-Security-Token'] = this.sessionToken;
    }

    const signedHeaderNames = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n') + '\n';

    const canonicalRequest = [
      'POST',
      '/',
      '',
      canonicalHeaders,
      signedHeaderNames,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/textract/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256hex(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = this.hmac(signingKey, stringToSign).toString('hex');

    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`;
    delete headers['Host'];

    return headers;
  }

  // ── HTTP helper ───────────────────────────────────────────────────────────

  private async textractPost(operation: string, payload: Record<string, unknown>): Promise<ToolResult> {
    const body = JSON.stringify(payload);
    const authHeaders = this.buildAuthHeaders(operation, body);

    const response = await this.fetchWithRetry(this.baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body,
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Textract returned non-JSON (HTTP ${response.status})` }],
        isError: true,
      };
    }

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${JSON.stringify(data)}` }],
        isError: true,
      };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  // ── Document source builder ───────────────────────────────────────────────

  private buildDocument(args: Record<string, unknown>): Record<string, unknown> {
    if (args.bytes) {
      return { Document: { Bytes: args.bytes } };
    }
    if (args.s3_bucket && args.s3_key) {
      const s3Obj: Record<string, unknown> = {
        Bucket: args.s3_bucket,
        Name: args.s3_key,
      };
      if (args.s3_version) s3Obj['Version'] = args.s3_version;
      return { Document: { S3Object: s3Obj } };
    }
    throw new Error('Provide either bytes or s3_bucket + s3_key');
  }

  private buildS3Object(args: Record<string, unknown>): Record<string, unknown> {
    if (!args.s3_bucket || !args.s3_key) {
      throw new Error('s3_bucket and s3_key are required for this operation');
    }
    return { DocumentLocation: { S3Object: { Bucket: args.s3_bucket, Name: args.s3_key } } };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async detectDocumentText(args: Record<string, unknown>): Promise<ToolResult> {
    const payload = this.buildDocument(args);
    return this.textractPost('DetectDocumentText', payload);
  }

  private async analyzeDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.feature_types) {
      return { content: [{ type: 'text', text: 'feature_types is required' }], isError: true };
    }
    const features = (args.feature_types as string).split(',').map(f => f.trim().toUpperCase());
    const payload: Record<string, unknown> = {
      ...this.buildDocument(args),
      FeatureTypes: features,
    };
    if (args.queries) {
      try {
        payload['QueriesConfig'] = { Queries: JSON.parse(args.queries as string) };
      } catch {
        return { content: [{ type: 'text', text: 'queries must be valid JSON array' }], isError: true };
      }
    }
    return this.textractPost('AnalyzeDocument', payload);
  }

  private async analyzeExpense(args: Record<string, unknown>): Promise<ToolResult> {
    const payload = this.buildDocument(args);
    return this.textractPost('AnalyzeExpense', payload);
  }

  private async analyzeId(args: Record<string, unknown>): Promise<ToolResult> {
    const docSource = this.buildDocument(args);
    const payload = { DocumentPages: [docSource['Document']] };
    return this.textractPost('AnalyzeID', payload);
  }

  private async startDocumentTextDetection(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = this.buildS3Object(args);
    if (args.client_request_token) payload['ClientRequestToken'] = args.client_request_token;
    if (args.job_tag) payload['JobTag'] = args.job_tag;
    if (args.notification_channel_role_arn && args.notification_channel_sns_topic_arn) {
      payload['NotificationChannel'] = {
        RoleArn: args.notification_channel_role_arn,
        SNSTopicArn: args.notification_channel_sns_topic_arn,
      };
    }
    return this.textractPost('StartDocumentTextDetection', payload);
  }

  private async getDocumentTextDetection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { JobId: args.job_id };
    if (args.max_results) payload['MaxResults'] = args.max_results;
    if (args.next_token) payload['NextToken'] = args.next_token;
    return this.textractPost('GetDocumentTextDetection', payload);
  }

  private async startDocumentAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.feature_types) {
      return { content: [{ type: 'text', text: 'feature_types is required' }], isError: true };
    }
    const features = (args.feature_types as string).split(',').map(f => f.trim().toUpperCase());
    const payload: Record<string, unknown> = {
      ...this.buildS3Object(args),
      FeatureTypes: features,
    };
    if (args.client_request_token) payload['ClientRequestToken'] = args.client_request_token;
    if (args.job_tag) payload['JobTag'] = args.job_tag;
    return this.textractPost('StartDocumentAnalysis', payload);
  }

  private async getDocumentAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { JobId: args.job_id };
    if (args.max_results) payload['MaxResults'] = args.max_results;
    if (args.next_token) payload['NextToken'] = args.next_token;
    return this.textractPost('GetDocumentAnalysis', payload);
  }

  private async startExpenseAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = this.buildS3Object(args);
    if (args.client_request_token) payload['ClientRequestToken'] = args.client_request_token;
    if (args.job_tag) payload['JobTag'] = args.job_tag;
    return this.textractPost('StartExpenseAnalysis', payload);
  }

  private async getExpenseAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { JobId: args.job_id };
    if (args.max_results) payload['MaxResults'] = args.max_results;
    if (args.next_token) payload['NextToken'] = args.next_token;
    return this.textractPost('GetExpenseAnalysis', payload);
  }

  private async listAdapters(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {};
    if (args.adapter_name) payload['AdapterName'] = args.adapter_name;
    if (args.max_results) payload['MaxResults'] = args.max_results;
    if (args.next_token) payload['NextToken'] = args.next_token;
    return this.textractPost('ListAdapters', payload);
  }

  private async getAdapter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adapter_id) {
      return { content: [{ type: 'text', text: 'adapter_id is required' }], isError: true };
    }
    return this.textractPost('GetAdapter', { AdapterId: args.adapter_id });
  }

  private async startLendingAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = this.buildS3Object(args);
    if (args.client_request_token) payload['ClientRequestToken'] = args.client_request_token;
    if (args.job_tag) payload['JobTag'] = args.job_tag;
    if (args.notification_channel_role_arn && args.notification_channel_sns_topic_arn) {
      payload['NotificationChannel'] = {
        RoleArn: args.notification_channel_role_arn,
        SNSTopicArn: args.notification_channel_sns_topic_arn,
      };
    }
    return this.textractPost('StartLendingAnalysis', payload);
  }

  private async getLendingAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { JobId: args.job_id };
    if (args.max_results) payload['MaxResults'] = args.max_results;
    if (args.next_token) payload['NextToken'] = args.next_token;
    return this.textractPost('GetLendingAnalysis', payload);
  }

  private async getLendingAnalysisSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) {
      return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    }
    return this.textractPost('GetLendingAnalysisSummary', { JobId: args.job_id });
  }

  private async createAdapter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adapter_name) {
      return { content: [{ type: 'text', text: 'adapter_name is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { AdapterName: args.adapter_name };
    if (args.description) payload['Description'] = args.description;
    if (args.auto_update) payload['AutoUpdate'] = args.auto_update;
    if (args.client_request_token) payload['ClientRequestToken'] = args.client_request_token;
    return this.textractPost('CreateAdapter', payload);
  }

  private async updateAdapter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adapter_id) {
      return { content: [{ type: 'text', text: 'adapter_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { AdapterId: args.adapter_id };
    if (args.description) payload['Description'] = args.description;
    if (args.adapter_name) payload['AdapterName'] = args.adapter_name;
    if (args.auto_update) payload['AutoUpdate'] = args.auto_update;
    return this.textractPost('UpdateAdapter', payload);
  }

  private async deleteAdapter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adapter_id) {
      return { content: [{ type: 'text', text: 'adapter_id is required' }], isError: true };
    }
    return this.textractPost('DeleteAdapter', { AdapterId: args.adapter_id });
  }

  private async listAdapterVersions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adapter_id) {
      return { content: [{ type: 'text', text: 'adapter_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { AdapterId: args.adapter_id };
    if (args.max_results) payload['MaxResults'] = args.max_results;
    if (args.next_token) payload['NextToken'] = args.next_token;
    return this.textractPost('ListAdapterVersions', payload);
  }

  private async getAdapterVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adapter_id || !args.adapter_version) {
      return { content: [{ type: 'text', text: 'adapter_id and adapter_version are required' }], isError: true };
    }
    return this.textractPost('GetAdapterVersion', {
      AdapterId: args.adapter_id,
      AdapterVersion: args.adapter_version,
    });
  }

  private async deleteAdapterVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adapter_id || !args.adapter_version) {
      return { content: [{ type: 'text', text: 'adapter_id and adapter_version are required' }], isError: true };
    }
    return this.textractPost('DeleteAdapterVersion', {
      AdapterId: args.adapter_id,
      AdapterVersion: args.adapter_version,
    });
  }
}
