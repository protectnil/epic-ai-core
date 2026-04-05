/**
 * Sprinto MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Sprinto MCP server was found on GitHub, npm, or Splunkbase.
//
// Base URL: https://app.sprinto.com/dev-api/graphql  (GraphQL endpoint — US region default)
//   Regional variants: US, Europe, India — exact regional URLs not publicly documented
//   in searchable form; the config baseUrl field allows override per region.
// Auth: API key header — api-key: <YOUR_API_KEY>
//       Generated in Sprinto UI by any admin under Settings → Developer API.
// Docs: https://developer.sprinto.com/docs/sprinto-developer-api-documentation
//       https://developer.sprinto.com/docs/quick-start
// Rate limits: Rate-limited by IP address and API key. Exact limits not publicly documented.
//              Uses GraphQL — all requests are POST to a single endpoint.
//              GraphQL schema is available via the Sprinto API Playground (region-specific).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SprintoConfig {
  apiKey: string;
  baseUrl?: string;
}

export class SprintoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SprintoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://app.sprinto.com/dev-api/graphql';
  }

  static catalog() {
    return {
      name: 'sprinto',
      displayName: 'Sprinto',
      version: '1.0.0',
      category: 'compliance',
      keywords: [
        'sprinto', 'compliance', 'soc2', 'iso27001', 'gdpr', 'hipaa', 'grc', 'risk',
        'control', 'evidence', 'audit', 'vendor', 'policy', 'employee', 'trust center',
      ],
      toolNames: [
        'list_controls', 'get_control', 'list_risks', 'get_risk',
        'list_employees', 'get_employee', 'list_evidence', 'get_evidence',
        'list_vendors', 'get_vendor', 'list_policies', 'get_policy',
      ],
      description: 'Sprinto compliance automation: query security controls, risk registers, employee records, evidence, vendor assessments, and policies via GraphQL API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_controls',
        description: 'List compliance controls with optional filters for status and framework',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by control status: passing, failing, not_applicable, in_progress (optional)',
            },
            framework: {
              type: 'string',
              description: 'Filter by framework: soc2, iso27001, hipaa, gdpr, pci_dss (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_control',
        description: 'Get detailed information for a specific compliance control by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Control ID from list_controls',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'list_risks',
        description: 'List risks in the risk register with optional filters for severity and status',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              description: 'Filter by risk severity: critical, high, medium, low (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by treatment status: accepted, mitigated, open (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_risk',
        description: 'Get full details for a specific risk including likelihood, impact, and treatment plan',
        inputSchema: {
          type: 'object',
          properties: {
            risk_id: {
              type: 'string',
              description: 'Risk ID from list_risks',
            },
          },
          required: ['risk_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'List employees in the Sprinto compliance program with onboarding and training status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by onboarding status: onboarded, not_onboarded, offboarded (optional)',
            },
            department: {
              type: 'string',
              description: 'Filter by department name (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Get compliance details for a specific employee including training completion and background check status',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Employee ID from list_employees',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_evidence',
        description: 'List evidence items collected for compliance controls with optional control and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'Filter evidence by parent control ID (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by evidence status: approved, rejected, pending (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_evidence',
        description: 'Get details for a specific evidence item including upload date, reviewer, and linked controls',
        inputSchema: {
          type: 'object',
          properties: {
            evidence_id: {
              type: 'string',
              description: 'Evidence ID from list_evidence',
            },
          },
          required: ['evidence_id'],
        },
      },
      {
        name: 'list_vendors',
        description: 'List third-party vendors in the vendor risk management register with risk tier and review status',
        inputSchema: {
          type: 'object',
          properties: {
            risk_tier: {
              type: 'string',
              description: 'Filter by risk tier: critical, high, medium, low (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by review status: approved, pending, rejected (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get detailed vendor risk assessment information for a specific vendor including questionnaire responses',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'Vendor ID from list_vendors',
            },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List security and compliance policies with their version, owner, and approval status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by policy status: approved, draft, under_review (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get the full details of a specific policy including content, version history, and acknowledged employees',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Policy ID from list_policies',
            },
          },
          required: ['policy_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_controls':
          return this.listControls(args);
        case 'get_control':
          return this.getControl(args);
        case 'list_risks':
          return this.listRisks(args);
        case 'get_risk':
          return this.getRisk(args);
        case 'list_employees':
          return this.listEmployees(args);
        case 'get_employee':
          return this.getEmployee(args);
        case 'list_evidence':
          return this.listEvidence(args);
        case 'get_evidence':
          return this.getEvidence(args);
        case 'list_vendors':
          return this.listVendors(args);
        case 'get_vendor':
          return this.getVendor(args);
        case 'list_policies':
          return this.listPolicies(args);
        case 'get_policy':
          return this.getPolicy(args);
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
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async graphql(query: string, variables: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { data?: unknown; errors?: Array<{ message: string }> };
    if (data.errors && data.errors.length > 0) {
      return { content: [{ type: 'text', text: `GraphQL error: ${data.errors.map((e) => e.message).join(', ')}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data.data) }], isError: false };
  }

  private paginationArgs(args: Record<string, unknown>): Record<string, unknown> {
    return {
      page: (args.page as number) || 1,
      perPage: (args.per_page as number) || 20,
    };
  }

  private async listControls(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query ListControls($page: Int, $perPage: Int, $status: String, $framework: String) {
        controls(page: $page, perPage: $perPage, status: $status, framework: $framework) {
          id
          name
          status
          description
          framework
          owner { id name email }
          testsPassing
          testsFailing
          updatedAt
        }
      }
    `;
    const variables: Record<string, unknown> = { ...this.paginationArgs(args) };
    if (args.status) variables.status = args.status;
    if (args.framework) variables.framework = args.framework;
    return this.graphql(query, variables);
  }

  private async getControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.control_id) return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
    const query = `
      query GetControl($id: ID!) {
        control(id: $id) {
          id
          name
          status
          description
          framework
          owner { id name email }
          tests { id name status lastRunAt }
          evidence { id name status uploadedAt }
          updatedAt
        }
      }
    `;
    return this.graphql(query, { id: args.control_id });
  }

  private async listRisks(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query ListRisks($page: Int, $perPage: Int, $severity: String, $status: String) {
        risks(page: $page, perPage: $perPage, severity: $severity, status: $status) {
          id
          name
          severity
          status
          likelihood
          impact
          riskScore
          owner { id name email }
          updatedAt
        }
      }
    `;
    const variables: Record<string, unknown> = { ...this.paginationArgs(args) };
    if (args.severity) variables.severity = args.severity;
    if (args.status) variables.status = args.status;
    return this.graphql(query, variables);
  }

  private async getRisk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.risk_id) return { content: [{ type: 'text', text: 'risk_id is required' }], isError: true };
    const query = `
      query GetRisk($id: ID!) {
        risk(id: $id) {
          id
          name
          severity
          status
          likelihood
          impact
          riskScore
          description
          treatmentPlan
          owner { id name email }
          controls { id name status }
          updatedAt
        }
      }
    `;
    return this.graphql(query, { id: args.risk_id });
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query ListEmployees($page: Int, $perPage: Int, $status: String, $department: String) {
        employees(page: $page, perPage: $perPage, status: $status, department: $department) {
          id
          name
          email
          department
          status
          onboardedAt
          trainingCompleted
          backgroundCheckStatus
        }
      }
    `;
    const variables: Record<string, unknown> = { ...this.paginationArgs(args) };
    if (args.status) variables.status = args.status;
    if (args.department) variables.department = args.department;
    return this.graphql(query, variables);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const query = `
      query GetEmployee($id: ID!) {
        employee(id: $id) {
          id
          name
          email
          department
          status
          onboardedAt
          offboardedAt
          trainingCompleted
          trainingCompletedAt
          backgroundCheckStatus
          backgroundCheckCompletedAt
          policies { id name acknowledgedAt }
        }
      }
    `;
    return this.graphql(query, { id: args.employee_id });
  }

  private async listEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query ListEvidence($page: Int, $perPage: Int, $controlId: ID, $status: String) {
        evidences(page: $page, perPage: $perPage, controlId: $controlId, status: $status) {
          id
          name
          status
          uploadedAt
          reviewedAt
          control { id name }
        }
      }
    `;
    const variables: Record<string, unknown> = { ...this.paginationArgs(args) };
    if (args.control_id) variables.controlId = args.control_id;
    if (args.status) variables.status = args.status;
    return this.graphql(query, variables);
  }

  private async getEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.evidence_id) return { content: [{ type: 'text', text: 'evidence_id is required' }], isError: true };
    const query = `
      query GetEvidence($id: ID!) {
        evidence(id: $id) {
          id
          name
          status
          description
          uploadedAt
          reviewedAt
          reviewer { id name email }
          control { id name status }
          fileUrl
        }
      }
    `;
    return this.graphql(query, { id: args.evidence_id });
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query ListVendors($page: Int, $perPage: Int, $riskTier: String, $status: String) {
        vendors(page: $page, perPage: $perPage, riskTier: $riskTier, status: $status) {
          id
          name
          riskTier
          status
          website
          reviewedAt
          owner { id name email }
        }
      }
    `;
    const variables: Record<string, unknown> = { ...this.paginationArgs(args) };
    if (args.risk_tier) variables.riskTier = args.risk_tier;
    if (args.status) variables.status = args.status;
    return this.graphql(query, variables);
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vendor_id) return { content: [{ type: 'text', text: 'vendor_id is required' }], isError: true };
    const query = `
      query GetVendor($id: ID!) {
        vendor(id: $id) {
          id
          name
          riskTier
          status
          website
          description
          dataAccess
          reviewedAt
          owner { id name email }
          controls { id name status }
        }
      }
    `;
    return this.graphql(query, { id: args.vendor_id });
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query ListPolicies($page: Int, $perPage: Int, $status: String) {
        policies(page: $page, perPage: $perPage, status: $status) {
          id
          name
          status
          version
          approvedAt
          owner { id name email }
          acknowledgedCount
        }
      }
    `;
    const variables: Record<string, unknown> = { ...this.paginationArgs(args) };
    if (args.status) variables.status = args.status;
    return this.graphql(query, variables);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    const query = `
      query GetPolicy($id: ID!) {
        policy(id: $id) {
          id
          name
          status
          version
          description
          content
          approvedAt
          owner { id name email }
          acknowledgedCount
          acknowledgedEmployees { id name email acknowledgedAt }
        }
      }
    `;
    return this.graphql(query, { id: args.policy_id });
  }
}
