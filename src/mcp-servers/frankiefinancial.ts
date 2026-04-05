/**
 * Frankie Financial MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Frankie Financial has not published an official MCP server.
//
// Base URL: https://api.demo.frankiefinancial.io/compliance/v1.2 (sandbox)
//           https://api.frankiefinancial.io/compliance/v1.2 (production)
// Auth: API key — header: api_key: <token>
// Docs: https://apidocs.frankiefinancial.com/
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FrankieFinancialConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FrankieFinancialMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FrankieFinancialConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.frankiefinancial.io/compliance/v1.2';
  }

  static catalog() {
    return {
      name: 'frankiefinancial',
      displayName: 'Frankie Financial',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'frankiefinancial', 'frankie', 'kyc', 'aml', 'identity verification',
        'compliance', 'document verification', 'entity', 'watchlist', 'sanctions',
        'pep', 'fraud', 'kyb', 'beneficial owner', 'australia', 'passport',
        'drivers licence', 'medicare', 'biometric', 'selfie', 'idv',
      ],
      toolNames: [
        'check_service_status',
        'create_entity', 'get_entity', 'update_entity', 'delete_entity',
        'search_entities', 'get_entity_full',
        'verify_entity', 'get_entity_checks',
        'set_entity_blacklist', 'set_entity_watchlist', 'set_entity_monitoring',
        'update_entity_status',
        'create_document', 'get_document', 'update_document', 'delete_document',
        'verify_document', 'scan_document', 'get_document_checks', 'get_document_full',
        'search_business_international', 'get_business_profile', 'run_business_reports',
        'verify_business', 'query_business_ownership',
      ],
      description: 'KYC/AML compliance: verify identities, validate documents (passport, driver licence, medicare), run watchlist/PEP/sanctions checks, manage entities, and perform KYB on organisations via the Frankie Financial API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Service ───────────────────────────────────────────────────────────
      {
        name: 'check_service_status',
        description: 'Check whether the Frankie Financial compliance API is operational',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Entity ────────────────────────────────────────────────────────────
      {
        name: 'create_entity',
        description: 'Create a new KYC entity (individual or organisation) with personal details for identity verification',
        inputSchema: {
          type: 'object',
          properties: {
            entity_type: { type: 'string', description: 'Entity type: "individual" or "organisation"' },
            name_given: { type: 'string', description: 'Given/first name of the individual' },
            name_family: { type: 'string', description: 'Family/last name of the individual' },
            date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
            email: { type: 'string', description: 'Email address' },
            phone_mobile: { type: 'string', description: 'Mobile phone number (E.164 format)' },
            addresses: {
              type: 'array',
              description: 'List of address objects for the entity',
              items: {
                type: 'object',
                properties: {
                  street_number: { type: 'string' },
                  street_name: { type: 'string' },
                  suburb: { type: 'string' },
                  state: { type: 'string' },
                  postal_code: { type: 'string' },
                  country: { type: 'string', description: 'ISO 3166-1 alpha-3 country code, e.g. AUS' },
                },
              },
            },
          },
        },
      },
      {
        name: 'get_entity',
        description: 'Retrieve details for an existing entity by entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The Frankie Financial entity ID' },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'get_entity_full',
        description: 'Retrieve full entity details including document scan data by entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The Frankie Financial entity ID' },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'update_entity',
        description: 'Update an existing entity record with new personal details or address information',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID to update' },
            name_given: { type: 'string', description: 'Updated given name' },
            name_family: { type: 'string', description: 'Updated family name' },
            date_of_birth: { type: 'string', description: 'Updated date of birth (YYYY-MM-DD)' },
            email: { type: 'string', description: 'Updated email address' },
            phone_mobile: { type: 'string', description: 'Updated mobile phone number' },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'delete_entity',
        description: 'Delete an entity and all associated records by entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID to delete' },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'search_entities',
        description: 'Search for entities matching given criteria such as name, email, or date of birth',
        inputSchema: {
          type: 'object',
          properties: {
            name_given: { type: 'string', description: 'Given name to search for' },
            name_family: { type: 'string', description: 'Family name to search for' },
            email: { type: 'string', description: 'Email address to search for' },
            date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
          },
        },
      },
      // ── Entity Verification ───────────────────────────────────────────────
      {
        name: 'verify_entity',
        description: 'Run KYC/AML verification checks (watchlist, PEP, sanctions, identity) against an entity by check type and result level',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID to verify' },
            check_type: { type: 'string', description: 'Verification check type: "check_kyc" or "check_selfie"' },
            result_level: { type: 'string', description: 'Result level: "ONE", "TWO", or "THREE" (detail depth)' },
          },
          required: ['entity_id', 'check_type', 'result_level'],
        },
      },
      {
        name: 'get_entity_checks',
        description: 'Retrieve all verification check results for an entity by entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID to fetch checks for' },
          },
          required: ['entity_id'],
        },
      },
      // ── Entity Flags ──────────────────────────────────────────────────────
      {
        name: 'set_entity_blacklist',
        description: 'Set or clear the blacklist flag on an entity with an optional reason',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID' },
            blacklisted: { type: 'boolean', description: 'true to blacklist, false to remove from blacklist' },
            reason: { type: 'string', description: 'Reason for the blacklist action' },
          },
          required: ['entity_id', 'blacklisted'],
        },
      },
      {
        name: 'set_entity_watchlist',
        description: 'Set or clear the internal watchlist flag on an entity with an optional reason',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID' },
            watchlisted: { type: 'boolean', description: 'true to add to watchlist, false to remove' },
            reason: { type: 'string', description: 'Reason for the watchlist action' },
          },
          required: ['entity_id', 'watchlisted'],
        },
      },
      {
        name: 'set_entity_monitoring',
        description: 'Enable or disable ongoing AML monitoring for an entity',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID' },
            monitored: { type: 'boolean', description: 'true to enable ongoing monitoring, false to disable' },
          },
          required: ['entity_id', 'monitored'],
        },
      },
      {
        name: 'update_entity_status',
        description: 'Update the review status of an entity (approved, rejected, pending, unchecked)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The entity ID' },
            status: { type: 'string', description: 'New entity status: "PASSED", "FAILED", "NEEDS_ATTENTION", "UNCHECKED"' },
            comment: { type: 'string', description: 'Optional comment explaining the status change' },
          },
          required: ['entity_id', 'status'],
        },
      },
      // ── Documents ─────────────────────────────────────────────────────────
      {
        name: 'create_document',
        description: 'Create an identity document (passport, driver licence, medicare, visa, etc.) linked to an entity',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'Entity ID this document belongs to' },
            document_type: { type: 'string', description: 'Document type: "PASSPORT", "DRIVERS_LICENCE", "NATIONAL_HEALTH_ID", "VISA", "BANK_STATEMENT"' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-3 country code, e.g. AUS' },
            document_number: { type: 'string', description: 'Document identification number' },
            expiry_date: { type: 'string', description: 'Document expiry date (YYYY-MM-DD)' },
          },
          required: ['entity_id', 'document_type', 'country'],
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve details for a specific identity document by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to retrieve' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'get_document_full',
        description: 'Retrieve full document details including OCR scan data by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to retrieve in full' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'update_document',
        description: 'Update an existing identity document with new data such as document number or expiry date',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to update' },
            document_number: { type: 'string', description: 'Updated document number' },
            expiry_date: { type: 'string', description: 'Updated expiry date (YYYY-MM-DD)' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a document record by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to delete' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'verify_document',
        description: 'Run verification checks against an existing document to validate authenticity against national databases',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to verify' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'scan_document',
        description: 'Run OCR scan on a document image to extract structured data fields',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to OCR scan' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'get_document_checks',
        description: 'Retrieve all verification check results for a document by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to fetch checks for' },
          },
          required: ['document_id'],
        },
      },
      // ── Business / KYB ────────────────────────────────────────────────────
      {
        name: 'search_business_international',
        description: 'Search for a business by name across international company registries',
        inputSchema: {
          type: 'object',
          properties: {
            business_name: { type: 'string', description: 'Business or company name to search' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-3 country code to restrict search (e.g. AUS, GBR, USA)' },
          },
          required: ['business_name'],
        },
      },
      {
        name: 'get_business_profile',
        description: 'Retrieve a business profile including registration details, officers, and beneficial owners',
        inputSchema: {
          type: 'object',
          properties: {
            business_id: { type: 'string', description: 'Business registry identifier' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-3 country code (e.g. AUS)' },
          },
          required: ['business_id', 'country'],
        },
      },
      {
        name: 'run_business_reports',
        description: 'Run compliance reports (credit, AML, director checks) against an existing organisation entity',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The organisation entity ID to run reports on' },
            report_types: {
              type: 'array',
              description: 'Report type strings to run (e.g. ["credit", "aml", "director"])',
              items: { type: 'string' },
            },
          },
          required: ['entity_id', 'report_types'],
        },
      },
      {
        name: 'verify_business',
        description: 'Run KYC/AML checks on an organisation and associated individuals (shareholders, beneficial owners, officers)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The organisation entity ID to verify' },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'query_business_ownership',
        description: 'Query UBO (ultimate beneficial ownership) structure for an Australian business entity',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: { type: 'string', description: 'The organisation entity ID to query ownership for' },
          },
          required: ['entity_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'api_key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      let response: Response;

      switch (name) {
        // ── Service ─────────────────────────────────────────────────────────
        case 'check_service_status': {
          response = await this.fetchWithRetry(`${this.baseUrl}/ruok`, { headers });
          break;
        }

        // ── Entity ───────────────────────────────────────────────────────────
        case 'create_entity': {
          const body: Record<string, unknown> = {
            entity_type: args.entity_type ?? 'individual',
          };
          if (args.name_given || args.name_family) {
            body.name = { given: args.name_given, family: args.name_family };
          }
          if (args.date_of_birth) body.date_of_birth = args.date_of_birth;
          if (args.email) body.email = args.email;
          if (args.phone_mobile) body.phone_mobile = args.phone_mobile;
          if (args.addresses) body.addresses = args.addresses;
          response = await this.fetchWithRetry(`${this.baseUrl}/entity`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        case 'get_entity': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}`, { headers });
          break;
        }

        case 'get_entity_full': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}/full`, { headers });
          break;
        }

        case 'update_entity': {
          const body: Record<string, unknown> = {};
          if (args.name_given || args.name_family) {
            body.name = { given: args.name_given, family: args.name_family };
          }
          if (args.date_of_birth) body.date_of_birth = args.date_of_birth;
          if (args.email) body.email = args.email;
          if (args.phone_mobile) body.phone_mobile = args.phone_mobile;
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        case 'delete_entity': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}`, {
            method: 'DELETE',
            headers,
          });
          break;
        }

        case 'search_entities': {
          const body: Record<string, unknown> = {};
          if (args.name_given) body.name_given = args.name_given;
          if (args.name_family) body.name_family = args.name_family;
          if (args.email) body.email = args.email;
          if (args.date_of_birth) body.date_of_birth = args.date_of_birth;
          if (args.page) body.page = args.page;
          if (args.page_size) body.page_size = args.page_size;
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        // ── Entity Verification ──────────────────────────────────────────────
        case 'verify_entity': {
          response = await this.fetchWithRetry(
            `${this.baseUrl}/entity/${args.entity_id}/verify/${args.check_type}/${args.result_level}`,
            { method: 'POST', headers, body: JSON.stringify({}) }
          );
          break;
        }

        case 'get_entity_checks': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}/checks`, { headers });
          break;
        }

        // ── Entity Flags ─────────────────────────────────────────────────────
        case 'set_entity_blacklist': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}/flag/blacklist`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ blacklisted: args.blacklisted, reason: args.reason }),
          });
          break;
        }

        case 'set_entity_watchlist': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}/flag/watchlist`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ watchlisted: args.watchlisted, reason: args.reason }),
          });
          break;
        }

        case 'set_entity_monitoring': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}/flag/monitor`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ monitored: args.monitored }),
          });
          break;
        }

        case 'update_entity_status': {
          response = await this.fetchWithRetry(`${this.baseUrl}/entity/${args.entity_id}/status`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ status: args.status, comment: args.comment }),
          });
          break;
        }

        // ── Documents ────────────────────────────────────────────────────────
        case 'create_document': {
          const body: Record<string, unknown> = {
            entity_id: args.entity_id,
            document_type: args.document_type,
            country: args.country,
          };
          if (args.document_number) body.document_number = args.document_number;
          if (args.expiry_date) body.expiry_date = args.expiry_date;
          response = await this.fetchWithRetry(`${this.baseUrl}/document`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        case 'get_document': {
          response = await this.fetchWithRetry(`${this.baseUrl}/document/${args.document_id}`, { headers });
          break;
        }

        case 'get_document_full': {
          response = await this.fetchWithRetry(`${this.baseUrl}/document/${args.document_id}/full`, { headers });
          break;
        }

        case 'update_document': {
          const body: Record<string, unknown> = {};
          if (args.document_number) body.document_number = args.document_number;
          if (args.expiry_date) body.expiry_date = args.expiry_date;
          response = await this.fetchWithRetry(`${this.baseUrl}/document/${args.document_id}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        case 'delete_document': {
          response = await this.fetchWithRetry(`${this.baseUrl}/document/${args.document_id}`, {
            method: 'DELETE',
            headers,
          });
          break;
        }

        case 'verify_document': {
          response = await this.fetchWithRetry(`${this.baseUrl}/document/${args.document_id}/verify`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          break;
        }

        case 'scan_document': {
          response = await this.fetchWithRetry(`${this.baseUrl}/document/${args.document_id}/scan`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          break;
        }

        case 'get_document_checks': {
          response = await this.fetchWithRetry(`${this.baseUrl}/document/${args.document_id}/checks`, { headers });
          break;
        }

        // ── Business / KYB ───────────────────────────────────────────────────
        case 'search_business_international': {
          const body: Record<string, unknown> = { business_name: args.business_name };
          if (args.country) body.country = args.country;
          response = await this.fetchWithRetry(`${this.baseUrl}/business/international/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          break;
        }

        case 'get_business_profile': {
          response = await this.fetchWithRetry(`${this.baseUrl}/business/international/profile`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ business_id: args.business_id, country: args.country }),
          });
          break;
        }

        case 'run_business_reports': {
          response = await this.fetchWithRetry(`${this.baseUrl}/business/reports`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ entity_id: args.entity_id, report_types: args.report_types }),
          });
          break;
        }

        case 'verify_business': {
          response = await this.fetchWithRetry(`${this.baseUrl}/business/${args.entity_id}/verify`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          break;
        }

        case 'query_business_ownership': {
          response = await this.fetchWithRetry(`${this.baseUrl}/business/ownership/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ entity_id: args.entity_id }),
          });
          break;
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      const text = await response.text();
      const truncated = text.length > 10240 ? text.slice(0, 10240) + '…[truncated]' : text;
      return {
        content: [{ type: 'text', text: truncated }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
}
