/**
 * Australian Tax Office (ATO) Business Registries MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://api.abr.ato.gov.au (Production) | https://api.sandbox.abr.ato.gov.au (Sandbox)
// Auth: API key via Authorization header (Bearer token or API key depending on endpoint)
//   Contact ATO for API access registration.
// Docs: https://api.abr.ato.gov.au/docs
// Spec: https://api.apis.guru/v2/specs/ato.gov.au/0.0.6/openapi.json
// Rate limits: Government API — contact ATO for rate limit details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AtoConfig {
  /** Bearer token or API key for ATO Business Registries API */
  apiKey: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  baseUrl?: string;
}

const TRUNCATE = 10 * 1024;

export class AtoAuMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AtoConfig) {
    super();
    this.apiKey = config.apiKey;
    const defaultBase = config.sandbox
      ? 'https://api.sandbox.abr.ato.gov.au'
      : 'https://api.abr.ato.gov.au';
    this.baseUrl = (config.baseUrl || defaultBase).replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'ato-au',
      displayName: 'ATO Business Registries (Australia)',
      version: '1.0.0',
      category: 'government' as const,
      keywords: [
        'ato', 'australia', 'tax office', 'business registry', 'abn', 'acn',
        'individuals', 'organisations', 'business names', 'licenses', 'addresses',
        'government', 'compliance', 'registry', 'identity', 'australian business',
      ],
      toolNames: [
        'list_individuals', 'get_individual', 'create_individual', 'update_individual', 'delete_individual',
        'list_individual_addresses', 'create_individual_address', 'get_individual_address', 'update_individual_address', 'delete_individual_address',
        'list_individual_business_names', 'create_individual_business_name',
        'list_individual_licenses', 'create_individual_license',
        'list_organisations', 'get_organisation', 'create_organisation', 'update_organisation', 'delete_organisation',
        'list_organisation_addresses', 'create_organisation_address',
        'list_organisation_business_names', 'create_organisation_business_name',
        'list_business_names',
        'list_licenses',
        'get_classifications',
        'get_legal_entity_types',
        'get_roles',
      ],
      description: 'Australian Tax Office (ATO) Business Registries API: manage individuals, organisations, business names, licenses, and addresses in the Australian Business Register.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_individuals',
        description: 'Retrieve a list of registered individuals in the business registry',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_individual',
        description: 'Retrieve a specific individual by party ID',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'create_individual',
        description: 'Create a new individual in the business registry',
        inputSchema: {
          type: 'object',
          properties: {
            givenName: { type: 'string', description: 'Given/first name' },
            familyName: { type: 'string', description: 'Family/last name' },
            dateOfBirth: { type: 'string', description: 'Date of birth (ISO 8601: YYYY-MM-DD)' },
            gender: { type: 'string', description: 'Gender code' },
          },
          required: ['givenName', 'familyName'],
        },
      },
      {
        name: 'update_individual',
        description: 'Update an existing individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
            givenName: { type: 'string', description: 'Given/first name' },
            familyName: { type: 'string', description: 'Family/last name' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'delete_individual',
        description: 'Delete an individual from the business registry',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID to delete' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'list_individual_addresses',
        description: 'List all addresses for a specific individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'create_individual_address',
        description: 'Create a new address for an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
            addressLine1: { type: 'string', description: 'Street address line 1' },
            suburb: { type: 'string', description: 'Suburb/city' },
            state: { type: 'string', description: 'State/territory code' },
            postcode: { type: 'string', description: 'Postcode' },
            countryCode: { type: 'string', description: 'ISO country code (default: AU)' },
          },
          required: ['partyId', 'addressLine1', 'suburb', 'state', 'postcode'],
        },
      },
      {
        name: 'get_individual_address',
        description: 'Get a specific address for an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
            addressId: { type: 'string', description: 'Address ID' },
          },
          required: ['partyId', 'addressId'],
        },
      },
      {
        name: 'update_individual_address',
        description: 'Update an address for an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
            addressId: { type: 'string', description: 'Address ID' },
            addressLine1: { type: 'string', description: 'Street address line 1' },
            suburb: { type: 'string', description: 'Suburb/city' },
            state: { type: 'string', description: 'State/territory code' },
            postcode: { type: 'string', description: 'Postcode' },
          },
          required: ['partyId', 'addressId'],
        },
      },
      {
        name: 'delete_individual_address',
        description: 'Delete an address for an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
            addressId: { type: 'string', description: 'Address ID to delete' },
          },
          required: ['partyId', 'addressId'],
        },
      },
      {
        name: 'list_individual_business_names',
        description: 'List all business names registered to an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'create_individual_business_name',
        description: 'Register a new business name for an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
            name: { type: 'string', description: 'Business name to register' },
          },
          required: ['partyId', 'name'],
        },
      },
      {
        name: 'list_individual_licenses',
        description: 'List all licenses held by an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'create_individual_license',
        description: 'Create a new license for an individual',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Individual party ID' },
            licenseTypeCode: { type: 'string', description: 'License type code' },
            licenseNumber: { type: 'string', description: 'License number' },
          },
          required: ['partyId', 'licenseTypeCode'],
        },
      },
      {
        name: 'list_organisations',
        description: 'Retrieve a list of registered organisations',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_organisation',
        description: 'Retrieve a specific organisation by party ID',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Organisation party ID' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'create_organisation',
        description: 'Create a new organisation in the business registry',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Organisation name' },
            legalEntityTypeCode: { type: 'string', description: 'Legal entity type code' },
            acn: { type: 'string', description: 'Australian Company Number (ACN)' },
            abn: { type: 'string', description: 'Australian Business Number (ABN)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_organisation',
        description: 'Update an existing organisation',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Organisation party ID' },
            name: { type: 'string', description: 'Organisation name' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'delete_organisation',
        description: 'Delete an organisation from the registry',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Organisation party ID to delete' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'list_organisation_addresses',
        description: 'List all addresses for a specific organisation',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Organisation party ID' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'create_organisation_address',
        description: 'Create a new address for an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Organisation party ID' },
            addressLine1: { type: 'string', description: 'Street address line 1' },
            suburb: { type: 'string', description: 'Suburb/city' },
            state: { type: 'string', description: 'State/territory code' },
            postcode: { type: 'string', description: 'Postcode' },
          },
          required: ['partyId', 'addressLine1', 'suburb', 'state', 'postcode'],
        },
      },
      {
        name: 'list_organisation_business_names',
        description: 'List all business names registered to an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Organisation party ID' },
          },
          required: ['partyId'],
        },
      },
      {
        name: 'create_organisation_business_name',
        description: 'Register a new business name for an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            partyId: { type: 'string', description: 'Organisation party ID' },
            name: { type: 'string', description: 'Business name to register' },
          },
          required: ['partyId', 'name'],
        },
      },
      {
        name: 'list_business_names',
        description: 'Retrieve a list of all business names in the registry',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'list_licenses',
        description: 'Retrieve a list of all licenses in the registry',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_classifications',
        description: 'Get all classification reference data (address types, name types, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Classification type: address-types, business-name-lifecycle-states, genders, name-types, name-prefixes, registered-identifier-types, roles, license-types, license-lifecycle-states, electronic-address-types' },
          },
          required: ['type'],
        },
      },
      {
        name: 'get_legal_entity_types',
        description: 'Get all legal entity type classifications',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_roles',
        description: 'Get all role type classifications',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await this._dispatch(name, args);
      const text = JSON.stringify(result);
      return {
        content: [{ type: 'text', text: text.length > TRUNCATE ? text.slice(0, TRUNCATE) + '…[truncated]' : text }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }

  private async _fetch(path: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`ATO API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  private _qs(params: Record<string, unknown>): string {
    const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
  }

  private async _dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'list_individuals': {
        const qs = this._qs({ page: args.page, pageSize: args.pageSize });
        return this._fetch(`/individuals${qs}`);
      }
      case 'get_individual':
        return this._fetch(`/individuals/${args.partyId}`);
      case 'create_individual':
        return this._fetch('/individuals', { method: 'POST', body: JSON.stringify({ givenName: args.givenName, familyName: args.familyName, dateOfBirth: args.dateOfBirth, gender: args.gender }) });
      case 'update_individual':
        return this._fetch(`/individuals/${args.partyId}`, { method: 'PUT', body: JSON.stringify({ givenName: args.givenName, familyName: args.familyName }) });
      case 'delete_individual':
        return this._fetch(`/individuals/${args.partyId}`, { method: 'DELETE' });
      case 'list_individual_addresses':
        return this._fetch(`/individuals/${args.partyId}/addresses`);
      case 'create_individual_address':
        return this._fetch(`/individuals/${args.partyId}/addresses`, { method: 'POST', body: JSON.stringify({ addressLine1: args.addressLine1, suburb: args.suburb, state: args.state, postcode: args.postcode, countryCode: args.countryCode || 'AU' }) });
      case 'get_individual_address':
        return this._fetch(`/individuals/${args.partyId}/addresses/${args.addressId}`);
      case 'update_individual_address':
        return this._fetch(`/individuals/${args.partyId}/addresses/${args.addressId}`, { method: 'PUT', body: JSON.stringify({ addressLine1: args.addressLine1, suburb: args.suburb, state: args.state, postcode: args.postcode }) });
      case 'delete_individual_address':
        return this._fetch(`/individuals/${args.partyId}/addresses/${args.addressId}`, { method: 'DELETE' });
      case 'list_individual_business_names':
        return this._fetch(`/individuals/${args.partyId}/business-names`);
      case 'create_individual_business_name':
        return this._fetch(`/individuals/${args.partyId}/business-names`, { method: 'POST', body: JSON.stringify({ name: args.name }) });
      case 'list_individual_licenses':
        return this._fetch(`/individuals/${args.partyId}/licenses`);
      case 'create_individual_license':
        return this._fetch(`/individuals/${args.partyId}/licenses`, { method: 'POST', body: JSON.stringify({ licenseTypeCode: args.licenseTypeCode, licenseNumber: args.licenseNumber }) });
      case 'list_organisations': {
        const qs = this._qs({ page: args.page, pageSize: args.pageSize });
        return this._fetch(`/organisations${qs}`);
      }
      case 'get_organisation':
        return this._fetch(`/organisations/${args.partyId}`);
      case 'create_organisation':
        return this._fetch('/organisations', { method: 'POST', body: JSON.stringify({ name: args.name, legalEntityTypeCode: args.legalEntityTypeCode, acn: args.acn, abn: args.abn }) });
      case 'update_organisation':
        return this._fetch(`/organisations/${args.partyId}`, { method: 'PUT', body: JSON.stringify({ name: args.name }) });
      case 'delete_organisation':
        return this._fetch(`/organisations/${args.partyId}`, { method: 'DELETE' });
      case 'list_organisation_addresses':
        return this._fetch(`/organisations/${args.partyId}/addresses`);
      case 'create_organisation_address':
        return this._fetch(`/organisations/${args.partyId}/addresses`, { method: 'POST', body: JSON.stringify({ addressLine1: args.addressLine1, suburb: args.suburb, state: args.state, postcode: args.postcode }) });
      case 'list_organisation_business_names':
        return this._fetch(`/organisations/${args.partyId}/business-names`);
      case 'create_organisation_business_name':
        return this._fetch(`/organisations/${args.partyId}/business-names`, { method: 'POST', body: JSON.stringify({ name: args.name }) });
      case 'list_business_names': {
        const qs = this._qs({ page: args.page, pageSize: args.pageSize });
        return this._fetch(`/business-names${qs}`);
      }
      case 'list_licenses': {
        const qs = this._qs({ page: args.page, pageSize: args.pageSize });
        return this._fetch(`/licenses${qs}`);
      }
      case 'get_classifications':
        return this._fetch(`/classifications/${args.type}`);
      case 'get_legal_entity_types':
        return this._fetch('/classifications/legal-entity-types');
      case 'get_roles':
        return this._fetch('/classifications/roles');
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
