/**
 * ConfigCat MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official ConfigCat MCP server was found on GitHub.
//
// Base URL: https://api.configcat.com/v1
// Auth: HTTP Basic (basicUsername = public key, basicPassword = private key)
// Docs: https://api.configcat.com/docs/v1/swagger.json
// Rate limits: X-Rate-Limit-Remaining / X-Rate-Limit-Reset headers; HTTP 429 on breach

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ConfigCatConfig {
  /**
   * ConfigCat Public Management API credentials.
   * basicUsername: the public portion of your Basic Auth credentials.
   * basicPassword: the private/secret portion of your Basic Auth credentials.
   * Obtain from: https://app.configcat.com/my-account/public-api-credentials
   */
  basicUsername: string;
  basicPassword: string;
  /** Override the API base URL. Defaults to https://api.configcat.com/v1 */
  baseUrl?: string;
}

export class ConfigCatMCPServer extends MCPAdapterBase {
  private readonly basicUsername: string;
  private readonly basicPassword: string;
  private readonly baseUrl: string;

  constructor(config: ConfigCatConfig) {
    super();
    this.basicUsername = config.basicUsername;
    this.basicPassword = config.basicPassword;
    this.baseUrl = config.baseUrl || 'https://api.configcat.com/v1';
  }

  private get headers(): Record<string, string> {
    const credentials = Buffer.from(`${this.basicUsername}:${this.basicPassword}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Products ---
      {
        name: 'list_products',
        description: 'List all ConfigCat products accessible to the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_product',
        description: 'Get details of a specific ConfigCat product by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The unique identifier of the product' },
          },
          required: ['productId'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new ConfigCat product under an organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', description: 'The organization ID to create the product under' },
            name: { type: 'string', description: 'Display name of the product' },
            description: { type: 'string', description: 'Optional description for the product' },
          },
          required: ['organizationId', 'name'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a ConfigCat product by its ID. Removes all associated configs and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID to delete' },
          },
          required: ['productId'],
        },
      },
      // --- Configs ---
      {
        name: 'list_configs',
        description: 'List all configs (configuration files) within a ConfigCat product.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID to list configs for' },
          },
          required: ['productId'],
        },
      },
      {
        name: 'get_config',
        description: 'Get details of a specific ConfigCat config by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'The unique identifier of the config' },
          },
          required: ['configId'],
        },
      },
      {
        name: 'create_config',
        description: 'Create a new config within a ConfigCat product.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID to create the config under' },
            name: { type: 'string', description: 'Display name for the config' },
            description: { type: 'string', description: 'Optional description for the config' },
          },
          required: ['productId', 'name'],
        },
      },
      {
        name: 'delete_config',
        description: 'Delete a ConfigCat config by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'The config ID to delete' },
          },
          required: ['configId'],
        },
      },
      // --- Environments ---
      {
        name: 'list_environments',
        description: 'List all environments within a ConfigCat product.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID to list environments for' },
          },
          required: ['productId'],
        },
      },
      {
        name: 'get_environment',
        description: 'Get details of a specific ConfigCat environment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'The unique identifier of the environment' },
          },
          required: ['environmentId'],
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new environment within a ConfigCat product.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID to create the environment under' },
            name: { type: 'string', description: 'Display name for the environment' },
            description: { type: 'string', description: 'Optional description for the environment' },
            color: { type: 'string', description: 'Color for the environment badge (hex, e.g. #FF0000)' },
          },
          required: ['productId', 'name'],
        },
      },
      {
        name: 'delete_environment',
        description: 'Delete a ConfigCat environment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'The environment ID to delete' },
          },
          required: ['environmentId'],
        },
      },
      // --- Feature Flags & Settings ---
      {
        name: 'list_settings',
        description: 'List all feature flags and settings within a ConfigCat config.',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'The config ID to list feature flags for' },
          },
          required: ['configId'],
        },
      },
      {
        name: 'create_setting',
        description: 'Create a new feature flag or setting within a ConfigCat config.',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'The config ID to add the setting to' },
            key: { type: 'string', description: 'Unique key for the feature flag (snake_case recommended)' },
            name: { type: 'string', description: 'Display name for the feature flag' },
            hint: { type: 'string', description: 'Optional description/hint for the flag' },
            settingType: {
              type: 'string',
              description: 'Data type: "boolean" (default), "string", "int", or "double"',
            },
          },
          required: ['configId', 'key', 'name'],
        },
      },
      // --- Feature Flag Values ---
      {
        name: 'get_setting_value',
        description: 'Get the current served value configuration for a feature flag in a specific environment.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'The environment ID' },
            settingId: { type: 'number', description: 'The setting/flag ID (numeric)' },
          },
          required: ['environmentId', 'settingId'],
        },
      },
      {
        name: 'update_setting_value',
        description: 'Update the served value of a feature flag in a specific environment (toggle on/off or set value).',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'The environment ID' },
            settingId: { type: 'number', description: 'The setting/flag ID (numeric)' },
            value: { description: 'The new value to serve (boolean, string, int, or double depending on setting type)' },
            reason: { type: 'string', description: 'Optional reason for the change (stored in audit log)' },
          },
          required: ['environmentId', 'settingId', 'value'],
        },
      },
      {
        name: 'list_setting_values',
        description: 'List all feature flag values for every setting in a config for a specific environment.',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'The config ID' },
            environmentId: { type: 'string', description: 'The environment ID' },
          },
          required: ['configId', 'environmentId'],
        },
      },
      // --- SDK Keys ---
      {
        name: 'get_sdk_keys',
        description: 'Retrieve the SDK keys for a specific config and environment pair.',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { type: 'string', description: 'The config ID' },
            environmentId: { type: 'string', description: 'The environment ID' },
          },
          required: ['configId', 'environmentId'],
        },
      },
      // --- Audit Logs ---
      {
        name: 'get_audit_logs',
        description: 'Retrieve audit log entries for a ConfigCat product with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID to retrieve audit logs for' },
            configId: { type: 'string', description: 'Optional: filter by config ID' },
            environmentId: { type: 'string', description: 'Optional: filter by environment ID' },
            startDate: { type: 'string', description: 'Optional: filter from this ISO-8601 date (e.g. 2026-01-01T00:00:00Z)' },
            endDate: { type: 'string', description: 'Optional: filter to this ISO-8601 date' },
          },
          required: ['productId'],
        },
      },
      // --- Organizations ---
      {
        name: 'list_organizations',
        description: 'List all ConfigCat organizations the authenticated user belongs to.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- Me ---
      {
        name: 'get_me',
        description: 'Get details about the currently authenticated ConfigCat user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_products':        return await this.listProducts();
        case 'get_product':          return await this.getProduct(args);
        case 'create_product':       return await this.createProduct(args);
        case 'delete_product':       return await this.deleteProduct(args);
        case 'list_configs':         return await this.listConfigs(args);
        case 'get_config':           return await this.getConfig(args);
        case 'create_config':        return await this.createConfig(args);
        case 'delete_config':        return await this.deleteConfig(args);
        case 'list_environments':    return await this.listEnvironments(args);
        case 'get_environment':      return await this.getEnvironment(args);
        case 'create_environment':   return await this.createEnvironment(args);
        case 'delete_environment':   return await this.deleteEnvironment(args);
        case 'list_settings':        return await this.listSettings(args);
        case 'create_setting':       return await this.createSetting(args);
        case 'get_setting_value':    return await this.getSettingValue(args);
        case 'update_setting_value': return await this.updateSettingValue(args);
        case 'list_setting_values':  return await this.listSettingValues(args);
        case 'get_sdk_keys':         return await this.getSdkKeys(args);
        case 'get_audit_logs':       return await this.getAuditLogs(args);
        case 'list_organizations':   return await this.listOrganizations();
        case 'get_me':               return await this.getMe();
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async listProducts(): Promise<ToolResult> {
    return this.apiGet('/products');
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.productId as string;
    if (!productId) return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
    return this.apiGet(`/products/${encodeURIComponent(productId)}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const { organizationId, name, description } = args;
    if (!organizationId || !name) {
      return { content: [{ type: 'text', text: 'organizationId and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name };
    if (description) body.description = description;
    return this.apiPost(`/organizations/${encodeURIComponent(organizationId as string)}/products`, body);
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.productId as string;
    if (!productId) return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
    return this.apiDelete(`/products/${encodeURIComponent(productId)}`);
  }

  private async listConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.productId as string;
    if (!productId) return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
    return this.apiGet(`/products/${encodeURIComponent(productId)}/configs`);
  }

  private async getConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const configId = args.configId as string;
    if (!configId) return { content: [{ type: 'text', text: 'configId is required' }], isError: true };
    return this.apiGet(`/configs/${encodeURIComponent(configId)}`);
  }

  private async createConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const { productId, name, description } = args;
    if (!productId || !name) {
      return { content: [{ type: 'text', text: 'productId and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name };
    if (description) body.description = description;
    return this.apiPost(`/products/${encodeURIComponent(productId as string)}/configs`, body);
  }

  private async deleteConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const configId = args.configId as string;
    if (!configId) return { content: [{ type: 'text', text: 'configId is required' }], isError: true };
    return this.apiDelete(`/configs/${encodeURIComponent(configId)}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.productId as string;
    if (!productId) return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
    return this.apiGet(`/products/${encodeURIComponent(productId)}/environments`);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environmentId as string;
    if (!environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    return this.apiGet(`/environments/${encodeURIComponent(environmentId)}`);
  }

  private async createEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const { productId, name, description, color } = args;
    if (!productId || !name) {
      return { content: [{ type: 'text', text: 'productId and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name };
    if (description) body.description = description;
    if (color) body.color = color;
    return this.apiPost(`/products/${encodeURIComponent(productId as string)}/environments`, body);
  }

  private async deleteEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environmentId as string;
    if (!environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    return this.apiDelete(`/environments/${encodeURIComponent(environmentId)}`);
  }

  private async listSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const configId = args.configId as string;
    if (!configId) return { content: [{ type: 'text', text: 'configId is required' }], isError: true };
    return this.apiGet(`/configs/${encodeURIComponent(configId)}/settings`);
  }

  private async createSetting(args: Record<string, unknown>): Promise<ToolResult> {
    const { configId, key, name, hint, settingType } = args;
    if (!configId || !key || !name) {
      return { content: [{ type: 'text', text: 'configId, key, and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { key, name };
    if (hint) body.hint = hint;
    if (settingType) body.settingType = settingType;
    return this.apiPost(`/configs/${encodeURIComponent(configId as string)}/settings`, body);
  }

  private async getSettingValue(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environmentId as string;
    const settingId = args.settingId as number;
    if (!environmentId || settingId === undefined) {
      return { content: [{ type: 'text', text: 'environmentId and settingId are required' }], isError: true };
    }
    return this.apiGet(`/environments/${encodeURIComponent(environmentId)}/settings/${settingId}/value`);
  }

  private async updateSettingValue(args: Record<string, unknown>): Promise<ToolResult> {
    const { environmentId, settingId, value, reason } = args;
    if (!environmentId || settingId === undefined || value === undefined) {
      return { content: [{ type: 'text', text: 'environmentId, settingId, and value are required' }], isError: true };
    }
    const operations = [{ op: 'replace', path: '/value', value }];
    const query = reason ? `?reason=${encodeURIComponent(reason as string)}` : '';
    return this.apiPatch(
      `/environments/${encodeURIComponent(environmentId as string)}/settings/${settingId}/value${query}`,
      operations,
    );
  }

  private async listSettingValues(args: Record<string, unknown>): Promise<ToolResult> {
    const { configId, environmentId } = args;
    if (!configId || !environmentId) {
      return { content: [{ type: 'text', text: 'configId and environmentId are required' }], isError: true };
    }
    return this.apiGet(
      `/configs/${encodeURIComponent(configId as string)}/environments/${encodeURIComponent(environmentId as string)}/values`,
    );
  }

  private async getSdkKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const { configId, environmentId } = args;
    if (!configId || !environmentId) {
      return { content: [{ type: 'text', text: 'configId and environmentId are required' }], isError: true };
    }
    return this.apiGet(
      `/configs/${encodeURIComponent(configId as string)}/environments/${encodeURIComponent(environmentId as string)}`,
    );
  }

  private async getAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.productId as string;
    if (!productId) return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.configId) params.set('configId', args.configId as string);
    if (args.environmentId) params.set('environmentId', args.environmentId as string);
    if (args.startDate) params.set('startDate', args.startDate as string);
    if (args.endDate) params.set('endDate', args.endDate as string);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiGet(`/products/${encodeURIComponent(productId)}/auditlogs${query}`);
  }

  private async listOrganizations(): Promise<ToolResult> {
    return this.apiGet('/organizations');
  }

  private async getMe(): Promise<ToolResult> {
    return this.apiGet('/me');
  }

  static catalog() {
    return {
      name: 'configcat',
      displayName: 'ConfigCat',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['configcat', 'feature flags', 'feature toggles', 'devops', 'feature management'],
      toolNames: [
        'list_products', 'get_product', 'create_product', 'delete_product',
        'list_configs', 'get_config', 'create_config', 'delete_config',
        'list_environments', 'get_environment', 'create_environment', 'delete_environment',
        'list_settings', 'create_setting',
        'get_setting_value', 'update_setting_value', 'list_setting_values',
        'get_sdk_keys',
        'get_audit_logs',
        'list_organizations',
        'get_me',
      ],
      description: 'ConfigCat adapter for the Epic AI Intelligence Platform — manage feature flags, configs, environments, and SDK keys',
      author: 'protectnil' as const,
    };
  }
}
