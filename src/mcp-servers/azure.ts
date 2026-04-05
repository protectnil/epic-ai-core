/**
 * Microsoft Azure MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/mcp (Azure.Mcp.Server) — transport: stdio/streamable-HTTP, auth: Entra ID
// The Azure MCP Server 1.0 (GA) covers 40+ Azure services including Storage, Cosmos DB, App Service,
// Monitor, Key Vault, and more. The original Azure/azure-mcp repo was archived 2025-08-25;
// development continues at microsoft/mcp.
// Our adapter covers: 18 tools (Resource Manager operations — subscriptions, resource groups, VMs,
// storage, networking, deployments, policies, and role assignments). Vendor MCP covers: 40+ tools
// across a broader set of services.
// Recommendation: Use microsoft/mcp (Azure.Mcp.Server) for full Azure service coverage.
// Use this adapter for air-gapped deployments or operations scoped to Azure Resource Manager.
//
// Base URL: https://management.azure.com
// Auth: Azure AD Bearer token (Entra ID client credentials flow or az account get-access-token).
//       Tokens expire after ~1 hour. Re-instantiate with a fresh token on expiry.
// Docs: https://learn.microsoft.com/en-us/rest/api/azure/
// Rate limits: ~12,000 req/hour per subscription for read operations; write limits vary by resource type

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AzureConfig {
  /**
   * Azure AD OAuth2 Bearer token for management.azure.com.
   * Obtain via: az account get-access-token --resource https://management.azure.com
   * or via client credentials flow with scope https://management.azure.com/.default
   */
  accessToken: string;
  subscriptionId?: string;
}

const BASE = 'https://management.azure.com';
const RM_API = '2022-09-01';
const COMPUTE_API = '2023-07-01';
const NETWORK_API = '2023-11-01';
const STORAGE_API = '2023-05-01';
const POLICY_API = '2023-04-01';
const AUTHZ_API = '2022-04-01';

function truncate(text: string): string {
  return text.length > 10_000
    ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
    : text;
}

export class AzureMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly subscriptionId: string;

  constructor(config: AzureConfig) {
    super();
    this.accessToken = config.accessToken;
    this.subscriptionId = config.subscriptionId ?? '';
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private subId(args: Record<string, unknown>): string {
    return (args.subscriptionId as string) || this.subscriptionId;
  }

  static catalog() {
    return {
      name: 'azure',
      displayName: 'Microsoft Azure',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['azure', 'microsoft', 'arm', 'resource manager', 'vm', 'virtual machine', 'storage', 'network', 'deployment', 'subscription', 'resource group', 'cloud'],
      toolNames: [
        'list_subscriptions', 'list_resource_groups', 'create_resource_group', 'delete_resource_group',
        'list_resources', 'get_resource', 'delete_resource',
        'list_virtual_machines', 'get_virtual_machine', 'start_virtual_machine', 'stop_virtual_machine',
        'list_storage_accounts', 'list_virtual_networks',
        'list_deployments', 'get_deployment', 'validate_deployment',
        'list_policy_assignments', 'list_role_assignments',
      ],
      description: 'Azure Resource Manager operations: subscriptions, resource groups, VMs, storage, networking, deployments, policies, and role assignments.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Subscriptions ────────────────────────────────────────────────────
      {
        name: 'list_subscriptions',
        description: 'List all Azure subscriptions accessible with the provided token.',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Resource Groups ──────────────────────────────────────────────────
      {
        name: 'list_resource_groups',
        description: 'List resource groups within a subscription with optional tag filter.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            filter: { type: 'string', description: 'OData filter expression, e.g. tagName eq \'env\' and tagValue eq \'prod\'' },
            top: { type: 'number', description: 'Maximum number of resource groups to return' },
          },
        },
      },
      {
        name: 'create_resource_group',
        description: 'Create or update an Azure resource group in a specific location.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Name of the resource group to create' },
            location: { type: 'string', description: 'Azure region, e.g. eastus, westeurope, australiaeast' },
            tags: { type: 'object', description: 'Key-value tag pairs to apply to the resource group' },
          },
          required: ['resourceGroupName', 'location'],
        },
      },
      {
        name: 'delete_resource_group',
        description: 'Delete an Azure resource group and all resources within it. This operation cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Name of the resource group to delete' },
          },
          required: ['resourceGroupName'],
        },
      },
      // ── Generic Resources ────────────────────────────────────────────────
      {
        name: 'list_resources',
        description: 'List all resources within a resource group with optional type filter.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
            filter: { type: 'string', description: 'OData filter, e.g. resourceType eq \'Microsoft.Compute/virtualMachines\'' },
            top: { type: 'number', description: 'Maximum number of resources to return' },
          },
          required: ['resourceGroupName'],
        },
      },
      {
        name: 'get_resource',
        description: 'Get details of a specific Azure resource by its full resource ID path.',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: { type: 'string', description: 'Full Azure resource ID, e.g. /subscriptions/{subId}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{name}' },
            apiVersion: { type: 'string', description: 'API version for the resource provider (e.g. 2023-07-01 for VMs). Defaults to 2022-09-01.' },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'delete_resource',
        description: 'Delete a specific Azure resource by its full resource ID. This operation cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: { type: 'string', description: 'Full Azure resource ID path' },
            apiVersion: { type: 'string', description: 'API version for the resource provider' },
          },
          required: ['resourceId'],
        },
      },
      // ── Virtual Machines ─────────────────────────────────────────────────
      {
        name: 'list_virtual_machines',
        description: 'List Azure virtual machines in a resource group with power state and size details.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
          },
          required: ['resourceGroupName'],
        },
      },
      {
        name: 'get_virtual_machine',
        description: 'Get full configuration details for a specific Azure virtual machine.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
            vmName: { type: 'string', description: 'Virtual machine name' },
            expand: { type: 'string', description: 'Expand instanceView to include runtime status and extension details (default: none)' },
          },
          required: ['resourceGroupName', 'vmName'],
        },
      },
      {
        name: 'start_virtual_machine',
        description: 'Start a stopped Azure virtual machine.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
            vmName: { type: 'string', description: 'Virtual machine name' },
          },
          required: ['resourceGroupName', 'vmName'],
        },
      },
      {
        name: 'stop_virtual_machine',
        description: 'Stop (deallocate) an Azure virtual machine to stop billing for compute.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
            vmName: { type: 'string', description: 'Virtual machine name' },
          },
          required: ['resourceGroupName', 'vmName'],
        },
      },
      // ── Storage ──────────────────────────────────────────────────────────
      {
        name: 'list_storage_accounts',
        description: 'List Azure Storage accounts within a resource group or subscription.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Limit results to a specific resource group (optional)' },
          },
        },
      },
      // ── Networking ───────────────────────────────────────────────────────
      {
        name: 'list_virtual_networks',
        description: 'List Azure Virtual Networks in a resource group or subscription.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Limit results to a specific resource group (optional)' },
          },
        },
      },
      // ── Deployments ──────────────────────────────────────────────────────
      {
        name: 'list_deployments',
        description: 'List ARM template deployments within a resource group with status and timestamp.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
            filter: { type: 'string', description: 'OData filter, e.g. provisioningState eq \'Failed\'' },
            top: { type: 'number', description: 'Maximum number of deployments to return' },
          },
          required: ['resourceGroupName'],
        },
      },
      {
        name: 'get_deployment',
        description: 'Get details and provisioning status for a specific ARM deployment.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
            deploymentName: { type: 'string', description: 'Deployment name' },
          },
          required: ['resourceGroupName', 'deploymentName'],
        },
      },
      {
        name: 'validate_deployment',
        description: 'Validate an ARM template deployment without actually deploying resources.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Resource group name' },
            deploymentName: { type: 'string', description: 'Deployment name for the validation' },
            template: { type: 'object', description: 'ARM template JSON object' },
            parameters: { type: 'object', description: 'Template parameters object' },
          },
          required: ['resourceGroupName', 'deploymentName', 'template'],
        },
      },
      // ── Policy ───────────────────────────────────────────────────────────
      {
        name: 'list_policy_assignments',
        description: 'List Azure Policy assignments at a subscription or resource group scope.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Scope to a specific resource group (optional)' },
            filter: { type: 'string', description: 'OData filter, e.g. policyDefinitionId eq \'/providers/Microsoft.Authorization/policyDefinitions/{id}\'' },
          },
        },
      },
      // ── Role Assignments ─────────────────────────────────────────────────
      {
        name: 'list_role_assignments',
        description: 'List Azure RBAC role assignments at a subscription or resource group scope.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', description: 'Azure subscription ID (overrides config)' },
            resourceGroupName: { type: 'string', description: 'Scope to a specific resource group (optional)' },
            filter: { type: 'string', description: 'OData filter, e.g. assignedTo(\'{principalId}\') or atScope()' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_subscriptions':      return this.listSubscriptions();
        case 'list_resource_groups':    return this.listResourceGroups(args);
        case 'create_resource_group':   return this.createResourceGroup(args);
        case 'delete_resource_group':   return this.deleteResourceGroup(args);
        case 'list_resources':          return this.listResources(args);
        case 'get_resource':            return this.getResource(args);
        case 'delete_resource':         return this.deleteResource(args);
        case 'list_virtual_machines':   return this.listVirtualMachines(args);
        case 'get_virtual_machine':     return this.getVirtualMachine(args);
        case 'start_virtual_machine':   return this.startVirtualMachine(args);
        case 'stop_virtual_machine':    return this.stopVirtualMachine(args);
        case 'list_storage_accounts':   return this.listStorageAccounts(args);
        case 'list_virtual_networks':   return this.listVirtualNetworks(args);
        case 'list_deployments':        return this.listDeployments(args);
        case 'get_deployment':          return this.getDeployment(args);
        case 'validate_deployment':     return this.validateDeployment(args);
        case 'list_policy_assignments': return this.listPolicyAssignments(args);
        case 'list_role_assignments':   return this.listRoleAssignments(args);
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async fetchJSON(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers(), ...options });
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return {
      content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  private async listSubscriptions(): Promise<ToolResult> {
    return this.fetchJSON(`${BASE}/subscriptions?api-version=2022-09-01`);
  }

  // ── Resource Groups ───────────────────────────────────────────────────────

  private async listResourceGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    let url = `${BASE}/subscriptions/${sub}/resourcegroups?api-version=${RM_API}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(String(args.filter))}`;
    if (args.top) url += `&$top=${encodeURIComponent(args.top as string)}`;
    return this.fetchJSON(url);
  }

  private async createResourceGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    const url = `${BASE}/subscriptions/${sub}/resourcegroups/${rg}?api-version=${RM_API}`;
    const body: Record<string, unknown> = { location: String(args.location) };
    if (args.tags) body.tags = args.tags;
    return this.fetchJSON(url, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async deleteResourceGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    const url = `${BASE}/subscriptions/${sub}/resourcegroups/${rg}?api-version=${RM_API}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { data = await response.text(); }
      return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: true };
    }
    return { content: [{ type: 'text', text: `Resource group ${encodeURIComponent(args.resourceGroupName as string)} deletion accepted (HTTP ${response.status}).` }], isError: false };
  }

  // ── Resources ─────────────────────────────────────────────────────────────

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    let url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/resources?api-version=${RM_API}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(String(args.filter))}`;
    if (args.top) url += `&$top=${encodeURIComponent(args.top as string)}`;
    return this.fetchJSON(url);
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    const apiVer = (args.apiVersion as string) || RM_API;
    const resourceId = String(args.resourceId).replace(/^\//, '');
    return this.fetchJSON(`${BASE}/${resourceId}?api-version=${apiVer}`);
  }

  private async deleteResource(args: Record<string, unknown>): Promise<ToolResult> {
    const apiVer = (args.apiVersion as string) || RM_API;
    const resourceId = String(args.resourceId).replace(/^\//, '');
    const url = `${BASE}/${resourceId}?api-version=${apiVer}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { data = await response.text(); }
      return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: true };
    }
    return { content: [{ type: 'text', text: `Resource deletion accepted (HTTP ${response.status}).` }], isError: false };
  }

  // ── Virtual Machines ──────────────────────────────────────────────────────

  private async listVirtualMachines(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    return this.fetchJSON(`${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines?api-version=${COMPUTE_API}`);
  }

  private async getVirtualMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    const vmName = encodeURIComponent(String(args.vmName));
    let url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${vmName}?api-version=${COMPUTE_API}`;
    if (args.expand) url += `&$expand=${encodeURIComponent(String(args.expand))}`;
    return this.fetchJSON(url);
  }

  private async startVirtualMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    const vmName = encodeURIComponent(String(args.vmName));
    const url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${vmName}/start?api-version=${COMPUTE_API}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers(), body: '{}' });
    if (!response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { data = await response.text(); }
      return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: true };
    }
    return { content: [{ type: 'text', text: `Start operation accepted for ${String(args.vmName)} (HTTP ${response.status}).` }], isError: false };
  }

  private async stopVirtualMachine(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    const vmName = encodeURIComponent(String(args.vmName));
    const url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${vmName}/deallocate?api-version=${COMPUTE_API}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers(), body: '{}' });
    if (!response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { data = await response.text(); }
      return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: true };
    }
    return { content: [{ type: 'text', text: `Deallocate (stop) operation accepted for ${String(args.vmName)} (HTTP ${response.status}).` }], isError: false };
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  private async listStorageAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    if (args.resourceGroupName) {
      const rg = encodeURIComponent(String(args.resourceGroupName));
      return this.fetchJSON(`${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Storage/storageAccounts?api-version=${STORAGE_API}`);
    }
    return this.fetchJSON(`${BASE}/subscriptions/${sub}/providers/Microsoft.Storage/storageAccounts?api-version=${STORAGE_API}`);
  }

  // ── Networking ────────────────────────────────────────────────────────────

  private async listVirtualNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    if (args.resourceGroupName) {
      const rg = encodeURIComponent(String(args.resourceGroupName));
      return this.fetchJSON(`${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Network/virtualNetworks?api-version=${NETWORK_API}`);
    }
    return this.fetchJSON(`${BASE}/subscriptions/${sub}/providers/Microsoft.Network/virtualNetworks?api-version=${NETWORK_API}`);
  }

  // ── Deployments ───────────────────────────────────────────────────────────

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    let url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Resources/deployments?api-version=${RM_API}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(String(args.filter))}`;
    if (args.top) url += `&$top=${encodeURIComponent(args.top as string)}`;
    return this.fetchJSON(url);
  }

  private async getDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    const dep = encodeURIComponent(String(args.deploymentName));
    return this.fetchJSON(`${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Resources/deployments/${dep}?api-version=${RM_API}`);
  }

  private async validateDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    const rg = encodeURIComponent(String(args.resourceGroupName));
    const dep = encodeURIComponent(String(args.deploymentName));
    const url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Resources/deployments/${dep}/validate?api-version=${RM_API}`;
    const body: Record<string, unknown> = {
      properties: {
        mode: 'Incremental',
        template: args.template,
      },
    };
    if (args.parameters) (body.properties as Record<string, unknown>).parameters = args.parameters;
    return this.fetchJSON(url, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Policy ────────────────────────────────────────────────────────────────

  private async listPolicyAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    let url: string;
    if (args.resourceGroupName) {
      const rg = encodeURIComponent(String(args.resourceGroupName));
      url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Authorization/policyAssignments?api-version=${POLICY_API}`;
    } else {
      url = `${BASE}/subscriptions/${sub}/providers/Microsoft.Authorization/policyAssignments?api-version=${POLICY_API}`;
    }
    if (args.filter) url += `&$filter=${encodeURIComponent(String(args.filter))}`;
    return this.fetchJSON(url);
  }

  // ── Role Assignments ──────────────────────────────────────────────────────

  private async listRoleAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    const sub = encodeURIComponent(this.subId(args));
    let url: string;
    if (args.resourceGroupName) {
      const rg = encodeURIComponent(String(args.resourceGroupName));
      url = `${BASE}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Authorization/roleAssignments?api-version=${AUTHZ_API}`;
    } else {
      url = `${BASE}/subscriptions/${sub}/providers/Microsoft.Authorization/roleAssignments?api-version=${AUTHZ_API}`;
    }
    if (args.filter) url += `&$filter=${encodeURIComponent(String(args.filter))}`;
    return this.fetchJSON(url);
  }
}
