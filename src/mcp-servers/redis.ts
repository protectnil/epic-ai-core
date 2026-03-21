/** Redis MCP Server
 * Redis key-value store operations via Upstash REST API
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface RedisConfig {
  endpoint: string;
  token: string;
}

export class RedisMCPServer {
  private config: RedisConfig;
  private baseUrl: string;

  constructor(config: RedisConfig) {
    this.config = config;
    this.baseUrl = `https://${config.endpoint}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get',
        description: 'Get the value of a key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to retrieve' },
          },
          required: ['key'],
        },
      },
      {
        name: 'set',
        description: 'Set the value of a key with optional expiry',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to set' },
            value: { type: 'string', description: 'Value to store' },
            ex: { type: 'number', description: 'Expiry in seconds' },
            px: { type: 'number', description: 'Expiry in milliseconds' },
            nx: { type: 'boolean', description: 'Only set if key does not exist' },
            xx: { type: 'boolean', description: 'Only set if key already exists' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'del',
        description: 'Delete one or more keys',
        inputSchema: {
          type: 'object',
          properties: {
            keys: { type: 'array', description: 'Keys to delete', items: { type: 'string' } },
          },
          required: ['keys'],
        },
      },
      {
        name: 'keys',
        description: 'Find all keys matching a pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Glob-style pattern (e.g. user:*)' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'hgetall',
        description: 'Get all fields and values of a hash',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Hash key' },
          },
          required: ['key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
    };

    try {
      let command: unknown[];

      switch (name) {
        case 'get': {
          command = ['GET', args.key];
          break;
        }
        case 'set': {
          command = ['SET', args.key, args.value];
          if (args.ex) command.push('EX', args.ex);
          if (args.px) command.push('PX', args.px);
          if (args.nx) command.push('NX');
          if (args.xx) command.push('XX');
          break;
        }
        case 'del': {
          command = ['DEL', ...(args.keys as string[])];
          break;
        }
        case 'keys': {
          command = ['KEYS', args.pattern];
          break;
        }
        case 'hgetall': {
          command = ['HGETALL', args.key];
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(command),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
