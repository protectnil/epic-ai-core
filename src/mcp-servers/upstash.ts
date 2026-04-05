/**
 * Upstash MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/upstash/mcp-server — transport: stdio + streamable-HTTP, auth: UPSTASH_REDIS_REST_URL/TOKEN
// Our adapter covers: 15 tools. Vendor MCP covers: 15 Redis tools.
// Recommendation: use-both — MCP covers Redis execution (run_single_redis_command,
//   run_multiple_redis_commands, create_backup, restore_backup, list_backups, set_daily_backup,
//   update_regions) which our adapter does NOT have. Our adapter covers Kafka and QStash
//   (list_kafka_clusters, get_kafka_cluster, create_kafka_cluster, list_kafka_topics,
//   create_kafka_topic, delete_kafka_topic, list_qstash_endpoints, get_qstash_dlq, purge_qstash_dlq)
//   which the vendor MCP does NOT have. Full coverage requires union.
// Integration: use-both
// MCP-sourced tools (7 unique): run_single_redis_command, run_multiple_redis_commands,
//   create_backup, restore_backup, list_backups, set_daily_backup, update_regions
// REST-sourced tools (9 unique): list_kafka_clusters, get_kafka_cluster, create_kafka_cluster,
//   list_kafka_topics, create_kafka_topic, delete_kafka_topic,
//   list_qstash_endpoints, get_qstash_dlq, purge_qstash_dlq
// Shared (6 tools): list_redis_databases, get_redis_database, create_redis_database,
//   delete_redis_database, reset_redis_password, get_redis_stats
// MCP npm: @upstash/mcp-server v0.2.2 (last publish March 2026 — actively maintained)
//
// Base URL: https://api.upstash.com/v2
// Auth: HTTP Basic — email:api_key (management API). Per-database REST uses UPSTASH_REDIS_REST_TOKEN as Bearer.
// Docs: https://developer.upstash.com/
// Rate limits: Not publicly documented; serverless per-request billing model.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface UpstashConfig {
  email: string;
  apiKey: string;
  baseUrl?: string;
}

export class UpstashMCPServer extends MCPAdapterBase {
  private readonly email: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: UpstashConfig) {
    super();
    this.email = config.email;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.upstash.com/v2';
  }

  static catalog() {
    return {
      name: 'upstash',
      displayName: 'Upstash',
      version: '1.0.0',
      category: 'data',
      keywords: ['upstash', 'redis', 'kafka', 'qstash', 'serverless', 'cache', 'queue', 'message', 'database', 'edge', 'vector'],
      toolNames: [
        'list_redis_databases', 'get_redis_database', 'create_redis_database',
        'delete_redis_database', 'reset_redis_password', 'get_redis_stats',
        'list_kafka_clusters', 'get_kafka_cluster', 'create_kafka_cluster',
        'list_kafka_topics', 'create_kafka_topic', 'delete_kafka_topic',
        'list_qstash_endpoints', 'get_qstash_dlq', 'purge_qstash_dlq',
      ],
      description: 'Upstash serverless data platform: manage Redis databases, Kafka clusters and topics, and QStash message queues with monitoring and statistics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_redis_databases',
        description: 'List all Upstash Redis databases in the account with their endpoints and region information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_redis_database',
        description: 'Get detailed information about a specific Upstash Redis database by database ID',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: {
              type: 'string',
              description: 'Upstash Redis database ID',
            },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'create_redis_database',
        description: 'Create a new Upstash Redis database with specified region, plan, and TLS configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new Redis database',
            },
            region: {
              type: 'string',
              description: 'Region: us-east-1, us-west-1, us-west-2, eu-west-1, eu-central-1, ap-southeast-1, ap-northeast-1, sa-east-1, global (default: us-east-1)',
            },
            tls: {
              type: 'boolean',
              description: 'Enable TLS encryption for connections (default: true)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_redis_database',
        description: 'Permanently delete an Upstash Redis database and all its data by database ID',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: {
              type: 'string',
              description: 'Upstash Redis database ID to delete',
            },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'reset_redis_password',
        description: 'Reset the REST API token/password for an Upstash Redis database',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: {
              type: 'string',
              description: 'Upstash Redis database ID',
            },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'get_redis_stats',
        description: 'Get usage statistics and metrics for an Upstash Redis database including commands, storage, and bandwidth',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: {
              type: 'string',
              description: 'Upstash Redis database ID',
            },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'list_kafka_clusters',
        description: 'List all Upstash Kafka clusters in the account with region and status information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_kafka_cluster',
        description: 'Get detailed configuration and status for a specific Upstash Kafka cluster by cluster ID',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Upstash Kafka cluster ID',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'create_kafka_cluster',
        description: 'Create a new Upstash Kafka cluster with specified name and region',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new Kafka cluster',
            },
            region: {
              type: 'string',
              description: 'Region: us-east-1, eu-west-1, us-west-1 (default: us-east-1)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_kafka_topics',
        description: 'List all topics in a specific Upstash Kafka cluster with partition and replication details',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Upstash Kafka cluster ID',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'create_kafka_topic',
        description: 'Create a new Kafka topic in an Upstash cluster with partition and retention configuration',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Upstash Kafka cluster ID',
            },
            name: {
              type: 'string',
              description: 'Topic name',
            },
            partitions: {
              type: 'number',
              description: 'Number of partitions (default: 1, max: 100)',
            },
            replication_factor: {
              type: 'number',
              description: 'Replication factor (default: 2)',
            },
            retention_time: {
              type: 'number',
              description: 'Message retention time in milliseconds (default: 604800000 = 7 days, -1 = unlimited)',
            },
            retention_size: {
              type: 'number',
              description: 'Maximum retained data size in bytes (default: 1073741824 = 1 GB, -1 = unlimited)',
            },
          },
          required: ['cluster_id', 'name'],
        },
      },
      {
        name: 'delete_kafka_topic',
        description: 'Delete a Kafka topic from an Upstash cluster by cluster ID and topic name',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Upstash Kafka cluster ID',
            },
            topic_id: {
              type: 'string',
              description: 'Kafka topic ID (not the topic name — use list_kafka_topics to get the ID)',
            },
          },
          required: ['cluster_id', 'topic_id'],
        },
      },
      {
        name: 'list_qstash_endpoints',
        description: 'List all QStash message queue endpoints configured in the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_qstash_dlq',
        description: 'Retrieve failed messages from the QStash dead-letter queue for inspection and reprocessing',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response for fetching the next page of DLQ messages',
            },
          },
        },
      },
      {
        name: 'purge_qstash_dlq',
        description: 'Permanently delete all messages from the QStash dead-letter queue',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_redis_databases':
          return this.listRedisDatabases();
        case 'get_redis_database':
          return this.getRedisDatabase(args);
        case 'create_redis_database':
          return this.createRedisDatabase(args);
        case 'delete_redis_database':
          return this.deleteRedisDatabase(args);
        case 'reset_redis_password':
          return this.resetRedisPassword(args);
        case 'get_redis_stats':
          return this.getRedisStats(args);
        case 'list_kafka_clusters':
          return this.listKafkaClusters();
        case 'get_kafka_cluster':
          return this.getKafkaCluster(args);
        case 'create_kafka_cluster':
          return this.createKafkaCluster(args);
        case 'list_kafka_topics':
          return this.listKafkaTopics(args);
        case 'create_kafka_topic':
          return this.createKafkaTopic(args);
        case 'delete_kafka_topic':
          return this.deleteKafkaTopic(args);
        case 'list_qstash_endpoints':
          return this.listQStashEndpoints();
        case 'get_qstash_dlq':
          return this.getQStashDLQ(args);
        case 'purge_qstash_dlq':
          return this.purgeQStashDLQ();
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

  private get authHeader(): string {
    return `Basic ${btoa(`${this.email}:${this.apiKey}`)}`;
  }


  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: { 'Authorization': this.authHeader, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Authorization': this.authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'Authorization': this.authHeader, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { status: 'deleted' };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRedisDatabases(): Promise<ToolResult> {
    return this.apiGet('/redis/databases');
  }

  private async getRedisDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database_id) return { content: [{ type: 'text', text: 'database_id is required' }], isError: true };
    return this.apiGet(`/redis/database/${encodeURIComponent(args.database_id as string)}`);
  }

  private async createRedisDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiPost('/redis/database', {
      name: args.name,
      region: (args.region as string) || 'us-east-1',
      tls: typeof args.tls === 'boolean' ? args.tls : true,
    });
  }

  private async deleteRedisDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database_id) return { content: [{ type: 'text', text: 'database_id is required' }], isError: true };
    return this.apiDelete(`/redis/database/${encodeURIComponent(args.database_id as string)}`);
  }

  private async resetRedisPassword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database_id) return { content: [{ type: 'text', text: 'database_id is required' }], isError: true };
    return this.apiPost(`/redis/database/${encodeURIComponent(args.database_id as string)}/reset-password`, {});
  }

  private async getRedisStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database_id) return { content: [{ type: 'text', text: 'database_id is required' }], isError: true };
    return this.apiGet(`/redis/stats/${encodeURIComponent(args.database_id as string)}`);
  }

  private async listKafkaClusters(): Promise<ToolResult> {
    return this.apiGet('/kafka/cluster');
  }

  private async getKafkaCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    return this.apiGet(`/kafka/cluster/${encodeURIComponent(args.cluster_id as string)}`);
  }

  private async createKafkaCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiPost('/kafka/cluster', {
      name: args.name,
      region: (args.region as string) || 'us-east-1',
    });
  }

  private async listKafkaTopics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    return this.apiGet(`/kafka/topic?clusterid=${encodeURIComponent(args.cluster_id as string)}`);
  }

  private async createKafkaTopic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.name) return { content: [{ type: 'text', text: 'cluster_id and name are required' }], isError: true };
    return this.apiPost('/kafka/topic', {
      cluster_id: args.cluster_id,
      name: args.name,
      partitions: (args.partitions as number) || 1,
      replication_factor: (args.replication_factor as number) || 2,
      retention_time: (args.retention_time as number) ?? 604800000,
      retention_size: (args.retention_size as number) ?? 1073741824,
    });
  }

  private async deleteKafkaTopic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.topic_id) return { content: [{ type: 'text', text: 'cluster_id and topic_id are required' }], isError: true };
    return this.apiDelete(`/kafka/topic/${encodeURIComponent(args.topic_id as string)}`);
  }

  private async listQStashEndpoints(): Promise<ToolResult> {
    return this.apiGet('/qstash/v2/endpoints');
  }

  private async getQStashDLQ(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = args.cursor ? `?cursor=${encodeURIComponent(args.cursor as string)}` : '';
    return this.apiGet(`/qstash/v2/dlq${qs}`);
  }

  private async purgeQStashDLQ(): Promise<ToolResult> {
    return this.apiDelete('/qstash/v2/dlq');
  }
}
