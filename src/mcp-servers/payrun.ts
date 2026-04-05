/**
 * PayRun.IO MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.test.payrun.io (test / sandbox)
//           https://api.payrun.io (production)
// Auth: OAuth 1.0a — pass a pre-computed Authorization header value per request.
//   Each request also requires Api-Version header (use "default" for the current version).
// Docs: https://developer.test.payrun.io/docs
// Rate limits: Not publicly documented; treat as standard REST API.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PayRunConfig {
  /** Pre-computed OAuth 1.0a Authorization header value */
  authorizationHeader: string;
  /** API version to target. Defaults to "default" (current version). */
  apiVersion?: string;
  /** Base URL. Defaults to https://api.payrun.io (production). */
  baseUrl?: string;
}

export class PayRunMCPServer extends MCPAdapterBase {
  private readonly authorizationHeader: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(config: PayRunConfig) {
    super();
    this.authorizationHeader = config.authorizationHeader;
    this.apiVersion = config.apiVersion || 'default';
    this.baseUrl = config.baseUrl || 'https://api.payrun.io';
  }

  static catalog() {
    return {
      name: 'payrun',
      displayName: 'PayRun.IO',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['payrun', 'payroll', 'employer', 'employee', 'pay run', 'uk payroll'],
      toolNames: [
        'list_employers',
        'get_employer',
        'create_employer',
        'list_employees',
        'get_employee',
        'create_employee',
        'list_pay_schedules',
        'get_pay_schedule',
        'list_pay_runs',
        'get_pay_run',
        'get_pay_run_employees',
        'get_pay_run_pay_lines',
        'list_pay_instructions',
        'get_pay_instruction',
        'create_pay_instruction',
        'delete_pay_instruction',
      ],
      description: 'PayRun.IO open payroll API adapter — manage employers, employees, pay schedules, pay runs, and pay instructions.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Employers
      {
        name: 'list_employers',
        description: 'List all employers accessible to the authenticated account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_employer',
        description: 'Retrieve a single employer record by employer ID.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
          },
          required: ['employerId'],
        },
      },
      {
        name: 'create_employer',
        description: 'Create a new employer record. Pass employer fields as a JSON body object.',
        inputSchema: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              description: 'Employer object. Common fields: EffectiveDate (YYYY-MM-DD), Name, Region (England/Scotland/Wales), Territory (UnitedKingdom), BankAccount, HmrcSettings.',
            },
          },
          required: ['body'],
        },
      },
      // Employees
      {
        name: 'list_employees',
        description: 'List all employees for a given employer.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
          },
          required: ['employerId'],
        },
      },
      {
        name: 'get_employee',
        description: 'Retrieve a single employee record by employer ID and employee ID.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            employeeId: {
              type: 'string',
              description: 'Unique identifier of the employee.',
            },
          },
          required: ['employerId', 'employeeId'],
        },
      },
      {
        name: 'create_employee',
        description: 'Create a new employee record under an employer.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            body: {
              type: 'object',
              description: 'Employee object. Common fields: EffectiveDate (YYYY-MM-DD), Title, FirstName, LastName, NiNumber, DateOfBirth, Gender, Address, Territory.',
            },
          },
          required: ['employerId', 'body'],
        },
      },
      // Pay Schedules
      {
        name: 'list_pay_schedules',
        description: 'List all pay schedules for a given employer.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
          },
          required: ['employerId'],
        },
      },
      {
        name: 'get_pay_schedule',
        description: 'Retrieve a single pay schedule by employer ID and pay schedule ID.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            payScheduleId: {
              type: 'string',
              description: 'Unique identifier of the pay schedule.',
            },
          },
          required: ['employerId', 'payScheduleId'],
        },
      },
      // Pay Runs
      {
        name: 'list_pay_runs',
        description: 'List all pay runs within a pay schedule.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            payScheduleId: {
              type: 'string',
              description: 'Unique identifier of the pay schedule.',
            },
          },
          required: ['employerId', 'payScheduleId'],
        },
      },
      {
        name: 'get_pay_run',
        description: 'Retrieve the details of a specific pay run.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            payScheduleId: {
              type: 'string',
              description: 'Unique identifier of the pay schedule.',
            },
            payRunId: {
              type: 'string',
              description: 'Unique identifier of the pay run.',
            },
          },
          required: ['employerId', 'payScheduleId', 'payRunId'],
        },
      },
      {
        name: 'get_pay_run_employees',
        description: 'List employees included in a specific pay run with their pay run summary.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            payScheduleId: {
              type: 'string',
              description: 'Unique identifier of the pay schedule.',
            },
            payRunId: {
              type: 'string',
              description: 'Unique identifier of the pay run.',
            },
          },
          required: ['employerId', 'payScheduleId', 'payRunId'],
        },
      },
      {
        name: 'get_pay_run_pay_lines',
        description: 'Retrieve all pay lines for a specific pay run, showing individual earnings, deductions, and calculations.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            payScheduleId: {
              type: 'string',
              description: 'Unique identifier of the pay schedule.',
            },
            payRunId: {
              type: 'string',
              description: 'Unique identifier of the pay run.',
            },
          },
          required: ['employerId', 'payScheduleId', 'payRunId'],
        },
      },
      // Pay Instructions
      {
        name: 'list_pay_instructions',
        description: 'List all pay instructions for an employee. Pay instructions define how an employee is paid (salary, deductions, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            employeeId: {
              type: 'string',
              description: 'Unique identifier of the employee.',
            },
          },
          required: ['employerId', 'employeeId'],
        },
      },
      {
        name: 'get_pay_instruction',
        description: 'Retrieve a specific pay instruction by ID for an employee.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            employeeId: {
              type: 'string',
              description: 'Unique identifier of the employee.',
            },
            payInstructionId: {
              type: 'string',
              description: 'Unique identifier of the pay instruction.',
            },
          },
          required: ['employerId', 'employeeId', 'payInstructionId'],
        },
      },
      {
        name: 'create_pay_instruction',
        description: 'Create a new pay instruction for an employee (e.g. salary, bonus, deduction).',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            employeeId: {
              type: 'string',
              description: 'Unique identifier of the employee.',
            },
            body: {
              type: 'object',
              description: 'Pay instruction object. Common fields: StartDate (YYYY-MM-DD), EndDate, PayCode, AnnualValue, MonthlyValue, or HourlyValue, Description.',
            },
          },
          required: ['employerId', 'employeeId', 'body'],
        },
      },
      {
        name: 'delete_pay_instruction',
        description: 'Delete a pay instruction for an employee by pay instruction ID.',
        inputSchema: {
          type: 'object',
          properties: {
            employerId: {
              type: 'string',
              description: 'Unique identifier of the employer.',
            },
            employeeId: {
              type: 'string',
              description: 'Unique identifier of the employee.',
            },
            payInstructionId: {
              type: 'string',
              description: 'Unique identifier of the pay instruction to delete.',
            },
          },
          required: ['employerId', 'employeeId', 'payInstructionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_employers':
          return await this.request('GET', '/Employers');
        case 'get_employer':
          return await this.request('GET', `/Employer/${enc(args.employerId)}`);
        case 'create_employer':
          return await this.request('POST', '/Employers', args.body);
        case 'list_employees':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/Employees`);
        case 'get_employee':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/Employee/${enc(args.employeeId)}`);
        case 'create_employee':
          return await this.request('POST', `/Employer/${enc(args.employerId)}/Employees`, args.body);
        case 'list_pay_schedules':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/PaySchedules`);
        case 'get_pay_schedule':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/PaySchedule/${enc(args.payScheduleId)}`);
        case 'list_pay_runs':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/PaySchedule/${enc(args.payScheduleId)}/PayRuns`);
        case 'get_pay_run':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/PaySchedule/${enc(args.payScheduleId)}/PayRun/${enc(args.payRunId)}`);
        case 'get_pay_run_employees':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/PaySchedule/${enc(args.payScheduleId)}/PayRun/${enc(args.payRunId)}/Employees`);
        case 'get_pay_run_pay_lines':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/PaySchedule/${enc(args.payScheduleId)}/PayRun/${enc(args.payRunId)}/PayLines`);
        case 'list_pay_instructions':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/Employee/${enc(args.employeeId)}/PayInstructions`);
        case 'get_pay_instruction':
          return await this.request('GET', `/Employer/${enc(args.employerId)}/Employee/${enc(args.employeeId)}/PayInstruction/${enc(args.payInstructionId)}`);
        case 'create_pay_instruction':
          return await this.request('POST', `/Employer/${enc(args.employerId)}/Employee/${enc(args.employeeId)}/PayInstructions`, args.body);
        case 'delete_pay_instruction':
          return await this.request('DELETE', `/Employer/${enc(args.employerId)}/Employee/${enc(args.employeeId)}/PayInstruction/${enc(args.payInstructionId)}`);
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
      Authorization: this.authorizationHeader,
      'Api-Version': this.apiVersion,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = { method, headers: this.headers };
    if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `PayRun.IO API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`PayRun.IO returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

function enc(value: unknown): string {
  return encodeURIComponent(String(value ?? ''));
}
