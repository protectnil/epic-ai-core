/**
 * Adobe Experience Manager (AEM) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Adobe AEM MCP server was found on GitHub. Community tooling exists for AEM
// as a Sling-based JCR repository but none implements the MCP protocol.
//
// Base URL: http://<aem-host> (user-supplied — no fixed SaaS base URL)
// Auth: HTTP Basic auth (username:password) — Authorization: Basic header
// Docs: https://github.com/shinesolutions/swagger-aem (Swagger AEM by Shine Solutions)
// Spec: https://api.apis.guru/v2/specs/adobe.com/aem/3.7.1-pre.0/openapi.json
// Rate limits: None documented; governed by AEM instance capacity

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AdobeAemConfig {
  /** AEM instance base URL, e.g. http://localhost:4502 */
  baseUrl: string;
  /** AEM username (default: admin) */
  username?: string;
  /** AEM password */
  password: string;
}

export class AdobeAemMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: AdobeAemConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    const user = config.username ?? 'admin';
    this.authHeader = `Basic ${Buffer.from(`${user}:${config.password}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'adobe-aem',
      displayName: 'Adobe Experience Manager (AEM)',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'adobe', 'aem', 'experience-manager', 'cms', 'content', 'jcr', 'sling',
        'package', 'replication', 'bundle', 'osgi', 'crx', 'keystore', 'truststore',
        'saml', 'agent', 'node', 'repository', 'health', 'config',
      ],
      toolNames: [
        'get_aem_health_check', 'get_aem_product_info', 'get_crxde_status',
        'get_config_manager', 'get_bundle_info', 'post_bundle',
        'get_agents', 'get_agent', 'post_agent', 'delete_agent',
        'get_package', 'get_package_filter', 'post_package_service',
        'post_package_service_json', 'post_package_update',
        'get_install_status', 'get_package_manager_servlet',
        'get_query', 'post_query',
        'post_authorizables', 'post_tree_activation',
        'get_truststore_info', 'get_login_page',
        'get_node', 'post_node', 'delete_node', 'post_path',
        'get_authorizable_keystore', 'post_cq_actions',
        'ssl_setup', 'post_set_password',
      ],
      description: 'Adobe Experience Manager (AEM): manage CMS content nodes, OSGi bundles, replication agents, packages, keystores, truststore, health checks, and configuration via the Sling/CRX HTTP API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_aem_health_check',
        description: 'Run AEM health checks with optional tag filters and combined tag mode; returns health status for the instance',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'string',
              description: 'Comma-separated health check tags to filter by (e.g. "integrationTest,systemReady")',
            },
            combine_tags_or: {
              type: 'boolean',
              description: 'If true, combine tags with OR logic; false uses AND logic (default: false)',
            },
          },
        },
      },
      {
        name: 'get_aem_product_info',
        description: 'Get installed AEM product information including version, build date, and service pack details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_crxde_status',
        description: 'Get CRXDE Lite status — checks whether CRXDE is enabled on the AEM instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_config_manager',
        description: 'Get the OSGi configuration manager page listing all active OSGi component configurations',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_bundle_info',
        description: 'Get details for a specific OSGi bundle by name including state, version, and manifest headers',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Bundle symbolic name (e.g. "com.day.cq.dam.dam-core")',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'post_bundle',
        description: 'Perform an action on an OSGi bundle: start, stop, or uninstall the specified bundle',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Bundle symbolic name (e.g. "com.day.cq.dam.dam-core")',
            },
            action: {
              type: 'string',
              description: 'Action to perform: start, stop, or uninstall',
            },
          },
          required: ['name', 'action'],
        },
      },
      {
        name: 'get_agents',
        description: 'List all replication agents for an AEM runmode (author or publish)',
        inputSchema: {
          type: 'object',
          properties: {
            runmode: {
              type: 'string',
              description: 'AEM runmode: author or publish',
            },
          },
          required: ['runmode'],
        },
      },
      {
        name: 'get_agent',
        description: 'Get configuration details for a specific replication agent by runmode and agent name',
        inputSchema: {
          type: 'object',
          properties: {
            runmode: {
              type: 'string',
              description: 'AEM runmode: author or publish',
            },
            name: {
              type: 'string',
              description: 'Replication agent name (e.g. "publish")',
            },
          },
          required: ['runmode', 'name'],
        },
      },
      {
        name: 'delete_agent',
        description: 'Delete a replication agent from an AEM runmode environment by agent name',
        inputSchema: {
          type: 'object',
          properties: {
            runmode: {
              type: 'string',
              description: 'AEM runmode: author or publish',
            },
            name: {
              type: 'string',
              description: 'Replication agent name to delete',
            },
          },
          required: ['runmode', 'name'],
        },
      },
      {
        name: 'post_agent',
        description: 'Create or update a replication agent with transport URI, credentials, enabled state, and title',
        inputSchema: {
          type: 'object',
          properties: {
            runmode: {
              type: 'string',
              description: 'AEM runmode: author or publish',
            },
            name: {
              type: 'string',
              description: 'Replication agent name',
            },
            enabled: {
              type: 'string',
              description: 'Enable the agent: "true" or "false" (default: "true")',
            },
            title: {
              type: 'string',
              description: 'Human-readable title for the agent',
            },
            transport_uri: {
              type: 'string',
              description: 'Transport URI for the replication target (e.g. http://publish:4503/bin/receive?sling:authRequestLogin=1)',
            },
            transport_user: {
              type: 'string',
              description: 'Username for transport authentication',
            },
            transport_password: {
              type: 'string',
              description: 'Password for transport authentication',
            },
            log_level: {
              type: 'string',
              description: 'Log level: error, warn, info, or debug (default: error)',
            },
            serialization_type: {
              type: 'string',
              description: 'Serialization type: durbo, flush, or send (default: durbo)',
            },
          },
          required: ['runmode', 'name'],
        },
      },
      {
        name: 'get_package',
        description: 'Download a CRX package ZIP file by group, name, and version from the AEM package manager',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Package group name (e.g. "my_packages")',
            },
            name: {
              type: 'string',
              description: 'Package name (e.g. "my-content")',
            },
            version: {
              type: 'string',
              description: 'Package version (e.g. "1.0.0")',
            },
          },
          required: ['group', 'name', 'version'],
        },
      },
      {
        name: 'get_package_filter',
        description: 'Get the filter definition (content paths included) for a CRX package by group, name, and version',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Package group name',
            },
            name: {
              type: 'string',
              description: 'Package name',
            },
            version: {
              type: 'string',
              description: 'Package version',
            },
          },
          required: ['group', 'name', 'version'],
        },
      },
      {
        name: 'post_package_service',
        description: 'Execute a package manager service command: ls (list), rm (remove), or upload via the basic service endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            cmd: {
              type: 'string',
              description: 'Command: ls (list packages), rm, or upload',
            },
          },
          required: ['cmd'],
        },
      },
      {
        name: 'post_package_service_json',
        description: 'Execute a package manager JSON service operation for a specific package path: install, uninstall, build, delete, replicate',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Package path (e.g. "/etc/packages/my_packages/my-content-1.0.zip")',
            },
            cmd: {
              type: 'string',
              description: 'Command: install, uninstall, build, delete, or replicate',
            },
            recursive: {
              type: 'boolean',
              description: 'Process sub-packages recursively (default: false)',
            },
            force: {
              type: 'boolean',
              description: 'Force execution without safeguards (default: false)',
            },
          },
          required: ['path', 'cmd'],
        },
      },
      {
        name: 'post_package_update',
        description: 'Update package metadata: group name, package name, version, filter, and path for an existing CRX package',
        inputSchema: {
          type: 'object',
          properties: {
            group_name: {
              type: 'string',
              description: 'Package group name',
            },
            package_name: {
              type: 'string',
              description: 'Package name',
            },
            version: {
              type: 'string',
              description: 'Package version string',
            },
            path: {
              type: 'string',
              description: 'Full path to the package in the repository',
            },
            filter: {
              type: 'string',
              description: 'JSON filter definition for package content paths',
            },
          },
          required: ['group_name', 'package_name', 'version', 'path'],
        },
      },
      {
        name: 'get_install_status',
        description: 'Get the current package installation status from AEM CRX package manager',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_package_manager_servlet',
        description: 'Get the CRX Package Manager servlet HTML page for diagnostics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_query',
        description: 'Execute a QueryBuilder GET query on the AEM JCR repository with path, limit, and property filters',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Repository path to scope the query (e.g. "/content/dam")',
            },
            p_limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10, use -1 for unlimited)',
            },
            property: {
              type: 'string',
              description: 'JCR property name to filter on (e.g. "jcr:primaryType")',
            },
            property_value: {
              type: 'string',
              description: 'Value for the property filter (e.g. "dam:Asset")',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'post_query',
        description: 'Execute a QueryBuilder POST query on the AEM JCR repository with path, limit, and property filters',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Repository path to scope the query (e.g. "/content/dam")',
            },
            p_limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10, use -1 for unlimited)',
            },
            property: {
              type: 'string',
              description: 'JCR property name to filter on',
            },
            property_value: {
              type: 'string',
              description: 'Value for the property filter',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'post_authorizables',
        description: 'Create a new AEM user or group with an authorizable ID, intermediate path, and optional password',
        inputSchema: {
          type: 'object',
          properties: {
            authorizable_id: {
              type: 'string',
              description: 'Unique identifier for the new user or group (e.g. "jdoe")',
            },
            intermediate_path: {
              type: 'string',
              description: 'JCR path where the authorizable will be created (e.g. "/home/users/myapp")',
            },
            create_user: {
              type: 'string',
              description: 'Set to any value to create a user (omit to create a group)',
            },
            create_group: {
              type: 'string',
              description: 'Set to any value to create a group (omit to create a user)',
            },
            rep_password: {
              type: 'string',
              description: 'Password for the new user (required when creating a user)',
            },
            given_name: {
              type: 'string',
              description: 'Display name / given name for the new authorizable',
            },
          },
          required: ['authorizable_id', 'intermediate_path'],
        },
      },
      {
        name: 'post_tree_activation',
        description: 'Replicate (activate) an entire content tree from AEM author to publish, with optional modified-only filter',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Root content path to replicate (e.g. "/content/mysite")',
            },
            cmd: {
              type: 'string',
              description: 'Command to execute (default: activate)',
            },
            ignore_deactivated: {
              type: 'boolean',
              description: 'Skip pages that have been explicitly deactivated (default: false)',
            },
            only_modified: {
              type: 'boolean',
              description: 'Replicate only pages modified since last activation (default: false)',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'get_truststore_info',
        description: 'Get AEM global truststore metadata including certificate aliases and expiry information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_login_page',
        description: 'Fetch the AEM Granite login page HTML — useful for connectivity verification',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_node',
        description: 'Get a JCR node by path and name, returning its properties and child nodes',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Parent path of the node (e.g. "/content/mysite")',
            },
            name: {
              type: 'string',
              description: 'Node name (e.g. "jcr:content")',
            },
          },
          required: ['path', 'name'],
        },
      },
      {
        name: 'delete_node',
        description: 'Delete a JCR node at the specified path and name from the AEM repository',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Parent path of the node to delete',
            },
            name: {
              type: 'string',
              description: 'Name of the node to delete',
            },
          },
          required: ['path', 'name'],
        },
      },
      {
        name: 'post_node',
        description: 'Modify a JCR node: move, copy, or delete it; set deleteAuthorizable to remove a user or group node',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Parent path of the target node',
            },
            name: {
              type: 'string',
              description: 'Node name to operate on',
            },
            operation: {
              type: 'string',
              description: 'Sling operation: move, copy, or delete',
            },
            delete_authorizable: {
              type: 'string',
              description: 'Set to any value to delete the authorizable associated with this node',
            },
          },
          required: ['path', 'name'],
        },
      },
      {
        name: 'post_path',
        description: 'Create a new JCR node at an intermediate path with a given primary type and node name',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Intermediate path under which to create the node (e.g. "/content/mysite")',
            },
            jcr_primary_type: {
              type: 'string',
              description: 'JCR primary node type (e.g. "sling:Folder", "nt:unstructured")',
            },
            name: {
              type: 'string',
              description: 'Name for the new node',
            },
          },
          required: ['path', 'jcr_primary_type', 'name'],
        },
      },
      {
        name: 'get_authorizable_keystore',
        description: 'Get keystore metadata for an AEM user or group (authorizable) including key aliases',
        inputSchema: {
          type: 'object',
          properties: {
            intermediate_path: {
              type: 'string',
              description: 'Intermediate path of the authorizable (e.g. "/home/users/myapp")',
            },
            authorizable_id: {
              type: 'string',
              description: 'Authorizable ID (username or group name)',
            },
          },
          required: ['intermediate_path', 'authorizable_id'],
        },
      },
      {
        name: 'post_cq_actions',
        description: 'Execute CQ actions (ACL changes) for an authorizable: modify repository permissions',
        inputSchema: {
          type: 'object',
          properties: {
            authorizable_id: {
              type: 'string',
              description: 'Authorizable ID to apply actions to',
            },
            changelog: {
              type: 'string',
              description: 'ACL changelog string describing permissions to grant or revoke',
            },
          },
          required: ['authorizable_id', 'changelog'],
        },
      },
      {
        name: 'ssl_setup',
        description: 'Configure SSL on AEM by providing keystore, truststore passwords, HTTPS hostname, and port',
        inputSchema: {
          type: 'object',
          properties: {
            keystore_password: {
              type: 'string',
              description: 'New keystore password',
            },
            keystore_password_confirm: {
              type: 'string',
              description: 'Keystore password confirmation (must match keystore_password)',
            },
            truststore_password: {
              type: 'string',
              description: 'New truststore password',
            },
            truststore_password_confirm: {
              type: 'string',
              description: 'Truststore password confirmation',
            },
            https_hostname: {
              type: 'string',
              description: 'Hostname for HTTPS (e.g. "aem.example.com")',
            },
            https_port: {
              type: 'string',
              description: 'HTTPS port number (e.g. "8443")',
            },
          },
          required: ['keystore_password', 'keystore_password_confirm', 'truststore_password', 'truststore_password_confirm', 'https_hostname', 'https_port'],
        },
      },
      {
        name: 'post_set_password',
        description: 'Change the password for the currently authenticated AEM user',
        inputSchema: {
          type: 'object',
          properties: {
            old_password: {
              type: 'string',
              description: 'Current password for the authenticated user',
            },
            new_password: {
              type: 'string',
              description: 'New plain-text password',
            },
            verify_password: {
              type: 'string',
              description: 'New password confirmation (must match new_password)',
            },
          },
          required: ['old_password', 'new_password', 'verify_password'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_aem_health_check':        return this.getAemHealthCheck(args);
        case 'get_aem_product_info':        return this.getAemProductInfo();
        case 'get_crxde_status':            return this.getCrxdeStatus();
        case 'get_config_manager':          return this.getConfigManager();
        case 'get_bundle_info':             return this.getBundleInfo(args);
        case 'post_bundle':                 return this.postBundle(args);
        case 'get_agents':                  return this.getAgents(args);
        case 'get_agent':                   return this.getAgent(args);
        case 'delete_agent':                return this.deleteAgent(args);
        case 'post_agent':                  return this.postAgent(args);
        case 'get_package':                 return this.getPackage(args);
        case 'get_package_filter':          return this.getPackageFilter(args);
        case 'post_package_service':        return this.postPackageService(args);
        case 'post_package_service_json':   return this.postPackageServiceJson(args);
        case 'post_package_update':         return this.postPackageUpdate(args);
        case 'get_install_status':          return this.getInstallStatus();
        case 'get_package_manager_servlet': return this.getPackageManagerServlet();
        case 'get_query':                   return this.getQuery(args);
        case 'post_query':                  return this.postQuery(args);
        case 'post_authorizables':          return this.postAuthorizables(args);
        case 'post_tree_activation':        return this.postTreeActivation(args);
        case 'get_truststore_info':         return this.getTruststoreInfo();
        case 'get_login_page':              return this.getLoginPage();
        case 'get_node':                    return this.getNode(args);
        case 'delete_node':                 return this.deleteNode(args);
        case 'post_node':                   return this.postNode(args);
        case 'post_path':                   return this.postPath(args);
        case 'get_authorizable_keystore':   return this.getAuthorizableKeystore(args);
        case 'post_cq_actions':             return this.postCqActions(args);
        case 'ssl_setup':                   return this.sslSetup(args);
        case 'post_set_password':           return this.postSetPassword(args);
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private async doGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: { 'Authorization': this.authHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const ct = response.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const data = await response.json();
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async doDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'Authorization': this.authHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || `Deleted: ${path}` }], isError: false };
  }

  private async doPost(path: string, params: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: new URLSearchParams(params).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const ct = response.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const data = await response.json();
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // ── Tool Implementations ───────────────────────────────────────────────────

  private async getAemHealthCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.tags) params['tags'] = args.tags as string;
    if (args.combine_tags_or !== undefined) params['combineTagsOr'] = String(args.combine_tags_or);
    return this.doGet('/system/health', Object.keys(params).length ? params : undefined);
  }

  private async getAemProductInfo(): Promise<ToolResult> {
    return this.doGet('/system/console/status-productinfo.json');
  }

  private async getCrxdeStatus(): Promise<ToolResult> {
    return this.doGet('/crx/server/crx.default/jcr:root/.1.json');
  }

  private async getConfigManager(): Promise<ToolResult> {
    return this.doGet('/system/console/configMgr');
  }

  private async getBundleInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.doGet(`/system/console/bundles/${encodeURIComponent(args.name as string)}.json`);
  }

  private async postBundle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.action) return { content: [{ type: 'text', text: 'action is required' }], isError: true };
    return this.doPost(`/system/console/bundles/${encodeURIComponent(args.name as string)}`, {
      action: args.action as string,
    });
  }

  private async getAgents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.runmode) return { content: [{ type: 'text', text: 'runmode is required' }], isError: true };
    return this.doGet(`/etc/replication/agents.${encodeURIComponent(args.runmode as string)}.-1.json`);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.runmode) return { content: [{ type: 'text', text: 'runmode is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.doGet(
      `/etc/replication/agents.${encodeURIComponent(args.runmode as string)}/${encodeURIComponent(args.name as string)}`,
    );
  }

  private async deleteAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.runmode) return { content: [{ type: 'text', text: 'runmode is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.doDelete(
      `/etc/replication/agents.${encodeURIComponent(args.runmode as string)}/${encodeURIComponent(args.name as string)}`,
    );
  }

  private async postAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.runmode) return { content: [{ type: 'text', text: 'runmode is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const params: Record<string, string> = {
      'jcr:primaryType': 'cq:Page',
      'jcr:content/cq:distribute': 'true',
      'jcr:content/enabled': (args.enabled as string) ?? 'true',
    };
    if (args.title) params['jcr:content/jcr:title'] = args.title as string;
    if (args.transport_uri) params['jcr:content/transportUri'] = args.transport_uri as string;
    if (args.transport_user) params['jcr:content/transportUser'] = args.transport_user as string;
    if (args.transport_password) params['jcr:content/transportPassword'] = args.transport_password as string;
    if (args.log_level) params['jcr:content/logLevel'] = args.log_level as string;
    if (args.serialization_type) params['jcr:content/serializationType'] = args.serialization_type as string;
    return this.doPost(
      `/etc/replication/agents.${encodeURIComponent(args.runmode as string)}/${encodeURIComponent(args.name as string)}`,
      params,
    );
  }

  private async getPackage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group || !args.name || !args.version) {
      return { content: [{ type: 'text', text: 'group, name, and version are required' }], isError: true };
    }
    return this.doGet(
      `/etc/packages/${encodeURIComponent(args.group as string)}/${encodeURIComponent(args.name as string)}-${encodeURIComponent(args.version as string)}.zip`,
    );
  }

  private async getPackageFilter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group || !args.name || !args.version) {
      return { content: [{ type: 'text', text: 'group, name, and version are required' }], isError: true };
    }
    return this.doGet(
      `/etc/packages/${encodeURIComponent(args.group as string)}/${encodeURIComponent(args.name as string)}-${encodeURIComponent(args.version as string)}.zip/jcr:content/vlt:definition/filter.tidy.2.json`,
    );
  }

  private async postPackageService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cmd) return { content: [{ type: 'text', text: 'cmd is required' }], isError: true };
    return this.doPost('/crx/packmgr/service.jsp', { cmd: args.cmd as string });
  }

  private async postPackageServiceJson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    if (!args.cmd) return { content: [{ type: 'text', text: 'cmd is required' }], isError: true };
    const params: Record<string, string> = { cmd: args.cmd as string };
    if (args.recursive !== undefined) params['recursive'] = String(args.recursive);
    if (args.force !== undefined) params['force'] = String(args.force);
    return this.doPost(`/crx/packmgr/service/.json/${encodeURIComponent(args.path as string)}`, params);
  }

  private async postPackageUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_name || !args.package_name || !args.version || !args.path) {
      return { content: [{ type: 'text', text: 'group_name, package_name, version, and path are required' }], isError: true };
    }
    const params: Record<string, string> = {
      groupName: args.group_name as string,
      packageName: args.package_name as string,
      version: args.version as string,
      path: args.path as string,
    };
    if (args.filter) params['filter'] = args.filter as string;
    return this.doPost('/crx/packmgr/update.jsp', params);
  }

  private async getInstallStatus(): Promise<ToolResult> {
    return this.doGet('/crx/packmgr/installstatus.jsp');
  }

  private async getPackageManagerServlet(): Promise<ToolResult> {
    return this.doGet('/crx/packmgr/service/script.html');
  }

  private async getQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const params: Record<string, string> = {
      path: args.path as string,
      'p.limit': String((args.p_limit as number) ?? 10),
    };
    if (args.property) params['1_property'] = args.property as string;
    if (args.property_value) params['1_property.value'] = args.property_value as string;
    return this.doGet('/bin/querybuilder.json', params);
  }

  private async postQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const params: Record<string, string> = {
      path: args.path as string,
      'p.limit': String((args.p_limit as number) ?? 10),
    };
    if (args.property) params['1_property'] = args.property as string;
    if (args.property_value) params['1_property.value'] = args.property_value as string;
    return this.doPost('/bin/querybuilder.json', params);
  }

  private async postAuthorizables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.authorizable_id) return { content: [{ type: 'text', text: 'authorizable_id is required' }], isError: true };
    if (!args.intermediate_path) return { content: [{ type: 'text', text: 'intermediate_path is required' }], isError: true };
    const params: Record<string, string> = {
      authorizableId: args.authorizable_id as string,
      intermediatePath: args.intermediate_path as string,
    };
    if (args.create_user !== undefined) params['createUser'] = args.create_user as string;
    if (args.create_group !== undefined) params['createGroup'] = args.create_group as string;
    if (args.rep_password) params['rep:password'] = args.rep_password as string;
    if (args.given_name) params['profile/givenName'] = args.given_name as string;
    return this.doPost('/libs/granite/security/post/authorizables', params);
  }

  private async postTreeActivation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const params: Record<string, string> = {
      path: args.path as string,
      cmd: (args.cmd as string) ?? 'activate',
      ignoredeactivated: String(args.ignore_deactivated ?? false),
      onlymodified: String(args.only_modified ?? false),
    };
    return this.doPost('/libs/replication/treeactivation.html', params);
  }

  private async getTruststoreInfo(): Promise<ToolResult> {
    return this.doGet('/libs/granite/security/truststore.json');
  }

  private async getLoginPage(): Promise<ToolResult> {
    return this.doGet('/libs/granite/core/content/login.html');
  }

  private async getNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.name) return { content: [{ type: 'text', text: 'path and name are required' }], isError: true };
    return this.doGet(`/${encodeURIComponent(args.path as string)}/${encodeURIComponent(args.name as string)}`);
  }

  private async deleteNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.name) return { content: [{ type: 'text', text: 'path and name are required' }], isError: true };
    return this.doDelete(`/${encodeURIComponent(args.path as string)}/${encodeURIComponent(args.name as string)}`);
  }

  private async postNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.name) return { content: [{ type: 'text', text: 'path and name are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.operation) params[':operation'] = args.operation as string;
    if (args.delete_authorizable) params['deleteAuthorizable'] = args.delete_authorizable as string;
    return this.doPost(
      `/${encodeURIComponent(args.path as string)}/${encodeURIComponent(args.name as string)}`,
      params,
    );
  }

  private async postPath(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.jcr_primary_type || !args.name) {
      return { content: [{ type: 'text', text: 'path, jcr_primary_type, and name are required' }], isError: true };
    }
    return this.doPost(`/${encodeURIComponent(args.path as string)}/`, {
      'jcr:primaryType': args.jcr_primary_type as string,
      ':name': args.name as string,
    });
  }

  private async getAuthorizableKeystore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.intermediate_path || !args.authorizable_id) {
      return { content: [{ type: 'text', text: 'intermediate_path and authorizable_id are required' }], isError: true };
    }
    return this.doGet(
      `/${encodeURIComponent(args.intermediate_path as string)}/${encodeURIComponent(args.authorizable_id as string)}.ks.json`,
    );
  }

  private async postCqActions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.authorizable_id) return { content: [{ type: 'text', text: 'authorizable_id is required' }], isError: true };
    if (!args.changelog) return { content: [{ type: 'text', text: 'changelog is required' }], isError: true };
    return this.doPost('/.cqactions.html', {
      authorizableId: args.authorizable_id as string,
      changelog: args.changelog as string,
    });
  }

  private async sslSetup(args: Record<string, unknown>): Promise<ToolResult> {
    const required = [
      'keystore_password', 'keystore_password_confirm',
      'truststore_password', 'truststore_password_confirm',
      'https_hostname', 'https_port',
    ];
    for (const f of required) {
      if (!args[f]) return { content: [{ type: 'text', text: `${f} is required` }], isError: true };
    }
    return this.doPost('/libs/granite/security/post/sslSetup.html', {
      keystorePassword: args.keystore_password as string,
      keystorePasswordConfirm: args.keystore_password_confirm as string,
      truststorePassword: args.truststore_password as string,
      truststorePasswordConfirm: args.truststore_password_confirm as string,
      httpsHostname: args.https_hostname as string,
      httpsPort: args.https_port as string,
    });
  }

  private async postSetPassword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.old_password || !args.new_password || !args.verify_password) {
      return { content: [{ type: 'text', text: 'old_password, new_password, and verify_password are required' }], isError: true };
    }
    return this.doPost('/crx/explorer/ui/setpassword.jsp', {
      old: args.old_password as string,
      plain: args.new_password as string,
      verify: args.verify_password as string,
    });
  }
}
