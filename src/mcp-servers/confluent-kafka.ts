/**
 * Confluent Kafka MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/confluentinc/mcp-confluent — transport: stdio/SSE/HTTP, auth: API key
//   Officially maintained by Confluent (confluentinc org). Latest release: v1.1.0 (Mar 2026). Actively maintained.
//   Vendor MCP exposes 39 tools: list-topics, create-topics, delete-topics, produce-message, consume-messages,
//     list-flink-statements, create-flink-statement, read-flink-statement, delete-flink-statements,
//     get-flink-statement-exceptions, list-flink-catalogs, list-flink-databases, list-flink-tables,
//     describe-flink-table, get-flink-table-info, check-flink-statement-health, detect-flink-statement-issues,
//     get-flink-statement-profile, list-connectors, read-connector, create-connector, delete-connector,
//     search-topics-by-tag, search-topics-by-name, create-topic-tags, delete-tag, remove-tag-from-entity,
//     add-tags-to-topic, list-tags, alter-topic-config, list-clusters, list-environments, read-environment,
//     list-schemas, delete-schema, get-topic-config, create-tableflow-topic, list-tableflow-topics,
//     create-tableflow-catalog-integration
//
// Integration: use-both
//   MCP-sourced tools (unique to MCP, not in our adapter): produce-message, consume-messages,
//     list-flink-statements, create-flink-statement, read-flink-statement, delete-flink-statements,
//     get-flink-statement-exceptions, list-flink-catalogs, list-flink-databases, list-flink-tables,
//     describe-flink-table, get-flink-table-info, check-flink-statement-health, detect-flink-statement-issues,
//     get-flink-statement-profile, search-topics-by-tag, search-topics-by-name, create-topic-tags, delete-tag,
//     remove-tag-from-entity, add-tags-to-topic, list-tags, alter-topic-config, delete-schema,
//     create-tableflow-topic, list-tableflow-topics, create-tableflow-catalog-integration
//   REST-adapter-only tools (not covered by vendor MCP): list_consumer_groups, get_consumer_group,
//     pause_connector, resume_connector, register_schema, delete_subject, list_subjects, get_schema
//   Shared (both cover, MCP takes priority): list_environments/list-environments, list_kafka_clusters/list-clusters,
//     get_kafka_cluster/read-environment, list_topics/list-topics, create_topic/create-topics,
//     delete_topic/delete-topics, get_topic_config/get-topic-config, list_connectors/list-connectors,
//     get_connector/read-connector, create_connector/create-connector, delete_connector/delete-connector,
//     list_schemas/list-schemas
//
// Our adapter covers: 20 tools. Vendor MCP covers: 39 tools. Combined coverage: ~48 unique tools.
//
// Base URL: https://api.confluent.cloud (control plane)
//   Kafka REST Proxy: per-cluster endpoint from Confluent Cloud Console → Cluster Settings
// Auth: HTTP Basic auth — base64(apiKey:apiSecret)
//   Control plane uses Cloud-level API key. Kafka REST Proxy uses cluster-scoped API key.
// Docs: https://docs.confluent.io/cloud/current/api.html
// Rate limits: Metrics API: 300 req/min per IP global limit. Control plane: not publicly documented per-key.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ConfluentConfig {
  /** Confluent Cloud API key ID — used as HTTP Basic auth username for control-plane operations. */
  apiKey: string;
  /** Confluent Cloud API key secret — used as HTTP Basic auth password. */
  apiSecret: string;
  /** Control plane base URL. Defaults to https://api.confluent.cloud */
  baseUrl?: string;
  /**
   * Per-cluster Kafka REST Proxy endpoint.
   * Format: https://<cluster-id>.<region>.<cloud>.confluent.cloud:443
   * Required for list_topics, create_topic, delete_topic, produce_records, list_consumer_groups.
   * Find in: Confluent Cloud Console → Cluster → Cluster Settings → Endpoints.
   */
  kafkaRestEndpoint?: string;
  /**
   * Kafka cluster ID (lkc-xxxxxx). Required for topic and consumer group operations.
   * Find in: Confluent Cloud Console → Cluster → Cluster Settings.
   */
  kafkaClusterId?: string;
  /** Kafka cluster-scoped API key. If not set, falls back to the control-plane apiKey. */
  kafkaApiKey?: string;
  /** Kafka cluster-scoped API secret. */
  kafkaApiSecret?: string;
  /**
   * Schema Registry REST endpoint.
   * Format: https://psrc-xxxxx.<region>.<cloud>.confluent.cloud
   * Required for schema registry tools.
   * Find in: Confluent Cloud Console → Schema Registry → API endpoint.
   */
  schemaRegistryEndpoint?: string;
  /** Schema Registry API key (SR-scoped, not cloud-level). */
  schemaRegistryApiKey?: string;
  /** Schema Registry API secret. */
  schemaRegistryApiSecret?: string;
}

export class ConfluentKafkaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly kafkaRestEndpoint: string | undefined;
  private readonly kafkaClusterId: string | undefined;
  private readonly kafkaApiKey: string | undefined;
  private readonly kafkaApiSecret: string | undefined;
  private readonly schemaRegistryEndpoint: string | undefined;
  private readonly schemaRegistryApiKey: string | undefined;
  private readonly schemaRegistryApiSecret: string | undefined;

  constructor(config: ConfluentConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = (config.baseUrl ?? 'https://api.confluent.cloud').replace(/\/$/, '');
    this.kafkaRestEndpoint = config.kafkaRestEndpoint?.replace(/\/$/, '');
    this.kafkaClusterId = config.kafkaClusterId;
    this.kafkaApiKey = config.kafkaApiKey;
    this.kafkaApiSecret = config.kafkaApiSecret;
    this.schemaRegistryEndpoint = config.schemaRegistryEndpoint?.replace(/\/$/, '');
    this.schemaRegistryApiKey = config.schemaRegistryApiKey;
    this.schemaRegistryApiSecret = config.schemaRegistryApiSecret;
  }

  static catalog() {
    return {
      name: 'confluent-kafka',
      displayName: 'Confluent Kafka',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['confluent', 'kafka', 'streaming', 'topics', 'connectors', 'schema-registry', 'ksql', 'consumer-groups', 'events', 'messaging'],
      toolNames: [
        'list_environments', 'list_kafka_clusters', 'get_kafka_cluster',
        'list_topics', 'create_topic', 'delete_topic', 'get_topic_config',
        'list_connectors', 'get_connector', 'create_connector',
        'pause_connector', 'resume_connector', 'delete_connector',
        'list_consumer_groups', 'get_consumer_group',
        'list_schemas', 'get_schema', 'register_schema', 'list_subjects', 'delete_subject',
      ],
      description: 'Confluent Cloud Kafka management: environments, clusters, topics, connectors, schema registry, and consumer groups via the Cloud REST API and Kafka REST Proxy.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_environments',
        description: 'List all Confluent Cloud environments in the organization with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Maximum environments per page (max 100, default: 10)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_kafka_clusters',
        description: 'List Kafka clusters in a Confluent Cloud environment with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. env-xxxxx)',
            },
            page_size: {
              type: 'number',
              description: 'Maximum clusters per page (max 100, default: 10)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'get_kafka_cluster',
        description: 'Get details of a specific Kafka cluster including cloud, region, availability, and REST endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID containing the cluster',
            },
          },
          required: ['cluster_id', 'environment_id'],
        },
      },
      {
        name: 'list_topics',
        description: 'List all Kafka topics in the configured cluster via the Kafka REST Proxy. Requires kafkaRestEndpoint and kafkaClusterId.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_topic',
        description: 'Create a new Kafka topic with configurable partitions, replication, and retention settings.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_name: {
              type: 'string',
              description: 'Name of the topic to create',
            },
            partitions_count: {
              type: 'number',
              description: 'Number of partitions (default: 6)',
            },
            replication_factor: {
              type: 'number',
              description: 'Replication factor (default: 3 for Confluent Cloud)',
            },
            configs: {
              type: 'array',
              description: 'Array of topic config objects, e.g. [{"name": "retention.ms", "value": "604800000"}]',
              items: { type: 'object' },
            },
          },
          required: ['topic_name'],
        },
      },
      {
        name: 'delete_topic',
        description: 'Delete a Kafka topic from the configured cluster. This is irreversible — all data in the topic is lost.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_name: {
              type: 'string',
              description: 'Name of the topic to delete',
            },
          },
          required: ['topic_name'],
        },
      },
      {
        name: 'get_topic_config',
        description: 'Get configuration settings for a specific Kafka topic, such as retention, cleanup policy, and compression.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_name: {
              type: 'string',
              description: 'Topic name to retrieve configuration for',
            },
          },
          required: ['topic_name'],
        },
      },
      {
        name: 'list_connectors',
        description: 'List all Kafka Connect connectors in a Confluent Cloud environment and cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
          },
          required: ['environment_id', 'cluster_id'],
        },
      },
      {
        name: 'get_connector',
        description: 'Get status and configuration details of a specific Kafka Connect connector.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            connector_name: {
              type: 'string',
              description: 'The connector name',
            },
          },
          required: ['environment_id', 'cluster_id', 'connector_name'],
        },
      },
      {
        name: 'create_connector',
        description: 'Create and start a new Kafka Connect connector with provided configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            name: {
              type: 'string',
              description: 'Name for the new connector',
            },
            config: {
              type: 'object',
              description: 'Connector configuration object (e.g. {"connector.class": "...", "tasks.max": "1", "topics": "..."})',
            },
          },
          required: ['environment_id', 'cluster_id', 'name', 'config'],
        },
      },
      {
        name: 'pause_connector',
        description: 'Pause a running Kafka Connect connector, suspending processing without deleting its configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            connector_name: {
              type: 'string',
              description: 'The connector name to pause',
            },
          },
          required: ['environment_id', 'cluster_id', 'connector_name'],
        },
      },
      {
        name: 'resume_connector',
        description: 'Resume a paused Kafka Connect connector, restarting message processing.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            connector_name: {
              type: 'string',
              description: 'The connector name to resume',
            },
          },
          required: ['environment_id', 'cluster_id', 'connector_name'],
        },
      },
      {
        name: 'delete_connector',
        description: 'Delete a Kafka Connect connector and stop all associated tasks permanently.',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            connector_name: {
              type: 'string',
              description: 'The connector name to delete',
            },
          },
          required: ['environment_id', 'cluster_id', 'connector_name'],
        },
      },
      {
        name: 'list_consumer_groups',
        description: 'List all consumer groups in the configured Kafka cluster via the Kafka REST Proxy.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_consumer_group',
        description: 'Get details and lag information for a specific consumer group in the configured Kafka cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            consumer_group_id: {
              type: 'string',
              description: 'The consumer group ID',
            },
          },
          required: ['consumer_group_id'],
        },
      },
      {
        name: 'list_subjects',
        description: 'List all Schema Registry subjects (each topic typically has key and value subjects).',
        inputSchema: {
          type: 'object',
          properties: {
            subject_prefix: {
              type: 'string',
              description: 'Filter subjects by prefix (optional)',
            },
          },
        },
      },
      {
        name: 'list_schemas',
        description: 'List all registered schemas in the Schema Registry with version info.',
        inputSchema: {
          type: 'object',
          properties: {
            subject_prefix: {
              type: 'string',
              description: 'Filter schemas by subject prefix (optional)',
            },
          },
        },
      },
      {
        name: 'get_schema',
        description: 'Get the schema definition for a specific Schema Registry subject and version.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject name (e.g. my-topic-value)',
            },
            version: {
              type: 'string',
              description: 'Schema version number or "latest" (default: latest)',
            },
          },
          required: ['subject'],
        },
      },
      {
        name: 'register_schema',
        description: 'Register a new schema version for a Schema Registry subject.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject name (e.g. my-topic-value)',
            },
            schema: {
              type: 'string',
              description: 'Schema definition as a JSON string (Avro, JSON Schema, or Protobuf)',
            },
            schema_type: {
              type: 'string',
              description: 'Schema format: AVRO, JSON, or PROTOBUF (default: AVRO)',
            },
          },
          required: ['subject', 'schema'],
        },
      },
      {
        name: 'delete_subject',
        description: 'Delete all versions of a Schema Registry subject. Use hard_delete to remove permanently.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject name to delete',
            },
            hard_delete: {
              type: 'boolean',
              description: 'Permanently delete (true) or soft delete (false, default). Soft delete allows recovery.',
            },
          },
          required: ['subject'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_environments':
          return this.listEnvironments(args);
        case 'list_kafka_clusters':
          return this.listKafkaClusters(args);
        case 'get_kafka_cluster':
          return this.getKafkaCluster(args);
        case 'list_topics':
          return this.listTopics();
        case 'create_topic':
          return this.createTopic(args);
        case 'delete_topic':
          return this.deleteTopic(args);
        case 'get_topic_config':
          return this.getTopicConfig(args);
        case 'list_connectors':
          return this.listConnectors(args);
        case 'get_connector':
          return this.getConnector(args);
        case 'create_connector':
          return this.createConnector(args);
        case 'pause_connector':
          return this.pauseConnector(args);
        case 'resume_connector':
          return this.resumeConnector(args);
        case 'delete_connector':
          return this.deleteConnector(args);
        case 'list_consumer_groups':
          return this.listConsumerGroups();
        case 'get_consumer_group':
          return this.getConsumerGroup(args);
        case 'list_subjects':
          return this.listSubjects(args);
        case 'list_schemas':
          return this.listSchemas(args);
        case 'get_schema':
          return this.getSchema(args);
        case 'register_schema':
          return this.registerSchema(args);
        case 'delete_subject':
          return this.deleteSubject(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private basicAuth(key: string, secret: string): string {
    return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
  }

  private get controlPlaneHeaders(): Record<string, string> {
    return {
      Authorization: this.basicAuth(this.apiKey, this.apiSecret),
      'Content-Type': 'application/json',
    };
  }

  private kafkaHeaders(): Record<string, string> {
    const key = this.kafkaApiKey ?? this.apiKey;
    const secret = this.kafkaApiSecret ?? this.apiSecret;
    return {
      Authorization: this.basicAuth(key, secret),
      'Content-Type': 'application/json',
    };
  }

  private srHeaders(): Record<string, string> {
    const key = this.schemaRegistryApiKey ?? this.apiKey;
    const secret = this.schemaRegistryApiSecret ?? this.apiSecret;
    return {
      Authorization: this.basicAuth(key, secret),
      'Content-Type': 'application/vnd.schemaregistry.v1+json',
    };
  }

  private async fetchJson(url: string, init: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private requireKafkaRest(): ToolResult | null {
    if (!this.kafkaRestEndpoint || !this.kafkaClusterId) {
      return {
        content: [{ type: 'text', text: 'kafkaRestEndpoint and kafkaClusterId must be set in config for this operation' }],
        isError: true,
      };
    }
    return null;
  }

  private requireSchemaRegistry(): ToolResult | null {
    if (!this.schemaRegistryEndpoint) {
      return {
        content: [{ type: 'text', text: 'schemaRegistryEndpoint must be set in config for schema registry operations' }],
        isError: true,
      };
    }
    return null;
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 10;
    let url = `${this.baseUrl}/org/v2/environments?page_size=${pageSize}`;
    if (args.page_token) url += `&page_token=${encodeURIComponent(args.page_token as string)}`;
    return this.fetchJson(url, { method: 'GET', headers: this.controlPlaneHeaders });
  }

  private async listKafkaClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    if (!environmentId) {
      return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    }
    const pageSize = (args.page_size as number) ?? 10;
    let url = `${this.baseUrl}/cmk/v2/clusters?environment=${encodeURIComponent(environmentId)}&page_size=${pageSize}`;
    if (args.page_token) url += `&page_token=${encodeURIComponent(args.page_token as string)}`;
    return this.fetchJson(url, { method: 'GET', headers: this.controlPlaneHeaders });
  }

  private async getKafkaCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const clusterId = args.cluster_id as string;
    const environmentId = args.environment_id as string;
    if (!clusterId || !environmentId) {
      return { content: [{ type: 'text', text: 'cluster_id and environment_id are required' }], isError: true };
    }
    return this.fetchJson(
      `${this.baseUrl}/cmk/v2/clusters/${encodeURIComponent(clusterId)}?environment=${encodeURIComponent(environmentId)}`,
      { method: 'GET', headers: this.controlPlaneHeaders },
    );
  }

  private async listTopics(): Promise<ToolResult> {
    const guard = this.requireKafkaRest();
    if (guard) return guard;
    return this.fetchJson(
      `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId!)}/topics`,
      { method: 'GET', headers: this.kafkaHeaders() },
    );
  }

  private async createTopic(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireKafkaRest();
    if (guard) return guard;
    const topicName = args.topic_name as string;
    if (!topicName) {
      return { content: [{ type: 'text', text: 'topic_name is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      topic_name: topicName,
      partitions_count: (args.partitions_count as number) ?? 6,
      replication_factor: (args.replication_factor as number) ?? 3,
    };
    if (args.configs) body.configs = args.configs;
    return this.fetchJson(
      `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId!)}/topics`,
      { method: 'POST', headers: this.kafkaHeaders(), body: JSON.stringify(body) },
    );
  }

  private async deleteTopic(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireKafkaRest();
    if (guard) return guard;
    const topicName = args.topic_name as string;
    if (!topicName) {
      return { content: [{ type: 'text', text: 'topic_name is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId!)}/topics/${encodeURIComponent(topicName)}`,
      { method: 'DELETE', headers: this.kafkaHeaders() },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, topic_name: topicName }) }], isError: false };
  }

  private async getTopicConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireKafkaRest();
    if (guard) return guard;
    const topicName = args.topic_name as string;
    if (!topicName) {
      return { content: [{ type: 'text', text: 'topic_name is required' }], isError: true };
    }
    return this.fetchJson(
      `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId!)}/topics/${encodeURIComponent(topicName)}/configs`,
      { method: 'GET', headers: this.kafkaHeaders() },
    );
  }

  private async listConnectors(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    const clusterId = args.cluster_id as string;
    if (!environmentId || !clusterId) {
      return { content: [{ type: 'text', text: 'environment_id and cluster_id are required' }], isError: true };
    }
    return this.fetchJson(
      `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors`,
      { method: 'GET', headers: this.controlPlaneHeaders },
    );
  }

  private async getConnector(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    const clusterId = args.cluster_id as string;
    const connectorName = args.connector_name as string;
    if (!environmentId || !clusterId || !connectorName) {
      return { content: [{ type: 'text', text: 'environment_id, cluster_id, and connector_name are required' }], isError: true };
    }
    return this.fetchJson(
      `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors/${encodeURIComponent(connectorName)}/status`,
      { method: 'GET', headers: this.controlPlaneHeaders },
    );
  }

  private async createConnector(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    const clusterId = args.cluster_id as string;
    const name = args.name as string;
    const config = args.config as Record<string, unknown>;
    if (!environmentId || !clusterId || !name || !config) {
      return { content: [{ type: 'text', text: 'environment_id, cluster_id, name, and config are required' }], isError: true };
    }
    return this.fetchJson(
      `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors`,
      { method: 'POST', headers: this.controlPlaneHeaders, body: JSON.stringify({ name, config }) },
    );
  }

  private async pauseConnector(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    const clusterId = args.cluster_id as string;
    const connectorName = args.connector_name as string;
    if (!environmentId || !clusterId || !connectorName) {
      return { content: [{ type: 'text', text: 'environment_id, cluster_id, and connector_name are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors/${encodeURIComponent(connectorName)}/pause`,
      { method: 'PUT', headers: this.controlPlaneHeaders },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ paused: true, connector: connectorName }) }], isError: false };
  }

  private async resumeConnector(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    const clusterId = args.cluster_id as string;
    const connectorName = args.connector_name as string;
    if (!environmentId || !clusterId || !connectorName) {
      return { content: [{ type: 'text', text: 'environment_id, cluster_id, and connector_name are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors/${encodeURIComponent(connectorName)}/resume`,
      { method: 'PUT', headers: this.controlPlaneHeaders },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ resumed: true, connector: connectorName }) }], isError: false };
  }

  private async deleteConnector(args: Record<string, unknown>): Promise<ToolResult> {
    const environmentId = args.environment_id as string;
    const clusterId = args.cluster_id as string;
    const connectorName = args.connector_name as string;
    if (!environmentId || !clusterId || !connectorName) {
      return { content: [{ type: 'text', text: 'environment_id, cluster_id, and connector_name are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors/${encodeURIComponent(connectorName)}`,
      { method: 'DELETE', headers: this.controlPlaneHeaders },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, connector: connectorName }) }], isError: false };
  }

  private async listConsumerGroups(): Promise<ToolResult> {
    const guard = this.requireKafkaRest();
    if (guard) return guard;
    return this.fetchJson(
      `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId!)}/consumer-groups`,
      { method: 'GET', headers: this.kafkaHeaders() },
    );
  }

  private async getConsumerGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireKafkaRest();
    if (guard) return guard;
    const groupId = args.consumer_group_id as string;
    if (!groupId) {
      return { content: [{ type: 'text', text: 'consumer_group_id is required' }], isError: true };
    }
    return this.fetchJson(
      `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId!)}/consumer-groups/${encodeURIComponent(groupId)}`,
      { method: 'GET', headers: this.kafkaHeaders() },
    );
  }

  private async listSubjects(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireSchemaRegistry();
    if (guard) return guard;
    let url = `${this.schemaRegistryEndpoint}/subjects`;
    if (args.subject_prefix) url += `?subjectPrefix=${encodeURIComponent(args.subject_prefix as string)}`;
    return this.fetchJson(url, { method: 'GET', headers: this.srHeaders() });
  }

  private async listSchemas(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireSchemaRegistry();
    if (guard) return guard;
    let url = `${this.schemaRegistryEndpoint}/schemas`;
    if (args.subject_prefix) url += `?subjectPrefix=${encodeURIComponent(args.subject_prefix as string)}`;
    return this.fetchJson(url, { method: 'GET', headers: this.srHeaders() });
  }

  private async getSchema(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireSchemaRegistry();
    if (guard) return guard;
    const subject = args.subject as string;
    if (!subject) {
      return { content: [{ type: 'text', text: 'subject is required' }], isError: true };
    }
    const version = (args.version as string) ?? 'latest';
    return this.fetchJson(
      `${this.schemaRegistryEndpoint}/subjects/${encodeURIComponent(subject)}/versions/${encodeURIComponent(version)}`,
      { method: 'GET', headers: this.srHeaders() },
    );
  }

  private async registerSchema(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireSchemaRegistry();
    if (guard) return guard;
    const subject = args.subject as string;
    const schema = args.schema as string;
    if (!subject || !schema) {
      return { content: [{ type: 'text', text: 'subject and schema are required' }], isError: true };
    }
    const body: Record<string, unknown> = { schema };
    if (args.schema_type) body.schemaType = args.schema_type;
    return this.fetchJson(
      `${this.schemaRegistryEndpoint}/subjects/${encodeURIComponent(subject)}/versions`,
      { method: 'POST', headers: this.srHeaders(), body: JSON.stringify(body) },
    );
  }

  private async deleteSubject(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireSchemaRegistry();
    if (guard) return guard;
    const subject = args.subject as string;
    if (!subject) {
      return { content: [{ type: 'text', text: 'subject is required' }], isError: true };
    }
    const permanent = args.hard_delete === true;
    const url = `${this.schemaRegistryEndpoint}/subjects/${encodeURIComponent(subject)}${permanent ? '?permanent=true' : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.srHeaders() });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { deleted: true, subject }; }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
