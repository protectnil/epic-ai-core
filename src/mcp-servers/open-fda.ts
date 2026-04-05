/**
 * openFDA MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official FDA MCP server exists.
//   Community implementations exist (e.g. github.com/Augmented-Nature/OpenFDA-MCP-Server,
//   github.com/BACH-AI-Tools/mcp-openfda) but are not officially published or maintained by the FDA.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: https://api.fda.gov
// Auth: Optional — API key passed as api_key query parameter for higher rate limits.
//   Without a key: 240 requests/minute, 1000/day per IP.
//   With a key:  240 requests/minute, 120,000/day per key.
//   Request a free key at: https://open.fda.gov/apis/authentication/
// Docs: https://open.fda.gov/apis/
// Rate limits: 240 req/min; 1,000 req/day without key; 120,000 req/day with key. Max 1,000 records per request.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenFDAConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class OpenFDAMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: OpenFDAConfig = {}) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.fda.gov').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'open-fda',
      displayName: 'openFDA',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'fda', 'openfda', 'drug', 'medication', 'adverse-event', 'recall', 'label',
        'device', 'medical-device', '510k', 'food', 'enforcement', 'pharmacovigilance',
        'faers', 'maude', 'ndc', 'caers', 'veterinary', 'biologic', 'compliance',
      ],
      toolNames: [
        'search_drug_adverse_events', 'search_drug_labels', 'search_drug_enforcement',
        'search_drug_ndc', 'count_drug_adverse_events',
        'search_device_adverse_events', 'search_device_510k', 'search_device_classification',
        'search_device_enforcement', 'search_device_recalls', 'count_device_adverse_events',
        'search_food_enforcement', 'search_food_adverse_events',
        'search_animal_adverse_events',
        'get_drug_label', 'get_device_510k',
        'count_drug_labels', 'count_food_enforcement',
      ],
      description: 'openFDA public FDA datasets: query drug adverse events (FAERS), product labels, recalls, enforcement actions, medical device events (MAUDE), 510(k) clearances, food recalls, and CAERS reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_drug_adverse_events',
        description: 'Search FDA drug adverse event reports (FAERS) by drug name, reaction, reporter country, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "patient.drug.medicinalproduct:aspirin", "patient.reaction.reactionmeddrapt:headache")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. "receivedate:desc")',
            },
          },
        },
      },
      {
        name: 'search_drug_labels',
        description: 'Search FDA drug product labeling (SPL) by drug name, active ingredient, manufacturer, or indications',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "openfda.brand_name:tylenol", "indications_and_usage:pain")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_drug_enforcement',
        description: 'Search FDA drug recall enforcement actions by product description, recalling firm, classification, or date',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "classification:\"Class I\"", "recalling_firm:pfizer")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_drug_ndc',
        description: 'Search the FDA National Drug Code (NDC) Directory by drug name, labeler, route, or dosage form',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "brand_name:advil", "route:oral", "labeler_name:johnson")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'count_drug_adverse_events',
        description: 'Count and aggregate drug adverse event reports by a specific field — useful for finding most common reactions or drugs',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'string',
              description: 'Field to count and aggregate (e.g. "patient.reaction.reactionmeddrapt.exact", "patient.drug.medicinalproduct.exact")',
            },
            search: {
              type: 'string',
              description: 'Optional search query to filter records before counting',
            },
            limit: {
              type: 'number',
              description: 'Maximum count buckets to return (default: 20, max: 1000)',
            },
          },
          required: ['count'],
        },
      },
      {
        name: 'search_device_adverse_events',
        description: 'Search FDA medical device adverse event reports (MAUDE) by device name, manufacturer, event type, or date',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "device.brand_name:pacemaker", "event_type:death")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_device_510k',
        description: 'Search FDA 510(k) premarket notification clearances by device name, applicant, or decision date',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "device_name:catheter", "applicant:medtronic", "decision_date:[2020-01-01+TO+2024-12-31]")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_device_classification',
        description: 'Search FDA medical device classification records by device name, product code, or medical specialty',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "device_name:stent", "medical_specialty_description:cardiovascular")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_device_enforcement',
        description: 'Search FDA medical device recall enforcement actions by product, manufacturer, or classification',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "product_description:catheter", "classification:\"Class III\"")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_device_recalls',
        description: 'Search FDA medical device recall database by device name, firm name, recall status, or product code',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "product_code:KZE", "firm_fei_number:1234567")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'count_device_adverse_events',
        description: 'Count device adverse event reports by a specific field to find most common devices or event types',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'string',
              description: 'Field to count (e.g. "device.brand_name.exact", "event_type.exact", "device.manufacturer_d_name.exact")',
            },
            search: {
              type: 'string',
              description: 'Optional filter query to apply before counting',
            },
            limit: {
              type: 'number',
              description: 'Maximum count buckets to return (default: 20, max: 1000)',
            },
          },
          required: ['count'],
        },
      },
      {
        name: 'search_food_enforcement',
        description: 'Search FDA food recall enforcement actions by product description, recalling firm, or classification',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "product_description:peanut butter", "classification:\"Class I\"")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_food_adverse_events',
        description: 'Search FDA CFSAN Adverse Event Reporting System (CAERS) for food, dietary supplement, and cosmetic adverse events',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "products.name_brand:\"energy drink\"", "reactions.name:vomiting")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_animal_adverse_events',
        description: 'Search FDA animal and veterinary drug adverse event reports by species, drug, or reaction',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'openFDA search query (e.g. "animal.species:dog", "drug.brand_name:heartgard")',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 10, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_drug_label',
        description: 'Get full drug product label information by NDC code or application number',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search for a specific drug label (e.g. "openfda.application_number:NDA020163", "openfda.package_ndc:0069-0105-68")',
            },
          },
          required: ['search'],
        },
      },
      {
        name: 'get_device_510k',
        description: 'Get details of a specific 510(k) clearance record by K-number',
        inputSchema: {
          type: 'object',
          properties: {
            k_number: {
              type: 'string',
              description: '510(k) K-number (e.g. K190542)',
            },
          },
          required: ['k_number'],
        },
      },
      {
        name: 'count_drug_labels',
        description: 'Count and aggregate drug label records by a field — useful for finding most common manufacturers or routes',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'string',
              description: 'Field to count (e.g. "openfda.manufacturer_name.exact", "route.exact", "dosage_form.exact")',
            },
            search: {
              type: 'string',
              description: 'Optional search filter to apply before counting',
            },
            limit: {
              type: 'number',
              description: 'Maximum count buckets to return (default: 20, max: 1000)',
            },
          },
          required: ['count'],
        },
      },
      {
        name: 'count_food_enforcement',
        description: 'Count food enforcement actions by field — useful for identifying most common recall reasons or firms',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'string',
              description: 'Field to aggregate (e.g. "recalling_firm.exact", "reason_for_recall.exact", "state.exact")',
            },
            search: {
              type: 'string',
              description: 'Optional filter query before counting',
            },
            limit: {
              type: 'number',
              description: 'Maximum count buckets to return (default: 20, max: 1000)',
            },
          },
          required: ['count'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_drug_adverse_events':
          return this.query('/drug/event.json', args);
        case 'search_drug_labels':
          return this.query('/drug/label.json', args);
        case 'search_drug_enforcement':
          return this.query('/drug/enforcement.json', args);
        case 'search_drug_ndc':
          return this.query('/drug/ndc.json', args);
        case 'count_drug_adverse_events':
          return this.queryCount('/drug/event.json', args);
        case 'search_device_adverse_events':
          return this.query('/device/event.json', args);
        case 'search_device_510k':
          return this.query('/device/510k.json', args);
        case 'search_device_classification':
          return this.query('/device/classification.json', args);
        case 'search_device_enforcement':
          return this.query('/device/enforcement.json', args);
        case 'search_device_recalls':
          return this.query('/device/recall.json', args);
        case 'count_device_adverse_events':
          return this.queryCount('/device/event.json', args);
        case 'search_food_enforcement':
          return this.query('/food/enforcement.json', args);
        case 'search_food_adverse_events':
          return this.query('/food/event.json', args);
        case 'search_animal_adverse_events':
          return this.query('/animalandveterinary/event.json', args);
        case 'get_drug_label':
          return this.query('/drug/label.json', { ...args, limit: 1 });
        case 'get_device_510k':
          return this.getDevice510k(args);
        case 'count_drug_labels':
          return this.queryCount('/drug/label.json', args);
        case 'count_food_enforcement':
          return this.queryCount('/food/enforcement.json', args);
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

  private buildParams(args: Record<string, unknown>, extra?: Record<string, string>): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.apiKey) params.api_key = this.apiKey;
    if (args.search) params.search = args.search as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.skip !== undefined) params.skip = String(args.skip);
    if (args.sort) params.sort = args.sort as string;
    return { ...params, ...extra };
  }

  private async query(endpoint: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args);
    if (!params.limit) params.limit = '10';
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}?${qs}`, {});
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${text}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryCount(endpoint: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (this.apiKey) params.api_key = this.apiKey;
    if (args.search) params.search = args.search as string;
    params.count = args.count as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}?${qs}`, {});
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${text}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDevice510k(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.k_number) return { content: [{ type: 'text', text: 'k_number is required' }], isError: true };
    return this.query('/device/510k.json', { search: `k_number:${encodeURIComponent(args.k_number as string)}`, limit: 1 });
  }
}
