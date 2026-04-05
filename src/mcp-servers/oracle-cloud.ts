/**
 * Oracle Cloud Infrastructure (OCI) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/oracle/mcp — transport: stdio, auth: OCI API key (~/.oci/config)
// Oracle publishes an official MCP repo (oracle/mcp) covering: Autonomous AI Database, Analytics Cloud,
// and a generic OCI API MCP server (oracle.oci-api-mcp-server) via PyPI. The OCI API server covers
// Cloud Guard, Compute, Storage, Identity, Logging, Monitoring (see oracle.com/mcp for full scope).
// The oracle.oci-api-mcp-server tool count is not publicly enumerated in the README; scope is broad.
// Our adapter covers: 18 tools focused on compute, networking, storage, identity, and monitoring.
// Decision: use-both — Oracle official OCI MCP covers broader services (Cloud Guard, Logging, etc.)
//   with native OCI SDK signing; our adapter handles infrastructure operations via bearer token.
// Integration:
//   MCP-sourced (prefer oracle.oci-api-mcp-server): cloud guard, logging, broader service coverage
//   REST-sourced (this adapter): list_instances, get_instance, launch_instance, stop_instance,
//     start_instance, terminate_instance, list_vcns, get_vcn, list_subnets, list_buckets,
//     list_objects, get_object, list_compartments, get_compartment, list_users, get_user,
//     list_alarms, list_metrics
//
// Base URL: https://{service}.{region}.oraclecloud.com (region-scoped, e.g. iaas.us-ashburn-1.oraclecloud.com)
// Auth: OCI Signature Version 1 — RSA-SHA256 request signing using tenancy OCID, user OCID, and private key.
//       This adapter accepts a pre-generated token or API key string for simplified integrations.
//       For full RSA signing, supply the Authorization header pre-built from the OCI SDK.
// Docs: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/usingapi.htm
// Rate limits: Service-specific; most control plane APIs allow ~1,000 requests/sec per tenancy

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OracleCloudConfig {
  // For simplified integrations: pre-signed auth token (e.g. from OCI CLI session or instance principal)
  authToken: string;
  region: string;       // e.g. "us-ashburn-1", "eu-frankfurt-1"
  tenancyId: string;    // Tenancy OCID
  baseUrl?: string;     // Override — defaults to iaas.{region}.oraclecloud.com
}

export class OracleCloudMCPServer extends MCPAdapterBase {
  private readonly authToken: string;
  private readonly region: string;
  private readonly tenancyId: string;
  private readonly baseUrl: string;

  constructor(config: OracleCloudConfig) {
    super();
    this.authToken = config.authToken;
    this.region = config.region;
    this.tenancyId = config.tenancyId;
    this.baseUrl = config.baseUrl || `https://iaas.${config.region}.oraclecloud.com`;
  }

  static catalog() {
    return {
      name: 'oracle-cloud',
      displayName: 'Oracle Cloud Infrastructure',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'oracle', 'oci', 'oracle cloud', 'cloud infrastructure', 'compute', 'instance',
        'virtual machine', 'vcn', 'subnet', 'block storage', 'object storage', 'iam',
        'compartment', 'tenancy', 'load balancer', 'monitoring', 'alarm', 'metric',
      ],
      toolNames: [
        'list_instances', 'get_instance', 'launch_instance', 'stop_instance', 'start_instance', 'terminate_instance',
        'list_vcns', 'get_vcn', 'list_subnets',
        'list_buckets', 'list_objects', 'get_object',
        'list_compartments', 'get_compartment',
        'list_users', 'get_user',
        'list_alarms', 'list_metrics',
      ],
      description: 'Oracle Cloud Infrastructure: manage compute instances, networking (VCN/subnet), object storage, IAM compartments and users, and monitor alarms and metrics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_instances',
        description: 'List compute instances in an OCI compartment with optional lifecycle state filter',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID to list instances in. Defaults to tenancy root if omitted.',
            },
            lifecycle_state: {
              type: 'string',
              description: 'Filter by state: RUNNING, STOPPED, STARTING, STOPPING, TERMINATED (default: all active)',
            },
            display_name: {
              type: 'string',
              description: 'Filter by instance display name (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of instances to return (default: 50, max: 1000)',
            },
            page: {
              type: 'string',
              description: 'Pagination token from a previous response (opc-next-page header)',
            },
          },
        },
      },
      {
        name: 'get_instance',
        description: 'Get detailed information for a specific OCI compute instance by its OCID',
        inputSchema: {
          type: 'object',
          properties: {
            instance_id: {
              type: 'string',
              description: 'Instance OCID (e.g. ocid1.instance.oc1.iad.xxx)',
            },
          },
          required: ['instance_id'],
        },
      },
      {
        name: 'launch_instance',
        description: 'Launch a new OCI compute instance in a compartment with specified shape and image',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID to launch the instance in',
            },
            availability_domain: {
              type: 'string',
              description: 'Availability domain (e.g. "Uocm:US-ASHBURN-AD-1")',
            },
            shape: {
              type: 'string',
              description: 'Instance shape (e.g. "VM.Standard.E4.Flex", "BM.Standard3.64")',
            },
            image_id: {
              type: 'string',
              description: 'Image OCID for the boot volume',
            },
            subnet_id: {
              type: 'string',
              description: 'Subnet OCID to attach the primary VNIC to',
            },
            display_name: {
              type: 'string',
              description: 'Display name for the new instance',
            },
            ocpus: {
              type: 'number',
              description: 'Number of OCPUs for flex shapes (e.g. 1, 2, 4)',
            },
            memory_in_gbs: {
              type: 'number',
              description: 'Memory in GB for flex shapes',
            },
          },
          required: ['compartment_id', 'availability_domain', 'shape', 'image_id', 'subnet_id'],
        },
      },
      {
        name: 'stop_instance',
        description: 'Stop (power off) a running OCI compute instance — supports graceful SOFTSTOP or forced STOP',
        inputSchema: {
          type: 'object',
          properties: {
            instance_id: {
              type: 'string',
              description: 'Instance OCID to stop',
            },
            action: {
              type: 'string',
              description: 'Stop action: SOFTSTOP (graceful, default) or STOP (immediate)',
            },
          },
          required: ['instance_id'],
        },
      },
      {
        name: 'start_instance',
        description: 'Start a stopped OCI compute instance',
        inputSchema: {
          type: 'object',
          properties: {
            instance_id: {
              type: 'string',
              description: 'Instance OCID to start',
            },
          },
          required: ['instance_id'],
        },
      },
      {
        name: 'terminate_instance',
        description: 'Permanently terminate an OCI compute instance — this is irreversible and deletes attached boot volume by default',
        inputSchema: {
          type: 'object',
          properties: {
            instance_id: {
              type: 'string',
              description: 'Instance OCID to terminate',
            },
            preserve_boot_volume: {
              type: 'boolean',
              description: 'Preserve the boot volume after termination (default: false)',
            },
          },
          required: ['instance_id'],
        },
      },
      {
        name: 'list_vcns',
        description: 'List Virtual Cloud Networks (VCNs) in an OCI compartment',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID to list VCNs in',
            },
            lifecycle_state: {
              type: 'string',
              description: 'Filter by state: AVAILABLE, TERMINATING, TERMINATED (default: AVAILABLE)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['compartment_id'],
        },
      },
      {
        name: 'get_vcn',
        description: 'Get details for a specific OCI Virtual Cloud Network by OCID',
        inputSchema: {
          type: 'object',
          properties: {
            vcn_id: {
              type: 'string',
              description: 'VCN OCID',
            },
          },
          required: ['vcn_id'],
        },
      },
      {
        name: 'list_subnets',
        description: 'List subnets in an OCI compartment with optional VCN filter',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID',
            },
            vcn_id: {
              type: 'string',
              description: 'Filter subnets by VCN OCID (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['compartment_id'],
        },
      },
      {
        name: 'list_buckets',
        description: 'List Object Storage buckets in an OCI compartment within a namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Object Storage namespace (tenancy name or namespace string)',
            },
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID to scope the bucket list',
            },
            limit: {
              type: 'number',
              description: 'Maximum buckets to return (default: 50)',
            },
          },
          required: ['namespace', 'compartment_id'],
        },
      },
      {
        name: 'list_objects',
        description: 'List objects in an OCI Object Storage bucket with optional prefix filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Object Storage namespace',
            },
            bucket_name: {
              type: 'string',
              description: 'Bucket name to list objects from',
            },
            prefix: {
              type: 'string',
              description: 'Prefix filter for object names (e.g. "logs/2026/")',
            },
            limit: {
              type: 'number',
              description: 'Maximum objects to return (default: 100, max: 1000)',
            },
            start: {
              type: 'string',
              description: 'Pagination start token from previous response',
            },
          },
          required: ['namespace', 'bucket_name'],
        },
      },
      {
        name: 'get_object',
        description: 'Retrieve metadata and content URL for a specific object in OCI Object Storage',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Object Storage namespace',
            },
            bucket_name: {
              type: 'string',
              description: 'Bucket name containing the object',
            },
            object_name: {
              type: 'string',
              description: 'Object name (key) to retrieve',
            },
          },
          required: ['namespace', 'bucket_name', 'object_name'],
        },
      },
      {
        name: 'list_compartments',
        description: 'List compartments in the tenancy or within a parent compartment, including sub-compartments',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Parent compartment OCID (defaults to tenancy root)',
            },
            access_level: {
              type: 'string',
              description: 'Scope: ANY (all sub-compartments) or ACCESSIBLE (only accessible ones, default: ACCESSIBLE)',
            },
            lifecycle_state: {
              type: 'string',
              description: 'Filter by state: ACTIVE, DELETING, DELETED (default: ACTIVE)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_compartment',
        description: 'Get details for a specific OCI compartment by OCID',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID to retrieve',
            },
          },
          required: ['compartment_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List IAM users in the OCI tenancy with optional lifecycle state filter',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Tenancy OCID (IAM users are tenancy-scoped)',
            },
            lifecycle_state: {
              type: 'string',
              description: 'Filter by state: ACTIVE, INACTIVE, CREATING, DELETING (default: ACTIVE)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['compartment_id'],
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific IAM user including groups and capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User OCID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_alarms',
        description: 'List monitoring alarms in an OCI compartment with optional namespace and state filters',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID to list alarms in',
            },
            display_name: {
              type: 'string',
              description: 'Filter alarms by display name (partial match)',
            },
            lifecycle_state: {
              type: 'string',
              description: 'Filter by state: ACTIVE, DELETING, DELETED (default: ACTIVE)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['compartment_id'],
        },
      },
      {
        name: 'list_metrics',
        description: 'List available OCI Monitoring metric namespaces and metric names in a compartment',
        inputSchema: {
          type: 'object',
          properties: {
            compartment_id: {
              type: 'string',
              description: 'Compartment OCID to list metrics for',
            },
            namespace: {
              type: 'string',
              description: 'Filter by metric namespace (e.g. "oci_computeagent", "oci_blockstore")',
            },
            name: {
              type: 'string',
              description: 'Filter by metric name prefix',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['compartment_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_instances':
          return this.listInstances(args);
        case 'get_instance':
          return this.getInstance(args);
        case 'launch_instance':
          return this.launchInstance(args);
        case 'stop_instance':
          return this.stopInstance(args);
        case 'start_instance':
          return this.startInstance(args);
        case 'terminate_instance':
          return this.terminateInstance(args);
        case 'list_vcns':
          return this.listVcns(args);
        case 'get_vcn':
          return this.getVcn(args);
        case 'list_subnets':
          return this.listSubnets(args);
        case 'list_buckets':
          return this.listBuckets(args);
        case 'list_objects':
          return this.listObjects(args);
        case 'get_object':
          return this.getObject(args);
        case 'list_compartments':
          return this.listCompartments(args);
        case 'get_compartment':
          return this.getCompartment(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_alarms':
          return this.listAlarms(args);
        case 'list_metrics':
          return this.listMetrics(args);
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
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private computeUrl(path: string): string {
    return `${this.baseUrl}/20160918${path}`;
  }

  private identityUrl(path: string): string {
    return `https://identity.${this.region}.oraclecloud.com/20160918${path}`;
  }

  private objectStorageUrl(namespace: string, path: string): string {
    return `https://objectstorage.${this.region}.oraclecloud.com/n/${namespace}${path}`;
  }

  private monitoringUrl(path: string): string {
    return `https://telemetry.${this.region}.oraclecloud.com/20180401${path}`;
  }

  private async apiGet(url: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const fullUrl = `${url}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(fullUrl, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(url: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
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

  private async apiAction(url: string, action: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${url}?action=${action}`, {
      method: 'POST',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(url: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const fullUrl = `${url}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(fullUrl, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  private async listInstances(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      compartmentId: (args.compartment_id as string) ?? this.tenancyId,
      limit: String((args.limit as number) ?? 50),
    };
    if (args.lifecycle_state) params.lifecycleState = args.lifecycle_state as string;
    if (args.display_name) params.displayName = args.display_name as string;
    if (args.page) params.page = args.page as string;
    return this.apiGet(this.computeUrl('/instances'), params);
  }

  private async getInstance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.instance_id) return { content: [{ type: 'text', text: 'instance_id is required' }], isError: true };
    return this.apiGet(this.computeUrl(`/instances/${encodeURIComponent(args.instance_id as string)}`));
  }

  private async launchInstance(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['compartment_id', 'availability_domain', 'shape', 'image_id', 'subnet_id'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      compartmentId: args.compartment_id,
      availabilityDomain: args.availability_domain,
      shape: args.shape,
      sourceDetails: { sourceType: 'image', imageId: args.image_id },
      createVnicDetails: { subnetId: args.subnet_id },
    };
    if (args.display_name) body.displayName = args.display_name;
    if (args.ocpus || args.memory_in_gbs) {
      body.shapeConfig = {
        ...(args.ocpus ? { ocpus: args.ocpus } : {}),
        ...(args.memory_in_gbs ? { memoryInGBs: args.memory_in_gbs } : {}),
      };
    }
    return this.apiPost(this.computeUrl('/instances'), body);
  }

  private async stopInstance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.instance_id) return { content: [{ type: 'text', text: 'instance_id is required' }], isError: true };
    const action = (args.action as string) ?? 'SOFTSTOP';
    return this.apiAction(this.computeUrl(`/instances/${encodeURIComponent(args.instance_id as string)}`), action);
  }

  private async startInstance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.instance_id) return { content: [{ type: 'text', text: 'instance_id is required' }], isError: true };
    return this.apiAction(this.computeUrl(`/instances/${encodeURIComponent(args.instance_id as string)}`), 'START');
  }

  private async terminateInstance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.instance_id) return { content: [{ type: 'text', text: 'instance_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.preserve_boot_volume === 'boolean') {
      params.preserveBootVolume = String(args.preserve_boot_volume);
    }
    return this.apiDelete(this.computeUrl(`/instances/${encodeURIComponent(args.instance_id as string)}`), params);
  }

  private async listVcns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.compartment_id) return { content: [{ type: 'text', text: 'compartment_id is required' }], isError: true };
    const params: Record<string, string> = {
      compartmentId: args.compartment_id as string,
      limit: String((args.limit as number) ?? 50),
    };
    if (args.lifecycle_state) params.lifecycleState = args.lifecycle_state as string;
    return this.apiGet(this.computeUrl('/vcns'), params);
  }

  private async getVcn(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vcn_id) return { content: [{ type: 'text', text: 'vcn_id is required' }], isError: true };
    return this.apiGet(this.computeUrl(`/vcns/${encodeURIComponent(args.vcn_id as string)}`));
  }

  private async listSubnets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.compartment_id) return { content: [{ type: 'text', text: 'compartment_id is required' }], isError: true };
    const params: Record<string, string> = {
      compartmentId: args.compartment_id as string,
      limit: String((args.limit as number) ?? 50),
    };
    if (args.vcn_id) params.vcnId = args.vcn_id as string;
    return this.apiGet(this.computeUrl('/subnets'), params);
  }

  private async listBuckets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.namespace || !args.compartment_id) {
      return { content: [{ type: 'text', text: 'namespace and compartment_id are required' }], isError: true };
    }
    const params: Record<string, string> = {
      compartmentId: args.compartment_id as string,
      limit: String((args.limit as number) ?? 50),
    };
    return this.apiGet(this.objectStorageUrl(args.namespace as string, '/b'), params);
  }

  private async listObjects(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.namespace || !args.bucket_name) {
      return { content: [{ type: 'text', text: 'namespace and bucket_name are required' }], isError: true };
    }
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 100),
    };
    if (args.prefix) params.prefix = args.prefix as string;
    if (args.start) params.start = args.start as string;
    return this.apiGet(this.objectStorageUrl(args.namespace as string, `/b/${encodeURIComponent(args.bucket_name as string)}/o`), params);
  }

  private async getObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.namespace || !args.bucket_name || !args.object_name) {
      return { content: [{ type: 'text', text: 'namespace, bucket_name, and object_name are required' }], isError: true };
    }
    const url = this.objectStorageUrl(
      args.namespace as string,
      `/b/${encodeURIComponent(args.bucket_name as string)}/o/${encodeURIComponent(args.object_name as string)}`,
    );
    const response = await this.fetchWithRetry(url, { method: 'HEAD', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const meta: Record<string, string> = {};
    response.headers.forEach((v, k) => { meta[k] = v; });
    return { content: [{ type: 'text', text: JSON.stringify({ object_url: url, headers: meta }, null, 2) }], isError: false };
  }

  private async listCompartments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      compartmentId: (args.compartment_id as string) ?? this.tenancyId,
      limit: String((args.limit as number) ?? 100),
      accessLevel: (args.access_level as string) ?? 'ACCESSIBLE',
    };
    if (args.lifecycle_state) params.lifecycleState = args.lifecycle_state as string;
    return this.apiGet(this.identityUrl('/compartments'), params);
  }

  private async getCompartment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.compartment_id) return { content: [{ type: 'text', text: 'compartment_id is required' }], isError: true };
    return this.apiGet(this.identityUrl(`/compartments/${encodeURIComponent(args.compartment_id as string)}`));
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.compartment_id) return { content: [{ type: 'text', text: 'compartment_id is required' }], isError: true };
    const params: Record<string, string> = {
      compartmentId: args.compartment_id as string,
      limit: String((args.limit as number) ?? 50),
    };
    if (args.lifecycle_state) params.lifecycleState = args.lifecycle_state as string;
    return this.apiGet(this.identityUrl('/users'), params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(this.identityUrl(`/users/${encodeURIComponent(args.user_id as string)}`));
  }

  private async listAlarms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.compartment_id) return { content: [{ type: 'text', text: 'compartment_id is required' }], isError: true };
    const params: Record<string, string> = {
      compartmentId: args.compartment_id as string,
      limit: String((args.limit as number) ?? 50),
    };
    if (args.display_name) params.displayName = args.display_name as string;
    if (args.lifecycle_state) params.lifecycleState = args.lifecycle_state as string;
    return this.apiGet(this.monitoringUrl('/alarms'), params);
  }

  private async listMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.compartment_id) return { content: [{ type: 'text', text: 'compartment_id is required' }], isError: true };
    const body: Record<string, unknown> = { compartmentId: args.compartment_id };
    if (args.namespace) body.namespace = args.namespace;
    if (args.name) body.name = args.name;
    return this.apiPost(this.monitoringUrl('/metrics/actions/listMetrics'), body);
  }
}
