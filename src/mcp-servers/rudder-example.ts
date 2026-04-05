/**
 * Rudder MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Rudder MCP server was found on GitHub or npm as of 2026-03.
//
// Base URL: https://{rudderServer}/rudder/api/latest
// Auth: API key via X-API-Token header
// Docs: https://docs.rudder.io/api/
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RudderConfig {
  /** Rudder API token */
  apiToken: string;
  /** Rudder server hostname (e.g. rudder.example.com) */
  rudderServer: string;
  /** Optional API version override (default: latest) */
  apiVersion?: string;
}

export class RudderExampleMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: RudderConfig) {
    super();
    this.apiToken = config.apiToken;
    const version = config.apiVersion ?? 'latest';
    this.baseUrl = `https://${config.rudderServer}/rudder/api/${version}`;
  }

  static catalog() {
    return {
      name: 'rudder-example',
      displayName: 'Rudder',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'rudder', 'devops', 'configuration', 'compliance', 'infrastructure',
        'nodes', 'rules', 'directives', 'techniques', 'groups',
        'policy', 'automation', 'audit', 'cve', 'security',
      ],
      toolNames: [
        'list_nodes', 'get_node', 'delete_node', 'update_node',
        'list_pending_nodes', 'apply_policy',
        'list_rules', 'create_rule', 'get_rule', 'update_rule', 'delete_rule',
        'list_directives', 'create_directive', 'get_directive', 'update_directive', 'delete_directive',
        'list_groups', 'create_group', 'get_group', 'update_group', 'delete_group',
        'list_techniques', 'get_technique',
        'get_global_compliance', 'get_node_compliance', 'get_rule_compliance',
        'list_parameters', 'create_parameter', 'update_parameter', 'delete_parameter',
        'get_system_info', 'get_system_status', 'get_healthcheck',
        'list_cve', 'get_cve', 'get_last_cve_check',
        'list_secrets', 'create_secret', 'get_secret', 'delete_secret',
        'get_all_settings', 'get_setting', 'set_setting',
      ],
      description: 'Rudder infrastructure automation: manage nodes, rules, directives, groups, techniques, compliance reporting, CVE checks, secrets, and system settings.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Nodes ---
      {
        name: 'list_nodes',
        description: 'List all managed nodes in Rudder with optional filters for status, OS, and property values.',
        inputSchema: {
          type: 'object',
          properties: {
            include: {
              type: 'string',
              description: 'Detail level to include: minimal, default, full (default: default)',
            },
            query: {
              type: 'string',
              description: 'JSON node query to filter nodes by properties, OS, or groups',
            },
          },
        },
      },
      {
        name: 'get_node',
        description: 'Get detailed information about a specific node including properties, OS, and policy server.',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: {
              type: 'string',
              description: 'Node UUID or hostname',
            },
            include: {
              type: 'string',
              description: 'Detail level: minimal, default, full (default: default)',
            },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'delete_node',
        description: 'Delete a node from Rudder, removing it from management and compliance tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: {
              type: 'string',
              description: 'Node UUID to delete',
            },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'update_node',
        description: 'Update node settings, properties, or policy mode for a specific node.',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: {
              type: 'string',
              description: 'Node UUID to update',
            },
            properties: {
              type: 'array',
              description: 'Array of {name, value} property objects to set on the node',
            },
            policyMode: {
              type: 'string',
              description: 'Policy enforcement mode: enforce, audit, or default (uses global setting)',
            },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'list_pending_nodes',
        description: 'List nodes awaiting acceptance into Rudder management.',
        inputSchema: {
          type: 'object',
          properties: {
            include: {
              type: 'string',
              description: 'Detail level: minimal, default, full (default: default)',
            },
          },
        },
      },
      {
        name: 'apply_policy',
        description: 'Trigger an immediate policy agent run on a specific node.',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: {
              type: 'string',
              description: 'Node UUID to trigger policy run on',
            },
          },
          required: ['node_id'],
        },
      },
      // --- Rules ---
      {
        name: 'list_rules',
        description: 'List all Rudder rules with their targets, directives, and enabled status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_rule',
        description: 'Create a new Rudder rule to apply directives to node groups.',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              description: 'Human-readable name for the rule',
            },
            short_description: {
              type: 'string',
              description: 'Brief description of what this rule enforces',
            },
            directives: {
              type: 'array',
              description: 'Array of directive IDs to apply via this rule',
            },
            targets: {
              type: 'array',
              description: 'Array of group targets (include/exclude node groups)',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the rule is enabled (default: true)',
            },
          },
          required: ['display_name'],
        },
      },
      {
        name: 'get_rule',
        description: 'Get details of a specific Rudder rule including directives, targets, and compliance summary.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Rule UUID',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'update_rule',
        description: 'Update an existing Rudder rule — change name, directives, targets, or enabled state.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Rule UUID to update',
            },
            display_name: {
              type: 'string',
              description: 'New name for the rule',
            },
            directives: {
              type: 'array',
              description: 'Updated list of directive IDs',
            },
            targets: {
              type: 'array',
              description: 'Updated list of group targets',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether to enable or disable the rule',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'delete_rule',
        description: 'Delete a Rudder rule and remove it from all policy enforcement.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Rule UUID to delete',
            },
          },
          required: ['rule_id'],
        },
      },
      // --- Directives ---
      {
        name: 'list_directives',
        description: 'List all Rudder directives with their technique, parameters, and enabled status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_directive',
        description: 'Create a new Rudder directive from a technique with specific parameter values.',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              description: 'Human-readable name for the directive',
            },
            technique_name: {
              type: 'string',
              description: 'Name of the technique this directive is based on',
            },
            technique_version: {
              type: 'string',
              description: 'Version of the technique (e.g. 1.0)',
            },
            parameters: {
              type: 'object',
              description: 'Technique parameter values as key-value pairs',
            },
            priority: {
              type: 'number',
              description: 'Directive priority 0-100 (0 = highest, default: 5)',
            },
          },
          required: ['display_name', 'technique_name'],
        },
      },
      {
        name: 'get_directive',
        description: 'Get details of a specific Rudder directive including technique, parameters, and priority.',
        inputSchema: {
          type: 'object',
          properties: {
            directive_id: {
              type: 'string',
              description: 'Directive UUID',
            },
          },
          required: ['directive_id'],
        },
      },
      {
        name: 'update_directive',
        description: 'Update an existing Rudder directive — change parameters, priority, or enabled state.',
        inputSchema: {
          type: 'object',
          properties: {
            directive_id: {
              type: 'string',
              description: 'Directive UUID to update',
            },
            display_name: {
              type: 'string',
              description: 'New name for the directive',
            },
            parameters: {
              type: 'object',
              description: 'Updated technique parameter values',
            },
            priority: {
              type: 'number',
              description: 'New priority 0-100',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether to enable or disable the directive',
            },
          },
          required: ['directive_id'],
        },
      },
      {
        name: 'delete_directive',
        description: 'Delete a Rudder directive. It will be removed from all rules that reference it.',
        inputSchema: {
          type: 'object',
          properties: {
            directive_id: {
              type: 'string',
              description: 'Directive UUID to delete',
            },
          },
          required: ['directive_id'],
        },
      },
      // --- Groups ---
      {
        name: 'list_groups',
        description: 'List all Rudder node groups with their query criteria and member node counts.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_group',
        description: 'Create a new Rudder node group with a dynamic or static query to define membership.',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              description: 'Human-readable name for the group',
            },
            description: {
              type: 'string',
              description: 'Description of the group purpose',
            },
            query: {
              type: 'object',
              description: 'Query object defining node membership criteria',
            },
            dynamic: {
              type: 'boolean',
              description: 'Whether the group membership is dynamic (recalculated on each policy run, default: true)',
            },
          },
          required: ['display_name'],
        },
      },
      {
        name: 'get_group',
        description: 'Get details of a specific Rudder node group including query, members, and dynamic status.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group UUID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'update_group',
        description: 'Update a Rudder node group — change name, query, or dynamic membership setting.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group UUID to update',
            },
            display_name: {
              type: 'string',
              description: 'New name for the group',
            },
            query: {
              type: 'object',
              description: 'Updated query criteria for node membership',
            },
            dynamic: {
              type: 'boolean',
              description: 'Whether the group should be dynamic or static',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a Rudder node group. Rules targeting this group will lose this target.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group UUID to delete',
            },
          },
          required: ['group_id'],
        },
      },
      // --- Techniques ---
      {
        name: 'list_techniques',
        description: 'List all available Rudder techniques with their versions and categories.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_technique',
        description: 'Get metadata, parameters, and resources for a specific Rudder technique version.',
        inputSchema: {
          type: 'object',
          properties: {
            technique_id: {
              type: 'string',
              description: 'Technique name/ID (e.g. userManagement)',
            },
            technique_version: {
              type: 'string',
              description: 'Technique version (e.g. 1.0)',
            },
          },
          required: ['technique_id', 'technique_version'],
        },
      },
      // --- Compliance ---
      {
        name: 'get_global_compliance',
        description: 'Get the overall global compliance percentage across all nodes, rules, and directives.',
        inputSchema: {
          type: 'object',
          properties: {
            precision: {
              type: 'number',
              description: 'Number of decimal places in compliance percentages (default: 2)',
            },
          },
        },
      },
      {
        name: 'get_node_compliance',
        description: 'Get compliance details for a specific node showing rule and directive compliance status.',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: {
              type: 'string',
              description: 'Node UUID to get compliance for',
            },
            level: {
              type: 'number',
              description: 'Depth of compliance details: 1-5 (default: 1)',
            },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'get_rule_compliance',
        description: 'Get compliance details for a specific rule across all targeted nodes.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Rule UUID to get compliance for',
            },
            level: {
              type: 'number',
              description: 'Depth of compliance details: 1-5 (default: 1)',
            },
          },
          required: ['rule_id'],
        },
      },
      // --- Parameters ---
      {
        name: 'list_parameters',
        description: 'List all global properties (parameters) available to all Rudder policies.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_parameter',
        description: 'Create a new global property in Rudder available to all techniques and directives.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier/name for the parameter',
            },
            value: {
              type: 'string',
              description: 'Value of the global parameter',
            },
            description: {
              type: 'string',
              description: 'Optional description of the parameter purpose',
            },
          },
          required: ['id', 'value'],
        },
      },
      {
        name: 'update_parameter',
        description: 'Update the value or description of an existing global Rudder parameter.',
        inputSchema: {
          type: 'object',
          properties: {
            parameter_id: {
              type: 'string',
              description: 'Parameter ID to update',
            },
            value: {
              type: 'string',
              description: 'New value for the parameter',
            },
            description: {
              type: 'string',
              description: 'New description for the parameter',
            },
          },
          required: ['parameter_id'],
        },
      },
      {
        name: 'delete_parameter',
        description: 'Delete a global Rudder parameter. Techniques referencing it will receive an empty value.',
        inputSchema: {
          type: 'object',
          properties: {
            parameter_id: {
              type: 'string',
              description: 'Parameter ID to delete',
            },
          },
          required: ['parameter_id'],
        },
      },
      // --- System ---
      {
        name: 'get_system_info',
        description: 'Get Rudder server information including version, build date, and enabled features.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_system_status',
        description: 'Get the current operational status of the Rudder server and its components.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_healthcheck',
        description: 'Get a health check report for all Rudder server components and subsystems.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- CVE ---
      {
        name: 'list_cve',
        description: 'List all CVE records known to Rudder, including scores and affected software.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_cve',
        description: 'Get details of a specific CVE by ID including CVSS score, description, and affected packages.',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: {
              type: 'string',
              description: 'CVE identifier (e.g. CVE-2024-12345)',
            },
          },
          required: ['cve_id'],
        },
      },
      {
        name: 'get_last_cve_check',
        description: 'Get the result of the last CVE check including affected nodes and packages with vulnerabilities.',
        inputSchema: {
          type: 'object',
          properties: {
            min_score: {
              type: 'number',
              description: 'Minimum CVSS score to include (0.0-10.0)',
            },
            max_score: {
              type: 'number',
              description: 'Maximum CVSS score to include (0.0-10.0)',
            },
            node_id: {
              type: 'string',
              description: 'Filter results to a specific node UUID',
            },
            package_name: {
              type: 'string',
              description: 'Filter results to a specific package name',
            },
          },
        },
      },
      // --- Secrets ---
      {
        name: 'list_secrets',
        description: 'List all secret names stored in Rudder (values are never returned, only names and descriptions).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_secret',
        description: 'Create a new secret in Rudder for use in techniques and directives.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the secret',
            },
            value: {
              type: 'string',
              description: 'Secret value (stored encrypted, never returned in API responses)',
            },
            description: {
              type: 'string',
              description: 'Optional description of what this secret is used for',
            },
          },
          required: ['name', 'value'],
        },
      },
      {
        name: 'get_secret',
        description: 'Get metadata for a specific Rudder secret (name and description only — value is not returned).',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the secret to retrieve',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Delete a secret from Rudder. Techniques referencing this secret will fail until updated.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the secret to delete',
            },
          },
          required: ['name'],
        },
      },
      // --- Settings ---
      {
        name: 'get_all_settings',
        description: 'Get all Rudder global settings including policy mode, compliance, and agent run schedules.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_setting',
        description: 'Get the current value of a specific Rudder global setting by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            setting_id: {
              type: 'string',
              description: 'Setting identifier (e.g. global_policy_mode, run_frequency)',
            },
          },
          required: ['setting_id'],
        },
      },
      {
        name: 'set_setting',
        description: 'Update the value of a specific Rudder global setting.',
        inputSchema: {
          type: 'object',
          properties: {
            setting_id: {
              type: 'string',
              description: 'Setting identifier to update',
            },
            value: {
              type: 'string',
              description: 'New value for the setting',
            },
          },
          required: ['setting_id', 'value'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_nodes': return await this.listNodes(args);
        case 'get_node': return await this.getNode(args);
        case 'delete_node': return await this.deleteNode(args);
        case 'update_node': return await this.updateNode(args);
        case 'list_pending_nodes': return await this.listPendingNodes(args);
        case 'apply_policy': return await this.applyPolicy(args);
        case 'list_rules': return await this.listRules();
        case 'create_rule': return await this.createRule(args);
        case 'get_rule': return await this.getRule(args);
        case 'update_rule': return await this.updateRule(args);
        case 'delete_rule': return await this.deleteRule(args);
        case 'list_directives': return await this.listDirectives();
        case 'create_directive': return await this.createDirective(args);
        case 'get_directive': return await this.getDirective(args);
        case 'update_directive': return await this.updateDirective(args);
        case 'delete_directive': return await this.deleteDirective(args);
        case 'list_groups': return await this.listGroups();
        case 'create_group': return await this.createGroup(args);
        case 'get_group': return await this.getGroup(args);
        case 'update_group': return await this.updateGroup(args);
        case 'delete_group': return await this.deleteGroup(args);
        case 'list_techniques': return await this.listTechniques();
        case 'get_technique': return await this.getTechnique(args);
        case 'get_global_compliance': return await this.getGlobalCompliance(args);
        case 'get_node_compliance': return await this.getNodeCompliance(args);
        case 'get_rule_compliance': return await this.getRuleCompliance(args);
        case 'list_parameters': return await this.listParameters();
        case 'create_parameter': return await this.createParameter(args);
        case 'update_parameter': return await this.updateParameter(args);
        case 'delete_parameter': return await this.deleteParameter(args);
        case 'get_system_info': return await this.getSystemInfo();
        case 'get_system_status': return await this.getSystemStatus();
        case 'get_healthcheck': return await this.getHealthcheck();
        case 'list_cve': return await this.listCve();
        case 'get_cve': return await this.getCve(args);
        case 'get_last_cve_check': return await this.getLastCveCheck(args);
        case 'list_secrets': return await this.listSecrets();
        case 'create_secret': return await this.createSecret(args);
        case 'get_secret': return await this.getSecret(args);
        case 'delete_secret': return await this.deleteSecret(args);
        case 'get_all_settings': return await this.getAllSettings();
        case 'get_setting': return await this.getSetting(args);
        case 'set_setting': return await this.setSetting(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-API-Token': this.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async listNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const include = (args.include as string) ?? 'default';
    const params = new URLSearchParams({ include });
    if (args.query) params.set('where', args.query as string);
    return this.request('GET', `/nodes?${params}`);
  }

  private async getNode(args: Record<string, unknown>): Promise<ToolResult> {
    const include = (args.include as string) ?? 'default';
    return this.request('GET', `/nodes/${args.node_id}?include=${include}`);
  }

  private async deleteNode(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/nodes/${args.node_id}`);
  }

  private async updateNode(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.properties !== undefined) body.properties = args.properties;
    if (args.policyMode !== undefined) body.policyMode = args.policyMode;
    return this.request('POST', `/nodes/${args.node_id}`, body);
  }

  private async listPendingNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const include = (args.include as string) ?? 'default';
    return this.request('GET', `/nodes/pending?include=${include}`);
  }

  private async applyPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/nodes/${args.node_id}/applyPolicy`);
  }

  private async listRules(): Promise<ToolResult> {
    return this.request('GET', '/rules');
  }

  private async createRule(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { displayName: args.display_name };
    if (args.short_description !== undefined) body.shortDescription = args.short_description;
    if (args.directives !== undefined) body.directives = args.directives;
    if (args.targets !== undefined) body.targets = args.targets;
    if (args.enabled !== undefined) body.enabled = args.enabled;
    return this.request('PUT', '/rules', body);
  }

  private async getRule(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/rules/${args.rule_id}`);
  }

  private async updateRule(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.display_name !== undefined) body.displayName = args.display_name;
    if (args.directives !== undefined) body.directives = args.directives;
    if (args.targets !== undefined) body.targets = args.targets;
    if (args.enabled !== undefined) body.enabled = args.enabled;
    return this.request('POST', `/rules/${args.rule_id}`, body);
  }

  private async deleteRule(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/rules/${args.rule_id}`);
  }

  private async listDirectives(): Promise<ToolResult> {
    return this.request('GET', '/directives');
  }

  private async createDirective(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      displayName: args.display_name,
      techniqueName: args.technique_name,
    };
    if (args.technique_version !== undefined) body.techniqueVersion = args.technique_version;
    if (args.parameters !== undefined) body.parameters = args.parameters;
    if (args.priority !== undefined) body.priority = args.priority;
    return this.request('PUT', '/directives', body);
  }

  private async getDirective(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/directives/${args.directive_id}`);
  }

  private async updateDirective(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.display_name !== undefined) body.displayName = args.display_name;
    if (args.parameters !== undefined) body.parameters = args.parameters;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.enabled !== undefined) body.enabled = args.enabled;
    return this.request('POST', `/directives/${args.directive_id}`, body);
  }

  private async deleteDirective(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/directives/${args.directive_id}`);
  }

  private async listGroups(): Promise<ToolResult> {
    return this.request('GET', '/groups');
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { displayName: args.display_name };
    if (args.description !== undefined) body.description = args.description;
    if (args.query !== undefined) body.query = args.query;
    if (args.dynamic !== undefined) body.dynamic = args.dynamic;
    return this.request('PUT', '/groups', body);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/groups/${args.group_id}`);
  }

  private async updateGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.display_name !== undefined) body.displayName = args.display_name;
    if (args.query !== undefined) body.query = args.query;
    if (args.dynamic !== undefined) body.dynamic = args.dynamic;
    return this.request('POST', `/groups/${args.group_id}`, body);
  }

  private async deleteGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/groups/${args.group_id}`);
  }

  private async listTechniques(): Promise<ToolResult> {
    return this.request('GET', '/techniques');
  }

  private async getTechnique(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/techniques/${args.technique_id}/${args.technique_version}`);
  }

  private async getGlobalCompliance(args: Record<string, unknown>): Promise<ToolResult> {
    const precision = (args.precision as number) ?? 2;
    return this.request('GET', `/compliance?precision=${precision}`);
  }

  private async getNodeCompliance(args: Record<string, unknown>): Promise<ToolResult> {
    const level = (args.level as number) ?? 1;
    return this.request('GET', `/compliance/nodes/${args.node_id}?level=${level}`);
  }

  private async getRuleCompliance(args: Record<string, unknown>): Promise<ToolResult> {
    const level = (args.level as number) ?? 1;
    return this.request('GET', `/compliance/rules/${args.rule_id}?level=${level}`);
  }

  private async listParameters(): Promise<ToolResult> {
    return this.request('GET', '/parameters');
  }

  private async createParameter(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { id: args.id, value: args.value };
    if (args.description !== undefined) body.description = args.description;
    return this.request('PUT', '/parameters', body);
  }

  private async updateParameter(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.value !== undefined) body.value = args.value;
    if (args.description !== undefined) body.description = args.description;
    return this.request('POST', `/parameters/${args.parameter_id}`, body);
  }

  private async deleteParameter(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/parameters/${args.parameter_id}`);
  }

  private async getSystemInfo(): Promise<ToolResult> {
    return this.request('GET', '/system/info');
  }

  private async getSystemStatus(): Promise<ToolResult> {
    return this.request('GET', '/system/status');
  }

  private async getHealthcheck(): Promise<ToolResult> {
    return this.request('GET', '/system/healthcheck');
  }

  private async listCve(): Promise<ToolResult> {
    return this.request('GET', '/cve');
  }

  private async getCve(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/cve/${args.cve_id}`);
  }

  private async getLastCveCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.min_score !== undefined) params.set('minScore', String(args.min_score));
    if (args.max_score !== undefined) params.set('maxScore', String(args.max_score));
    if (args.node_id !== undefined) params.set('nodeId', args.node_id as string);
    if (args.package_name !== undefined) params.set('package', args.package_name as string);
    const query = params.toString();
    return this.request('GET', `/cve/check/last${query ? '?' + query : ''}`);
  }

  private async listSecrets(): Promise<ToolResult> {
    return this.request('GET', '/secret');
  }

  private async createSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, value: args.value };
    if (args.description !== undefined) body.description = args.description;
    return this.request('PUT', '/secret', body);
  }

  private async getSecret(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/secret/${args.name}`);
  }

  private async deleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/secret/${args.name}`);
  }

  private async getAllSettings(): Promise<ToolResult> {
    return this.request('GET', '/settings');
  }

  private async getSetting(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/settings/${args.setting_id}`);
  }

  private async setSetting(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/settings/${args.setting_id}`, { value: args.value });
  }
}
