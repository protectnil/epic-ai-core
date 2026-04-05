/**
 * Culture Amp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Culture Amp MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://api.cultureamp.com/v1
// Auth: OAuth2 client credentials flow — token endpoint: https://api.cultureamp.com/oauth2/token
//   (tokenUrl is /oauth2/token per OpenAPI spec, relative to root host not /v1 base)
//   client_id and client_secret may be passed in body or as Basic auth header (both valid per docs)
// Docs: https://docs.api.cultureamp.com/docs/resources-getting-started
// API Spec: https://api.cultureamp.com/spec
// Rate limits: Not publicly documented; apply reasonable backoff on 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CultureAmpConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class CultureAmpMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CultureAmpConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.cultureamp.com/v1';
  }

  static catalog() {
    return {
      name: 'culture-amp',
      displayName: 'Culture Amp',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'culture amp', 'employee engagement', 'engagement survey', 'hr', 'people analytics',
        'performance review', 'feedback', 'pulse survey', 'eNPS', 'workforce', 'retention',
        'employee experience', 'manager effectiveness',
      ],
      toolNames: [
        'list_employees', 'get_employee', 'list_employee_demographics',
        'list_surveys', 'get_survey', 'list_survey_responses', 'get_survey_response',
        'list_survey_questions', 'get_survey_question', 'list_survey_factors', 'get_survey_factor',
        'list_survey_sections', 'get_survey_section',
        'list_performance_cycles', 'get_performance_cycle',
        'list_manager_reviews_by_cycle', 'list_manager_reviews', 'get_manager_review',
        'list_manager_reviews_by_employee',
      ],
      description: 'Culture Amp employee engagement and performance data: list employees, survey results, response data, and performance review cycles.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_employees',
        description: 'List all employees in the Culture Amp account with optional pagination cursor',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to retrieve the next page of employees',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of employees to return per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Retrieve detailed profile information for a specific Culture Amp employee by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Unique Culture Amp employee ID',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_employee_demographics',
        description: 'List demographic attributes for a specific employee, including department, location, and custom properties',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Unique Culture Amp employee ID to retrieve demographics for',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_surveys',
        description: 'List all engagement and pulse surveys in the Culture Amp account with status and date information',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter surveys by status: active, closed, draft (default: no filter, returns all)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of surveys to return per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_survey',
        description: 'Retrieve metadata and question details for a specific Culture Amp survey by survey ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Unique Culture Amp survey ID',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'list_survey_responses',
        description: 'List completed survey responses for a specific survey, with pagination support for large response sets',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Unique Culture Amp survey ID to retrieve responses for',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'get_survey_response',
        description: 'Retrieve a single survey response by its response ID',
        inputSchema: {
          type: 'object',
          properties: {
            response_id: {
              type: 'string',
              description: 'Unique survey response ID',
            },
          },
          required: ['response_id'],
        },
      },
      {
        name: 'list_survey_questions',
        description: 'List all questions for a specific Culture Amp survey by survey ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Unique Culture Amp survey ID to retrieve questions for',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'get_survey_question',
        description: 'Retrieve details for a specific Culture Amp survey question by question ID',
        inputSchema: {
          type: 'object',
          properties: {
            question_id: {
              type: 'string',
              description: 'Unique survey question ID',
            },
          },
          required: ['question_id'],
        },
      },
      {
        name: 'list_survey_factors',
        description: 'List all factors (question groupings) for a specific Culture Amp survey by survey ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Unique Culture Amp survey ID to retrieve factors for',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'get_survey_factor',
        description: 'Retrieve details for a specific Culture Amp survey factor by factor ID',
        inputSchema: {
          type: 'object',
          properties: {
            factor_id: {
              type: 'string',
              description: 'Unique survey factor ID',
            },
          },
          required: ['factor_id'],
        },
      },
      {
        name: 'list_survey_sections',
        description: 'List all sections for a specific Culture Amp survey by survey ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Unique Culture Amp survey ID to retrieve sections for',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'get_survey_section',
        description: 'Retrieve details for a specific Culture Amp survey section by section ID',
        inputSchema: {
          type: 'object',
          properties: {
            section_id: {
              type: 'string',
              description: 'Unique survey section ID',
            },
          },
          required: ['section_id'],
        },
      },
      {
        name: 'list_performance_cycles',
        description: 'List all performance review cycles in Culture Amp with cycle name, status, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter cycles by status: active, closed, ready (default: no filter)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of cycles to return per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_performance_cycle',
        description: 'Retrieve details for a specific Culture Amp performance review cycle by cycle ID',
        inputSchema: {
          type: 'object',
          properties: {
            cycle_id: {
              type: 'string',
              description: 'Unique performance cycle ID',
            },
          },
          required: ['cycle_id'],
        },
      },
      {
        name: 'list_manager_reviews_by_cycle',
        description: 'List manager reviews (performance evaluations) within a specific performance cycle by cycle ID',
        inputSchema: {
          type: 'object',
          properties: {
            cycle_id: {
              type: 'string',
              description: 'Unique performance cycle ID to retrieve manager reviews from',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['cycle_id'],
        },
      },
      {
        name: 'list_manager_reviews',
        description: 'List all manager reviews across all performance cycles in the Culture Amp account',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_manager_review',
        description: 'Retrieve details for a specific Culture Amp manager review by review ID',
        inputSchema: {
          type: 'object',
          properties: {
            review_id: {
              type: 'string',
              description: 'Unique manager review ID',
            },
          },
          required: ['review_id'],
        },
      },
      {
        name: 'list_manager_reviews_by_employee',
        description: 'List all manager reviews for a specific employee across all performance cycles',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Unique Culture Amp employee ID to retrieve manager reviews for',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['employee_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_employees':
          return this.listEmployees(args);
        case 'get_employee':
          return this.getEmployee(args);
        case 'list_employee_demographics':
          return this.listEmployeeDemographics(args);
        case 'list_surveys':
          return this.listSurveys(args);
        case 'get_survey':
          return this.getSurvey(args);
        case 'list_survey_responses':
          return this.listSurveyResponses(args);
        case 'list_performance_cycles':
          return this.listPerformanceCycles(args);
        case 'get_performance_cycle':
          return this.getPerformanceCycle(args);
        case 'list_manager_reviews_by_cycle':
          return this.listManagerReviewsByCycle(args);
        case 'list_manager_reviews':
          return this.listManagerReviews(args);
        case 'get_manager_review':
          return this.getManagerReview(args);
        case 'list_manager_reviews_by_employee':
          return this.listManagerReviewsByEmployee(args);
        case 'get_survey_response':
          return this.getSurveyResponse(args);
        case 'list_survey_questions':
          return this.listSurveyQuestions(args);
        case 'get_survey_question':
          return this.getSurveyQuestion(args);
        case 'list_survey_factors':
          return this.listSurveyFactors(args);
        case 'get_survey_factor':
          return this.getSurveyFactor(args);
        case 'list_survey_sections':
          return this.listSurveySections(args);
        case 'get_survey_section':
          return this.getSurveySection(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/employees', params);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.apiGet(`/employees/${encodeURIComponent(args.employee_id as string)}`);
  }

  private async listEmployeeDemographics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.apiGet(`/employees/${encodeURIComponent(args.employee_id as string)}/demographics`);
  }

  private async listSurveys(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/surveys', params);
  }

  private async getSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}`);
  }

  private async listSurveyResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/responses`, params);
  }

  private async listPerformanceCycles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/performance-cycles', params);
  }

  private async getPerformanceCycle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cycle_id) return { content: [{ type: 'text', text: 'cycle_id is required' }], isError: true };
    return this.apiGet(`/performance-cycles/${encodeURIComponent(args.cycle_id as string)}`);
  }

  private async listManagerReviewsByCycle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cycle_id) return { content: [{ type: 'text', text: 'cycle_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/performance-cycles/${encodeURIComponent(args.cycle_id as string)}/manager-reviews`, params);
  }

  private async listManagerReviews(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/manager-reviews', params);
  }

  private async getManagerReview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.review_id) return { content: [{ type: 'text', text: 'review_id is required' }], isError: true };
    return this.apiGet(`/manager-reviews/${encodeURIComponent(args.review_id as string)}`);
  }

  private async listManagerReviewsByEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/employees/${encodeURIComponent(args.employee_id as string)}/manager-reviews`, params);
  }

  private async getSurveyResponse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.response_id) return { content: [{ type: 'text', text: 'response_id is required' }], isError: true };
    return this.apiGet(`/responses/${encodeURIComponent(args.response_id as string)}`);
  }

  private async listSurveyQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/questions`, params);
  }

  private async getSurveyQuestion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.question_id) return { content: [{ type: 'text', text: 'question_id is required' }], isError: true };
    return this.apiGet(`/questions/${encodeURIComponent(args.question_id as string)}`);
  }

  private async listSurveyFactors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/factors`, params);
  }

  private async getSurveyFactor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.factor_id) return { content: [{ type: 'text', text: 'factor_id is required' }], isError: true };
    return this.apiGet(`/factors/${encodeURIComponent(args.factor_id as string)}`);
  }

  private async listSurveySections(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/sections`, params);
  }

  private async getSurveySection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section_id) return { content: [{ type: 'text', text: 'section_id is required' }], isError: true };
    return this.apiGet(`/sections/${encodeURIComponent(args.section_id as string)}`);
  }
}
