/**
 * Vanta MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/VantaInc/vanta-mcp-server — transport: stdio, auth: OAuth2 client credentials
// Our adapter covers: 15 tools (tests, controls, frameworks, vulnerabilities, people, risks, integrations,
//   vendors, documents, access reviews, policy exceptions, custom resources).
// Vendor MCP covers: 13 tools (public preview). Our adapter extends coverage with vendors, access reviews,
//   policy exceptions, and custom resource endpoints not exposed in the vendor MCP.
// Recommendation: Use vendor MCP for quick read-only access. Use this adapter for full coverage
//   and air-gapped or server-side automation.
//
// Base URL: https://api.vanta.com  (single global endpoint, no regional variants)
// Auth: OAuth2 client_credentials flow.
//   POST https://api.vanta.com/oauth/token
//   Body (JSON): { client_id, client_secret, grant_type: "client_credentials", scope: "vanta-api.all:read vanta-api.all:write" }
//   Returns: { access_token, token_type: "Bearer", expires_in: 3600 }
//   Verified at: developer.vanta.com/docs/api-access-setup
// API version prefix: /v1/
// Docs: https://developer.vanta.com/reference
// Rate limits: OAuth: 5 req/min — Private/Public integration endpoints: 20 req/min — Management endpoints: 50 req/min
//
// Verified endpoint paths (developer.vanta.com/reference):
//   GET  /v1/tests
//   GET  /v1/controls
//   GET  /v1/controls/{controlId}/tests
//   GET  /v1/frameworks
//   GET  /v1/vulnerabilities
//   GET  /v1/people
//   GET  /v1/risks
//   GET  /v1/integrations
//   GET  /v1/documents
//   GET  /v1/vendors
//   POST /v1/vendors
//   GET  /v1/vendors/{vendorId}
//   PATCH /v1/vendors/{vendorId}

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VantaConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class VantaMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VantaConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.vanta.com';
  }

  static catalog() {
    return {
      name: 'vanta',
      displayName: 'Vanta',
      version: '1.0.0',
      category: 'compliance' as const,
      keywords: ['vanta', 'compliance', 'soc2', 'iso27001', 'hipaa', 'gdpr', 'pci', 'control', 'test', 'risk', 'vulnerability', 'audit', 'framework', 'security', 'vendor', 'evidence'],
      toolNames: [
        'list_tests', 'list_controls', 'get_control_tests', 'list_frameworks',
        'list_vulnerabilities', 'list_people', 'list_risks', 'list_integrations',
        'list_documents', 'list_vendors', 'create_vendor', 'get_vendor', 'update_vendor',
        'list_policy_exceptions', 'list_access_reviews',
      ],
      description: 'Vanta compliance automation: SOC 2, ISO 27001, HIPAA, PCI controls, tests, risks, vulnerabilities, vendors, people, documents, and access reviews.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tests',
        description: 'List compliance tests (automated checks) in Vanta with their current pass/fail status, associated controls, and failing resources.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'list_controls',
        description: 'List security controls tracked in Vanta across compliance frameworks (SOC 2, ISO 27001, HIPAA, etc.) with their status and owner.',
        inputSchema: {
          type: 'object',
          properties: {
            framework_id: { type: 'string', description: 'Filter controls by compliance framework ID' },
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'get_control_tests',
        description: 'Get all automated tests mapped to a specific control, showing which checks are linked to that control requirement and their pass/fail status.',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: { type: 'string', description: 'Control ID whose associated tests to retrieve' },
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'list_frameworks',
        description: 'List compliance frameworks configured in Vanta (SOC 2, ISO 27001, HIPAA, GDPR, PCI DSS, etc.) with overall readiness status and control counts.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities tracked in Vanta with severity, affected assets, SLA deadlines, and remediation status.',
        inputSchema: {
          type: 'object',
          properties: {
            severity: { type: 'string', description: 'Filter by severity: critical, high, medium, low' },
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'list_people',
        description: 'List people (employees and contractors) in Vanta with their access reviews, security training status, and compliance posture.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'list_risks',
        description: 'List risk scenarios in Vanta with risk scores, treatment status (accepted, mitigated, transferred), owner, and mitigation strategy.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'list_integrations',
        description: 'List third-party integrations connected to Vanta (AWS, GitHub, GCP, Okta, etc.) with their sync status and last sync timestamp.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'list_documents',
        description: 'List policy documents and evidence files uploaded to Vanta. Returns document name, type, owner, expiration, and upload date.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'list_vendors',
        description: 'List vendors in your Vanta security review program with their risk tier, review status, and security questionnaire completion.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'create_vendor',
        description: 'Add a new vendor to the Vanta security review program. Requires vendor name, website, and category.',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_name: { type: 'string', description: 'Vendor company name' },
            vendor_website: { type: 'string', description: 'Vendor website URL (e.g. https://aws.amazon.com)' },
            vendor_category: { type: 'string', description: 'Vendor category (e.g. Infrastructure, SaaS, Security)' },
            description: { type: 'string', description: 'Internal notes or description for this vendor' },
            risk_level: { type: 'string', description: 'Risk tier: HIGH, MEDIUM, LOW' },
          },
          required: ['vendor_name', 'vendor_website', 'vendor_category'],
        },
      },
      {
        name: 'get_vendor',
        description: 'Get detailed information about a specific vendor in Vanta including security review status, risk level, and linked controls.',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: { type: 'string', description: 'Vendor ID to retrieve' },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'update_vendor',
        description: 'Update vendor properties in Vanta such as risk level, review status, or category.',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: { type: 'string', description: 'Vendor ID to update' },
            risk_level: { type: 'string', description: 'Updated risk tier: HIGH, MEDIUM, LOW' },
            vendor_category: { type: 'string', description: 'Updated vendor category' },
            description: { type: 'string', description: 'Updated internal notes or description' },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'list_policy_exceptions',
        description: 'List active policy exceptions in Vanta with their justification, expiration date, approver, and linked controls.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
      {
        name: 'list_access_reviews',
        description: 'List access review campaigns in Vanta with status (pending, completed), reviewer, deadline, and completion percentage.',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            page_size: { type: 'number', description: 'Number of results per page (default: 100, max: 100)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tests': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/tests?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_controls': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/controls?pageSize=${pageSize}`;
          if (args.framework_id) path += `&frameworkId=${encodeURIComponent(args.framework_id as string)}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_control_tests': {
          const controlId = args.control_id as string;
          if (!controlId) {
            return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
          }
          let path = `/v1/controls/${encodeURIComponent(controlId)}/tests`;
          if (args.page_cursor) path += `?pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_frameworks': {
          let path = '/v1/frameworks';
          if (args.page_cursor) path += `?pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_vulnerabilities': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/vulnerabilities?pageSize=${pageSize}`;
          if (args.severity) path += `&severity=${encodeURIComponent(args.severity as string)}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_people': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/people?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_risks': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/risks?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_integrations': {
          let path = '/v1/integrations';
          if (args.page_cursor) path += `?pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_documents': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/documents?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_vendors': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/vendors?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'create_vendor': {
          const vendorName = args.vendor_name as string;
          const vendorWebsite = args.vendor_website as string;
          const vendorCategory = args.vendor_category as string;
          if (!vendorName || !vendorWebsite || !vendorCategory) {
            return { content: [{ type: 'text', text: 'vendor_name, vendor_website, and vendor_category are required' }], isError: true };
          }
          const body: Record<string, unknown> = {
            vendorName,
            vendorWebsite,
            vendorCategory,
          };
          if (args.description) body.description = args.description;
          if (args.risk_level) body.riskLevel = args.risk_level;
          return await this.request('/v1/vendors', 'POST', body);
        }

        case 'get_vendor': {
          const vendorId = args.vendor_id as string;
          if (!vendorId) {
            return { content: [{ type: 'text', text: 'vendor_id is required' }], isError: true };
          }
          return await this.request(`/v1/vendors/${encodeURIComponent(vendorId)}`, 'GET');
        }

        case 'update_vendor': {
          const vendorId = args.vendor_id as string;
          if (!vendorId) {
            return { content: [{ type: 'text', text: 'vendor_id is required' }], isError: true };
          }
          const body: Record<string, unknown> = {};
          if (args.risk_level) body.riskLevel = args.risk_level;
          if (args.vendor_category) body.vendorCategory = args.vendor_category;
          if (args.description) body.description = args.description;
          return await this.request(`/v1/vendors/${encodeURIComponent(vendorId)}`, 'PATCH', body);
        }

        case 'list_policy_exceptions': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/policy-exceptions?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_access_reviews': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/access-reviews?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

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

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'vanta-api.all:read vanta-api.all:write',
      }),
    });

    if (!response.ok) {
      throw new Error(`Vanta token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data?.access_token) {
      throw new Error('Vanta token response did not contain access_token');
    }

    this.cachedToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return this.cachedToken;
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const token = await this.getToken();

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Vanta API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Vanta returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}
