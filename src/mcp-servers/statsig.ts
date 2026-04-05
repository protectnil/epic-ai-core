/**
 * Statsig MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.statsig.com/updates/update/mcpserver — transport: stdio, auth: Console API key
// Statsig publishes an official MCP server. Community listing (mcpbundles.com) shows ~21 Console API tools;
// no official GitHub repo or npm package was found published by Statsig Inc. as of 2026-03-28.
// MCP criteria: official publisher UNCONFIRMED — treating as unofficial/community until verified.
// Our adapter covers: 16 tools (feature gates, experiments, dynamic configs, layers, events).
// Recommendation: use-rest-api — official MCP publisher status unconfirmed. Use this adapter as primary.
//
// Base URL: https://statsigapi.net/console/v1 (Console API) | https://api.statsig.com/v1 (HTTP SDK API)
// Auth: STATSIG-API-KEY header with Console API key (for Console endpoints) or Server Secret key (for SDK endpoints)
// Docs: https://docs.statsig.com/console-api/introduction | https://docs.statsig.com/http-api/overview
// Rate limits: Console API mutation requests ~100/10s and ~900/15min per project (GET requests unthrottled)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StatsigConfig {
  apiKey: string;
  consoleApiKey?: string;
  baseUrl?: string;
  consoleBaseUrl?: string;
}

export class StatsigMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly consoleApiKey: string;
  private readonly baseUrl: string;
  private readonly consoleBaseUrl: string;

  constructor(config: StatsigConfig) {
    super();
    this.apiKey = config.apiKey;
    this.consoleApiKey = config.consoleApiKey || config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.statsig.com/v1';
    this.consoleBaseUrl = config.consoleBaseUrl || 'https://statsigapi.net/console/v1';
  }

  static catalog() {
    return {
      name: 'statsig',
      displayName: 'Statsig',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'statsig', 'feature flags', 'feature gates', 'experiments', 'a/b testing',
        'dynamic config', 'layers', 'holdouts', 'rollout', 'targeting',
        'experimentation', 'metrics', 'events', 'users',
      ],
      toolNames: [
        'check_gate', 'get_config', 'get_experiment', 'get_layer',
        'list_gates', 'get_gate', 'create_gate', 'update_gate', 'delete_gate',
        'list_experiments', 'get_experiment_details', 'create_experiment',
        'list_configs', 'get_config_details', 'list_layers',
        'log_event',
      ],
      description: 'Statsig feature flag and experimentation platform: evaluate feature gates, manage experiments and dynamic configs, and log custom events.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'check_gate',
        description: 'Evaluate a feature gate for a specific user and return whether the gate is enabled for that user',
        inputSchema: {
          type: 'object',
          properties: {
            gate_name: {
              type: 'string',
              description: 'Name of the feature gate to evaluate',
            },
            user_id: {
              type: 'string',
              description: 'User ID to evaluate the gate for',
            },
            user_email: {
              type: 'string',
              description: 'Optional user email for targeting rules',
            },
            custom_ids: {
              type: 'object',
              description: 'Optional custom ID map for unit-type targeting (e.g. {"company_id": "acme"})',
            },
            custom_attributes: {
              type: 'object',
              description: 'Optional key-value map of user attributes for targeting rules',
            },
          },
          required: ['gate_name', 'user_id'],
        },
      },
      {
        name: 'get_config',
        description: 'Get the dynamic config or experiment value for a specific user, returning the evaluated JSON config object',
        inputSchema: {
          type: 'object',
          properties: {
            config_name: {
              type: 'string',
              description: 'Name of the dynamic config or experiment to evaluate',
            },
            user_id: {
              type: 'string',
              description: 'User ID to evaluate the config for',
            },
            user_email: {
              type: 'string',
              description: 'Optional user email for targeting',
            },
            custom_ids: {
              type: 'object',
              description: 'Optional custom ID map for unit-type targeting',
            },
          },
          required: ['config_name', 'user_id'],
        },
      },
      {
        name: 'get_experiment',
        description: 'Get the experiment assignment and parameter values for a specific user in a named experiment',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_name: {
              type: 'string',
              description: 'Name of the experiment to evaluate',
            },
            user_id: {
              type: 'string',
              description: 'User ID to evaluate the experiment for',
            },
            user_email: {
              type: 'string',
              description: 'Optional user email for targeting',
            },
            custom_ids: {
              type: 'object',
              description: 'Optional custom ID map for unit-type targeting',
            },
          },
          required: ['experiment_name', 'user_id'],
        },
      },
      {
        name: 'get_layer',
        description: 'Get parameter values from a Statsig layer for a specific user, returning the active layer configuration',
        inputSchema: {
          type: 'object',
          properties: {
            layer_name: {
              type: 'string',
              description: 'Name of the layer to evaluate',
            },
            user_id: {
              type: 'string',
              description: 'User ID to evaluate the layer for',
            },
            user_email: {
              type: 'string',
              description: 'Optional user email for targeting',
            },
          },
          required: ['layer_name', 'user_id'],
        },
      },
      {
        name: 'list_gates',
        description: 'List all feature gates in the Statsig project with names, descriptions, and enabled status via the Console API',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            limit: {
              type: 'number',
              description: 'Number of gates per page (default: 100, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_gate',
        description: 'Get full configuration details for a specific feature gate including targeting rules and rollout percentages',
        inputSchema: {
          type: 'object',
          properties: {
            gate_name: {
              type: 'string',
              description: 'Name of the feature gate to retrieve',
            },
          },
          required: ['gate_name'],
        },
      },
      {
        name: 'create_gate',
        description: 'Create a new feature gate in the Statsig project with an optional description and targeting rules',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the feature gate (lowercase, underscores allowed)',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of what the gate controls',
            },
            isEnabled: {
              type: 'boolean',
              description: 'Whether the gate is active (default: true)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_gate',
        description: 'Update a feature gate — enable/disable it, change its description, or modify targeting rules',
        inputSchema: {
          type: 'object',
          properties: {
            gate_name: {
              type: 'string',
              description: 'Name of the gate to update',
            },
            isEnabled: {
              type: 'boolean',
              description: 'Set to true to enable or false to disable the gate',
            },
            description: {
              type: 'string',
              description: 'Updated description for the gate',
            },
          },
          required: ['gate_name'],
        },
      },
      {
        name: 'delete_gate',
        description: 'Permanently delete a feature gate from the Statsig project by gate name',
        inputSchema: {
          type: 'object',
          properties: {
            gate_name: {
              type: 'string',
              description: 'Name of the feature gate to delete',
            },
          },
          required: ['gate_name'],
        },
      },
      {
        name: 'list_experiments',
        description: 'List all experiments in the Statsig project with status, hypothesis, and group configuration',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            limit: {
              type: 'number',
              description: 'Number of experiments per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_experiment_details',
        description: 'Get complete configuration details for a named experiment including groups, metrics, and launch status',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_name: {
              type: 'string',
              description: 'Name of the experiment to retrieve',
            },
          },
          required: ['experiment_name'],
        },
      },
      {
        name: 'create_experiment',
        description: 'Create a new A/B experiment in Statsig with control and treatment groups and target metrics',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the experiment',
            },
            description: {
              type: 'string',
              description: 'Hypothesis or description for the experiment',
            },
            idType: {
              type: 'string',
              description: 'Unit type for experiment assignment: userID, stableID, or a custom ID type (default: userID)',
            },
            groups: {
              type: 'array',
              description: 'Array of group objects with name and percentage (control + treatments must sum to 100)',
            },
          },
          required: ['name', 'groups'],
        },
      },
      {
        name: 'list_configs',
        description: 'List all dynamic configs in the Statsig project with their names and targeting rules',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            limit: {
              type: 'number',
              description: 'Number of configs per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_config_details',
        description: 'Get the full configuration for a dynamic config including all rules and default values',
        inputSchema: {
          type: 'object',
          properties: {
            config_name: {
              type: 'string',
              description: 'Name of the dynamic config to retrieve',
            },
          },
          required: ['config_name'],
        },
      },
      {
        name: 'list_layers',
        description: 'List all layers in the Statsig project — layers group mutually exclusive experiments sharing parameters',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            limit: {
              type: 'number',
              description: 'Number of layers per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'log_event',
        description: 'Log a custom event to Statsig for use in experiment metrics and analytics, associated with a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID to associate the event with',
            },
            event_name: {
              type: 'string',
              description: 'Name of the custom event to log',
            },
            value: {
              type: 'string',
              description: 'Optional string or numeric value for the event (e.g. price, item name)',
            },
            metadata: {
              type: 'object',
              description: 'Optional key-value metadata for the event (e.g. {"item_id": "sku123"})',
            },
          },
          required: ['user_id', 'event_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'check_gate': return this.checkGate(args);
        case 'get_config': return this.getConfig(args);
        case 'get_experiment': return this.getExperiment(args);
        case 'get_layer': return this.getLayer(args);
        case 'list_gates': return this.listGates(args);
        case 'get_gate': return this.getGate(args);
        case 'create_gate': return this.createGate(args);
        case 'update_gate': return this.updateGate(args);
        case 'delete_gate': return this.deleteGate(args);
        case 'list_experiments': return this.listExperiments(args);
        case 'get_experiment_details': return this.getExperimentDetails(args);
        case 'create_experiment': return this.createExperiment(args);
        case 'list_configs': return this.listConfigs(args);
        case 'get_config_details': return this.getConfigDetails(args);
        case 'list_layers': return this.listLayers(args);
        case 'log_event': return this.logEvent(args);
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

  private sdkHeaders(): Record<string, string> {
    return {
      'statsig-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private consoleHeaders(): Record<string, string> {
    return {
      'statsig-api-key': this.consoleApiKey,
      'Content-Type': 'application/json',
    };
  }

  private buildUser(args: Record<string, unknown>): Record<string, unknown> {
    const user: Record<string, unknown> = { userID: args.user_id as string };
    if (args.user_email) user.email = args.user_email;
    if (args.custom_ids) user.customIDs = args.custom_ids;
    if (args.custom_attributes) user.custom = args.custom_attributes;
    return user;
  }

  private async sdkPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.sdkHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async consoleGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.consoleBaseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.consoleHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async consolePost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.consoleBaseUrl}${path}`, {
      method: 'POST',
      headers: this.consoleHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async consolePatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.consoleBaseUrl}${path}`, {
      method: 'PATCH',
      headers: this.consoleHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async consoleDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.consoleBaseUrl}${path}`, {
      method: 'DELETE',
      headers: this.consoleHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async checkGate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.gate_name || !args.user_id) return { content: [{ type: 'text', text: 'gate_name and user_id are required' }], isError: true };
    return this.sdkPost('/check_gate', { gateName: args.gate_name, user: this.buildUser(args) });
  }

  private async getConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.config_name || !args.user_id) return { content: [{ type: 'text', text: 'config_name and user_id are required' }], isError: true };
    return this.sdkPost('/get_config', { configName: args.config_name, user: this.buildUser(args) });
  }

  private async getExperiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.experiment_name || !args.user_id) return { content: [{ type: 'text', text: 'experiment_name and user_id are required' }], isError: true };
    return this.sdkPost('/get_config', { configName: args.experiment_name, user: this.buildUser(args) });
  }

  private async getLayer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.layer_name || !args.user_id) return { content: [{ type: 'text', text: 'layer_name and user_id are required' }], isError: true };
    return this.sdkPost('/get_layer', { layerName: args.layer_name, user: this.buildUser(args) });
  }

  private async listGates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 100),
    };
    return this.consoleGet('/gates', params);
  }

  private async getGate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.gate_name) return { content: [{ type: 'text', text: 'gate_name is required' }], isError: true };
    return this.consoleGet(`/gates/${encodeURIComponent(args.gate_name as string)}`);
  }

  private async createGate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (typeof args.isEnabled === 'boolean') body.isEnabled = args.isEnabled;
    return this.consolePost('/gates', body);
  }

  private async updateGate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.gate_name) return { content: [{ type: 'text', text: 'gate_name is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (typeof args.isEnabled === 'boolean') body.isEnabled = args.isEnabled;
    if (args.description) body.description = args.description;
    return this.consolePatch(`/gates/${encodeURIComponent(args.gate_name as string)}`, body);
  }

  private async deleteGate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.gate_name) return { content: [{ type: 'text', text: 'gate_name is required' }], isError: true };
    return this.consoleDelete(`/gates/${encodeURIComponent(args.gate_name as string)}`);
  }

  private async listExperiments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 100),
    };
    return this.consoleGet('/experiments', params);
  }

  private async getExperimentDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.experiment_name) return { content: [{ type: 'text', text: 'experiment_name is required' }], isError: true };
    return this.consoleGet(`/experiments/${encodeURIComponent(args.experiment_name as string)}`);
  }

  private async createExperiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.groups) return { content: [{ type: 'text', text: 'name and groups are required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      groups: args.groups,
      idType: (args.idType as string) || 'userID',
    };
    if (args.description) body.description = args.description;
    return this.consolePost('/experiments', body);
  }

  private async listConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 100),
    };
    return this.consoleGet('/dynamic_configs', params);
  }

  private async getConfigDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.config_name) return { content: [{ type: 'text', text: 'config_name is required' }], isError: true };
    return this.consoleGet(`/dynamic_configs/${encodeURIComponent(args.config_name as string)}`);
  }

  private async listLayers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 100),
    };
    return this.consoleGet('/layers', params);
  }

  private async logEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id || !args.event_name) return { content: [{ type: 'text', text: 'user_id and event_name are required' }], isError: true };
    const event: Record<string, unknown> = {
      eventName: args.event_name,
      user: { userID: args.user_id },
      time: Date.now(),
    };
    if (args.value !== undefined) event.value = args.value;
    if (args.metadata) event.metadata = args.metadata;
    return this.sdkPost('/log_event', { events: [event] });
  }
}
