/**
 * Redis (Upstash REST API) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/upstash/mcp-server — transport: stdio + streamable-HTTP, auth: Upstash email + API key
// Maintained: yes — latest release v0.2.1, Dec 15, 2025 (within 6 months of 2026-03-28).
// Our adapter covers: 35 tools (Redis data commands via REST API). Vendor MCP covers: 15 tools (Upstash account management).
// Recommendation: use-both — the vendor MCP and this REST adapter have NON-OVERLAPPING tools.
//   MCP-sourced tools (15): redis_database_create_backup, redis_database_create_new, redis_database_delete,
//     redis_database_delete_backup, redis_database_get_details, redis_database_list_backups,
//     redis_database_list_databases, redis_database_reset_password, redis_database_restore_backup,
//     redis_database_run_multiple_redis_commands, redis_database_run_single_redis_command,
//     redis_database_set_daily_backup, redis_database_update_regions,
//     redis_database_get_usage_last_5_days, redis_database_get_stats
//   REST-sourced tools (35): get_key, set_key, delete_keys, exists_keys, expire_key, persist_key,
//     ttl_key, type_key, scan_keys, incr_key, decr_key, mget_keys, mset_keys, append_key,
//     hget_field, hset_fields, hdel_fields, hgetall, hkeys, hvals, hexists, lpush, rpush,
//     lpop, rpop, lrange, llen, lindex, sadd, srem, smembers, sismember, scard,
//     zadd, zrange, zrank, zscore, zrem, zcard, zcount, pipeline
//   Combined coverage: 50 tools (MCP: 15 + REST: 35 - shared: 0)
//   The MCP manages Upstash account infrastructure (databases, backups, regions).
//   This adapter executes Redis data-plane commands (GET, SET, HGET, ZADD, etc.) via the REST API.
//   FederationManager routes MCP-sourced tools through the Upstash MCP connection;
//   REST-sourced tools route through this adapter.
//
// Base URL: https://{your-upstash-endpoint} (full URL from Upstash console)
// Auth: Bearer token — set Authorization: Bearer <UPSTASH_REDIS_REST_TOKEN>
// Docs: https://upstash.com/docs/redis/features/restapi
// Rate limits: Varies by plan. Free tier: 10,000 req/day. Pro: higher limits.
// Pipeline: POST /pipeline accepts array-of-arrays for multi-command batching.
// Transactions: POST /multi-exec for atomic multi-command execution.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RedisConfig {
  /** Full Upstash REST endpoint URL, e.g. https://us1-abc.upstash.io */
  endpoint: string;
  /** Upstash REST token from the Upstash console */
  token: string;
}

export class RedisMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: RedisConfig) {
    super();
    this.token = config.token;
    // Normalize: strip trailing slash, ensure https scheme
    this.baseUrl = config.endpoint.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'redis',
      displayName: 'Redis (Upstash)',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['redis', 'upstash', 'cache', 'key-value', 'hash', 'list', 'set', 'sorted-set', 'pub-sub', 'ttl', 'pipeline'],
      toolNames: [
        'get_key', 'set_key', 'delete_keys', 'exists_keys', 'expire_key', 'persist_key',
        'ttl_key', 'type_key', 'scan_keys', 'incr_key', 'decr_key',
        'mget_keys', 'mset_keys', 'append_key',
        'hget_field', 'hset_fields', 'hdel_fields', 'hgetall', 'hkeys', 'hvals', 'hexists',
        'lpush', 'rpush', 'lpop', 'rpop', 'lrange', 'llen', 'lindex',
        'sadd', 'srem', 'smembers', 'sismember', 'scard',
        'zadd', 'zrange', 'zrank', 'zscore', 'zrem', 'zcard', 'zcount',
        'pipeline',
      ],
      description: 'Redis key-value store via Upstash REST API: strings, hashes, lists, sets, sorted sets, TTL management, and pipeline batching.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── String commands ──────────────────────────────────────────────
      {
        name: 'get_key',
        description: 'Get the string value stored at a Redis key. Returns null if the key does not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key to retrieve' },
          },
          required: ['key'],
        },
      },
      {
        name: 'set_key',
        description: 'Set a string value at a Redis key with optional expiry, conditional flags NX/XX, and keep-TTL option',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key to set' },
            value: { type: 'string', description: 'Value to store (string)' },
            ex: { type: 'number', description: 'Expiry in seconds (EX)' },
            px: { type: 'number', description: 'Expiry in milliseconds (PX)' },
            exat: { type: 'number', description: 'Expiry as Unix timestamp in seconds (EXAT)' },
            pxat: { type: 'number', description: 'Expiry as Unix timestamp in milliseconds (PXAT)' },
            nx: { type: 'boolean', description: 'Only set if key does NOT exist (NX)' },
            xx: { type: 'boolean', description: 'Only set if key already exists (XX)' },
            keepttl: { type: 'boolean', description: 'Retain existing TTL on the key (KEEPTTL)' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'delete_keys',
        description: 'Delete one or more Redis keys. Returns the number of keys actually deleted.',
        inputSchema: {
          type: 'object',
          properties: {
            keys: { type: 'array', items: { type: 'string' }, description: 'List of Redis keys to delete' },
          },
          required: ['keys'],
        },
      },
      {
        name: 'exists_keys',
        description: 'Count how many of the given keys exist in Redis (keys listed multiple times count multiple times)',
        inputSchema: {
          type: 'object',
          properties: {
            keys: { type: 'array', items: { type: 'string' }, description: 'Keys to check for existence' },
          },
          required: ['keys'],
        },
      },
      {
        name: 'expire_key',
        description: 'Set a TTL (time-to-live) on a Redis key in seconds. Returns 1 if set, 0 if key does not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key to set TTL on' },
            seconds: { type: 'number', description: 'Time-to-live in seconds' },
          },
          required: ['key', 'seconds'],
        },
      },
      {
        name: 'persist_key',
        description: 'Remove the TTL from a Redis key, making it persistent. Returns 1 if TTL was removed.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key to make persistent' },
          },
          required: ['key'],
        },
      },
      {
        name: 'ttl_key',
        description: 'Get the remaining TTL of a Redis key in seconds. Returns -1 if no TTL, -2 if key does not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key to check TTL on' },
          },
          required: ['key'],
        },
      },
      {
        name: 'type_key',
        description: 'Return the Redis data type stored at a key: string, list, set, zset, hash, or stream',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key to inspect' },
          },
          required: ['key'],
        },
      },
      {
        name: 'scan_keys',
        description: 'Incrementally iterate over all keys in the database matching a pattern using SCAN (non-blocking)',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'number', description: 'Cursor position — start at 0, use returned cursor for subsequent calls' },
            match: { type: 'string', description: 'Glob-style key pattern filter (e.g. user:*, session:*)' },
            count: { type: 'number', description: 'Hint for number of elements per iteration (default: 10)' },
            type: { type: 'string', description: 'Filter by key type: string, list, set, zset, hash' },
          },
          required: ['cursor'],
        },
      },
      {
        name: 'incr_key',
        description: 'Increment the integer value of a key by a delta (default 1). Creates key with value 0 before incrementing if it does not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key holding an integer value' },
            delta: { type: 'number', description: 'Amount to increment by (default: 1, use negative to decrement)' },
          },
          required: ['key'],
        },
      },
      {
        name: 'decr_key',
        description: 'Decrement the integer value of a key by a delta (default 1). Creates key with value 0 before decrementing if it does not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key holding an integer value' },
            delta: { type: 'number', description: 'Amount to decrement by (default: 1)' },
          },
          required: ['key'],
        },
      },
      {
        name: 'mget_keys',
        description: 'Get values of multiple Redis keys in a single call. Returns null for keys that do not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            keys: { type: 'array', items: { type: 'string' }, description: 'List of Redis keys to retrieve' },
          },
          required: ['keys'],
        },
      },
      {
        name: 'mset_keys',
        description: 'Set multiple Redis key-value pairs atomically in a single call',
        inputSchema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'object',
              description: 'Object of key-value pairs to set (e.g. {"key1": "val1", "key2": "val2"})',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['pairs'],
        },
      },
      {
        name: 'append_key',
        description: 'Append a value to a Redis string key. Returns the new length of the string.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis key to append to' },
            value: { type: 'string', description: 'String value to append' },
          },
          required: ['key', 'value'],
        },
      },
      // ── Hash commands ─────────────────────────────────────────────────
      {
        name: 'hget_field',
        description: 'Get the value of a specific field in a Redis hash key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis hash key' },
            field: { type: 'string', description: 'Field name within the hash' },
          },
          required: ['key', 'field'],
        },
      },
      {
        name: 'hset_fields',
        description: 'Set one or more fields on a Redis hash key. Creates the hash if it does not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis hash key' },
            fields: {
              type: 'object',
              description: 'Field-value pairs to set on the hash',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['key', 'fields'],
        },
      },
      {
        name: 'hdel_fields',
        description: 'Delete one or more fields from a Redis hash key. Returns the number of fields removed.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis hash key' },
            fields: { type: 'array', items: { type: 'string' }, description: 'Field names to delete' },
          },
          required: ['key', 'fields'],
        },
      },
      {
        name: 'hgetall',
        description: 'Get all fields and values from a Redis hash key as an object',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis hash key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'hkeys',
        description: 'List all field names in a Redis hash key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis hash key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'hvals',
        description: 'List all field values in a Redis hash key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis hash key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'hexists',
        description: 'Check whether a field exists in a Redis hash. Returns 1 if exists, 0 if not.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis hash key' },
            field: { type: 'string', description: 'Field name to check' },
          },
          required: ['key', 'field'],
        },
      },
      // ── List commands ─────────────────────────────────────────────────
      {
        name: 'lpush',
        description: 'Prepend one or more values to a Redis list (head). Returns new list length.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis list key' },
            values: { type: 'array', items: { type: 'string' }, description: 'Values to prepend (left push)' },
          },
          required: ['key', 'values'],
        },
      },
      {
        name: 'rpush',
        description: 'Append one or more values to a Redis list (tail). Returns new list length.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis list key' },
            values: { type: 'array', items: { type: 'string' }, description: 'Values to append (right push)' },
          },
          required: ['key', 'values'],
        },
      },
      {
        name: 'lpop',
        description: 'Remove and return one or more elements from the head (left) of a Redis list',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis list key' },
            count: { type: 'number', description: 'Number of elements to pop (default: 1)' },
          },
          required: ['key'],
        },
      },
      {
        name: 'rpop',
        description: 'Remove and return one or more elements from the tail (right) of a Redis list',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis list key' },
            count: { type: 'number', description: 'Number of elements to pop (default: 1)' },
          },
          required: ['key'],
        },
      },
      {
        name: 'lrange',
        description: 'Get a range of elements from a Redis list by index. Use 0 to -1 for all elements.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis list key' },
            start: { type: 'number', description: 'Start index (0-based, negative counts from end)' },
            stop: { type: 'number', description: 'Stop index inclusive (use -1 for last element)' },
          },
          required: ['key', 'start', 'stop'],
        },
      },
      {
        name: 'llen',
        description: 'Get the number of elements in a Redis list',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis list key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'lindex',
        description: 'Get the element at a specific index in a Redis list (0-based, negative counts from end)',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis list key' },
            index: { type: 'number', description: 'Index of the element (0 = head, -1 = tail)' },
          },
          required: ['key', 'index'],
        },
      },
      // ── Set commands ──────────────────────────────────────────────────
      {
        name: 'sadd',
        description: 'Add one or more members to a Redis set. Returns the number of members actually added.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis set key' },
            members: { type: 'array', items: { type: 'string' }, description: 'Members to add to the set' },
          },
          required: ['key', 'members'],
        },
      },
      {
        name: 'srem',
        description: 'Remove one or more members from a Redis set. Returns the number of members removed.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis set key' },
            members: { type: 'array', items: { type: 'string' }, description: 'Members to remove' },
          },
          required: ['key', 'members'],
        },
      },
      {
        name: 'smembers',
        description: 'Get all members of a Redis set',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis set key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'sismember',
        description: 'Check whether a value is a member of a Redis set. Returns 1 if member, 0 if not.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis set key' },
            member: { type: 'string', description: 'Value to check for membership' },
          },
          required: ['key', 'member'],
        },
      },
      {
        name: 'scard',
        description: 'Get the number of members (cardinality) in a Redis set',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis set key' },
          },
          required: ['key'],
        },
      },
      // ── Sorted set commands ───────────────────────────────────────────
      {
        name: 'zadd',
        description: 'Add members with scores to a Redis sorted set. Returns the number of new members added.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis sorted set key' },
            members: {
              type: 'array',
              description: 'Array of {score, member} objects to add',
              items: {
                type: 'object',
                properties: {
                  score: { type: 'number', description: 'Numeric score for ranking' },
                  member: { type: 'string', description: 'Member value' },
                },
              },
            },
            nx: { type: 'boolean', description: 'Only add new elements, do not update existing (NX)' },
            xx: { type: 'boolean', description: 'Only update existing elements, do not add new (XX)' },
            gt: { type: 'boolean', description: 'Only update score if new score > current (GT)' },
            lt: { type: 'boolean', description: 'Only update score if new score < current (LT)' },
          },
          required: ['key', 'members'],
        },
      },
      {
        name: 'zrange',
        description: 'Return members of a Redis sorted set by rank range (ascending). Use REV for descending.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis sorted set key' },
            start: { type: 'number', description: 'Start rank index (0-based)' },
            stop: { type: 'number', description: 'Stop rank index inclusive (-1 for last)' },
            withscores: { type: 'boolean', description: 'Include scores in the response (default: false)' },
            rev: { type: 'boolean', description: 'Return in reverse (descending) order' },
          },
          required: ['key', 'start', 'stop'],
        },
      },
      {
        name: 'zrank',
        description: 'Get the rank (0-based position) of a member in a Redis sorted set (ascending order)',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis sorted set key' },
            member: { type: 'string', description: 'Member to get rank for' },
          },
          required: ['key', 'member'],
        },
      },
      {
        name: 'zscore',
        description: 'Get the score of a member in a Redis sorted set',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis sorted set key' },
            member: { type: 'string', description: 'Member to get score for' },
          },
          required: ['key', 'member'],
        },
      },
      {
        name: 'zrem',
        description: 'Remove one or more members from a Redis sorted set. Returns count of removed members.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis sorted set key' },
            members: { type: 'array', items: { type: 'string' }, description: 'Members to remove' },
          },
          required: ['key', 'members'],
        },
      },
      {
        name: 'zcard',
        description: 'Get the number of members in a Redis sorted set',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis sorted set key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'zcount',
        description: 'Count members in a Redis sorted set with scores between min and max (inclusive)',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Redis sorted set key' },
            min: { type: 'number', description: 'Minimum score (inclusive)' },
            max: { type: 'number', description: 'Maximum score (inclusive)' },
          },
          required: ['key', 'min', 'max'],
        },
      },
      // ── Pipeline ──────────────────────────────────────────────────────
      {
        name: 'pipeline',
        description: 'Execute multiple Redis commands in a single HTTP request. Returns an array of responses in order.',
        inputSchema: {
          type: 'object',
          properties: {
            commands: {
              type: 'array',
              description: 'Array of Redis commands, each as an array where the first element is the command name (e.g. [["SET","key","val"],["GET","key"]])',
              items: {
                type: 'array',
                items: {},
              },
            },
          },
          required: ['commands'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_key':
          return await this.runCommand(['GET', args.key]);
        case 'set_key':
          return await this.setKey(args);
        case 'delete_keys':
          return await this.runCommand(['DEL', ...(args.keys as string[])]);
        case 'exists_keys':
          return await this.runCommand(['EXISTS', ...(args.keys as string[])]);
        case 'expire_key':
          return await this.runCommand(['EXPIRE', args.key, args.seconds]);
        case 'persist_key':
          return await this.runCommand(['PERSIST', args.key]);
        case 'ttl_key':
          return await this.runCommand(['TTL', args.key]);
        case 'type_key':
          return await this.runCommand(['TYPE', args.key]);
        case 'scan_keys':
          return await this.scanKeys(args);
        case 'incr_key': {
          const delta = (args.delta as number) ?? 1;
          return delta === 1
            ? this.runCommand(['INCR', args.key])
            : this.runCommand(['INCRBY', args.key, delta]);
        }
        case 'decr_key': {
          const delta = (args.delta as number) ?? 1;
          return delta === 1
            ? this.runCommand(['DECR', args.key])
            : this.runCommand(['DECRBY', args.key, delta]);
        }
        case 'mget_keys':
          return await this.runCommand(['MGET', ...(args.keys as string[])]);
        case 'mset_keys':
          return await this.msetKeys(args);
        case 'append_key':
          return await this.runCommand(['APPEND', args.key, args.value]);
        case 'hget_field':
          return await this.runCommand(['HGET', args.key, args.field]);
        case 'hset_fields':
          return await this.hsetFields(args);
        case 'hdel_fields':
          return await this.runCommand(['HDEL', args.key, ...(args.fields as string[])]);
        case 'hgetall':
          return await this.runCommand(['HGETALL', args.key]);
        case 'hkeys':
          return await this.runCommand(['HKEYS', args.key]);
        case 'hvals':
          return await this.runCommand(['HVALS', args.key]);
        case 'hexists':
          return await this.runCommand(['HEXISTS', args.key, args.field]);
        case 'lpush':
          return await this.runCommand(['LPUSH', args.key, ...(args.values as string[])]);
        case 'rpush':
          return await this.runCommand(['RPUSH', args.key, ...(args.values as string[])]);
        case 'lpop':
          return await this.runCommand(
            args.count ? ['LPOP', args.key, args.count] : ['LPOP', args.key],
          );
        case 'rpop':
          return await this.runCommand(
            args.count ? ['RPOP', args.key, args.count] : ['RPOP', args.key],
          );
        case 'lrange':
          return await this.runCommand(['LRANGE', args.key, args.start, args.stop]);
        case 'llen':
          return await this.runCommand(['LLEN', args.key]);
        case 'lindex':
          return await this.runCommand(['LINDEX', args.key, args.index]);
        case 'sadd':
          return await this.runCommand(['SADD', args.key, ...(args.members as string[])]);
        case 'srem':
          return await this.runCommand(['SREM', args.key, ...(args.members as string[])]);
        case 'smembers':
          return await this.runCommand(['SMEMBERS', args.key]);
        case 'sismember':
          return await this.runCommand(['SISMEMBER', args.key, args.member]);
        case 'scard':
          return await this.runCommand(['SCARD', args.key]);
        case 'zadd':
          return await this.zaddMembers(args);
        case 'zrange':
          return await this.zrangeMembers(args);
        case 'zrank':
          return await this.runCommand(['ZRANK', args.key, args.member]);
        case 'zscore':
          return await this.runCommand(['ZSCORE', args.key, args.member]);
        case 'zrem':
          return await this.runCommand(['ZREM', args.key, ...(args.members as string[])]);
        case 'zcard':
          return await this.runCommand(['ZCARD', args.key]);
        case 'zcount':
          return await this.runCommand(['ZCOUNT', args.key, args.min, args.max]);
        case 'pipeline':
          return await this.runPipeline(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async runCommand(command: unknown[]): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.baseUrl, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(command),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: !response.ok,
    };
  }

  private async setKey(args: Record<string, unknown>): Promise<ToolResult> {
    const cmd: unknown[] = ['SET', args.key, args.value];
    if (args.ex) cmd.push('EX', args.ex);
    else if (args.px) cmd.push('PX', args.px);
    else if (args.exat) cmd.push('EXAT', args.exat);
    else if (args.pxat) cmd.push('PXAT', args.pxat);
    else if (args.keepttl) cmd.push('KEEPTTL');
    if (args.nx) cmd.push('NX');
    else if (args.xx) cmd.push('XX');
    return this.runCommand(cmd);
  }

  private async scanKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const cmd: unknown[] = ['SCAN', args.cursor ?? 0];
    if (args.match) cmd.push('MATCH', args.match);
    if (args.count) cmd.push('COUNT', args.count);
    if (args.type) cmd.push('TYPE', args.type);
    return this.runCommand(cmd);
  }

  private async msetKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const pairs = args.pairs as Record<string, string>;
    const cmd: unknown[] = ['MSET'];
    for (const [k, v] of Object.entries(pairs)) {
      cmd.push(k, v);
    }
    return this.runCommand(cmd);
  }

  private async hsetFields(args: Record<string, unknown>): Promise<ToolResult> {
    const fields = args.fields as Record<string, string>;
    const cmd: unknown[] = ['HSET', args.key];
    for (const [field, value] of Object.entries(fields)) {
      cmd.push(field, value);
    }
    return this.runCommand(cmd);
  }

  private async zaddMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const cmd: unknown[] = ['ZADD', args.key];
    if (args.nx) cmd.push('NX');
    else if (args.xx) cmd.push('XX');
    if (args.gt) cmd.push('GT');
    else if (args.lt) cmd.push('LT');
    const members = args.members as Array<{ score: number; member: string }>;
    for (const m of members) {
      cmd.push(m.score, m.member);
    }
    return this.runCommand(cmd);
  }

  private async zrangeMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const cmd: unknown[] = ['ZRANGE', args.key, args.start, args.stop];
    if (args.rev) cmd.push('REV');
    if (args.withscores) cmd.push('WITHSCORES');
    return this.runCommand(cmd);
  }

  private async runPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const commands = args.commands as unknown[][];
    const response = await this.fetchWithRetry(`${this.baseUrl}/pipeline`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(commands),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: !response.ok,
    };
  }
}
