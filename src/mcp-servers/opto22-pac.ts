/**
 * Opto 22 PAC Control REST API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Opto 22 PAC MCP server was found on GitHub or npm.
//
// Base URL: https://{controller-ip}/api/v1  (controller IP/host set via config.controllerHost)
// Auth: HTTP Basic Authentication — API key ID as userid, API key value as password
// Docs: http://developer.opto22.com
// Rate limits: Not documented. JSON payload per request should not exceed 3KB (3072 bytes).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Opto22PACConfig {
  /** IP address or hostname of the SNAP-PAC-R or SNAP-PAC-S series controller */
  controllerHost: string;
  /** API key ID (used as Basic Auth username) */
  apiKeyId: string;
  /** API key value (used as Basic Auth password) */
  apiKeyValue: string;
  /** Optional full base URL override (default: https://{controllerHost}/api/v1) */
  baseUrl?: string;
}

export class Opto22PACMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: Opto22PACConfig) {
    super();
    this.baseUrl = config.baseUrl ?? `https://${config.controllerHost}/api/v1`;
    this.authHeader = `Basic ${Buffer.from(`${config.apiKeyId}:${config.apiKeyValue}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'opto22-pac',
      displayName: 'Opto 22 PAC Control',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'opto22', 'pac', 'snap-pac', 'plc', 'controller', 'industrial', 'iot',
        'automation', 'analog', 'digital', 'io', 'strategy', 'tags', 'variables',
        'tables', 'timer', 'float', 'integer', 'sensor', 'actuator', 'scada',
      ],
      toolNames: [
        'get_device_details', 'get_strategy_details',
        'list_analog_inputs', 'read_analog_input',
        'list_analog_outputs', 'read_analog_output', 'write_analog_output',
        'list_digital_inputs', 'read_digital_input',
        'list_digital_outputs', 'read_digital_output', 'write_digital_output',
        'list_float_tables', 'read_float_table', 'write_float_table',
        'read_float_table_element', 'write_float_table_element',
        'list_int32_tables', 'read_int32_table', 'write_int32_table',
        'read_int32_table_element', 'write_int32_table_element',
        'list_int64_tables', 'read_int64_table', 'write_int64_table',
        'read_int64_table_element', 'write_int64_table_element',
        'list_string_tables', 'read_string_table', 'write_string_table',
        'read_string_table_element', 'write_string_table_element',
        'list_float_vars', 'read_float_var', 'write_float_var',
        'list_int32_vars', 'read_int32_var', 'write_int32_var',
        'list_int64_vars', 'read_int64_var', 'write_int64_var',
        'list_string_vars', 'read_string_var', 'write_string_var',
        'list_up_timers', 'read_up_timer',
        'list_down_timers', 'read_down_timer',
      ],
      description: 'SNAP-PAC controller I/O and strategy access: read/write analog and digital I/O points, numeric and string tables, variables, and timer values.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Device & Strategy
      {
        name: 'get_device_details',
        description: 'Get SNAP-PAC controller type, firmware version, MAC addresses, and uptime in seconds',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_strategy_details',
        description: 'Get the name, date, time, CRC, and running chart count of the strategy loaded on the PAC controller',
        inputSchema: { type: 'object', properties: {} },
      },
      // Analog Inputs
      {
        name: 'list_analog_inputs',
        description: 'List all analog input points in the PAC strategy with their names and current engineering unit values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_analog_input',
        description: 'Read the current engineering unit value of a single named analog input point from the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            io_name: {
              type: 'string',
              description: 'Name of the analog input point as defined in the PAC strategy (e.g. aiTemperatureF)',
            },
          },
          required: ['io_name'],
        },
      },
      // Analog Outputs
      {
        name: 'list_analog_outputs',
        description: 'List all analog output points in the PAC strategy with their names and current engineering unit values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_analog_output',
        description: 'Read the current engineering unit value of a single named analog output point from the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            io_name: {
              type: 'string',
              description: 'Name of the analog output point as defined in the PAC strategy',
            },
          },
          required: ['io_name'],
        },
      },
      {
        name: 'write_analog_output',
        description: 'Set the engineering unit value of a named analog output point on the PAC controller',
        inputSchema: {
          type: 'object',
          properties: {
            io_name: {
              type: 'string',
              description: 'Name of the analog output point to write',
            },
            value: {
              type: 'number',
              description: 'Engineering unit value to write to the analog output',
            },
          },
          required: ['io_name', 'value'],
        },
      },
      // Digital Inputs
      {
        name: 'list_digital_inputs',
        description: 'List all digital input points in the PAC strategy with their names and on/off states (true=on, false=off)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_digital_input',
        description: 'Read the on/off state of a single named digital input point from the PAC strategy (true=on, false=off)',
        inputSchema: {
          type: 'object',
          properties: {
            io_name: {
              type: 'string',
              description: 'Name of the digital input point as defined in the PAC strategy',
            },
          },
          required: ['io_name'],
        },
      },
      // Digital Outputs
      {
        name: 'list_digital_outputs',
        description: 'List all digital output points in the PAC strategy with their names and on/off states (true=on, false=off)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_digital_output',
        description: 'Read the on/off state of a single named digital output point from the PAC strategy (true=on, false=off)',
        inputSchema: {
          type: 'object',
          properties: {
            io_name: {
              type: 'string',
              description: 'Name of the digital output point as defined in the PAC strategy',
            },
          },
          required: ['io_name'],
        },
      },
      {
        name: 'write_digital_output',
        description: 'Set the on/off state of a named digital output point on the PAC controller (true=on, false=off)',
        inputSchema: {
          type: 'object',
          properties: {
            io_name: {
              type: 'string',
              description: 'Name of the digital output point to write',
            },
            state: {
              type: 'boolean',
              description: 'State to write: true = on, false = off',
            },
          },
          required: ['io_name', 'state'],
        },
      },
      // Float Tables
      {
        name: 'list_float_tables',
        description: 'List all float tables defined in the PAC strategy with their names',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_float_table',
        description: 'Read elements from a named float table in the PAC strategy, with optional start index and element count',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the float table to read',
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to read (default: 0)',
            },
            num_elements: {
              type: 'integer',
              description: 'Number of elements to read (default: all remaining from start_index)',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'write_float_table',
        description: 'Write an array of float values to a named float table in the PAC strategy, starting at an optional index',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the float table to write',
            },
            values: {
              type: 'array',
              description: 'Array of float values to write starting at start_index',
              items: { type: 'number' },
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to write (default: 0)',
            },
          },
          required: ['table_name', 'values'],
        },
      },
      {
        name: 'read_float_table_element',
        description: 'Read a single element by index from a named float table in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the float table to read from',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to read',
            },
          },
          required: ['table_name', 'index'],
        },
      },
      {
        name: 'write_float_table_element',
        description: 'Write a single float value to a specific index in a named float table in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the float table to write to',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to write',
            },
            value: {
              type: 'number',
              description: 'Float value to write at the specified index',
            },
          },
          required: ['table_name', 'index', 'value'],
        },
      },
      // Int32 Tables
      {
        name: 'list_int32_tables',
        description: 'List all integer32 tables defined in the PAC strategy with their names',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_int32_table',
        description: 'Read elements from a named integer32 table in the PAC strategy, with optional start index and element count',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer32 table to read',
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to read (default: 0)',
            },
            num_elements: {
              type: 'integer',
              description: 'Number of elements to read (default: all remaining from start_index)',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'write_int32_table',
        description: 'Write an array of integer32 values to a named table in the PAC strategy, starting at an optional index',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer32 table to write',
            },
            values: {
              type: 'array',
              description: 'Array of integer32 values to write starting at start_index',
              items: { type: 'integer' },
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to write (default: 0)',
            },
          },
          required: ['table_name', 'values'],
        },
      },
      {
        name: 'read_int32_table_element',
        description: 'Read a single element by index from a named integer32 table in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer32 table to read from',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to read',
            },
          },
          required: ['table_name', 'index'],
        },
      },
      {
        name: 'write_int32_table_element',
        description: 'Write a single integer32 value to a specific index in a named table in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer32 table to write to',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to write',
            },
            value: {
              type: 'integer',
              description: 'Integer32 value to write at the specified index',
            },
          },
          required: ['table_name', 'index', 'value'],
        },
      },
      // Int64 Tables
      {
        name: 'list_int64_tables',
        description: 'List all integer64 tables defined in the PAC strategy with their names',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_int64_table',
        description: 'Read elements from a named integer64 table in the PAC strategy, returned as strings to preserve precision',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer64 table to read',
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to read (default: 0)',
            },
            num_elements: {
              type: 'integer',
              description: 'Number of elements to read (default: all remaining from start_index)',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'write_int64_table',
        description: 'Write an array of integer64 values to a named table in the PAC strategy (values passed as strings for precision)',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer64 table to write',
            },
            values: {
              type: 'array',
              description: 'Array of integer64 values as strings (e.g. ["1234567890123"])',
              items: { type: 'string' },
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to write (default: 0)',
            },
          },
          required: ['table_name', 'values'],
        },
      },
      {
        name: 'read_int64_table_element',
        description: 'Read a single integer64 element by index from a named table in the PAC strategy (returned as string)',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer64 table to read from',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to read',
            },
          },
          required: ['table_name', 'index'],
        },
      },
      {
        name: 'write_int64_table_element',
        description: 'Write a single integer64 value to a specific index in a named table in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the integer64 table to write to',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to write',
            },
            value: {
              type: 'string',
              description: 'Integer64 value as a string to preserve precision (e.g. "9007199254740993")',
            },
          },
          required: ['table_name', 'index', 'value'],
        },
      },
      // String Tables
      {
        name: 'list_string_tables',
        description: 'List all string tables defined in the PAC strategy with their names',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_string_table',
        description: 'Read elements from a named string table in the PAC strategy, with optional start index and element count',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the string table to read',
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to read (default: 0)',
            },
            num_elements: {
              type: 'integer',
              description: 'Number of elements to read (default: all remaining from start_index)',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'write_string_table',
        description: 'Write an array of strings to a named string table in the PAC strategy; values truncated to fit column width',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the string table to write',
            },
            values: {
              type: 'array',
              description: 'Array of string values to write starting at start_index',
              items: { type: 'string' },
            },
            start_index: {
              type: 'integer',
              description: 'Index of the first element to write (default: 0)',
            },
          },
          required: ['table_name', 'values'],
        },
      },
      {
        name: 'read_string_table_element',
        description: 'Read a single element by index from a named string table in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the string table to read from',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to read',
            },
          },
          required: ['table_name', 'index'],
        },
      },
      {
        name: 'write_string_table_element',
        description: 'Write a single string value to a specific index in a named string table in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the string table to write to',
            },
            index: {
              type: 'integer',
              description: 'Zero-based index of the element to write',
            },
            value: {
              type: 'string',
              description: 'String value to write (truncated to fit column width)',
            },
          },
          required: ['table_name', 'index', 'value'],
        },
      },
      // Float Variables
      {
        name: 'list_float_vars',
        description: 'List all float variables defined in the PAC strategy with their names and current values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_float_var',
        description: 'Read the current value of a single named float variable from the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the float variable as defined in the PAC strategy',
            },
          },
          required: ['var_name'],
        },
      },
      {
        name: 'write_float_var',
        description: 'Write a new float value to a named float variable in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the float variable to write',
            },
            value: {
              type: 'number',
              description: 'Float value to write to the variable',
            },
          },
          required: ['var_name', 'value'],
        },
      },
      // Int32 Variables
      {
        name: 'list_int32_vars',
        description: 'List all integer32 variables defined in the PAC strategy with their names and current values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_int32_var',
        description: 'Read the current value of a single named integer32 variable from the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the integer32 variable as defined in the PAC strategy',
            },
          },
          required: ['var_name'],
        },
      },
      {
        name: 'write_int32_var',
        description: 'Write a new integer32 value to a named integer32 variable in the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the integer32 variable to write',
            },
            value: {
              type: 'integer',
              description: 'Integer32 value to write to the variable',
            },
          },
          required: ['var_name', 'value'],
        },
      },
      // Int64 Variables
      {
        name: 'list_int64_vars',
        description: 'List all integer64 variables defined in the PAC strategy with their names and current values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_int64_var',
        description: 'Read the current value of a single named integer64 variable from the PAC strategy (returned as string)',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the integer64 variable as defined in the PAC strategy',
            },
          },
          required: ['var_name'],
        },
      },
      {
        name: 'write_int64_var',
        description: 'Write a new integer64 value to a named integer64 variable in the PAC strategy (value passed as string)',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the integer64 variable to write',
            },
            value: {
              type: 'string',
              description: 'Integer64 value as string to preserve precision (e.g. "9007199254740993")',
            },
          },
          required: ['var_name', 'value'],
        },
      },
      // String Variables
      {
        name: 'list_string_vars',
        description: 'List all string variables defined in the PAC strategy with their names and current values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_string_var',
        description: 'Read the current value of a single named string variable from the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the string variable as defined in the PAC strategy',
            },
          },
          required: ['var_name'],
        },
      },
      {
        name: 'write_string_var',
        description: 'Write a string value to a named string variable in the PAC strategy; truncated if longer than variable width',
        inputSchema: {
          type: 'object',
          properties: {
            var_name: {
              type: 'string',
              description: 'Name of the string variable to write',
            },
            value: {
              type: 'string',
              description: 'String value to write (truncated to fit if longer than the variable width)',
            },
          },
          required: ['var_name', 'value'],
        },
      },
      // Up Timers
      {
        name: 'list_up_timers',
        description: 'List all up timer variables defined in the PAC strategy with their names and current elapsed values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_up_timer',
        description: 'Read the current elapsed value of a single named up timer variable from the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            timer_name: {
              type: 'string',
              description: 'Name of the up timer variable as defined in the PAC strategy',
            },
          },
          required: ['timer_name'],
        },
      },
      // Down Timers
      {
        name: 'list_down_timers',
        description: 'List all down timer variables defined in the PAC strategy with their names and current remaining values',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_down_timer',
        description: 'Read the current remaining value of a single named down timer variable from the PAC strategy',
        inputSchema: {
          type: 'object',
          properties: {
            timer_name: {
              type: 'string',
              description: 'Name of the down timer variable as defined in the PAC strategy',
            },
          },
          required: ['timer_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_device_details':         return this.getDeviceDetails();
        case 'get_strategy_details':       return this.getStrategyDetails();
        case 'list_analog_inputs':         return this.listAnalogInputs();
        case 'read_analog_input':          return this.readAnalogInput(args);
        case 'list_analog_outputs':        return this.listAnalogOutputs();
        case 'read_analog_output':         return this.readAnalogOutput(args);
        case 'write_analog_output':        return this.writeAnalogOutput(args);
        case 'list_digital_inputs':        return this.listDigitalInputs();
        case 'read_digital_input':         return this.readDigitalInput(args);
        case 'list_digital_outputs':       return this.listDigitalOutputs();
        case 'read_digital_output':        return this.readDigitalOutput(args);
        case 'write_digital_output':       return this.writeDigitalOutput(args);
        case 'list_float_tables':          return this.listFloatTables();
        case 'read_float_table':           return this.readFloatTable(args);
        case 'write_float_table':          return this.writeFloatTable(args);
        case 'read_float_table_element':   return this.readFloatTableElement(args);
        case 'write_float_table_element':  return this.writeFloatTableElement(args);
        case 'list_int32_tables':          return this.listInt32Tables();
        case 'read_int32_table':           return this.readInt32Table(args);
        case 'write_int32_table':          return this.writeInt32Table(args);
        case 'read_int32_table_element':   return this.readInt32TableElement(args);
        case 'write_int32_table_element':  return this.writeInt32TableElement(args);
        case 'list_int64_tables':          return this.listInt64Tables();
        case 'read_int64_table':           return this.readInt64Table(args);
        case 'write_int64_table':          return this.writeInt64Table(args);
        case 'read_int64_table_element':   return this.readInt64TableElement(args);
        case 'write_int64_table_element':  return this.writeInt64TableElement(args);
        case 'list_string_tables':         return this.listStringTables();
        case 'read_string_table':          return this.readStringTable(args);
        case 'write_string_table':         return this.writeStringTable(args);
        case 'read_string_table_element':  return this.readStringTableElement(args);
        case 'write_string_table_element': return this.writeStringTableElement(args);
        case 'list_float_vars':            return this.listFloatVars();
        case 'read_float_var':             return this.readFloatVar(args);
        case 'write_float_var':            return this.writeFloatVar(args);
        case 'list_int32_vars':            return this.listInt32Vars();
        case 'read_int32_var':             return this.readInt32Var(args);
        case 'write_int32_var':            return this.writeInt32Var(args);
        case 'list_int64_vars':            return this.listInt64Vars();
        case 'read_int64_var':             return this.readInt64Var(args);
        case 'write_int64_var':            return this.writeInt64Var(args);
        case 'list_string_vars':           return this.listStringVars();
        case 'read_string_var':            return this.readStringVar(args);
        case 'write_string_var':           return this.writeStringVar(args);
        case 'list_up_timers':             return this.listUpTimers();
        case 'read_up_timer':              return this.readUpTimer(args);
        case 'list_down_timers':           return this.listDownTimers();
        case 'read_down_timer':            return this.readDownTimer(args);
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

  private async get(path: string, query: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const url = `${this.baseUrl}${path}${qs.toString() ? '?' + qs.toString() : ''}`;
    const response = await this.fetchWithRetry(url, {
      headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown, query: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const url = `${this.baseUrl}${path}${qs.toString() ? '?' + qs.toString() : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDeviceDetails(): Promise<ToolResult> {
    return this.get('/device');
  }

  private async getStrategyDetails(): Promise<ToolResult> {
    return this.get('/device/strategy');
  }

  private async listAnalogInputs(): Promise<ToolResult> {
    return this.get('/device/strategy/ios/analogInputs');
  }

  private async readAnalogInput(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.io_name) return { content: [{ type: 'text', text: 'io_name is required' }], isError: true };
    return this.get(`/device/strategy/ios/analogInputs/${encodeURIComponent(args.io_name as string)}/eu`);
  }

  private async listAnalogOutputs(): Promise<ToolResult> {
    return this.get('/device/strategy/ios/analogOutputs');
  }

  private async readAnalogOutput(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.io_name) return { content: [{ type: 'text', text: 'io_name is required' }], isError: true };
    return this.get(`/device/strategy/ios/analogOutputs/${encodeURIComponent(args.io_name as string)}/eu`);
  }

  private async writeAnalogOutput(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.io_name) return { content: [{ type: 'text', text: 'io_name is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/ios/analogOutputs/${encodeURIComponent(args.io_name as string)}/eu`, { value: args.value });
  }

  private async listDigitalInputs(): Promise<ToolResult> {
    return this.get('/device/strategy/ios/digitalInputs');
  }

  private async readDigitalInput(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.io_name) return { content: [{ type: 'text', text: 'io_name is required' }], isError: true };
    return this.get(`/device/strategy/ios/digitalInputs/${encodeURIComponent(args.io_name as string)}/state`);
  }

  private async listDigitalOutputs(): Promise<ToolResult> {
    return this.get('/device/strategy/ios/digitalOutputs');
  }

  private async readDigitalOutput(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.io_name) return { content: [{ type: 'text', text: 'io_name is required' }], isError: true };
    return this.get(`/device/strategy/ios/digitalOutputs/${encodeURIComponent(args.io_name as string)}/state`);
  }

  private async writeDigitalOutput(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.io_name) return { content: [{ type: 'text', text: 'io_name is required' }], isError: true };
    if (args.state === undefined) return { content: [{ type: 'text', text: 'state is required' }], isError: true };
    return this.post(`/device/strategy/ios/digitalOutputs/${encodeURIComponent(args.io_name as string)}/state`, { state: args.state });
  }

  private async listFloatTables(): Promise<ToolResult> {
    return this.get('/device/strategy/tables/floats');
  }

  private async readFloatTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    return this.get(
      `/device/strategy/tables/floats/${encodeURIComponent(args.table_name as string)}`,
      { startIndex: args.start_index as number | undefined, numElements: args.num_elements as number | undefined },
    );
  }

  private async writeFloatTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (!Array.isArray(args.values)) return { content: [{ type: 'text', text: 'values must be an array' }], isError: true };
    return this.post(
      `/device/strategy/tables/floats/${encodeURIComponent(args.table_name as string)}`,
      args.values,
      { startIndex: args.start_index as number | undefined },
    );
  }

  private async readFloatTableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    return this.get(`/device/strategy/tables/floats/${encodeURIComponent(args.table_name as string)}/${args.index}`);
  }

  private async writeFloatTableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/tables/floats/${encodeURIComponent(args.table_name as string)}/${args.index}`, { value: args.value });
  }

  private async listInt32Tables(): Promise<ToolResult> {
    return this.get('/device/strategy/tables/int32s');
  }

  private async readInt32Table(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    return this.get(
      `/device/strategy/tables/int32s/${encodeURIComponent(args.table_name as string)}`,
      { startIndex: args.start_index as number | undefined, numElements: args.num_elements as number | undefined },
    );
  }

  private async writeInt32Table(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (!Array.isArray(args.values)) return { content: [{ type: 'text', text: 'values must be an array' }], isError: true };
    return this.post(
      `/device/strategy/tables/int32s/${encodeURIComponent(args.table_name as string)}`,
      args.values,
      { startIndex: args.start_index as number | undefined },
    );
  }

  private async readInt32TableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    return this.get(`/device/strategy/tables/int32s/${encodeURIComponent(args.table_name as string)}/${args.index}`);
  }

  private async writeInt32TableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/tables/int32s/${encodeURIComponent(args.table_name as string)}/${args.index}`, { value: args.value });
  }

  private async listInt64Tables(): Promise<ToolResult> {
    return this.get('/device/strategy/tables/int64s');
  }

  private async readInt64Table(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    return this.get(
      `/device/strategy/tables/int64s/${encodeURIComponent(args.table_name as string)}/_string`,
      { startIndex: args.start_index as number | undefined, numElements: args.num_elements as number | undefined },
    );
  }

  private async writeInt64Table(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (!Array.isArray(args.values)) return { content: [{ type: 'text', text: 'values must be an array' }], isError: true };
    return this.post(
      `/device/strategy/tables/int64s/${encodeURIComponent(args.table_name as string)}/_string`,
      args.values,
      { startIndex: args.start_index as number | undefined },
    );
  }

  private async readInt64TableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    return this.get(`/device/strategy/tables/int64s/${encodeURIComponent(args.table_name as string)}/${args.index}/_string`);
  }

  private async writeInt64TableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/tables/int64s/${encodeURIComponent(args.table_name as string)}/${args.index}/_string`, { value: String(args.value) });
  }

  private async listStringTables(): Promise<ToolResult> {
    return this.get('/device/strategy/tables/strings');
  }

  private async readStringTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    return this.get(
      `/device/strategy/tables/strings/${encodeURIComponent(args.table_name as string)}`,
      { startIndex: args.start_index as number | undefined, numElements: args.num_elements as number | undefined },
    );
  }

  private async writeStringTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (!Array.isArray(args.values)) return { content: [{ type: 'text', text: 'values must be an array' }], isError: true };
    return this.post(
      `/device/strategy/tables/strings/${encodeURIComponent(args.table_name as string)}`,
      args.values,
      { startIndex: args.start_index as number | undefined },
    );
  }

  private async readStringTableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    return this.get(`/device/strategy/tables/strings/${encodeURIComponent(args.table_name as string)}/${args.index}`);
  }

  private async writeStringTableElement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.table_name) return { content: [{ type: 'text', text: 'table_name is required' }], isError: true };
    if (args.index === undefined) return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/tables/strings/${encodeURIComponent(args.table_name as string)}/${args.index}`, { value: args.value });
  }

  private async listFloatVars(): Promise<ToolResult> {
    return this.get('/device/strategy/vars/floats');
  }

  private async readFloatVar(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    return this.get(`/device/strategy/vars/floats/${encodeURIComponent(args.var_name as string)}`);
  }

  private async writeFloatVar(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/vars/floats/${encodeURIComponent(args.var_name as string)}`, { value: args.value });
  }

  private async listInt32Vars(): Promise<ToolResult> {
    return this.get('/device/strategy/vars/int32s');
  }

  private async readInt32Var(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    return this.get(`/device/strategy/vars/int32s/${encodeURIComponent(args.var_name as string)}`);
  }

  private async writeInt32Var(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/vars/int32s/${encodeURIComponent(args.var_name as string)}`, { value: args.value });
  }

  private async listInt64Vars(): Promise<ToolResult> {
    return this.get('/device/strategy/vars/int64s');
  }

  private async readInt64Var(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    return this.get(`/device/strategy/vars/int64s/${encodeURIComponent(args.var_name as string)}/_string`);
  }

  private async writeInt64Var(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/vars/int64s/${encodeURIComponent(args.var_name as string)}/_string`, { value: String(args.value) });
  }

  private async listStringVars(): Promise<ToolResult> {
    return this.get('/device/strategy/vars/strings');
  }

  private async readStringVar(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    return this.get(`/device/strategy/vars/strings/${encodeURIComponent(args.var_name as string)}`);
  }

  private async writeStringVar(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.var_name) return { content: [{ type: 'text', text: 'var_name is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    return this.post(`/device/strategy/vars/strings/${encodeURIComponent(args.var_name as string)}`, { value: args.value });
  }

  private async listUpTimers(): Promise<ToolResult> {
    return this.get('/device/strategy/vars/upTimers');
  }

  private async readUpTimer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.timer_name) return { content: [{ type: 'text', text: 'timer_name is required' }], isError: true };
    return this.get(`/device/strategy/vars/upTimers/${encodeURIComponent(args.timer_name as string)}/value`);
  }

  private async listDownTimers(): Promise<ToolResult> {
    return this.get('/device/strategy/vars/downTimers');
  }

  private async readDownTimer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.timer_name) return { content: [{ type: 'text', text: 'timer_name is required' }], isError: true };
    return this.get(`/device/strategy/vars/downTimers/${encodeURIComponent(args.timer_name as string)}/value`);
  }
}
