/**
 * Qualys VMDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Qualys MCP server was found on GitHub or npm.
//
// Base URL: Varies by region — NO default provided. Choose your platform URL:
//   US1: https://qualysapi.qualys.com
//   US2: https://qualysapi.qg2.apps.qualys.com
//   US3: https://qualysapi.qg3.apps.qualys.com
//   EU1: https://qualysapi.qg1.apps.qualys.eu
//   IN1: https://qualysapi.qg1.apps.qualys.in
// Auth: HTTP Basic (username:password) + X-Requested-With header (required by all Qualys APIs)
// Docs: https://docs.qualys.com/en/vm/api/index.htm
//       https://cdn2.qualys.com/docs/qualys-api-vmpc-user-guide.pdf
// Rate limits: Varies by subscription; Qualys recommends concurrency limits per API user

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface QualysConfig {
  /**
   * Required. Qualys platform API URL for your subscription region.
   * Examples: https://qualysapi.qualys.com, https://qualysapi.qg2.apps.qualys.com
   * No default — using the wrong region routes requests to the wrong data centre.
   */
  baseUrl: string;
  username: string;
  password: string;
}

export class QualysMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly formHeaders: Record<string, string>;
  private readonly xmlHeaders: Record<string, string>;

  constructor(config: QualysConfig) {
    super();
    if (!config.baseUrl) {
      throw new Error(
        'QualysMCPServer: baseUrl is required. Qualys has multiple regional platforms; ' +
        'specify the correct URL for your subscription (e.g. https://qualysapi.qualys.com).',
      );
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    const credentials = btoa(`${config.username}:${config.password}`);
    // X-Requested-With is mandatory on all Qualys API requests
    const common = {
      'Authorization': `Basic ${credentials}`,
      'X-Requested-With': 'epicai-mcp-adapter',
    };
    this.formHeaders = { ...common, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/xml' };
    this.xmlHeaders = { ...common, 'Content-Type': 'application/xml', 'Accept': 'application/xml' };
  }

  static catalog() {
    return {
      name: 'qualys',
      displayName: 'Qualys VMDR',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'qualys', 'vmdr', 'vulnerability', 'scan', 'host', 'asset',
        'detection', 'compliance', 'policy', 'was', 'web application',
        'knowledgebase', 'report', 'patch', 'remediation', 'cvss',
      ],
      toolNames: [
        'list_host_assets',
        'list_host_detections',
        'launch_vm_scan',
        'list_vm_scans',
        'get_scan_results',
        'list_asset_groups',
        'get_knowledgebase',
        'list_reports',
        'launch_report',
        'list_web_apps',
        'launch_was_scan',
        'list_was_scans',
      ],
      description:
        'Qualys VMDR: list and manage host assets, retrieve vulnerability detections, launch and monitor VM and WAS scans, query the vulnerability KnowledgeBase, manage asset groups, and generate compliance reports.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_host_assets',
        description:
          'Download the list of scanned host assets in your Qualys account, optionally filtered by IPs, OS, or last scan date.',
        inputSchema: {
          type: 'object',
          properties: {
            ips: {
              type: 'string',
              description: 'Comma-separated IPs or CIDR ranges to filter by (e.g. "10.0.0.1,192.168.1.0/24").',
            },
            os_pattern: {
              type: 'string',
              description: 'Regex to filter hosts by OS (e.g. "Windows Server 2019").',
            },
            last_scan_date_after: {
              type: 'string',
              description: 'Return only hosts last scanned after this date (YYYY-MM-DD format).',
            },
            truncation_limit: {
              type: 'number',
              description: 'Maximum host records to return per page (default: 1000, max: 1000).',
            },
            id_min: {
              type: 'number',
              description: 'Minimum host ID for pagination (use last returned ID + 1 for next page).',
            },
          },
        },
      },
      {
        name: 'list_host_detections',
        description:
          'Retrieve vulnerability detection records for hosts from Qualys VMDR host detection list, with optional filters for IP, severity, and QID.',
        inputSchema: {
          type: 'object',
          properties: {
            ips: {
              type: 'string',
              description: 'Comma-separated IPs or CIDR ranges to filter by.',
            },
            severities: {
              type: 'string',
              description: 'Comma-separated Qualys severity levels to filter by (1–5, where 5 is critical).',
            },
            qids: {
              type: 'string',
              description: 'Comma-separated Qualys vulnerability IDs (QIDs) to filter for.',
            },
            status: {
              type: 'string',
              description: 'Detection status filter: New, Active, Re-Opened, Fixed (default: all).',
            },
            truncation_limit: {
              type: 'number',
              description: 'Maximum host records to return (default: 1000).',
            },
          },
        },
      },
      {
        name: 'launch_vm_scan',
        description:
          'Launch a Qualys VM vulnerability scan against specified IP targets using a named or ID-referenced option profile.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_title: {
              type: 'string',
              description: 'Display name for the scan.',
            },
            targets: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of IPs or CIDR ranges to scan.',
            },
            option_id: {
              type: 'string',
              description: 'Numeric option profile ID. Use option_id OR option_title.',
            },
            option_title: {
              type: 'string',
              description: 'Option profile title. Used if option_id is not provided.',
            },
            scanner_name: {
              type: 'string',
              description: 'Scanner appliance name for on-premises scanning.',
            },
            asset_group_title: {
              type: 'string',
              description: 'Asset group title to scan instead of explicit IPs.',
            },
          },
          required: ['scan_title', 'targets'],
        },
      },
      {
        name: 'list_vm_scans',
        description:
          'List VM vulnerability scans in your Qualys account with status, launch date, and scan reference.',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter by scan state: Running, Paused, Canceled, Finished, Error, Queued, Loading.',
            },
            launched_after_datetime: {
              type: 'string',
              description: 'ISO 8601 datetime — return only scans launched after this time.',
            },
            scan_ref: {
              type: 'string',
              description: 'Filter to a specific scan reference (e.g. scan/1234567890.12345).',
            },
          },
        },
      },
      {
        name: 'get_scan_results',
        description:
          'Fetch the results of a completed Qualys VM scan by its scan reference.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_ref: {
              type: 'string',
              description: 'Scan reference in the form scan/NNNNNNNNNN.NNNNN (from launch_vm_scan or list_vm_scans).',
            },
            ips: {
              type: 'string',
              description: 'Comma-separated IPs to limit results to specific hosts.',
            },
          },
          required: ['scan_ref'],
        },
      },
      {
        name: 'list_asset_groups',
        description:
          'List asset groups defined in Qualys, showing their names, IDs, and associated IP ranges.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Filter by asset group title (substring match).',
            },
            ids: {
              type: 'string',
              description: 'Comma-separated asset group IDs to retrieve.',
            },
          },
        },
      },
      {
        name: 'get_knowledgebase',
        description:
          'Download vulnerability definitions from the Qualys KnowledgeBase (QIDs), optionally filtering by date modified or specific QIDs.',
        inputSchema: {
          type: 'object',
          properties: {
            details: {
              type: 'string',
              description: 'Detail level: Basic, All, or None (default: Basic).',
            },
            last_modified_after: {
              type: 'string',
              description: 'Return only vulnerabilities modified after this date (YYYY-MM-DD).',
            },
            qids: {
              type: 'string',
              description: 'Comma-separated QIDs to fetch specific vulnerability definitions.',
            },
            severities: {
              type: 'string',
              description: 'Comma-separated Qualys severity levels to filter by (1–5).',
            },
          },
        },
      },
      {
        name: 'list_reports',
        description:
          'List saved Qualys reports in your account with their IDs, titles, types, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Filter to a specific report ID.',
            },
            state: {
              type: 'string',
              description: 'Filter by report state: Running, Finished, Scheduled.',
            },
          },
        },
      },
      {
        name: 'launch_report',
        description:
          'Launch a Qualys scan report, patch report, or remediation report using a saved report template.',
        inputSchema: {
          type: 'object',
          properties: {
            report_title: {
              type: 'string',
              description: 'Display name for the generated report.',
            },
            template_id: {
              type: 'string',
              description: 'Report template ID.',
            },
            report_format: {
              type: 'string',
              description: 'Output format: PDF, HTML, MHT, XML, CSV, or DOCX (default: PDF).',
            },
            ips: {
              type: 'string',
              description: 'Comma-separated IPs or CIDR ranges to scope the report.',
            },
            asset_group_title: {
              type: 'string',
              description: 'Scope the report to a named asset group.',
            },
          },
          required: ['report_title', 'template_id'],
        },
      },
      {
        name: 'list_web_apps',
        description:
          'Search and list web applications registered in the Qualys WAS (Web Application Scanning) module.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of web apps to return (default: 50).',
            },
            name_filter: {
              type: 'string',
              description: 'Filter web apps by name substring.',
            },
            url_filter: {
              type: 'string',
              description: 'Filter by URL substring.',
            },
          },
        },
      },
      {
        name: 'launch_was_scan',
        description:
          'Launch a Qualys Web Application Security scan against a registered web application.',
        inputSchema: {
          type: 'object',
          properties: {
            scan_name: {
              type: 'string',
              description: 'Display name for the WAS scan.',
            },
            web_app_id: {
              type: 'string',
              description: 'Qualys WAS web application ID to scan.',
            },
            type: {
              type: 'string',
              description: 'Scan type: VULNERABILITY or DISCOVERY (default: VULNERABILITY).',
            },
            scanner_appliance_type: {
              type: 'string',
              description: 'Scanner type: EXTERNAL or INTERNAL (default: EXTERNAL).',
            },
            profile_id: {
              type: 'string',
              description: 'Scan profile/option ID (optional).',
            },
          },
          required: ['scan_name', 'web_app_id'],
        },
      },
      {
        name: 'list_was_scans',
        description:
          'List WAS (Web Application Scanning) scans in your Qualys account with status and associated web app.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by scan status: SUBMITTED, RUNNING, FINISHED, ERROR, CANCELED.',
            },
            web_app_id: {
              type: 'string',
              description: 'Filter scans to a specific web application ID.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of scans to return (default: 50).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_host_assets':
          return await this.listHostAssets(args);
        case 'list_host_detections':
          return await this.listHostDetections(args);
        case 'launch_vm_scan':
          return await this.launchVmScan(args);
        case 'list_vm_scans':
          return await this.listVmScans(args);
        case 'get_scan_results':
          return await this.getScanResults(args);
        case 'list_asset_groups':
          return await this.listAssetGroups(args);
        case 'get_knowledgebase':
          return await this.getKnowledgebase(args);
        case 'list_reports':
          return await this.listReports(args);
        case 'launch_report':
          return await this.launchReport(args);
        case 'list_web_apps':
          return await this.listWebApps(args);
        case 'launch_was_scan':
          return await this.launchWasScan(args);
        case 'list_was_scans':
          return await this.listWasScans(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Most Qualys V2 APIs return XML. We return the raw XML as text — the LLM
   * can parse key fields from the structured XML text.
   */
  private textResult(text: string): ToolResult {
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async formPost(path: string, params: URLSearchParams): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.formHeaders,
      body: params.toString(),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Qualys API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return this.textResult(await response.text());
  }

  private async listHostAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'list', truncation_limit: String(args.truncation_limit ?? 1000) });
    if (args.ips) params.set('ips', args.ips as string);
    if (args.os_pattern) params.set('os_pattern', args.os_pattern as string);
    if (args.last_scan_date_after) params.set('last_scan_date_after', args.last_scan_date_after as string);
    if (args.id_min !== undefined) params.set('id_min', String(args.id_min));
    return this.formPost('/api/2.0/fo/asset/host/', params);
  }

  private async listHostDetections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'list' });
    if (args.ips) params.set('ips', args.ips as string);
    if (args.severities) params.set('severities', args.severities as string);
    if (args.qids) params.set('qids', args.qids as string);
    if (args.status) params.set('status', args.status as string);
    if (args.truncation_limit !== undefined) params.set('truncation_limit', String(args.truncation_limit));
    return this.formPost('/api/2.0/fo/asset/host/vm/detection/', params);
  }

  private async launchVmScan(args: Record<string, unknown>): Promise<ToolResult> {
    const targets = args.targets as string[];
    if (!targets || targets.length === 0) {
      return { content: [{ type: 'text', text: 'targets is required' }], isError: true };
    }
    const params = new URLSearchParams({
      action: 'launch',
      scan_title: args.scan_title as string,
      ip: targets.join(','),
    });
    if (args.option_id) params.set('option_id', args.option_id as string);
    else if (args.option_title) params.set('option_title', args.option_title as string);
    if (args.scanner_name) params.set('iscanner_name', args.scanner_name as string);
    if (args.asset_group_title) params.set('asset_group_title', args.asset_group_title as string);
    return this.formPost('/api/2.0/fo/scan/', params);
  }

  private async listVmScans(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'list' });
    if (args.state) params.set('state', args.state as string);
    if (args.launched_after_datetime) params.set('launched_after_datetime', args.launched_after_datetime as string);
    if (args.scan_ref) params.set('scan_ref', args.scan_ref as string);
    return this.formPost('/api/2.0/fo/scan/', params);
  }

  private async getScanResults(args: Record<string, unknown>): Promise<ToolResult> {
    const scanRef = args.scan_ref as string;
    if (!scanRef) {
      return { content: [{ type: 'text', text: 'scan_ref is required (e.g. scan/1234567890.12345)' }], isError: true };
    }
    const params = new URLSearchParams({ action: 'fetch', scan_ref: scanRef });
    if (args.ips) params.set('ips', args.ips as string);
    return this.formPost('/api/2.0/fo/scan/', params);
  }

  private async listAssetGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'list' });
    if (args.title) params.set('title', args.title as string);
    if (args.ids) params.set('ids', args.ids as string);
    return this.formPost('/api/2.0/fo/asset/group/', params);
  }

  private async getKnowledgebase(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'list', details: (args.details as string) ?? 'Basic' });
    if (args.last_modified_after) params.set('last_modified_by_service_after', args.last_modified_after as string);
    if (args.qids) params.set('qids', args.qids as string);
    if (args.severities) params.set('severities', args.severities as string);
    return this.formPost('/api/2.0/fo/knowledge_base/vuln/', params);
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'list' });
    if (args.id) params.set('id', args.id as string);
    if (args.state) params.set('state', args.state as string);
    return this.formPost('/api/2.0/fo/report/', params);
  }

  private async launchReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      action: 'launch',
      report_title: args.report_title as string,
      template_id: args.template_id as string,
      report_format: (args.report_format as string) ?? 'PDF',
    });
    if (args.ips) params.set('ips', args.ips as string);
    if (args.asset_group_title) params.set('asset_group_title', args.asset_group_title as string);
    return this.formPost('/api/2.0/fo/report/', params);
  }

  private async listWebApps(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    let filterXml = '';
    const filters: string[] = [];
    if (args.name_filter) {
      filters.push(`<Criteria field="name" operator="CONTAINS">${encodeURIComponent(args.name_filter as string)}</Criteria>`);
    }
    if (args.url_filter) {
      filters.push(`<Criteria field="url" operator="CONTAINS">${encodeURIComponent(args.url_filter as string)}</Criteria>`);
    }
    if (filters.length > 0) {
      filterXml = `\n  <filters>${filters.join('')}</filters>`;
    }

    const serviceRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ServiceRequest>
  <preferences>
    <limitResults>${limit}</limitResults>
  </preferences>${filterXml}
</ServiceRequest>`;

    const response = await this.fetchWithRetry(`${this.baseUrl}/qps/rest/3.0/search/was/webapp`, {
      method: 'POST',
      headers: this.xmlHeaders,
      body: serviceRequest,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Qualys WAS API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return this.textResult(await response.text());
  }

  private async launchWasScan(args: Record<string, unknown>): Promise<ToolResult> {
    const webAppId = args.web_app_id as string;
    if (!webAppId) {
      return { content: [{ type: 'text', text: 'web_app_id is required' }], isError: true };
    }
    const scanType = (args.type as string) ?? 'VULNERABILITY';
    const appliance = (args.scanner_appliance_type as string) ?? 'EXTERNAL';

    let profileXml = '';
    if (args.profile_id) {
      profileXml = `\n    <profile><id>${encodeURIComponent(args.profile_id as string)}</id></profile>`;
    }

    const serviceRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ServiceRequest>
  <data>
    <WasScan>
      <name>${encodeURIComponent(args.scan_name as string)}</name>
      <type>${scanType}</type>
      <target>
        <webApp><id>${webAppId}</id></webApp>
        <scannerAppliance><type>${appliance}</type></scannerAppliance>
      </target>${profileXml}
    </WasScan>
  </data>
</ServiceRequest>`;

    const response = await this.fetchWithRetry(`${this.baseUrl}/qps/rest/3.0/launch/was/wasscan`, {
      method: 'POST',
      headers: this.xmlHeaders,
      body: serviceRequest,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Qualys WAS API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return this.textResult(await response.text());
  }

  private async listWasScans(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const filters: string[] = [];
    if (args.status) {
      filters.push(`<Criteria field="status" operator="EQUALS">${encodeURIComponent(args.status as string)}</Criteria>`);
    }
    if (args.web_app_id) {
      filters.push(`<Criteria field="webApp.id" operator="EQUALS">${encodeURIComponent(args.web_app_id as string)}</Criteria>`);
    }

    let filterXml = '';
    if (filters.length > 0) {
      filterXml = `\n  <filters>${filters.join('')}</filters>`;
    }

    const serviceRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ServiceRequest>
  <preferences>
    <limitResults>${limit}</limitResults>
  </preferences>${filterXml}
</ServiceRequest>`;

    const response = await this.fetchWithRetry(`${this.baseUrl}/qps/rest/3.0/search/was/wasscan`, {
      method: 'POST',
      headers: this.xmlHeaders,
      body: serviceRequest,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Qualys WAS API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return this.textResult(await response.text());
  }
}
