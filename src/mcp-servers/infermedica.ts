/**
 * Infermedica MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Infermedica MCP server was found on GitHub.
//
// Base URL: https://api.infermedica.com/v2
// Auth: App-Id and App-Key headers on every request
// Docs: https://developer.infermedica.com/docs/
// Spec: https://api.apis.guru/v2/specs/infermedica.com/v2/swagger.json
// Rate limits: Depends on plan. Free developer tier available. Contact Infermedica for production limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InfermedicaConfig {
  /** Infermedica App-Id from developer dashboard */
  appId: string;
  /** Infermedica App-Key from developer dashboard */
  appKey: string;
  /** Optional base URL override (default: https://api.infermedica.com/v2) */
  baseUrl?: string;
}

export class InfermedicaMCPServer extends MCPAdapterBase {
  private readonly appId: string;
  private readonly appKey: string;
  private readonly baseUrl: string;

  constructor(config: InfermedicaConfig) {
    super();
    this.appId = config.appId;
    this.appKey = config.appKey;
    this.baseUrl = config.baseUrl ?? 'https://api.infermedica.com/v2';
  }

  static catalog() {
    return {
      name: 'infermedica',
      displayName: 'Infermedica',
      version: '1.0.0',
      category: 'healthcare' as const,
      keywords: [
        'infermedica', 'symptom', 'symptoms', 'diagnosis', 'diagnostic', 'triage',
        'condition', 'conditions', 'healthcare', 'medical', 'clinical', 'patient',
        'risk-factor', 'lab-test', 'parse', 'nlp', 'red-flags', 'suggest',
        'explain', 'rationale', 'observation', 'medical-ai', 'symptom-checker',
      ],
      toolNames: [
        'get_info',
        'list_symptoms',
        'get_symptom',
        'list_conditions',
        'get_condition',
        'list_risk_factors',
        'get_risk_factor',
        'list_lab_tests',
        'get_lab_test',
        'lookup_observation',
        'search_observations',
        'parse_text',
        'run_diagnosis',
        'explain_diagnosis',
        'get_rationale',
        'get_triage',
        'get_red_flags',
        'suggest_symptoms',
        'list_concepts',
        'get_concept',
      ],
      description: 'Infermedica clinical AI: symptom checker, diagnostic engine, triage scoring, NLP text parsing, and medical knowledge base covering symptoms, conditions, risk factors, and lab tests.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Knowledge Base ---------------------------------------------------
      {
        name: 'get_info',
        description: 'Get Infermedica database metadata including version, symptoms count, conditions count, and supported age/sex parameters',
        inputSchema: {
          type: 'object',
          properties: {
            age_value: {
              type: 'number',
              description: 'Patient age value used to filter the knowledge base (e.g. 30)',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
          },
        },
      },
      {
        name: 'list_symptoms',
        description: 'List all symptoms available in the Infermedica knowledge base, optionally filtered by patient age',
        inputSchema: {
          type: 'object',
          properties: {
            age_value: {
              type: 'number',
              description: 'Patient age to filter symptoms applicable to this age group',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
            enable_triage_5: {
              type: 'boolean',
              description: 'Enable 5-level triage mode (requires plan support)',
            },
          },
        },
      },
      {
        name: 'get_symptom',
        description: 'Get a specific symptom by its Infermedica ID, including name, common name, sex filter, and age ranges',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Infermedica symptom ID (e.g. "s_13" for fever)',
            },
            age_value: {
              type: 'number',
              description: 'Patient age for context-aware symptom details',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
            enable_triage_5: {
              type: 'boolean',
              description: 'Enable 5-level triage mode',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_conditions',
        description: 'List all medical conditions (diagnoses) in the Infermedica knowledge base, optionally filtered by age',
        inputSchema: {
          type: 'object',
          properties: {
            age_value: {
              type: 'number',
              description: 'Patient age to filter conditions applicable to this age group',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
            enable_triage_5: {
              type: 'boolean',
              description: 'Enable 5-level triage mode',
            },
          },
        },
      },
      {
        name: 'get_condition',
        description: 'Get a specific medical condition by Infermedica ID, including name, ICD-10 code, severity, and triage level',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Infermedica condition ID (e.g. "c_49" for influenza)',
            },
            age_value: {
              type: 'number',
              description: 'Patient age for context-aware condition details',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
            enable_triage_5: {
              type: 'boolean',
              description: 'Enable 5-level triage mode',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_risk_factors',
        description: 'List all risk factors in the Infermedica knowledge base (e.g. smoking, hypertension, diabetes)',
        inputSchema: {
          type: 'object',
          properties: {
            age_value: {
              type: 'number',
              description: 'Patient age to filter risk factors applicable to this age group',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
            enable_triage_5: {
              type: 'boolean',
              description: 'Enable 5-level triage mode',
            },
          },
        },
      },
      {
        name: 'get_risk_factor',
        description: 'Get a specific risk factor by Infermedica ID, including name and applicable age/sex ranges',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Infermedica risk factor ID (e.g. "p_8" for smoking)',
            },
            age_value: {
              type: 'number',
              description: 'Patient age for context-aware risk factor details',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
            enable_triage_5: {
              type: 'boolean',
              description: 'Enable 5-level triage mode',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_lab_tests',
        description: 'List all lab tests available in the Infermedica knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            age_value: {
              type: 'number',
              description: 'Patient age to filter lab tests applicable to this age group',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
          },
        },
      },
      {
        name: 'get_lab_test',
        description: 'Get a specific lab test by Infermedica ID, including name and LOINC code',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Infermedica lab test ID',
            },
            age_value: {
              type: 'number',
              description: 'Patient age for context-aware lab test details',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
          },
          required: ['id'],
        },
      },
      // -- Search & NLP ----------------------------------------------------
      {
        name: 'lookup_observation',
        description: 'Find a single observation (symptom or risk factor) that best matches a given phrase — useful for mapping patient-reported symptoms to Infermedica IDs',
        inputSchema: {
          type: 'object',
          properties: {
            phrase: {
              type: 'string',
              description: 'Natural language phrase to look up (e.g. "sore throat", "chest pain")',
            },
            sex: {
              type: 'string',
              description: 'Patient sex for context: "male" or "female"',
              enum: ['male', 'female'],
            },
            age_value: {
              type: 'number',
              description: 'Patient age value',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
          },
          required: ['phrase'],
        },
      },
      {
        name: 'search_observations',
        description: 'Search symptoms and risk factors matching a phrase — returns ranked list of observations with IDs and common names',
        inputSchema: {
          type: 'object',
          properties: {
            phrase: {
              type: 'string',
              description: 'Natural language search phrase (e.g. "fever", "shortness of breath")',
            },
            sex: {
              type: 'string',
              description: 'Patient sex for context-aware ranking: "male" or "female"',
              enum: ['male', 'female'],
            },
            age_value: {
              type: 'number',
              description: 'Patient age value',
            },
            age_unit: {
              type: 'string',
              description: 'Unit for age_value: "year" (default) or "month"',
              enum: ['year', 'month'],
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default: 8)',
            },
            type: {
              type: 'string',
              description: 'Filter by observation type: "symptom" or "risk_factor"',
              enum: ['symptom', 'risk_factor'],
            },
          },
          required: ['phrase'],
        },
      },
      {
        name: 'parse_text',
        description: 'Parse free-text patient input and extract mentions of symptoms and risk factors with their Infermedica IDs and initial/present status',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Free-form patient-reported text to parse (e.g. "I have had a fever and headache for 3 days")',
            },
            concept_types: {
              type: 'array',
              items: { type: 'string', enum: ['symptom', 'risk_factor'] },
              description: 'Types of concepts to extract (default: all)',
            },
            context: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ordered list of Infermedica IDs of already-captured present symptoms for disambiguation context',
            },
            correct_spelling: {
              type: 'boolean',
              description: 'Correct spelling in input text before analysis (default: false)',
            },
            include_tokens: {
              type: 'boolean',
              description: 'Include tokenization details in the response (default: false)',
            },
          },
          required: ['text'],
        },
      },
      // -- Diagnostic Engine ------------------------------------------------
      {
        name: 'run_diagnosis',
        description: 'Run the Infermedica diagnostic engine — returns ranked list of possible conditions with probabilities and the next best question to ask the patient',
        inputSchema: {
          type: 'object',
          properties: {
            sex: {
              type: 'string',
              description: 'Patient sex: "male" or "female"',
              enum: ['male', 'female'],
            },
            age: {
              type: 'object',
              description: 'Patient age object with "value" (number) and optional "unit" ("year" or "month")',
              properties: {
                value: { type: 'number', description: 'Age value' },
                unit: { type: 'string', enum: ['year', 'month'], description: 'Age unit (default: year)' },
              },
              required: ['value'],
            },
            evidence: {
              type: 'array',
              description: 'List of evidence items — each has id (observation ID), choice_id ("present", "absent", or "unknown"), and optional source',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Observation ID (e.g. "s_13")' },
                  choice_id: { type: 'string', enum: ['present', 'absent', 'unknown'] },
                  source: { type: 'string', description: 'Evidence source context' },
                },
                required: ['id', 'choice_id'],
              },
            },
            extras: {
              type: 'object',
              description: 'Optional extra parameters (e.g. enable_explanations, enable_triage_5)',
              additionalProperties: true,
            },
          },
          required: ['sex', 'age', 'evidence'],
        },
      },
      {
        name: 'explain_diagnosis',
        description: 'Get an explanation of why a target condition is or is not supported by the provided evidence — returns supporting and opposing observations',
        inputSchema: {
          type: 'object',
          properties: {
            sex: {
              type: 'string',
              description: 'Patient sex: "male" or "female"',
              enum: ['male', 'female'],
            },
            age: {
              type: 'object',
              description: 'Patient age object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['year', 'month'] },
              },
              required: ['value'],
            },
            evidence: {
              type: 'array',
              description: 'Evidence items (same format as run_diagnosis)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  choice_id: { type: 'string', enum: ['present', 'absent', 'unknown'] },
                  source: { type: 'string' },
                },
                required: ['id', 'choice_id'],
              },
            },
            target: {
              type: 'string',
              description: 'Infermedica condition ID to explain (e.g. "c_49")',
            },
            extras: {
              type: 'object',
              additionalProperties: true,
            },
          },
          required: ['sex', 'age', 'evidence', 'target'],
        },
      },
      {
        name: 'get_rationale',
        description: 'Get the diagnostic engine rationale for why a specific question was asked — useful for building transparent symptom checkers',
        inputSchema: {
          type: 'object',
          properties: {
            sex: {
              type: 'string',
              description: 'Patient sex: "male" or "female"',
              enum: ['male', 'female'],
            },
            age: {
              type: 'object',
              description: 'Patient age object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['year', 'month'] },
              },
              required: ['value'],
            },
            evidence: {
              type: 'array',
              description: 'Evidence items (same format as run_diagnosis)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  choice_id: { type: 'string', enum: ['present', 'absent', 'unknown'] },
                  source: { type: 'string' },
                },
                required: ['id', 'choice_id'],
              },
            },
            extras: {
              type: 'object',
              additionalProperties: true,
            },
          },
          required: ['sex', 'age', 'evidence'],
        },
      },
      {
        name: 'get_triage',
        description: 'Get triage level recommendation for a patient based on their symptoms and evidence — returns urgency level (emergency, consultation, self-care, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            sex: {
              type: 'string',
              description: 'Patient sex: "male" or "female"',
              enum: ['male', 'female'],
            },
            age: {
              type: 'object',
              description: 'Patient age object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['year', 'month'] },
              },
              required: ['value'],
            },
            evidence: {
              type: 'array',
              description: 'Evidence items (same format as run_diagnosis)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  choice_id: { type: 'string', enum: ['present', 'absent', 'unknown'] },
                  source: { type: 'string' },
                },
                required: ['id', 'choice_id'],
              },
            },
            extras: {
              type: 'object',
              additionalProperties: true,
            },
          },
          required: ['sex', 'age', 'evidence'],
        },
      },
      {
        name: 'get_red_flags',
        description: 'Identify possible red flag symptoms — critical or emergency-level symptoms — from the current evidence set',
        inputSchema: {
          type: 'object',
          properties: {
            sex: {
              type: 'string',
              description: 'Patient sex: "male" or "female"',
              enum: ['male', 'female'],
            },
            age: {
              type: 'object',
              description: 'Patient age object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['year', 'month'] },
              },
              required: ['value'],
            },
            evidence: {
              type: 'array',
              description: 'Evidence items (same format as run_diagnosis)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  choice_id: { type: 'string', enum: ['present', 'absent', 'unknown'] },
                  source: { type: 'string' },
                },
                required: ['id', 'choice_id'],
              },
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of red flag results to return',
            },
          },
          required: ['sex', 'age', 'evidence'],
        },
      },
      {
        name: 'suggest_symptoms',
        description: 'Get suggested related symptoms to ask about next, based on current evidence — powers symptom suggestion UI in symptom checkers',
        inputSchema: {
          type: 'object',
          properties: {
            sex: {
              type: 'string',
              description: 'Patient sex: "male" or "female"',
              enum: ['male', 'female'],
            },
            age: {
              type: 'object',
              description: 'Patient age object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['year', 'month'] },
              },
              required: ['value'],
            },
            evidence: {
              type: 'array',
              description: 'Evidence items (same format as run_diagnosis)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  choice_id: { type: 'string', enum: ['present', 'absent', 'unknown'] },
                  source: { type: 'string' },
                },
                required: ['id', 'choice_id'],
              },
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of suggested symptoms to return (default: 8)',
            },
            extras: {
              type: 'object',
              additionalProperties: true,
            },
          },
          required: ['sex', 'age', 'evidence'],
        },
      },
      // -- Concepts ---------------------------------------------------------
      {
        name: 'list_concepts',
        description: 'List all medical concepts (symptoms and risk factors combined) in the Infermedica knowledge base, optionally filtered by type or IDs',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Comma-separated list of concept IDs to retrieve (e.g. "s_13,p_8")',
            },
            types: {
              type: 'string',
              description: 'Comma-separated concept types to filter: "symptom", "risk_factor"',
            },
          },
        },
      },
      {
        name: 'get_concept',
        description: 'Get a specific medical concept by Infermedica ID — works for both symptoms and risk factors',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Infermedica concept ID (e.g. "s_13" for a symptom, "p_8" for a risk factor)',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_info':            return this.getInfo(args);
        case 'list_symptoms':       return this.listSymptoms(args);
        case 'get_symptom':         return this.getById('symptoms', args.id as string, args);
        case 'list_conditions':     return this.listConditions(args);
        case 'get_condition':       return this.getById('conditions', args.id as string, args);
        case 'list_risk_factors':   return this.listRiskFactors(args);
        case 'get_risk_factor':     return this.getById('risk_factors', args.id as string, args);
        case 'list_lab_tests':      return this.listLabTests(args);
        case 'get_lab_test':        return this.getById('lab_tests', args.id as string, args);
        case 'lookup_observation':  return this.lookupObservation(args);
        case 'search_observations': return this.searchObservations(args);
        case 'parse_text':          return this.parseText(args);
        case 'run_diagnosis':       return this.runDiagnosis(args);
        case 'explain_diagnosis':   return this.explainDiagnosis(args);
        case 'get_rationale':       return this.getRationale(args);
        case 'get_triage':          return this.getTriage(args);
        case 'get_red_flags':       return this.getRedFlags(args);
        case 'suggest_symptoms':    return this.suggestSymptoms(args);
        case 'list_concepts':       return this.listConcepts(args);
        case 'get_concept':         return this.getConceptById(args.id as string);
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

  // -- Helpers --------------------------------------------------------------

  private get authHeaders(): Record<string, string> {
    return {
      'App-Id': this.appId,
      'App-Key': this.appKey,
      'Content-Type': 'application/json',
    };
  }

  private ageParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.age_value !== undefined) params.set('age.value', String(args.age_value));
    if (args.age_unit !== undefined) params.set('age.unit', String(args.age_unit));
    if (args.enable_triage_5 === true) params.set('enable_triage_5', 'true');
    return params;
  }

  private async doGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params?.toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doPost(path: string, body: unknown, extraParams?: URLSearchParams): Promise<ToolResult> {
    const qs = extraParams?.toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // -- Knowledge Base -------------------------------------------------------

  private async getInfo(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet('/info', this.ageParams(args));
  }

  private async listSymptoms(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet('/symptoms', this.ageParams(args));
  }

  private async listConditions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet('/conditions', this.ageParams(args));
  }

  private async listRiskFactors(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet('/risk_factors', this.ageParams(args));
  }

  private async listLabTests(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet('/lab_tests', this.ageParams(args));
  }

  private async getById(resource: string, id: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.doGet(`/${resource}/${encodeURIComponent(id)}`, this.ageParams(args));
  }

  // -- Search & NLP ---------------------------------------------------------

  private async lookupObservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phrase) {
      return { content: [{ type: 'text', text: 'phrase is required' }], isError: true };
    }
    const params = new URLSearchParams({ phrase: args.phrase as string });
    if (args.sex) params.set('sex', args.sex as string);
    if (args.age_value !== undefined) params.set('age.value', String(args.age_value));
    if (args.age_unit) params.set('age.unit', args.age_unit as string);
    return this.doGet('/lookup', params);
  }

  private async searchObservations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phrase) {
      return { content: [{ type: 'text', text: 'phrase is required' }], isError: true };
    }
    const params = new URLSearchParams({ phrase: args.phrase as string });
    if (args.sex) params.set('sex', args.sex as string);
    if (args.age_value !== undefined) params.set('age.value', String(args.age_value));
    if (args.age_unit) params.set('age.unit', args.age_unit as string);
    if (args.max_results !== undefined) params.set('max_results', String(args.max_results));
    if (args.type) params.set('type', args.type as string);
    return this.doGet('/search', params);
  }

  private async parseText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text) {
      return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    }
    const body: Record<string, unknown> = { text: args.text };
    if (args.concept_types) body['concept_types'] = args.concept_types;
    if (args.context) body['context'] = args.context;
    if (args.correct_spelling !== undefined) body['correct_spelling'] = args.correct_spelling;
    if (args.include_tokens !== undefined) body['include_tokens'] = args.include_tokens;
    return this.doPost('/parse', body);
  }

  // -- Diagnostic Engine ----------------------------------------------------

  private buildDiagnosisBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      sex: args.sex,
      age: args.age,
      evidence: args.evidence ?? [],
    };
    if (args.extras) body['extras'] = args.extras;
    return body;
  }

  private async runDiagnosis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sex || !args.age) {
      return { content: [{ type: 'text', text: 'sex and age are required' }], isError: true };
    }
    return this.doPost('/diagnosis', this.buildDiagnosisBody(args));
  }

  private async explainDiagnosis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sex || !args.age || !args.target) {
      return { content: [{ type: 'text', text: 'sex, age, and target are required' }], isError: true };
    }
    return this.doPost('/explain', { ...this.buildDiagnosisBody(args), target: args.target });
  }

  private async getRationale(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sex || !args.age) {
      return { content: [{ type: 'text', text: 'sex and age are required' }], isError: true };
    }
    return this.doPost('/rationale', this.buildDiagnosisBody(args));
  }

  private async getTriage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sex || !args.age) {
      return { content: [{ type: 'text', text: 'sex and age are required' }], isError: true };
    }
    return this.doPost('/triage', this.buildDiagnosisBody(args));
  }

  private async getRedFlags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sex || !args.age) {
      return { content: [{ type: 'text', text: 'sex and age are required' }], isError: true };
    }
    const extraParams = args.max_results !== undefined
      ? new URLSearchParams({ max_results: String(args.max_results) })
      : undefined;
    return this.doPost('/red_flags', this.buildDiagnosisBody(args), extraParams);
  }

  private async suggestSymptoms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sex || !args.age) {
      return { content: [{ type: 'text', text: 'sex and age are required' }], isError: true };
    }
    const extraParams = args.max_results !== undefined
      ? new URLSearchParams({ max_results: String(args.max_results) })
      : undefined;
    return this.doPost('/suggest', this.buildDiagnosisBody(args), extraParams);
  }

  // -- Concepts -------------------------------------------------------------

  private async listConcepts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.ids) params.set('ids', args.ids as string);
    if (args.types) params.set('types', args.types as string);
    return this.doGet('/concepts', params.toString() ? params : undefined);
  }

  private async getConceptById(id: string): Promise<ToolResult> {
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.doGet(`/concepts/${encodeURIComponent(id)}`);
  }
}
