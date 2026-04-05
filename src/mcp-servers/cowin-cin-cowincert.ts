/**
 * Co-WIN Certificate API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Co-WIN MCP server was found on GitHub. We build a full REST wrapper
// for the Co-WIN vaccination certificate API.
//
// Base URL: https://cowin.gov.cin/cert/external
// Auth: OAuth2 authorization_code (DIVOC Keycloak) + API key header (Authorization)
// Docs: https://www.cowin.gov.in
// Spec: https://api.apis.guru/v2/specs/cowin.gov.cin/cowincert/1.0.0/openapi.json
// Category: healthcare
// Rate limits: See Co-WIN / MoHFW terms

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CoWinCertConfig {
  /** Bearer token obtained via DIVOC Keycloak OAuth2 authorization_code flow */
  accessToken: string;
  baseUrl?: string;
}

export class CoWinCinCowincertMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CoWinCertConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://cowin.gov.cin/cert/external';
  }

  static catalog() {
    return {
      name: 'cowin-cin-cowincert',
      displayName: 'Co-WIN Vaccination Certificate API',
      version: '1.0.0',
      category: 'healthcare',
      keywords: [
        'cowin', 'co-win', 'vaccination', 'certificate', 'covid', 'covid-19',
        'india', 'mohfw', 'divoc', 'immunization', 'vaccine', 'healthcare',
        'beneficiary', 'pdf', 'health certificate',
      ],
      toolNames: [
        'get_certificate_pdf',
      ],
      description: 'Co-WIN Certificate API: download COVID-19 vaccination certificates as PDF for Indian beneficiaries via the Ministry of Health and Family Welfare DIVOC platform.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Certificate ────────────────────────────────────────────────────────
      {
        name: 'get_certificate_pdf',
        description: 'Download a Co-WIN COVID-19 vaccination certificate in PDF format for a beneficiary. Requires the beneficiary ID and registered mobile number. Returns the certificate PDF as a base64-encoded string.',
        inputSchema: {
          type: 'object',
          properties: {
            beneficiaryId: {
              type: 'string',
              description: 'Co-WIN beneficiary reference ID for the vaccinated individual',
            },
            mobile: {
              type: 'string',
              description: 'Mobile number registered with Co-WIN for the beneficiary',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_certificate_pdf': return this.getCertificatePdf(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }


  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/pdf',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      const b64 = Buffer.from(buffer).toString('base64');
      return {
        content: [{ type: 'text', text: JSON.stringify({ pdf_base64: b64, content_type: 'application/pdf' }) }],
        isError: false,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Certificate ────────────────────────────────────────────────────────────

  private async getCertificatePdf(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.beneficiaryId) body.beneficiaryId = args.beneficiaryId;
    if (args.mobile) body.mobile = args.mobile;
    return this.request('POST', '/pdf/certificate', body);
  }
}
