/**
 * The Graph MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/graphprotocol/mcp-monorepo — transport: streamable-HTTP (hosted), auth: Bearer API key
// The Graph publishes an official Subgraph MCP server at thegraph.com/docs/en/ai-suite/subgraph-mcp/introduction/
// Vendor MCP covers: 6 tools (get_schema_by_deployment_id, get_schema_by_subgraph_id, get_schema_by_ipfs_hash,
//   execute_query_by_deployment_id, execute_query_by_subgraph_id, get_top_subgraph_deployments).
// Our adapter covers: 11 tools (superset — adds list_network_subgraphs, search_subgraphs, get_indexer_status,
//   query_graph_network, get_entity_by_id, list_entities, get_recent_events beyond MCP scope).
// Recommendation: use-both — MCP covers schema introspection and basic query execution; our REST adapter
//   adds network-level queries, entity listing, indexer status, and discovery that the MCP does not expose.
//
// Integration: use-both
// MCP-sourced tools (6): get_schema_by_deployment_id, get_schema_by_subgraph_id, get_schema_by_ipfs_hash,
//   execute_query_by_deployment_id, execute_query_by_subgraph_id, get_top_subgraph_deployments
// REST-sourced tools (11): query_subgraph, query_subgraph_studio, introspect_subgraph, get_subgraph_metadata,
//   list_network_subgraphs, search_subgraphs, get_indexer_status, query_graph_network,
//   get_entity_by_id, list_entities, get_recent_events
// Combined coverage: 11 REST tools + 6 MCP tools (shared ~3, MCP-only ~3, REST-only ~8)
//
// Base URL: https://gateway-arbitrum.network.thegraph.com/api/{api-key}/subgraphs/id/{subgraph-id}
// Auth: API key embedded in URL path — generated in Subgraph Studio under API Keys
// Docs: https://thegraph.com/docs/en/subgraphs/querying/graphql-api/
// Rate limits: 100,000 free queries/month per API key; paid usage at $4 per 100K additional queries
// Note: This adapter queries subgraphs via GraphQL POST requests. Subgraph IDs are unique per deployment.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TheGraphConfig {
  apiKey: string;
  gatewayBaseUrl?: string;
  subgraphStudioUrl?: string;
}

export class TheGraphMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly gatewayBaseUrl: string;
  private readonly subgraphStudioUrl: string;

  constructor(config: TheGraphConfig) {
    super();
    this.apiKey = config.apiKey;
    this.gatewayBaseUrl = config.gatewayBaseUrl || 'https://gateway-arbitrum.network.thegraph.com/api';
    this.subgraphStudioUrl = config.subgraphStudioUrl || 'https://api.studio.thegraph.com/query';
  }

  static catalog() {
    return {
      name: 'the-graph',
      displayName: 'The Graph',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'the graph', 'graphql', 'blockchain', 'subgraph', 'ethereum', 'defi', 'indexing',
        'web3', 'smart contracts', 'on-chain data', 'grt', 'arbitrum', 'uniswap',
        'decentralized data', 'query', 'indexer',
      ],
      toolNames: [
        'query_subgraph', 'query_subgraph_studio', 'introspect_subgraph',
        'get_subgraph_metadata', 'list_network_subgraphs', 'search_subgraphs',
        'get_indexer_status', 'query_graph_network',
        'get_entity_by_id', 'list_entities', 'get_recent_events',
      ],
      description: 'The Graph decentralized blockchain indexing protocol: query on-chain data from Ethereum, Arbitrum, and other networks via GraphQL subgraphs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_subgraph',
        description: 'Execute a GraphQL query against a deployed subgraph on The Graph decentralized network using a subgraph ID',
        inputSchema: {
          type: 'object',
          properties: {
            subgraph_id: {
              type: 'string',
              description: 'Subgraph deployment ID (e.g. Qm... IPFS hash or version label like uniswap/uniswap-v3)',
            },
            query: {
              type: 'string',
              description: 'GraphQL query string (e.g. { tokens(first: 10) { id symbol name } })',
            },
            variables: {
              type: 'object',
              description: 'Optional GraphQL variables object for parameterized queries',
            },
          },
          required: ['subgraph_id', 'query'],
        },
      },
      {
        name: 'query_subgraph_studio',
        description: 'Execute a GraphQL query against a subgraph in Subgraph Studio development environment using a slug and version',
        inputSchema: {
          type: 'object',
          properties: {
            studio_id: {
              type: 'string',
              description: 'Subgraph Studio numeric ID (from the Studio URL)',
            },
            version: {
              type: 'string',
              description: 'API version number (e.g. 1, 2)',
            },
            query: {
              type: 'string',
              description: 'GraphQL query string',
            },
            variables: {
              type: 'object',
              description: 'Optional GraphQL variables object',
            },
          },
          required: ['studio_id', 'version', 'query'],
        },
      },
      {
        name: 'introspect_subgraph',
        description: 'Retrieve the GraphQL schema of a subgraph using introspection — returns all available types, fields, and queries',
        inputSchema: {
          type: 'object',
          properties: {
            subgraph_id: {
              type: 'string',
              description: 'Subgraph deployment ID to introspect',
            },
          },
          required: ['subgraph_id'],
        },
      },
      {
        name: 'get_subgraph_metadata',
        description: 'Get metadata about a specific subgraph from The Graph Network including deployment status and entity counts',
        inputSchema: {
          type: 'object',
          properties: {
            subgraph_id: {
              type: 'string',
              description: 'Subgraph ID to retrieve metadata for',
            },
          },
          required: ['subgraph_id'],
        },
      },
      {
        name: 'list_network_subgraphs',
        description: 'List published subgraphs on The Graph Network with optional chain, category, and name filters',
        inputSchema: {
          type: 'object',
          properties: {
            network: {
              type: 'string',
              description: 'Blockchain network filter: mainnet, arbitrum-one, matic, optimism, base (default: all)',
            },
            first: {
              type: 'number',
              description: 'Number of subgraphs to return (default: 20, max: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            order_by: {
              type: 'string',
              description: 'Sort field: signalAmount, createdAt, updatedAt (default: signalAmount)',
            },
          },
        },
      },
      {
        name: 'search_subgraphs',
        description: 'Search for subgraphs on The Graph Network by keyword or protocol name',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to find subgraphs (e.g. uniswap, aave, compound)',
            },
            first: {
              type: 'number',
              description: 'Number of results to return (default: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_indexer_status',
        description: 'Query The Graph Network for the indexing status and latest block of a subgraph deployment',
        inputSchema: {
          type: 'object',
          properties: {
            subgraph_id: {
              type: 'string',
              description: 'Subgraph deployment ID to check indexing status for',
            },
          },
          required: ['subgraph_id'],
        },
      },
      {
        name: 'query_graph_network',
        description: 'Query The Graph Network subgraph for indexer, delegator, and protocol-level data about The Graph ecosystem',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'GraphQL query against The Graph Network subgraph (e.g. { indexers(first: 5) { id stakedTokens } })',
            },
            variables: {
              type: 'object',
              description: 'Optional GraphQL variables',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_entity_by_id',
        description: 'Fetch a single entity from a subgraph by its ID — returns all fields available on that entity type',
        inputSchema: {
          type: 'object',
          properties: {
            subgraph_id: {
              type: 'string',
              description: 'Subgraph deployment ID to query',
            },
            entity_type: {
              type: 'string',
              description: 'GraphQL entity type name (e.g. Token, Pool, Transaction) — case-sensitive, matches schema',
            },
            entity_id: {
              type: 'string',
              description: 'Entity ID (usually a lowercase hex address or UUID)',
            },
            fields: {
              type: 'string',
              description: 'Space-separated list of fields to return (default: id and common fields)',
            },
          },
          required: ['subgraph_id', 'entity_type', 'entity_id'],
        },
      },
      {
        name: 'list_entities',
        description: 'List entities of a specific type from a subgraph with optional ordering, filtering, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            subgraph_id: {
              type: 'string',
              description: 'Subgraph deployment ID to query',
            },
            entity_type: {
              type: 'string',
              description: 'Plural GraphQL entity type (e.g. tokens, pools, swaps) — must match schema field name',
            },
            first: {
              type: 'number',
              description: 'Number of entities to return (default: 20, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of entities to skip for pagination (default: 0)',
            },
            order_by: {
              type: 'string',
              description: 'Field name to sort by (e.g. createdAt, totalValueLockedUSD)',
            },
            order_direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            fields: {
              type: 'string',
              description: 'Space-separated fields to include in the response',
            },
            where: {
              type: 'object',
              description: 'Filter conditions as key-value pairs (e.g. {"decimals": 18, "symbol": "USDC"})',
            },
          },
          required: ['subgraph_id', 'entity_type'],
        },
      },
      {
        name: 'get_recent_events',
        description: 'Get the most recent events or transactions from a subgraph entity type, ordered by block timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            subgraph_id: {
              type: 'string',
              description: 'Subgraph deployment ID to query',
            },
            event_type: {
              type: 'string',
              description: 'Plural event entity type (e.g. swaps, transfers, mints, burns)',
            },
            first: {
              type: 'number',
              description: 'Number of recent events to return (default: 20, max: 100)',
            },
            fields: {
              type: 'string',
              description: 'Space-separated fields to include (default: id timestamp)',
            },
          },
          required: ['subgraph_id', 'event_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_subgraph': return this.querySubgraph(args);
        case 'query_subgraph_studio': return this.querySubgraphStudio(args);
        case 'introspect_subgraph': return this.introspectSubgraph(args);
        case 'get_subgraph_metadata': return this.getSubgraphMetadata(args);
        case 'list_network_subgraphs': return this.listNetworkSubgraphs(args);
        case 'search_subgraphs': return this.searchSubgraphs(args);
        case 'get_indexer_status': return this.getIndexerStatus(args);
        case 'query_graph_network': return this.queryGraphNetwork(args);
        case 'get_entity_by_id': return this.getEntityById(args);
        case 'list_entities': return this.listEntities(args);
        case 'get_recent_events': return this.getRecentEvents(args);
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

  private async graphqlPost(url: string, query: string, variables?: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { query };
    if (variables) body.variables = variables;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `HTTP error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { data?: unknown; errors?: Array<{ message: string }> };
    if (data.errors && data.errors.length > 0) {
      return {
        content: [{ type: 'text', text: `GraphQL errors: ${data.errors.map(e => e.message).join('; ')}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private subgraphUrl(subgraphId: string): string {
    return `${this.gatewayBaseUrl}/${this.apiKey}/subgraphs/id/${subgraphId}`;
  }

  private async querySubgraph(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subgraph_id || !args.query) return { content: [{ type: 'text', text: 'subgraph_id and query are required' }], isError: true };
    return this.graphqlPost(
      this.subgraphUrl(args.subgraph_id as string),
      args.query as string,
      args.variables as Record<string, unknown> | undefined,
    );
  }

  private async querySubgraphStudio(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.studio_id || !args.version || !args.query) return { content: [{ type: 'text', text: 'studio_id, version, and query are required' }], isError: true };
    const url = `${this.subgraphStudioUrl}/${encodeURIComponent(args.studio_id as string)}/${encodeURIComponent(args.version as string)}`;
    return this.graphqlPost(url, args.query as string, args.variables as Record<string, unknown> | undefined);
  }

  private async introspectSubgraph(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subgraph_id) return { content: [{ type: 'text', text: 'subgraph_id is required' }], isError: true };
    const introspectionQuery = `{
      __schema {
        types {
          name
          kind
          fields {
            name
            type { name kind ofType { name kind } }
          }
        }
        queryType { name }
      }
    }`;
    return this.graphqlPost(this.subgraphUrl(args.subgraph_id as string), introspectionQuery);
  }

  private async getSubgraphMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subgraph_id) return { content: [{ type: 'text', text: 'subgraph_id is required' }], isError: true };
    // Query The Graph Network subgraph for metadata about this deployment
    const query = `{
      subgraphDeployment(id: "${encodeURIComponent(args.subgraph_id as string)}") {
        id
        ipfsHash
        createdAt
        stakedTokens
        indexingRewardAmount
        network { id }
        versions { label }
        entityCount
        latestEthereumBlockNumber
        failedUpdates
        activeIndexerAllocations { id }
      }
    }`;
    return this.queryGraphNetwork({ query });
  }

  private async listNetworkSubgraphs(args: Record<string, unknown>): Promise<ToolResult> {
    const first = (args.first as number) || 20;
    const skip = (args.skip as number) || 0;
    const orderBy = (args.order_by as string) || 'signalAmount';
    let networkFilter = '';
    if (args.network) {
      networkFilter = `, where: { network: "${encodeURIComponent(args.network as string)}" }`;
    }
    const query = `{
      subgraphs(first: ${first}, skip: ${skip}, orderBy: ${orderBy}, orderDirection: desc${networkFilter}) {
        id
        displayName
        description
        signal: currentVersion { subgraphDeployment { stakedTokens network { id } } }
        currentVersion { label }
        createdAt
        updatedAt
      }
    }`;
    return this.queryGraphNetwork({ query });
  }

  private async searchSubgraphs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const first = (args.first as number) || 20;
    const gqlQuery = `{
      subgraphSearch(text: "${encodeURIComponent(args.query as string)}") {
        id
        displayName
        description
        currentVersion { label }
        createdAt
      }
    }`;
    // Use first via variables approach
    void first;
    return this.queryGraphNetwork({ query: gqlQuery });
  }

  private async getIndexerStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subgraph_id) return { content: [{ type: 'text', text: 'subgraph_id is required' }], isError: true };
    const query = `{
      subgraphDeployment(id: "${encodeURIComponent(args.subgraph_id as string)}") {
        id
        latestEthereumBlockNumber
        stakedTokens
        activeIndexerAllocations { id indexer { id } }
        failedUpdates
      }
    }`;
    return this.queryGraphNetwork({ query });
  }

  private async queryGraphNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    // The Graph Network subgraph ID (Arbitrum mainnet)
    const networkSubgraphId = 'DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp';
    const url = this.subgraphUrl(networkSubgraphId);
    return this.graphqlPost(url, args.query as string, args.variables as Record<string, unknown> | undefined);
  }

  private async getEntityById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subgraph_id || !args.entity_type || !args.entity_id) {
      return { content: [{ type: 'text', text: 'subgraph_id, entity_type, and entity_id are required' }], isError: true };
    }
    const fields = (args.fields as string) || 'id';
    // entity_type is singular (e.g. Token), GraphQL query uses lowercase first letter
    const typeName = (args.entity_type as string).charAt(0).toLowerCase() + (args.entity_type as string).slice(1);
    const query = `{
      ${typeName}(id: "${encodeURIComponent(args.entity_id as string)}") {
        ${fields}
      }
    }`;
    return this.graphqlPost(this.subgraphUrl(args.subgraph_id as string), query);
  }

  private async listEntities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subgraph_id || !args.entity_type) {
      return { content: [{ type: 'text', text: 'subgraph_id and entity_type are required' }], isError: true };
    }
    const first = (args.first as number) || 20;
    const skip = (args.skip as number) || 0;
    const orderBy = args.order_by ? `, orderBy: ${encodeURIComponent(args.order_by as string)}` : '';
    const orderDirection = args.order_direction ? `, orderDirection: ${encodeURIComponent(args.order_direction as string)}` : ', orderDirection: desc';
    const fields = (args.fields as string) || 'id';

    let whereClause = '';
    if (args.where && typeof args.where === 'object') {
      const conditions = Object.entries(args.where as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(', ');
      if (conditions) whereClause = `, where: { ${conditions} }`;
    }

    const query = `{
      ${encodeURIComponent(args.entity_type as string)}(first: ${first}, skip: ${skip}${orderBy}${orderDirection}${whereClause}) {
        ${fields}
      }
    }`;
    return this.graphqlPost(this.subgraphUrl(args.subgraph_id as string), query);
  }

  private async getRecentEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subgraph_id || !args.event_type) {
      return { content: [{ type: 'text', text: 'subgraph_id and event_type are required' }], isError: true };
    }
    const first = (args.first as number) || 20;
    const fields = (args.fields as string) || 'id timestamp';
    const query = `{
      ${encodeURIComponent(args.event_type as string)}(first: ${first}, orderBy: timestamp, orderDirection: desc) {
        ${fields}
      }
    }`;
    return this.graphqlPost(this.subgraphUrl(args.subgraph_id as string), query);
  }
}
