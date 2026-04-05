/**
 * VMware vRealize Network Insight (vRNI) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official VMware vRNI MCP server was found on GitHub. We build a full REST wrapper
// for complete vRNI API coverage.
//
// Base URL: https://{vrni-host}/api/ni
// Auth: Token-based — POST /auth/token to obtain token, then include as:
//       Authorization: NetworkInsight {token}
// Docs: https://vdc-download.vmware.com/vmwb-repository/dcr-public/
// Spec: https://api.apis.guru/v2/specs/vmware.local/vrni/1.0.0/openapi.json
// Category: cloud
// Rate limits: Not documented — standard VMware API throttling applies

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VrniConfig {
  baseUrl: string;
  token?: string;
  username?: string;
  password?: string;
  domain?: string;
}

export class VmwareVrniMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private token: string;

  constructor(config: VrniConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token || '';
  }

  static catalog() {
    return {
      name: 'vmware-vrni',
      displayName: 'VMware vRealize Network Insight',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'vmware', 'vrni', 'vrealize', 'network insight', 'nsx', 'vsphere',
        'vcenter', 'micro-segmentation', 'microsegmentation', 'firewall',
        'network flow', 'flow analysis', 'security group', 'virtual machine',
        'vm', 'vnic', 'portgroup', 'distributed switch', 'dvs', 'vds',
        'data source', 'infrastructure', 'application', 'tier',
        'network topology', 'cisco', 'juniper', 'arista', 'brocade',
        'checkpoint', 'panorama', 'palo alto', 'ucs', 'recommended rules',
        'network visibility', 'cloud network',
      ],
      toolNames: [
        'create_auth_token',
        'delete_auth_token',
        'get_version',
        'search_entities',
        'get_entity_names',
        'get_entity_name',
        'list_data_sources_vcenter',
        'add_data_source_vcenter',
        'get_data_source_vcenter',
        'update_data_source_vcenter',
        'delete_data_source_vcenter',
        'enable_data_source_vcenter',
        'disable_data_source_vcenter',
        'list_data_sources_nsxv',
        'add_data_source_nsxv',
        'get_data_source_nsxv',
        'update_data_source_nsxv',
        'delete_data_source_nsxv',
        'enable_data_source_nsxv',
        'disable_data_source_nsxv',
        'list_data_sources_cisco_switches',
        'add_data_source_cisco_switch',
        'get_data_source_cisco_switch',
        'update_data_source_cisco_switch',
        'delete_data_source_cisco_switch',
        'enable_data_source_cisco_switch',
        'disable_data_source_cisco_switch',
        'list_data_sources_arista_switches',
        'add_data_source_arista_switch',
        'get_data_source_arista_switch',
        'update_data_source_arista_switch',
        'delete_data_source_arista_switch',
        'enable_data_source_arista_switch',
        'disable_data_source_arista_switch',
        'list_data_sources_juniper_switches',
        'add_data_source_juniper_switch',
        'get_data_source_juniper_switch',
        'update_data_source_juniper_switch',
        'delete_data_source_juniper_switch',
        'enable_data_source_juniper_switch',
        'disable_data_source_juniper_switch',
        'list_data_sources_brocade_switches',
        'add_data_source_brocade_switch',
        'get_data_source_brocade_switch',
        'update_data_source_brocade_switch',
        'delete_data_source_brocade_switch',
        'enable_data_source_brocade_switch',
        'disable_data_source_brocade_switch',
        'list_data_sources_dell_switches',
        'add_data_source_dell_switch',
        'get_data_source_dell_switch',
        'update_data_source_dell_switch',
        'delete_data_source_dell_switch',
        'enable_data_source_dell_switch',
        'disable_data_source_dell_switch',
        'list_data_sources_checkpoint_firewalls',
        'add_data_source_checkpoint_firewall',
        'get_data_source_checkpoint_firewall',
        'update_data_source_checkpoint_firewall',
        'delete_data_source_checkpoint_firewall',
        'enable_data_source_checkpoint_firewall',
        'disable_data_source_checkpoint_firewall',
        'list_data_sources_panorama_firewalls',
        'add_data_source_panorama_firewall',
        'get_data_source_panorama_firewall',
        'update_data_source_panorama_firewall',
        'delete_data_source_panorama_firewall',
        'enable_data_source_panorama_firewall',
        'disable_data_source_panorama_firewall',
        'list_data_sources_ucs_managers',
        'add_data_source_ucs_manager',
        'get_data_source_ucs_manager',
        'update_data_source_ucs_manager',
        'delete_data_source_ucs_manager',
        'enable_data_source_ucs_manager',
        'disable_data_source_ucs_manager',
        'list_data_sources_hpov_managers',
        'add_data_source_hpov_manager',
        'get_data_source_hpov_manager',
        'update_data_source_hpov_manager',
        'delete_data_source_hpov_manager',
        'enable_data_source_hpov_manager',
        'disable_data_source_hpov_manager',
        'list_data_sources_hpvc_managers',
        'add_data_source_hpvc_manager',
        'get_data_source_hpvc_manager',
        'update_data_source_hpvc_manager',
        'delete_data_source_hpvc_manager',
        'enable_data_source_hpvc_manager',
        'disable_data_source_hpvc_manager',
        'list_vms',
        'get_vm',
        'list_hosts',
        'get_host',
        'list_clusters',
        'get_cluster',
        'list_datastores',
        'get_datastore',
        'list_flows',
        'get_flow',
        'list_firewall_rules',
        'get_firewall_rule',
        'list_firewalls',
        'get_firewall',
        'list_security_groups',
        'get_security_group',
        'list_security_tags',
        'get_security_tag',
        'list_services',
        'get_service',
        'list_service_groups',
        'get_service_group',
        'list_ip_sets',
        'get_ip_set',
        'list_distributed_virtual_switches',
        'get_distributed_virtual_switch',
        'list_distributed_virtual_portgroups',
        'get_distributed_virtual_portgroup',
        'list_layer2_networks',
        'get_layer2_network',
        'list_vnics',
        'get_vnic',
        'list_vmknics',
        'get_vmknic',
        'list_nsx_managers',
        'get_nsx_manager',
        'list_vcenter_managers',
        'get_vcenter_manager',
        'list_datacenters',
        'get_datacenter',
        'list_folders',
        'get_folder',
        'list_problems',
        'get_problem',
        'list_infra_nodes',
        'get_infra_node',
        'list_applications',
        'add_application',
        'get_application',
        'delete_application',
        'list_application_tiers',
        'add_application_tier',
        'get_application_tier',
        'delete_application_tier',
        'get_tier',
        'get_recommended_rules',
        'export_nsx_recommended_rules',
      ],
      description: 'VMware vRealize Network Insight: manage data sources, query network entities (VMs, hosts, flows, firewalls, security groups), manage applications and tiers, and generate micro-segmentation recommended rules.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Authentication ─────────────────────────────────────────────────────
      {
        name: 'create_auth_token',
        description: 'Authenticate with vRealize Network Insight and obtain a bearer token. The token must be included in subsequent requests as: Authorization: NetworkInsight {token}',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'vRNI username' },
            password: { type: 'string', description: 'vRNI password' },
            domain: {
              type: 'object',
              description: 'Authentication domain. For local accounts: {"domain_type":"LOCAL","value":"localos"}. For LDAP: {"domain_type":"LDAP","value":"your.domain.com"}',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'delete_auth_token',
        description: 'Invalidate and delete the current authentication token. The token in the Authorization header will be revoked.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Info ───────────────────────────────────────────────────────────────
      {
        name: 'get_version',
        description: 'Get the vRealize Network Insight version information.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Search ─────────────────────────────────────────────────────────────
      {
        name: 'search_entities',
        description: 'Search vRealize Network Insight entities using a query string. Supports natural language queries like "show flows where destination port = 443" or "list vms where security group = sg-name".',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string in vRNI query language.' },
            size: { type: 'number', description: 'Number of results to return.' },
            cursor: { type: 'string', description: 'Pagination cursor for next page of results.' },
            start_time: { type: 'number', description: 'Start time for time-range queries (Unix epoch seconds).' },
            end_time: { type: 'number', description: 'End time for time-range queries (Unix epoch seconds).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_entity_names',
        description: 'Retrieve display names for a list of entity IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            entity_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of entity IDs to look up names for.',
            },
          },
          required: ['entity_ids'],
        },
      },
      {
        name: 'get_entity_name',
        description: 'Get the display name of a single vRNI entity by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Entity ID to look up.' },
          },
          required: ['id'],
        },
      },
      // ── Data Sources — vCenter ─────────────────────────────────────────────
      {
        name: 'list_data_sources_vcenter',
        description: 'List all vCenter data sources configured in vRealize Network Insight.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_vcenter',
        description: 'Add a vCenter Server as a data source in vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            fqdn: { type: 'string', description: 'Fully qualified domain name or IP of the vCenter Server.' },
            credentials: { type: 'object', description: 'Credentials object with username and password fields.' },
            nickname: { type: 'string', description: 'Optional display name for this data source.' },
            proxy_id: { type: 'string', description: 'ID of the proxy/collector node to use for this data source.' },
          },
          required: ['fqdn', 'credentials'],
        },
      },
      {
        name: 'get_data_source_vcenter',
        description: 'Show details for a specific vCenter data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'vCenter data source ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_vcenter',
        description: 'Update a vCenter data source configuration (credentials, nickname, or other settings).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'vCenter data source ID.' },
            fqdn: { type: 'string', description: 'Updated FQDN or IP.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_vcenter',
        description: 'Delete a vCenter data source from vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'vCenter data source ID to delete.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_vcenter',
        description: 'Enable a previously disabled vCenter data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'vCenter data source ID to enable.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_vcenter',
        description: 'Disable a vCenter data source (stops data collection without deleting).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'vCenter data source ID to disable.' },
          },
          required: ['id'],
        },
      },
      // ── Data Sources — NSX-V ───────────────────────────────────────────────
      {
        name: 'list_data_sources_nsxv',
        description: 'List all NSX-V Manager data sources configured in vRealize Network Insight.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_nsxv',
        description: 'Add an NSX-V Manager as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            fqdn: { type: 'string', description: 'FQDN or IP of the NSX-V Manager.' },
            credentials: { type: 'object', description: 'Credentials with username and password.' },
            nickname: { type: 'string', description: 'Optional display name.' },
            vcenter_id: { type: 'string', description: 'ID of the associated vCenter data source.' },
          },
          required: ['fqdn', 'credentials'],
        },
      },
      {
        name: 'get_data_source_nsxv',
        description: 'Show details for a specific NSX-V Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'NSX-V data source ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_nsxv',
        description: 'Update an NSX-V Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'NSX-V data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_nsxv',
        description: 'Delete an NSX-V Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'NSX-V data source ID to delete.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_nsxv',
        description: 'Enable an NSX-V Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'NSX-V data source ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_nsxv',
        description: 'Disable an NSX-V Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'NSX-V data source ID.' },
          },
          required: ['id'],
        },
      },
      // ── Data Sources — Cisco Switches ──────────────────────────────────────
      {
        name: 'list_data_sources_cisco_switches',
        description: 'List all Cisco switch data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_cisco_switch',
        description: 'Add a Cisco switch as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the Cisco switch.' },
            credentials: { type: 'object', description: 'Credentials with username and password.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_cisco_switch',
        description: 'Show details for a Cisco switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Cisco switch data source ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_cisco_switch',
        description: 'Update a Cisco switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Cisco switch data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_cisco_switch',
        description: 'Delete a Cisco switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Cisco switch data source ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_cisco_switch',
        description: 'Enable a Cisco switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Cisco switch data source ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_cisco_switch',
        description: 'Disable a Cisco switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Cisco switch data source ID.' },
          },
          required: ['id'],
        },
      },
      // ── Data Sources — Arista Switches ─────────────────────────────────────
      {
        name: 'list_data_sources_arista_switches',
        description: 'List all Arista switch data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_arista_switch',
        description: 'Add an Arista switch as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the Arista switch.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_arista_switch',
        description: 'Show details for an Arista switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Arista switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_arista_switch',
        description: 'Update an Arista switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Arista switch data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_arista_switch',
        description: 'Delete an Arista switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Arista switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_arista_switch',
        description: 'Enable an Arista switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Arista switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_arista_switch',
        description: 'Disable an Arista switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Arista switch data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — Juniper Switches ────────────────────────────────────
      {
        name: 'list_data_sources_juniper_switches',
        description: 'List all Juniper switch data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_juniper_switch',
        description: 'Add a Juniper switch as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the Juniper switch.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_juniper_switch',
        description: 'Show details for a Juniper switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Juniper switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_juniper_switch',
        description: 'Update a Juniper switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Juniper switch data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_juniper_switch',
        description: 'Delete a Juniper switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Juniper switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_juniper_switch',
        description: 'Enable a Juniper switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Juniper switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_juniper_switch',
        description: 'Disable a Juniper switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Juniper switch data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — Brocade Switches ────────────────────────────────────
      {
        name: 'list_data_sources_brocade_switches',
        description: 'List all Brocade switch data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_brocade_switch',
        description: 'Add a Brocade switch as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the Brocade switch.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_brocade_switch',
        description: 'Show details for a Brocade switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Brocade switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_brocade_switch',
        description: 'Update a Brocade switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Brocade switch data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_brocade_switch',
        description: 'Delete a Brocade switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Brocade switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_brocade_switch',
        description: 'Enable a Brocade switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Brocade switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_brocade_switch',
        description: 'Disable a Brocade switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Brocade switch data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — Dell Switches ───────────────────────────────────────
      {
        name: 'list_data_sources_dell_switches',
        description: 'List all Dell switch data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_dell_switch',
        description: 'Add a Dell switch as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the Dell switch.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_dell_switch',
        description: 'Show details for a Dell switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Dell switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_dell_switch',
        description: 'Update a Dell switch data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Dell switch data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_dell_switch',
        description: 'Delete a Dell switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Dell switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_dell_switch',
        description: 'Enable a Dell switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Dell switch data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_dell_switch',
        description: 'Disable a Dell switch data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Dell switch data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — Checkpoint Firewalls ────────────────────────────────
      {
        name: 'list_data_sources_checkpoint_firewalls',
        description: 'List all Check Point firewall data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_checkpoint_firewall',
        description: 'Add a Check Point firewall as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the Check Point firewall/management server.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_checkpoint_firewall',
        description: 'Show details for a Check Point firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Check Point data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_checkpoint_firewall',
        description: 'Update a Check Point firewall data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Check Point data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_checkpoint_firewall',
        description: 'Delete a Check Point firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Check Point data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_checkpoint_firewall',
        description: 'Enable a Check Point firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Check Point data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_checkpoint_firewall',
        description: 'Disable a Check Point firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Check Point data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — Panorama Firewalls ──────────────────────────────────
      {
        name: 'list_data_sources_panorama_firewalls',
        description: 'List all Palo Alto Panorama firewall data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_panorama_firewall',
        description: 'Add a Palo Alto Panorama as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the Panorama management server.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_panorama_firewall',
        description: 'Show details for a Panorama firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Panorama data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_panorama_firewall',
        description: 'Update a Panorama firewall data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Panorama data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_panorama_firewall',
        description: 'Delete a Panorama firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Panorama data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_panorama_firewall',
        description: 'Enable a Panorama firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Panorama data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_panorama_firewall',
        description: 'Disable a Panorama firewall data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Panorama data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — UCS Managers ────────────────────────────────────────
      {
        name: 'list_data_sources_ucs_managers',
        description: 'List all Cisco UCS Manager data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_ucs_manager',
        description: 'Add a Cisco UCS Manager as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the UCS Manager.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_ucs_manager',
        description: 'Show details for a UCS Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'UCS Manager data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_ucs_manager',
        description: 'Update a UCS Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UCS Manager data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_ucs_manager',
        description: 'Delete a UCS Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'UCS Manager data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_ucs_manager',
        description: 'Enable a UCS Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'UCS Manager data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_ucs_manager',
        description: 'Disable a UCS Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'UCS Manager data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — HP OneView Managers ─────────────────────────────────
      {
        name: 'list_data_sources_hpov_managers',
        description: 'List all HP OneView Manager data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_hpov_manager',
        description: 'Add an HP OneView Manager as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the HP OneView Manager.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_hpov_manager',
        description: 'Show details for an HP OneView Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HP OneView data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_hpov_manager',
        description: 'Update an HP OneView Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'HP OneView data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_hpov_manager',
        description: 'Delete an HP OneView Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HP OneView data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_hpov_manager',
        description: 'Enable an HP OneView Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HP OneView data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_hpov_manager',
        description: 'Disable an HP OneView Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HP OneView data source ID.' } },
          required: ['id'],
        },
      },
      // ── Data Sources — HPVC Managers ───────────────────────────────────────
      {
        name: 'list_data_sources_hpvc_managers',
        description: 'List all HP Virtual Connect (HPVC) Manager data sources.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_data_source_hpvc_manager',
        description: 'Add an HP Virtual Connect Manager as a data source.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address of the HPVC Manager.' },
            credentials: { type: 'object', description: 'Credentials object.' },
            nickname: { type: 'string', description: 'Optional display name.' },
          },
          required: ['ip', 'credentials'],
        },
      },
      {
        name: 'get_data_source_hpvc_manager',
        description: 'Show details for an HPVC Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HPVC Manager data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'update_data_source_hpvc_manager',
        description: 'Update an HPVC Manager data source.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'HPVC Manager data source ID.' },
            credentials: { type: 'object', description: 'Updated credentials.' },
            nickname: { type: 'string', description: 'Updated display name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_source_hpvc_manager',
        description: 'Delete an HPVC Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HPVC Manager data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'enable_data_source_hpvc_manager',
        description: 'Enable an HPVC Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HPVC Manager data source ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'disable_data_source_hpvc_manager',
        description: 'Disable an HPVC Manager data source.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'HPVC Manager data source ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — VMs ─────────────────────────────────────────────────────
      {
        name: 'list_vms',
        description: 'List all virtual machines discovered by vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_vm',
        description: 'Show details for a specific virtual machine.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'VM entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Hosts ───────────────────────────────────────────────────
      {
        name: 'list_hosts',
        description: 'List all ESXi hosts discovered by vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_host',
        description: 'Show details for a specific ESXi host.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Host entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Clusters ────────────────────────────────────────────────
      {
        name: 'list_clusters',
        description: 'List all vSphere clusters.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Show details for a specific vSphere cluster.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Cluster entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Datastores ──────────────────────────────────────────────
      {
        name: 'list_datastores',
        description: 'List all datastores discovered by vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_datastore',
        description: 'Show details for a specific datastore.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Datastore entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Flows ───────────────────────────────────────────────────
      {
        name: 'list_flows',
        description: 'List network flows observed by vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
            start_time: { type: 'number', description: 'Start time (Unix epoch seconds).' },
            end_time: { type: 'number', description: 'End time (Unix epoch seconds).' },
          },
        },
      },
      {
        name: 'get_flow',
        description: 'Show details for a specific network flow.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Flow entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Firewall Rules ──────────────────────────────────────────
      {
        name: 'list_firewall_rules',
        description: 'List all firewall rules discovered across data sources.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_firewall_rule',
        description: 'Show details for a specific firewall rule.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Firewall rule entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Firewalls ───────────────────────────────────────────────
      {
        name: 'list_firewalls',
        description: 'List all firewalls discovered by vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_firewall',
        description: 'Show details for a specific firewall.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Firewall entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Security Groups ─────────────────────────────────────────
      {
        name: 'list_security_groups',
        description: 'List all NSX security groups.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_security_group',
        description: 'Show details for a specific security group.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Security group entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Security Tags ───────────────────────────────────────────
      {
        name: 'list_security_tags',
        description: 'List all NSX security tags.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_security_tag',
        description: 'Show details for a specific security tag.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Security tag entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Services ────────────────────────────────────────────────
      {
        name: 'list_services',
        description: 'List all NSX services (named port/protocol definitions).',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Show details for a specific NSX service.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Service entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Service Groups ──────────────────────────────────────────
      {
        name: 'list_service_groups',
        description: 'List all NSX service groups.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_service_group',
        description: 'Show details for a specific NSX service group.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Service group entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — IP Sets ─────────────────────────────────────────────────
      {
        name: 'list_ip_sets',
        description: 'List all NSX IP sets.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_ip_set',
        description: 'Show details for a specific NSX IP set.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'IP set entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Distributed Virtual Switches ────────────────────────────
      {
        name: 'list_distributed_virtual_switches',
        description: 'List all distributed virtual switches (DVS/VDS).',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_distributed_virtual_switch',
        description: 'Show details for a specific distributed virtual switch.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'DVS entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Distributed Virtual Portgroups ──────────────────────────
      {
        name: 'list_distributed_virtual_portgroups',
        description: 'List all distributed virtual portgroups.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_distributed_virtual_portgroup',
        description: 'Show details for a specific distributed virtual portgroup.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Portgroup entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Layer 2 Networks ────────────────────────────────────────
      {
        name: 'list_layer2_networks',
        description: 'List all Layer 2 networks.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_layer2_network',
        description: 'Show details for a specific Layer 2 network.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Layer 2 network entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — vNICs / VMknics ─────────────────────────────────────────
      {
        name: 'list_vnics',
        description: 'List all virtual network interface cards (vNICs) attached to VMs.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_vnic',
        description: 'Show details for a specific vNIC.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'vNIC entity ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'list_vmknics',
        description: 'List all VMkernel network adapters (vmknics) on ESXi hosts.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_vmknic',
        description: 'Show details for a specific VMkernel adapter.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'vmknic entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — NSX Managers / vCenter Managers / Datacenters ──────────
      {
        name: 'list_nsx_managers',
        description: 'List all NSX managers discovered.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_nsx_manager',
        description: 'Show details for a specific NSX manager entity.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'NSX manager entity ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'list_vcenter_managers',
        description: 'List all vCenter manager entities discovered.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_vcenter_manager',
        description: 'Show details for a specific vCenter manager entity.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'vCenter manager entity ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'list_datacenters',
        description: 'List all vCenter datacenter objects.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_datacenter',
        description: 'Show details for a specific vCenter datacenter.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Datacenter entity ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'list_folders',
        description: 'List all vCenter folder objects.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_folder',
        description: 'Show details for a specific vCenter folder.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Folder entity ID.' } },
          required: ['id'],
        },
      },
      // ── Entities — Problems ────────────────────────────────────────────────
      {
        name: 'list_problems',
        description: 'List all problem events detected by vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_problem',
        description: 'Show details for a specific problem event.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Problem event entity ID.' } },
          required: ['id'],
        },
      },
      // ── Infrastructure Nodes ───────────────────────────────────────────────
      {
        name: 'list_infra_nodes',
        description: 'List vRealize Network Insight infrastructure nodes (proxy/collector appliances).',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'get_infra_node',
        description: 'Show details for a specific infrastructure node.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Infrastructure node ID.' } },
          required: ['id'],
        },
      },
      // ── Applications ───────────────────────────────────────────────────────
      {
        name: 'list_applications',
        description: 'List all applications defined in vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            size: { type: 'number', description: 'Number of results per page.' },
            cursor: { type: 'string', description: 'Pagination cursor.' },
          },
        },
      },
      {
        name: 'add_application',
        description: 'Create a new application group in vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name.' },
            tiers: {
              type: 'array',
              description: 'Optional list of tier definitions to include in the application.',
              items: { type: 'object' },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_application',
        description: 'Show details for a specific application.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Application ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'delete_application',
        description: 'Delete an application from vRealize Network Insight.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Application ID to delete.' } },
          required: ['id'],
        },
      },
      {
        name: 'list_application_tiers',
        description: 'List all tiers within a specific application.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Application ID.' } },
          required: ['id'],
        },
      },
      {
        name: 'add_application_tier',
        description: 'Add a tier to an existing application.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Application ID.' },
            name: { type: 'string', description: 'Tier name.' },
            group_membership_criteria: {
              type: 'array',
              description: 'List of criteria defining which VMs/workloads belong to this tier.',
              items: { type: 'object' },
            },
          },
          required: ['id', 'name'],
        },
      },
      {
        name: 'get_application_tier',
        description: 'Show details for a specific tier within an application.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Application ID.' },
            tier_id: { type: 'string', description: 'Tier ID.' },
          },
          required: ['id', 'tier_id'],
        },
      },
      {
        name: 'delete_application_tier',
        description: 'Delete a tier from an application.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Application ID.' },
            tier_id: { type: 'string', description: 'Tier ID to delete.' },
          },
          required: ['id', 'tier_id'],
        },
      },
      {
        name: 'get_tier',
        description: 'Get details for a tier by its standalone tier ID (not application-scoped).',
        inputSchema: {
          type: 'object',
          properties: { tier_id: { type: 'string', description: 'Tier ID.' } },
          required: ['tier_id'],
        },
      },
      // ── Micro-segmentation ─────────────────────────────────────────────────
      {
        name: 'get_recommended_rules',
        description: 'Get micro-segmentation recommended firewall rules based on observed network flows for an application or tier. Returns logical rules suitable for NSX-V policy creation.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: { type: 'string', description: 'Application ID to generate recommended rules for.' },
            tier_id: { type: 'string', description: 'Specific tier ID to scope the recommendations (optional).' },
            start_time: { type: 'number', description: 'Start time for flow analysis window (Unix epoch seconds).' },
            end_time: { type: 'number', description: 'End time for flow analysis window (Unix epoch seconds).' },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'export_nsx_recommended_rules',
        description: 'Export micro-segmentation recommended rules formatted for direct import into NSX-V. Returns rules in NSX-V XML/JSON format ready to push to the NSX Manager.',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: { type: 'string', description: 'Application ID to export rules for.' },
            tier_id: { type: 'string', description: 'Specific tier ID to scope the export (optional).' },
            start_time: { type: 'number', description: 'Start time for flow analysis (Unix epoch seconds).' },
            end_time: { type: 'number', description: 'End time for flow analysis (Unix epoch seconds).' },
          },
          required: ['application_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // Auth
        case 'create_auth_token':              return this.createAuthToken(args);
        case 'delete_auth_token':              return this.deleteAuthToken();
        // Info
        case 'get_version':                    return this.request('GET', '/info/version');
        // Search
        case 'search_entities':                return this.searchEntities(args);
        case 'get_entity_names':               return this.getEntityNames(args);
        case 'get_entity_name':                return this.requireId(args, id => this.request('GET', `/entities/names/${encodeURIComponent(id)}`));
        // Data Sources — vCenter
        case 'list_data_sources_vcenter':      return this.request('GET', '/data-sources/vcenters');
        case 'add_data_source_vcenter':        return this.request('POST', '/data-sources/vcenters', args);
        case 'get_data_source_vcenter':        return this.requireId(args, id => this.request('GET', `/data-sources/vcenters/${encodeURIComponent(id)}`));
        case 'update_data_source_vcenter':     return this.requireId(args, id => this.request('PUT', `/data-sources/vcenters/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_vcenter':     return this.requireId(args, id => this.request('DELETE', `/data-sources/vcenters/${encodeURIComponent(id)}`));
        case 'enable_data_source_vcenter':     return this.requireId(args, id => this.request('POST', `/data-sources/vcenters/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_vcenter':    return this.requireId(args, id => this.request('POST', `/data-sources/vcenters/${encodeURIComponent(id)}/disable`));
        // Data Sources — NSX-V
        case 'list_data_sources_nsxv':         return this.request('GET', '/data-sources/nsxv-managers');
        case 'add_data_source_nsxv':           return this.request('POST', '/data-sources/nsxv-managers', args);
        case 'get_data_source_nsxv':           return this.requireId(args, id => this.request('GET', `/data-sources/nsxv-managers/${encodeURIComponent(id)}`));
        case 'update_data_source_nsxv':        return this.requireId(args, id => this.request('PUT', `/data-sources/nsxv-managers/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_nsxv':        return this.requireId(args, id => this.request('DELETE', `/data-sources/nsxv-managers/${encodeURIComponent(id)}`));
        case 'enable_data_source_nsxv':        return this.requireId(args, id => this.request('POST', `/data-sources/nsxv-managers/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_nsxv':       return this.requireId(args, id => this.request('POST', `/data-sources/nsxv-managers/${encodeURIComponent(id)}/disable`));
        // Data Sources — Cisco
        case 'list_data_sources_cisco_switches':    return this.request('GET', '/data-sources/cisco-switches');
        case 'add_data_source_cisco_switch':        return this.request('POST', '/data-sources/cisco-switches', args);
        case 'get_data_source_cisco_switch':        return this.requireId(args, id => this.request('GET', `/data-sources/cisco-switches/${encodeURIComponent(id)}`));
        case 'update_data_source_cisco_switch':     return this.requireId(args, id => this.request('PUT', `/data-sources/cisco-switches/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_cisco_switch':     return this.requireId(args, id => this.request('DELETE', `/data-sources/cisco-switches/${encodeURIComponent(id)}`));
        case 'enable_data_source_cisco_switch':     return this.requireId(args, id => this.request('POST', `/data-sources/cisco-switches/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_cisco_switch':    return this.requireId(args, id => this.request('POST', `/data-sources/cisco-switches/${encodeURIComponent(id)}/disable`));
        // Data Sources — Arista
        case 'list_data_sources_arista_switches':   return this.request('GET', '/data-sources/arista-switches');
        case 'add_data_source_arista_switch':       return this.request('POST', '/data-sources/arista-switches', args);
        case 'get_data_source_arista_switch':       return this.requireId(args, id => this.request('GET', `/data-sources/arista-switches/${encodeURIComponent(id)}`));
        case 'update_data_source_arista_switch':    return this.requireId(args, id => this.request('PUT', `/data-sources/arista-switches/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_arista_switch':    return this.requireId(args, id => this.request('DELETE', `/data-sources/arista-switches/${encodeURIComponent(id)}`));
        case 'enable_data_source_arista_switch':    return this.requireId(args, id => this.request('POST', `/data-sources/arista-switches/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_arista_switch':   return this.requireId(args, id => this.request('POST', `/data-sources/arista-switches/${encodeURIComponent(id)}/disable`));
        // Data Sources — Juniper
        case 'list_data_sources_juniper_switches':  return this.request('GET', '/data-sources/juniper-switches');
        case 'add_data_source_juniper_switch':      return this.request('POST', '/data-sources/juniper-switches', args);
        case 'get_data_source_juniper_switch':      return this.requireId(args, id => this.request('GET', `/data-sources/juniper-switches/${encodeURIComponent(id)}`));
        case 'update_data_source_juniper_switch':   return this.requireId(args, id => this.request('PUT', `/data-sources/juniper-switches/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_juniper_switch':   return this.requireId(args, id => this.request('DELETE', `/data-sources/juniper-switches/${encodeURIComponent(id)}`));
        case 'enable_data_source_juniper_switch':   return this.requireId(args, id => this.request('POST', `/data-sources/juniper-switches/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_juniper_switch':  return this.requireId(args, id => this.request('POST', `/data-sources/juniper-switches/${encodeURIComponent(id)}/disable`));
        // Data Sources — Brocade
        case 'list_data_sources_brocade_switches':  return this.request('GET', '/data-sources/brocade-switches');
        case 'add_data_source_brocade_switch':      return this.request('POST', '/data-sources/brocade-switches', args);
        case 'get_data_source_brocade_switch':      return this.requireId(args, id => this.request('GET', `/data-sources/brocade-switches/${encodeURIComponent(id)}`));
        case 'update_data_source_brocade_switch':   return this.requireId(args, id => this.request('PUT', `/data-sources/brocade-switches/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_brocade_switch':   return this.requireId(args, id => this.request('DELETE', `/data-sources/brocade-switches/${encodeURIComponent(id)}`));
        case 'enable_data_source_brocade_switch':   return this.requireId(args, id => this.request('POST', `/data-sources/brocade-switches/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_brocade_switch':  return this.requireId(args, id => this.request('POST', `/data-sources/brocade-switches/${encodeURIComponent(id)}/disable`));
        // Data Sources — Dell
        case 'list_data_sources_dell_switches':     return this.request('GET', '/data-sources/dell-switches');
        case 'add_data_source_dell_switch':         return this.request('POST', '/data-sources/dell-switches', args);
        case 'get_data_source_dell_switch':         return this.requireId(args, id => this.request('GET', `/data-sources/dell-switches/${encodeURIComponent(id)}`));
        case 'update_data_source_dell_switch':      return this.requireId(args, id => this.request('PUT', `/data-sources/dell-switches/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_dell_switch':      return this.requireId(args, id => this.request('DELETE', `/data-sources/dell-switches/${encodeURIComponent(id)}`));
        case 'enable_data_source_dell_switch':      return this.requireId(args, id => this.request('POST', `/data-sources/dell-switches/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_dell_switch':     return this.requireId(args, id => this.request('POST', `/data-sources/dell-switches/${encodeURIComponent(id)}/disable`));
        // Data Sources — Checkpoint
        case 'list_data_sources_checkpoint_firewalls':   return this.request('GET', '/data-sources/checkpoint-firewalls');
        case 'add_data_source_checkpoint_firewall':      return this.request('POST', '/data-sources/checkpoint-firewalls', args);
        case 'get_data_source_checkpoint_firewall':      return this.requireId(args, id => this.request('GET', `/data-sources/checkpoint-firewalls/${encodeURIComponent(id)}`));
        case 'update_data_source_checkpoint_firewall':   return this.requireId(args, id => this.request('PUT', `/data-sources/checkpoint-firewalls/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_checkpoint_firewall':   return this.requireId(args, id => this.request('DELETE', `/data-sources/checkpoint-firewalls/${encodeURIComponent(id)}`));
        case 'enable_data_source_checkpoint_firewall':   return this.requireId(args, id => this.request('POST', `/data-sources/checkpoint-firewalls/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_checkpoint_firewall':  return this.requireId(args, id => this.request('POST', `/data-sources/checkpoint-firewalls/${encodeURIComponent(id)}/disable`));
        // Data Sources — Panorama
        case 'list_data_sources_panorama_firewalls':   return this.request('GET', '/data-sources/panorama-firewalls');
        case 'add_data_source_panorama_firewall':      return this.request('POST', '/data-sources/panorama-firewalls', args);
        case 'get_data_source_panorama_firewall':      return this.requireId(args, id => this.request('GET', `/data-sources/panorama-firewalls/${encodeURIComponent(id)}`));
        case 'update_data_source_panorama_firewall':   return this.requireId(args, id => this.request('PUT', `/data-sources/panorama-firewalls/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_panorama_firewall':   return this.requireId(args, id => this.request('DELETE', `/data-sources/panorama-firewalls/${encodeURIComponent(id)}`));
        case 'enable_data_source_panorama_firewall':   return this.requireId(args, id => this.request('POST', `/data-sources/panorama-firewalls/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_panorama_firewall':  return this.requireId(args, id => this.request('POST', `/data-sources/panorama-firewalls/${encodeURIComponent(id)}/disable`));
        // Data Sources — UCS
        case 'list_data_sources_ucs_managers':   return this.request('GET', '/data-sources/ucs-managers');
        case 'add_data_source_ucs_manager':      return this.request('POST', '/data-sources/ucs-managers', args);
        case 'get_data_source_ucs_manager':      return this.requireId(args, id => this.request('GET', `/data-sources/ucs-managers/${encodeURIComponent(id)}`));
        case 'update_data_source_ucs_manager':   return this.requireId(args, id => this.request('PUT', `/data-sources/ucs-managers/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_ucs_manager':   return this.requireId(args, id => this.request('DELETE', `/data-sources/ucs-managers/${encodeURIComponent(id)}`));
        case 'enable_data_source_ucs_manager':   return this.requireId(args, id => this.request('POST', `/data-sources/ucs-managers/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_ucs_manager':  return this.requireId(args, id => this.request('POST', `/data-sources/ucs-managers/${encodeURIComponent(id)}/disable`));
        // Data Sources — HP OneView
        case 'list_data_sources_hpov_managers':   return this.request('GET', '/data-sources/hpov-managers');
        case 'add_data_source_hpov_manager':      return this.request('POST', '/data-sources/hpov-managers', args);
        case 'get_data_source_hpov_manager':      return this.requireId(args, id => this.request('GET', `/data-sources/hpov-managers/${encodeURIComponent(id)}`));
        case 'update_data_source_hpov_manager':   return this.requireId(args, id => this.request('PUT', `/data-sources/hpov-managers/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_hpov_manager':   return this.requireId(args, id => this.request('DELETE', `/data-sources/hpov-managers/${encodeURIComponent(id)}`));
        case 'enable_data_source_hpov_manager':   return this.requireId(args, id => this.request('POST', `/data-sources/hpov-managers/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_hpov_manager':  return this.requireId(args, id => this.request('POST', `/data-sources/hpov-managers/${encodeURIComponent(id)}/disable`));
        // Data Sources — HPVC
        case 'list_data_sources_hpvc_managers':   return this.request('GET', '/data-sources/hpvc-managers');
        case 'add_data_source_hpvc_manager':      return this.request('POST', '/data-sources/hpvc-managers', args);
        case 'get_data_source_hpvc_manager':      return this.requireId(args, id => this.request('GET', `/data-sources/hpvc-managers/${encodeURIComponent(id)}`));
        case 'update_data_source_hpvc_manager':   return this.requireId(args, id => this.request('PUT', `/data-sources/hpvc-managers/${encodeURIComponent(id)}`, this.omit(args, 'id')));
        case 'delete_data_source_hpvc_manager':   return this.requireId(args, id => this.request('DELETE', `/data-sources/hpvc-managers/${encodeURIComponent(id)}`));
        case 'enable_data_source_hpvc_manager':   return this.requireId(args, id => this.request('POST', `/data-sources/hpvc-managers/${encodeURIComponent(id)}/enable`));
        case 'disable_data_source_hpvc_manager':  return this.requireId(args, id => this.request('POST', `/data-sources/hpvc-managers/${encodeURIComponent(id)}/disable`));
        // Entities
        case 'list_vms':                     return this.listEntities('/entities/vms', args);
        case 'get_vm':                        return this.requireId(args, id => this.request('GET', `/entities/vms/${encodeURIComponent(id)}`));
        case 'list_hosts':                    return this.listEntities('/entities/hosts', args);
        case 'get_host':                      return this.requireId(args, id => this.request('GET', `/entities/hosts/${encodeURIComponent(id)}`));
        case 'list_clusters':                 return this.listEntities('/entities/clusters', args);
        case 'get_cluster':                   return this.requireId(args, id => this.request('GET', `/entities/clusters/${encodeURIComponent(id)}`));
        case 'list_datastores':               return this.listEntities('/entities/datastores', args);
        case 'get_datastore':                 return this.requireId(args, id => this.request('GET', `/entities/datastores/${encodeURIComponent(id)}`));
        case 'list_flows':                    return this.listEntities('/entities/flows', args);
        case 'get_flow':                      return this.requireId(args, id => this.request('GET', `/entities/flows/${encodeURIComponent(id)}`));
        case 'list_firewall_rules':           return this.listEntities('/entities/firewall-rules', args);
        case 'get_firewall_rule':             return this.requireId(args, id => this.request('GET', `/entities/firewall-rules/${encodeURIComponent(id)}`));
        case 'list_firewalls':                return this.listEntities('/entities/firewalls', args);
        case 'get_firewall':                  return this.requireId(args, id => this.request('GET', `/entities/firewalls/${encodeURIComponent(id)}`));
        case 'list_security_groups':          return this.listEntities('/entities/security-groups', args);
        case 'get_security_group':            return this.requireId(args, id => this.request('GET', `/entities/security-groups/${encodeURIComponent(id)}`));
        case 'list_security_tags':            return this.listEntities('/entities/security-tags', args);
        case 'get_security_tag':              return this.requireId(args, id => this.request('GET', `/entities/security-tags/${encodeURIComponent(id)}`));
        case 'list_services':                 return this.listEntities('/entities/services', args);
        case 'get_service':                   return this.requireId(args, id => this.request('GET', `/entities/services/${encodeURIComponent(id)}`));
        case 'list_service_groups':           return this.listEntities('/entities/service-groups', args);
        case 'get_service_group':             return this.requireId(args, id => this.request('GET', `/entities/service-groups/${encodeURIComponent(id)}`));
        case 'list_ip_sets':                  return this.listEntities('/entities/ip-sets', args);
        case 'get_ip_set':                    return this.requireId(args, id => this.request('GET', `/entities/ip-sets/${encodeURIComponent(id)}`));
        case 'list_distributed_virtual_switches':   return this.listEntities('/entities/distributed-virtual-switches', args);
        case 'get_distributed_virtual_switch':      return this.requireId(args, id => this.request('GET', `/entities/distributed-virtual-switches/${encodeURIComponent(id)}`));
        case 'list_distributed_virtual_portgroups': return this.listEntities('/entities/distributed-virtual-portgroups', args);
        case 'get_distributed_virtual_portgroup':   return this.requireId(args, id => this.request('GET', `/entities/distributed-virtual-portgroups/${encodeURIComponent(id)}`));
        case 'list_layer2_networks':          return this.listEntities('/entities/layer2-networks', args);
        case 'get_layer2_network':            return this.requireId(args, id => this.request('GET', `/entities/layer2-networks/${encodeURIComponent(id)}`));
        case 'list_vnics':                    return this.listEntities('/entities/vnics', args);
        case 'get_vnic':                      return this.requireId(args, id => this.request('GET', `/entities/vnics/${encodeURIComponent(id)}`));
        case 'list_vmknics':                  return this.listEntities('/entities/vmknics', args);
        case 'get_vmknic':                    return this.requireId(args, id => this.request('GET', `/entities/vmknics/${encodeURIComponent(id)}`));
        case 'list_nsx_managers':             return this.listEntities('/entities/nsx-managers', args);
        case 'get_nsx_manager':               return this.requireId(args, id => this.request('GET', `/entities/nsx-managers/${encodeURIComponent(id)}`));
        case 'list_vcenter_managers':         return this.listEntities('/entities/vcenter-managers', args);
        case 'get_vcenter_manager':           return this.requireId(args, id => this.request('GET', `/entities/vcenter-managers/${encodeURIComponent(id)}`));
        case 'list_datacenters':              return this.listEntities('/entities/vc-datacenters', args);
        case 'get_datacenter':                return this.requireId(args, id => this.request('GET', `/entities/vc-datacenters/${encodeURIComponent(id)}`));
        case 'list_folders':                  return this.listEntities('/entities/folders', args);
        case 'get_folder':                    return this.requireId(args, id => this.request('GET', `/entities/folders/${encodeURIComponent(id)}`));
        case 'list_problems':                 return this.listEntities('/entities/problems', args);
        case 'get_problem':                   return this.requireId(args, id => this.request('GET', `/entities/problems/${encodeURIComponent(id)}`));
        // Infrastructure nodes
        case 'list_infra_nodes':              return this.listEntities('/infra/nodes', args);
        case 'get_infra_node':                return this.requireId(args, id => this.request('GET', `/infra/nodes/${encodeURIComponent(id)}`));
        // Applications
        case 'list_applications':             return this.listEntities('/groups/applications', args);
        case 'add_application':               return this.addApplication(args);
        case 'get_application':               return this.requireId(args, id => this.request('GET', `/groups/applications/${encodeURIComponent(id)}`));
        case 'delete_application':            return this.requireId(args, id => this.request('DELETE', `/groups/applications/${encodeURIComponent(id)}`));
        case 'list_application_tiers':        return this.requireId(args, id => this.request('GET', `/groups/applications/${encodeURIComponent(id)}/tiers`));
        case 'add_application_tier':          return this.addApplicationTier(args);
        case 'get_application_tier':          return this.getApplicationTier(args);
        case 'delete_application_tier':       return this.deleteApplicationTier(args);
        case 'get_tier': {
          if (!args.tier_id) return { content: [{ type: 'text', text: 'tier_id is required' }], isError: true };
          return this.request('GET', `/groups/tiers/${encodeURIComponent(args.tier_id as string)}`);
        }
        // Micro-segmentation
        case 'get_recommended_rules':         return this.getRecommendedRules(args);
        case 'export_nsx_recommended_rules':  return this.exportNsxRecommendedRules(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────


  private omit(args: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
    const result = { ...args };
    for (const k of keys) delete result[k];
    return result;
  }

  private async requireId(
    args: Record<string, unknown>,
    fn: (id: string) => Promise<ToolResult>,
  ): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return fn(args.id as string);
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `NetworkInsight ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEntities(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.size) params.push(`size=${encodeURIComponent(String(args.size))}`);
    if (args.cursor) params.push(`cursor=${encodeURIComponent(args.cursor as string)}`);
    if (args.start_time) params.push(`start_time=${encodeURIComponent(String(args.start_time))}`);
    if (args.end_time) params.push(`end_time=${encodeURIComponent(String(args.end_time))}`);
    const fullPath = params.length > 0 ? `${path}?${params.join('&')}` : path;
    return this.request('GET', fullPath);
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  private async createAuthToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.password) {
      return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      username: args.username,
      password: args.password,
      domain: args.domain || { domain_type: 'LOCAL', value: 'localos' },
    };
    const url = `${this.baseUrl}/auth/token`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Auth error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json() as Record<string, unknown>;
    if (data.token) this.token = data.token as string;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteAuthToken(): Promise<ToolResult> {
    return this.request('DELETE', '/auth/token');
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  private async searchEntities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.request('POST', '/search', args);
  }

  private async getEntityNames(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_ids || !Array.isArray(args.entity_ids) || args.entity_ids.length === 0) {
      return { content: [{ type: 'text', text: 'entity_ids array is required and must not be empty' }], isError: true };
    }
    return this.request('POST', '/entities/names', { entity_ids: args.entity_ids });
  }

  // ── Applications — Tiers ───────────────────────────────────────────────────

  private async addApplicationTier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id (application ID) is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('POST', `/groups/applications/${encodeURIComponent(id as string)}/tiers`, body);
  }

  private async getApplicationTier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id (application ID) is required' }], isError: true };
    if (!args.tier_id) return { content: [{ type: 'text', text: 'tier_id is required' }], isError: true };
    return this.request('GET', `/groups/applications/${encodeURIComponent(args.id as string)}/tiers/${encodeURIComponent(args.tier_id as string)}`);
  }

  private async deleteApplicationTier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id (application ID) is required' }], isError: true };
    if (!args.tier_id) return { content: [{ type: 'text', text: 'tier_id is required' }], isError: true };
    return this.request('DELETE', `/groups/applications/${encodeURIComponent(args.id as string)}/tiers/${encodeURIComponent(args.tier_id as string)}`);
  }

  // ── Micro-segmentation ─────────────────────────────────────────────────────

  private async addApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.request('POST', '/groups/applications', args);
  }

    private async getRecommendedRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) {
      return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    }
    return this.request('POST', '/micro-seg/recommended-rules', args);
  }

  private async exportNsxRecommendedRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) {
      return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    }
    return this.request('POST', '/micro-seg/recommended-rules/nsx', args);
  }
}
