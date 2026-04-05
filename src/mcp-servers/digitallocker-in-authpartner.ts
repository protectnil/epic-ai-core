/**
 * DigiLocker Authorized Partner MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official DigiLocker MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://betaapi.digitallocker.gov.in/public
// Auth: OAuth2 Authorization Code flow (client_id, client_secret, access_token)
//       Device flow also supported for limited-input devices.
// Docs: https://apisetu.gov.in/api_specification_v8/authpartner.yaml
//       https://ndh.digitallocker.gov.in/terms.php
// Rate limits: Not publicly documented.
// Note: DigiLocker is India's national digital document locker system operated by the
//       Government of India (MeitY). Authorized partners can access user documents
//       (Aadhaar, driving licences, education certificates, etc.) with user consent.
//       Requires prior registration as an authorized partner at digitallocker.gov.in.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DigiLockerAuthPartnerConfig {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
}

export class DigiLockerAuthPartnerMCPServer extends MCPAdapterBase {
  private readonly accessToken: string | null;
  private readonly clientId: string | null;
  private readonly clientSecret: string | null;
  private readonly baseUrl: string;

  constructor(config: DigiLockerAuthPartnerConfig = {}) {
    super();
    this.accessToken = config.accessToken ?? null;
    this.clientId = config.clientId ?? null;
    this.clientSecret = config.clientSecret ?? null;
    this.baseUrl = config.baseUrl || 'https://betaapi.digitallocker.gov.in/public';
  }

  static catalog() {
    return {
      name: 'digitallocker-in-authpartner',
      displayName: 'DigiLocker Authorized Partner',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'digilocker', 'digitallocker', 'india', 'government', 'india gov',
        'aadhaar', 'driving licence', 'document locker', 'e-documents',
        'MeitY', 'authorized partner', 'OAuth2', 'identity', 'citizen services',
        'digital document', 'issued documents', 'certificate', 'eaadhaar',
      ],
      toolNames: [
        'get_authorization_url',
        'exchange_code_for_token',
        'get_device_code',
        'revoke_token',
        'get_user_details',
        'list_issued_documents',
        'list_uploaded_documents',
        'get_document_file',
        'get_document_xml',
        'get_eaadhaar_xml',
        'list_document_types',
        'list_issuers',
        'get_issuer_parameters',
        'pull_document',
        'verify_account',
        'push_uri',
        'get_statistics',
      ],
      description: 'DigiLocker Authorized Partner API: OAuth2 authorization, access user digital documents (Aadhaar, licences, certificates) stored in India\'s national DigiLocker, and manage issued document URIs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_authorization_url',
        description: 'Build the DigiLocker OAuth2 authorization URL to redirect a user to for consent. Returns the URL to redirect the user\'s browser to initiate the authorization code flow.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'The partner application client_id registered with DigiLocker',
            },
            redirect_uri: {
              type: 'string',
              description: 'The callback URL to redirect the user to after authorization',
            },
            state: {
              type: 'string',
              description: 'Random string to prevent CSRF attacks; will be returned in the callback',
            },
            response_type: {
              type: 'string',
              description: 'Must be "code" for authorization code flow (default: code)',
            },
            dl_flow: {
              type: 'string',
              description: 'Optional DigiLocker flow type (e.g. "login" or "signup")',
            },
            code_challenge: {
              type: 'string',
              description: 'PKCE code challenge (base64url-encoded SHA256 hash of the code_verifier)',
            },
            code_challenge_method: {
              type: 'string',
              description: 'PKCE code challenge method, must be "S256" if using PKCE',
            },
          },
          required: ['client_id', 'redirect_uri', 'state'],
        },
      },
      {
        name: 'exchange_code_for_token',
        description: 'Exchange an authorization code (received in the OAuth2 callback) for an access token and refresh token from DigiLocker.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The authorization code received in the OAuth2 redirect callback',
            },
            grant_type: {
              type: 'string',
              description: 'Must be "authorization_code" (default: authorization_code)',
            },
            redirect_uri: {
              type: 'string',
              description: 'The same redirect_uri used in the authorization request',
            },
            code_verifier: {
              type: 'string',
              description: 'PKCE code verifier (if code_challenge was used in authorization)',
            },
          },
          required: ['code', 'redirect_uri'],
        },
      },
      {
        name: 'get_device_code',
        description: 'Initiate the DigiLocker device authorization flow for limited-input devices. Returns a device_code and user_code for the user to enter at the DigiLocker verification URL.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'The partner application client_id registered with DigiLocker',
            },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'revoke_token',
        description: 'Revoke a previously obtained DigiLocker access token or refresh token, terminating the user session.',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'The access token or refresh token to revoke',
            },
            token_type_hint: {
              type: 'string',
              description: 'Optional hint: "access_token" or "refresh_token"',
            },
          },
          required: ['token'],
        },
      },
      {
        name: 'get_user_details',
        description: 'Retrieve the authenticated user\'s DigiLocker account details including name, DigiLocker ID, date of birth, and Aadhaar-linked mobile number.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_issued_documents',
        description: 'List all government-issued documents (e.g. Aadhaar, driving licence, education certificates) available in the authenticated user\'s DigiLocker issued documents folder.',
        inputSchema: {
          type: 'object',
          properties: {
            use_v2: {
              type: 'boolean',
              description: 'Use the v2 issued documents API which may return additional fields (default: false)',
            },
          },
        },
      },
      {
        name: 'list_uploaded_documents',
        description: 'List documents the user has self-uploaded to their DigiLocker account. Optionally filter by document ID.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Optional document ID to filter — retrieve a specific uploaded document',
            },
          },
        },
      },
      {
        name: 'get_document_file',
        description: 'Download a document file from DigiLocker by its URI. Returns the document content (typically PDF or image).',
        inputSchema: {
          type: 'object',
          properties: {
            uri: {
              type: 'string',
              description: 'The document URI from the issued or uploaded documents list (e.g. "in.gov.uidai.aadhaar-regular/...")',
            },
          },
          required: ['uri'],
        },
      },
      {
        name: 'get_document_xml',
        description: 'Retrieve a government-issued certificate in XML format by its URI. Useful for machine-readable structured data extraction.',
        inputSchema: {
          type: 'object',
          properties: {
            uri: {
              type: 'string',
              description: 'The document URI from the issued documents list',
            },
          },
          required: ['uri'],
        },
      },
      {
        name: 'get_eaadhaar_xml',
        description: 'Retrieve the authenticated user\'s e-Aadhaar data in XML format. Contains name, date of birth, address, and photo as structured XML.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_document_types',
        description: 'Get the list of document types provided by a specific issuer in DigiLocker (e.g. all certificate types issued by a state transport department).',
        inputSchema: {
          type: 'object',
          properties: {
            orgid: {
              type: 'string',
              description: 'The issuer organization ID to query document types for',
            },
          },
          required: ['orgid'],
        },
      },
      {
        name: 'list_issuers',
        description: 'Retrieve the list of registered issuers in DigiLocker (government departments, educational institutions, etc.) that publish documents.',
        inputSchema: {
          type: 'object',
          properties: {
            searchtext: {
              type: 'string',
              description: 'Optional search text to filter issuers by name',
            },
          },
        },
      },
      {
        name: 'get_issuer_parameters',
        description: 'Get the search parameters required to pull a specific document type from an issuer (e.g. the fields needed to look up a driving licence).',
        inputSchema: {
          type: 'object',
          properties: {
            orgid: {
              type: 'string',
              description: 'The issuer organization ID',
            },
            doctype: {
              type: 'string',
              description: 'The document type code to get parameters for',
            },
          },
          required: ['orgid', 'doctype'],
        },
      },
      {
        name: 'pull_document',
        description: 'Pull (fetch and add) a specific issued document into the user\'s DigiLocker account by providing issuer search parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            orgid: {
              type: 'string',
              description: 'The issuer organization ID',
            },
            doctype: {
              type: 'string',
              description: 'The document type code',
            },
            parameters: {
              type: 'object',
              description: 'Key-value pairs of the issuer-specific search parameters (e.g. { "dob": "1990-01-01", "dl_number": "DL1234567" })',
            },
          },
          required: ['orgid', 'doctype', 'parameters'],
        },
      },
      {
        name: 'verify_account',
        description: 'Verify whether a mobile number or Aadhaar number is already registered with DigiLocker.',
        inputSchema: {
          type: 'object',
          properties: {
            mobile: {
              type: 'string',
              description: 'Mobile number to verify (10 digits, Indian format)',
            },
            uid: {
              type: 'string',
              description: 'Aadhaar number to verify (12 digits)',
            },
          },
        },
      },
      {
        name: 'push_uri',
        description: 'Push or delete a document URI into a user\'s DigiLocker account by DigiLocker ID. Used by registered issuers to proactively push issued certificates.',
        inputSchema: {
          type: 'object',
          properties: {
            digilockerid: {
              type: 'string',
              description: 'The target user\'s DigiLocker ID (acquired via get_user_details)',
            },
            uri: {
              type: 'string',
              description: 'The document URI to push (e.g. "in.gov.issuer.doctype/uniqueid")',
            },
            doctype: {
              type: 'string',
              description: 'The document type code',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of the document',
            },
            docid: {
              type: 'string',
              description: 'Unique document identifier from the issuer system',
            },
            issuedate: {
              type: 'string',
              description: 'Document issue date in DDMMYYYY format',
            },
            action: {
              type: 'string',
              description: 'Action to perform: "push" to add, "delete" to remove (default: push)',
            },
          },
          required: ['digilockerid', 'uri', 'doctype', 'description', 'docid', 'issuedate'],
        },
      },
      {
        name: 'get_statistics',
        description: 'Retrieve DigiLocker usage statistics and counts for the authorized partner application.',
        inputSchema: {
          type: 'object',
          properties: {
            fromdate: {
              type: 'string',
              description: 'Start date for statistics in DDMMYYYY format',
            },
            todate: {
              type: 'string',
              description: 'End date for statistics in DDMMYYYY format',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_authorization_url':
          return this.getAuthorizationUrl(args);
        case 'exchange_code_for_token':
          return this.exchangeCodeForToken(args);
        case 'get_device_code':
          return this.getDeviceCode(args);
        case 'revoke_token':
          return this.revokeToken(args);
        case 'get_user_details':
          return this.getUserDetails();
        case 'list_issued_documents':
          return this.listIssuedDocuments(args);
        case 'list_uploaded_documents':
          return this.listUploadedDocuments(args);
        case 'get_document_file':
          return this.getDocumentFile(args);
        case 'get_document_xml':
          return this.getDocumentXml(args);
        case 'get_eaadhaar_xml':
          return this.getEAadhaarXml();
        case 'list_document_types':
          return this.listDocumentTypes(args);
        case 'list_issuers':
          return this.listIssuers(args);
        case 'get_issuer_parameters':
          return this.getIssuerParameters(args);
        case 'pull_document':
          return this.pullDocument(args);
        case 'verify_account':
          return this.verifyAccount(args);
        case 'push_uri':
          return this.pushUri(args);
        case 'get_statistics':
          return this.getStatistics(args);
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

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private async get(path: string, headers?: Record<string, string>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', ...(headers ?? this.buildAuthHeaders()) },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('json') ? await response.json() : await response.text();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, string>, useClientAuth = false): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const formBody = new URLSearchParams(body);
    if (useClientAuth && this.clientId && this.clientSecret) {
      formBody.set('client_id', this.clientId);
      formBody.set('client_secret', this.clientSecret);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (this.accessToken && !useClientAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: formBody.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('json') ? await response.json() : await response.text();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private getAuthorizationUrl(args: Record<string, unknown>): ToolResult {
    if (!args.client_id || !args.redirect_uri || !args.state) {
      return { content: [{ type: 'text', text: 'client_id, redirect_uri, and state are required' }], isError: true };
    }
    const params = new URLSearchParams({
      client_id: args.client_id as string,
      response_type: (args.response_type as string) || 'code',
      redirect_uri: args.redirect_uri as string,
      state: args.state as string,
    });
    if (args.dl_flow) params.set('dl_flow', args.dl_flow as string);
    if (args.code_challenge) params.set('Code_challenge', args.code_challenge as string);
    if (args.code_challenge_method) params.set('Code_challenge_method', args.code_challenge_method as string);
    const url = `${this.baseUrl}/oauth2/1/authorize?${params.toString()}`;
    return { content: [{ type: 'text', text: JSON.stringify({ authorization_url: url }) }], isError: false };
  }

  private async exchangeCodeForToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.code || !args.redirect_uri) {
      return { content: [{ type: 'text', text: 'code and redirect_uri are required' }], isError: true };
    }
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code: args.code as string,
      redirect_uri: args.redirect_uri as string,
    };
    if (args.code_verifier) body['code_verifier'] = args.code_verifier as string;
    return this.post('/oauth2/1/token', body, true);
  }

  private async getDeviceCode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id) {
      return { content: [{ type: 'text', text: 'client_id is required' }], isError: true };
    }
    return this.post('/oauth2/1/code', { client_id: args.client_id as string }, false);
  }

  private async revokeToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.token) {
      return { content: [{ type: 'text', text: 'token is required' }], isError: true };
    }
    const body: Record<string, string> = { token: args.token as string };
    if (args.token_type_hint) body['token_type_hint'] = args.token_type_hint as string;
    return this.post('/oauth2/1/revoke', body, true);
  }

  private async getUserDetails(): Promise<ToolResult> {
    return this.get('/oauth2/1/user');
  }

  private async listIssuedDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const version = args.use_v2 ? '2' : '1';
    return this.get(`/oauth2/${version}/files/issued`);
  }

  private async listUploadedDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.document_id) {
      return this.get(`/oauth2/1/files/${args.document_id as string}`);
    }
    return this.get('/oauth2/1/files/');
  }

  private async getDocumentFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uri) {
      return { content: [{ type: 'text', text: 'uri is required' }], isError: true };
    }
    return this.get(`/oauth2/1/file/${encodeURIComponent(args.uri as string)}`);
  }

  private async getDocumentXml(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uri) {
      return { content: [{ type: 'text', text: 'uri is required' }], isError: true };
    }
    return this.get(`/oauth2/1/xml/${encodeURIComponent(args.uri as string)}`);
  }

  private async getEAadhaarXml(): Promise<ToolResult> {
    return this.get('/oauth2/2/xml/eaadhaar');
  }

  private async listDocumentTypes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orgid) {
      return { content: [{ type: 'text', text: 'orgid is required' }], isError: true };
    }
    return this.post('/oauth2/1/pull/doctype', { orgid: args.orgid as string });
  }

  private async listIssuers(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, string> = {};
    if (args.searchtext) body['searchtext'] = args.searchtext as string;
    return this.post('/oauth2/1/pull/issuers', body);
  }

  private async getIssuerParameters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orgid || !args.doctype) {
      return { content: [{ type: 'text', text: 'orgid and doctype are required' }], isError: true };
    }
    return this.post('/oauth2/1/pull/parameters', {
      orgid: args.orgid as string,
      doctype: args.doctype as string,
    });
  }

  private async pullDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orgid || !args.doctype || !args.parameters) {
      return { content: [{ type: 'text', text: 'orgid, doctype, and parameters are required' }], isError: true };
    }
    const body: Record<string, string> = {
      orgid: args.orgid as string,
      doctype: args.doctype as string,
    };
    const params = args.parameters as Record<string, string>;
    for (const [key, value] of Object.entries(params)) {
      body[key] = String(value);
    }
    return this.post('/oauth2/1/pull/pulldocument', body);
  }

  private async verifyAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, string> = {};
    if (args.mobile) body['mobile'] = args.mobile as string;
    if (args.uid) body['uid'] = args.uid as string;
    if (!body.mobile && !body.uid) {
      return { content: [{ type: 'text', text: 'Either mobile or uid is required' }], isError: true };
    }
    return this.post('/account/2/verify', body, true);
  }

  private async pushUri(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['digilockerid', 'uri', 'doctype', 'description', 'docid', 'issuedate'];
    for (const field of required) {
      if (!args[field]) {
        return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
      }
    }
    const body: Record<string, string> = {
      digilockerid: args.digilockerid as string,
      uri: args.uri as string,
      doctype: args.doctype as string,
      description: args.description as string,
      docid: args.docid as string,
      issuedate: args.issuedate as string,
    };
    if (args.action) body['action'] = args.action as string;
    return this.post('/account/1/pushuri', body, true);
  }

  private async getStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, string> = {};
    if (args.fromdate) body['fromdate'] = args.fromdate as string;
    if (args.todate) body['todate'] = args.todate as string;
    return this.post('/statistics/1/counts', body, true);
  }
}
