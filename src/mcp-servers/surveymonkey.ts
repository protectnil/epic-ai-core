/**
 * SurveyMonkey MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official SurveyMonkey MCP server was found on GitHub or in SurveyMonkey's developer documentation.
//
// Base URL: https://api.surveymonkey.com/v3
// Auth: OAuth2 Bearer token in Authorization header — exchange authorization code for access_token at /oauth/token
// Docs: https://api.surveymonkey.com/v3/docs
// Rate limits: 500 req/day (free app); 5,000 req/day (paid app). Per-minute: ~120 req/min. 429 on breach (no Retry-After header).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SurveyMonkeyConfig {
  accessToken: string;
  baseUrl?: string;
}

export class SurveyMonkeyMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SurveyMonkeyConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.surveymonkey.com/v3';
  }

  static catalog() {
    return {
      name: 'surveymonkey',
      displayName: 'SurveyMonkey',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'surveymonkey', 'survey', 'questionnaire', 'responses', 'collectors', 'feedback',
        'polls', 'forms', 'analytics', 'nps', 'csat', 'voice of customer',
      ],
      toolNames: [
        'list_surveys', 'get_survey', 'create_survey', 'update_survey', 'delete_survey',
        'list_survey_pages', 'list_survey_questions',
        'list_responses', 'get_response', 'get_survey_summary',
        'list_collectors', 'get_collector', 'create_collector', 'update_collector', 'delete_collector',
        'list_collector_messages', 'send_collector_message',
        'get_current_user', 'list_webhooks', 'create_webhook',
      ],
      description: 'SurveyMonkey survey platform: create and manage surveys, retrieve responses, manage collectors, and analyze survey results.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_surveys',
        description: 'List all surveys in the SurveyMonkey account with optional sorting and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of surveys per page (default: 50, max: 100)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: title, date_modified, num_responses (default: date_modified)',
            },
            sort_order: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default: DESC)',
            },
            start_modified_at: {
              type: 'string',
              description: 'Return surveys modified after this ISO 8601 datetime',
            },
          },
        },
      },
      {
        name: 'get_survey',
        description: 'Get full details of a specific survey by its ID including pages, questions, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'SurveyMonkey survey ID',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'create_survey',
        description: 'Create a new survey from a title, optional template, or by copying an existing survey',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the new survey',
            },
            language: {
              type: 'string',
              description: 'Language code for the survey (default: en)',
            },
            from_template_id: {
              type: 'string',
              description: 'Template ID to base the survey on (optional)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_survey',
        description: 'Update a survey title, language, or other metadata by survey ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID to update',
            },
            title: {
              type: 'string',
              description: 'Updated survey title',
            },
            language: {
              type: 'string',
              description: 'Updated language code (e.g. en, fr, de)',
            },
            nickname: {
              type: 'string',
              description: 'Internal nickname for the survey',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'delete_survey',
        description: 'Delete a survey and all its responses by survey ID — this is permanent and cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID to delete',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'list_survey_pages',
        description: 'List all pages in a survey — SurveyMonkey organizes questions into pages',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID to list pages for',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'list_survey_questions',
        description: 'List all questions on a specific page of a survey with answer choices and question type',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID containing the page',
            },
            page_id: {
              type: 'string',
              description: 'Page ID to list questions for',
            },
          },
          required: ['survey_id', 'page_id'],
        },
      },
      {
        name: 'list_responses',
        description: 'List survey responses with optional date range filter, status filter, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID to retrieve responses for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Responses per page (default: 50, max: 100)',
            },
            start_created_at: {
              type: 'string',
              description: 'Return responses created after this ISO 8601 datetime',
            },
            end_created_at: {
              type: 'string',
              description: 'Return responses created before this ISO 8601 datetime',
            },
            status: {
              type: 'string',
              description: 'Filter by completion status: completed, partial, overquota, disqualified (default: completed)',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'get_response',
        description: 'Get a single survey response by response ID including all question answers',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID containing the response',
            },
            response_id: {
              type: 'string',
              description: 'Response ID to retrieve',
            },
          },
          required: ['survey_id', 'response_id'],
        },
      },
      {
        name: 'get_survey_summary',
        description: 'Get a statistical summary of all survey responses including per-question aggregate statistics',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID to summarize',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'list_collectors',
        description: 'List all collectors (distribution channels) for a survey — each collector generates a unique survey link',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID to list collectors for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Collectors per page (default: 50)',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'get_collector',
        description: 'Get details of a specific collector by survey ID and collector ID including URL and settings',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID containing the collector',
            },
            collector_id: {
              type: 'string',
              description: 'Collector ID to retrieve',
            },
          },
          required: ['survey_id', 'collector_id'],
        },
      },
      {
        name: 'create_collector',
        description: 'Create a new collector for a survey — collectors are distribution channels like web links or email invites',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID to create the collector for',
            },
            type: {
              type: 'string',
              description: 'Collector type: weblink, email, sms, popup, offline (default: weblink)',
            },
            name: {
              type: 'string',
              description: 'Display name for the collector',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'update_collector',
        description: 'Update a collector name, status, or close date by survey ID and collector ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID containing the collector',
            },
            collector_id: {
              type: 'string',
              description: 'Collector ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated collector name',
            },
            status: {
              type: 'string',
              description: 'Collector status: open, closed (use closed to stop accepting responses)',
            },
            close_date: {
              type: 'string',
              description: 'ISO 8601 datetime after which the collector closes automatically',
            },
          },
          required: ['survey_id', 'collector_id'],
        },
      },
      {
        name: 'delete_collector',
        description: 'Delete a collector and all its associated responses by survey ID and collector ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID containing the collector',
            },
            collector_id: {
              type: 'string',
              description: 'Collector ID to delete',
            },
          },
          required: ['survey_id', 'collector_id'],
        },
      },
      {
        name: 'list_collector_messages',
        description: 'List email invitation messages for an email collector, including subject, status, and send date',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID containing the collector',
            },
            collector_id: {
              type: 'string',
              description: 'Email collector ID to list messages for',
            },
          },
          required: ['survey_id', 'collector_id'],
        },
      },
      {
        name: 'send_collector_message',
        description: 'Send or schedule an email invitation message for an email collector to its recipient list',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Survey ID containing the collector',
            },
            collector_id: {
              type: 'string',
              description: 'Email collector ID',
            },
            message_id: {
              type: 'string',
              description: 'Message ID to send',
            },
            scheduled_date: {
              type: 'string',
              description: 'ISO 8601 datetime to schedule the send (omit to send immediately)',
            },
          },
          required: ['survey_id', 'collector_id', 'message_id'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile information of the authenticated SurveyMonkey user including account type and email',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured for the SurveyMonkey account for survey event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Webhooks per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a webhook to receive notifications when survey responses are submitted or surveys are updated',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Webhook name for identification',
            },
            event_type: {
              type: 'string',
              description: 'Event to trigger on: response_completed, response_updated, response_deleted, survey_created, survey_updated, survey_deleted, collector_created, collector_updated, collector_deleted',
            },
            object_type: {
              type: 'string',
              description: 'Object type to monitor: survey or collector',
            },
            object_ids: {
              type: 'array',
              description: 'Array of survey or collector IDs to watch (empty = all)',
            },
            subscription_url: {
              type: 'string',
              description: 'HTTPS URL to receive POST webhook payloads',
            },
          },
          required: ['name', 'event_type', 'object_type', 'subscription_url'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_surveys': return this.listSurveys(args);
        case 'get_survey': return this.getSurvey(args);
        case 'create_survey': return this.createSurvey(args);
        case 'update_survey': return this.updateSurvey(args);
        case 'delete_survey': return this.deleteSurvey(args);
        case 'list_survey_pages': return this.listSurveyPages(args);
        case 'list_survey_questions': return this.listSurveyQuestions(args);
        case 'list_responses': return this.listResponses(args);
        case 'get_response': return this.getResponse(args);
        case 'get_survey_summary': return this.getSurveySummary(args);
        case 'list_collectors': return this.listCollectors(args);
        case 'get_collector': return this.getCollector(args);
        case 'create_collector': return this.createCollector(args);
        case 'update_collector': return this.updateCollector(args);
        case 'delete_collector': return this.deleteCollector(args);
        case 'list_collector_messages': return this.listCollectorMessages(args);
        case 'send_collector_message': return this.sendCollectorMessage(args);
        case 'get_current_user': return this.getCurrentUser();
        case 'list_webhooks': return this.listWebhooks(args);
        case 'create_webhook': return this.createWebhook(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async listSurveys(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 50),
      sort_by: (args.sort_by as string) || 'date_modified',
      sort_order: (args.sort_order as string) || 'DESC',
    };
    if (args.start_modified_at) params.start_modified_at = args.start_modified_at as string;
    return this.apiGet('/surveys', params);
  }

  private async getSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/details`);
  }

  private async createSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    const body: Record<string, unknown> = { title: args.title };
    if (args.language) body.language = args.language;
    if (args.from_template_id) body.from_template_id = args.from_template_id;
    return this.apiPost('/surveys', body);
  }

  private async updateSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.language) body.language = args.language;
    if (args.nickname) body.nickname = args.nickname;
    return this.apiPatch(`/surveys/${encodeURIComponent(args.survey_id as string)}`, body);
  }

  private async deleteSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    return this.apiDelete(`/surveys/${encodeURIComponent(args.survey_id as string)}`);
  }

  private async listSurveyPages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/pages`);
  }

  private async listSurveyQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id || !args.page_id) return { content: [{ type: 'text', text: 'survey_id and page_id are required' }], isError: true };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/pages/${encodeURIComponent(args.page_id as string)}/questions`);
  }

  private async listResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 50),
    };
    if (args.start_created_at) params.start_created_at = args.start_created_at as string;
    if (args.end_created_at) params.end_created_at = args.end_created_at as string;
    if (args.status) params.status = args.status as string;
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/responses/bulk`, params);
  }

  private async getResponse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id || !args.response_id) return { content: [{ type: 'text', text: 'survey_id and response_id are required' }], isError: true };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/responses/${encodeURIComponent(args.response_id as string)}`);
  }

  private async getSurveySummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/rollups`);
  }

  private async listCollectors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 50),
    };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/collectors`, params);
  }

  private async getCollector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collector_id) return { content: [{ type: 'text', text: 'collector_id is required' }], isError: true };
    return this.apiGet(`/collectors/${encodeURIComponent(args.collector_id as string)}`);
  }

  private async createCollector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      type: (args.type as string) || 'weblink',
    };
    if (args.name) body.name = args.name;
    return this.apiPost(`/surveys/${encodeURIComponent(args.survey_id as string)}/collectors`, body);
  }

  private async updateCollector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collector_id) return { content: [{ type: 'text', text: 'collector_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    if (args.close_date) body.close_date = args.close_date;
    return this.apiPatch(`/collectors/${encodeURIComponent(args.collector_id as string)}`, body);
  }

  private async deleteCollector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collector_id) return { content: [{ type: 'text', text: 'collector_id is required' }], isError: true };
    return this.apiDelete(`/collectors/${encodeURIComponent(args.collector_id as string)}`);
  }

  private async listCollectorMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id || !args.collector_id) return { content: [{ type: 'text', text: 'survey_id and collector_id are required' }], isError: true };
    return this.apiGet(`/collectors/${encodeURIComponent(args.collector_id as string)}/messages`);
  }

  private async sendCollectorMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id || !args.collector_id || !args.message_id) {
      return { content: [{ type: 'text', text: 'survey_id, collector_id, and message_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.scheduled_date) body.scheduled_date = args.scheduled_date;
    return this.apiPost(`/collectors/${encodeURIComponent(args.collector_id as string)}/messages/${encodeURIComponent(args.message_id as string)}/send`, body);
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.apiGet('/users/me');
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 50),
    };
    return this.apiGet('/webhooks', params);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.event_type || !args.object_type || !args.subscription_url) {
      return { content: [{ type: 'text', text: 'name, event_type, object_type, and subscription_url are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      event_type: args.event_type,
      object_type: args.object_type,
      subscription_url: args.subscription_url,
    };
    if (args.object_ids) body.object_ids = args.object_ids;
    return this.apiPost('/webhooks', body);
  }
}
