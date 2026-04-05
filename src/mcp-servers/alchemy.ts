/**
 * Alchemy MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/alchemyplatform/alchemy-mcp-server — transport: stdio, auth: API key env var
// Our adapter covers: 18 tools (NFT, token balances, transfers, transactions, prices, gas, webhooks).
// Vendor MCP covers: 9 tools (core queries only).
// Recommendation: Use this adapter for broader coverage including webhooks and gas estimation.
// Use the vendor MCP for minimal footprint deployments focused on core on-chain queries.
//
// Base URL: https://{network}.g.alchemy.com/v2/{apiKey}  (JSON-RPC and core APIs)
//           https://{network}.g.alchemy.com/nft/v3/{apiKey}  (NFT API v3)
// Auth: API key embedded in URL path (not a header) — per Alchemy's URL-key model
// Docs: https://www.alchemy.com/docs / https://docs.alchemy.com/reference/api-overview
// Rate limits: Varies by plan — free tier: 330 compute units/sec; paid plans higher

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AlchemyConfig {
  apiKey: string;
  network?: string;   // default: eth-mainnet
  baseUrl?: string;   // optional full override (overrides network + default)
}

export class AlchemyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly network: string;
  private readonly baseUrlOverride: string | undefined;

  constructor(config: AlchemyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.network = config.network || 'eth-mainnet';
    this.baseUrlOverride = config.baseUrl;
  }

  static catalog() {
    return {
      name: 'alchemy',
      displayName: 'Alchemy',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'alchemy', 'blockchain', 'ethereum', 'polygon', 'nft', 'token', 'defi',
        'web3', 'onchain', 'erc20', 'erc721', 'erc1155', 'transaction', 'transfer',
        'wallet', 'balance', 'gas', 'price', 'webhook', 'notify', 'multichain',
      ],
      toolNames: [
        'get_nfts_for_owner', 'get_nft_metadata', 'get_nft_collection',
        'get_owners_for_nft', 'get_owners_for_contract', 'search_nfts_by_keyword',
        'get_token_balances', 'get_token_metadata',
        'get_asset_transfers', 'get_transaction', 'get_transaction_receipt',
        'get_token_price', 'get_latest_block', 'get_block_by_number',
        'estimate_gas', 'get_gas_price',
        'list_webhooks', 'create_webhook', 'delete_webhook',
      ],
      description: 'Alchemy blockchain node and data API: query NFTs, token balances, transfers, transactions, gas, prices, and manage webhooks across Ethereum and EVM chains.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── NFT API ────────────────────────────────────────────────────────────
      {
        name: 'get_nfts_for_owner',
        description: 'Get all NFTs (ERC-721 and ERC-1155) owned by a wallet address, with metadata and collection info',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Wallet address (0x…) to query NFTs for',
            },
            contract_addresses: {
              type: 'array',
              description: 'Optional list of contract addresses to filter results to specific NFT collections',
              items: { type: 'string' },
            },
            with_metadata: {
              type: 'boolean',
              description: 'Include NFT metadata (name, description, image URL) in response (default: true)',
            },
            page_key: {
              type: 'string',
              description: 'Pagination cursor from a previous response pageKey field',
            },
            page_size: {
              type: 'number',
              description: 'Number of NFTs per page (max: 100, default: 100)',
            },
          },
          required: ['owner'],
        },
      },
      {
        name: 'get_nft_metadata',
        description: 'Get metadata for a specific NFT by contract address and token ID — name, description, image, traits',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'NFT contract address (0x…)',
            },
            token_id: {
              type: 'string',
              description: 'NFT token ID (decimal or hex)',
            },
            token_type: {
              type: 'string',
              description: 'Token standard: ERC721 or ERC1155 (optional — auto-detected if omitted)',
            },
            refresh_cache: {
              type: 'boolean',
              description: 'Force a metadata refresh from the token URI (default: false)',
            },
          },
          required: ['contract_address', 'token_id'],
        },
      },
      {
        name: 'get_nft_collection',
        description: 'Get collection-level metadata for an NFT contract — name, symbol, total supply, floor price, and OpenSea slug',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'NFT contract address (0x…)',
            },
          },
          required: ['contract_address'],
        },
      },
      {
        name: 'get_owners_for_nft',
        description: 'Get all current owners of a specific NFT token by contract address and token ID',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'NFT contract address (0x…)',
            },
            token_id: {
              type: 'string',
              description: 'NFT token ID (decimal or hex)',
            },
          },
          required: ['contract_address', 'token_id'],
        },
      },
      {
        name: 'get_owners_for_contract',
        description: 'Get all unique owner wallet addresses for every token in an NFT contract',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'NFT contract address (0x…)',
            },
            with_token_balances: {
              type: 'boolean',
              description: 'Include per-owner token balance counts in the response (default: false)',
            },
            page_key: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['contract_address'],
        },
      },
      {
        name: 'search_nfts_by_keyword',
        description: 'Search for NFTs by keyword matching collection name, symbol, or contract address',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword or phrase to search for across NFT collection names and symbols',
            },
          },
          required: ['query'],
        },
      },
      // ── Token API ──────────────────────────────────────────────────────────
      {
        name: 'get_token_balances',
        description: 'Get ERC-20 token balances for a wallet address — returns all tokens or a specific list of contracts',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Wallet address (0x…) to query token balances for',
            },
            contract_addresses: {
              type: 'array',
              description: 'Optional list of ERC-20 contract addresses to check (default: all tokens)',
              items: { type: 'string' },
            },
            page_key: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'get_token_metadata',
        description: 'Get ERC-20 token metadata by contract address — name, symbol, decimals, and logo',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'ERC-20 token contract address (0x…)',
            },
          },
          required: ['contract_address'],
        },
      },
      // ── Transfers API ──────────────────────────────────────────────────────
      {
        name: 'get_asset_transfers',
        description: 'Get asset transfer history for a wallet — ETH, ERC-20, ERC-721, ERC-1155 transfers, with optional date range',
        inputSchema: {
          type: 'object',
          properties: {
            from_address: {
              type: 'string',
              description: 'Filter transfers where this address is the sender',
            },
            to_address: {
              type: 'string',
              description: 'Filter transfers where this address is the recipient',
            },
            from_block: {
              type: 'string',
              description: 'Start block number (hex, e.g. "0x0") or "latest" (default: "0x0")',
            },
            to_block: {
              type: 'string',
              description: 'End block number (hex) or "latest" (default: "latest")',
            },
            category: {
              type: 'array',
              description: 'Transfer categories to include: external, internal, erc20, erc721, erc1155, specialnft',
              items: { type: 'string' },
            },
            contract_addresses: {
              type: 'array',
              description: 'Filter by specific token contract addresses',
              items: { type: 'string' },
            },
            max_count: {
              type: 'string',
              description: 'Max number of results to return in hex (e.g. "0x64" = 100, default: "0x3e8" = 1000)',
            },
            page_key: {
              type: 'string',
              description: 'Pagination cursor from a previous response pageKey field',
            },
          },
        },
      },
      // ── Transaction API ────────────────────────────────────────────────────
      {
        name: 'get_transaction',
        description: 'Get full details of an Ethereum transaction by transaction hash',
        inputSchema: {
          type: 'object',
          properties: {
            tx_hash: {
              type: 'string',
              description: 'Transaction hash (0x…) to retrieve',
            },
          },
          required: ['tx_hash'],
        },
      },
      {
        name: 'get_transaction_receipt',
        description: 'Get the transaction receipt for a mined transaction — includes status, gas used, and event logs',
        inputSchema: {
          type: 'object',
          properties: {
            tx_hash: {
              type: 'string',
              description: 'Transaction hash (0x…) to get the receipt for',
            },
          },
          required: ['tx_hash'],
        },
      },
      // ── Price API ──────────────────────────────────────────────────────────
      {
        name: 'get_token_price',
        description: 'Get current price in USD and other currencies for a token by contract address',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'Token contract address (0x…)',
            },
            network: {
              type: 'string',
              description: 'Network to query on (default: eth-mainnet)',
            },
          },
          required: ['contract_address'],
        },
      },
      // ── Block API ──────────────────────────────────────────────────────────
      {
        name: 'get_latest_block',
        description: 'Get the latest confirmed block number and basic block data for the configured network',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_block_by_number',
        description: 'Get full block data by block number — transactions, miner, gas used, timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            block_number: {
              type: 'string',
              description: 'Block number in hex (e.g. "0x1b4") or "latest" / "earliest" / "pending"',
            },
            include_transactions: {
              type: 'boolean',
              description: 'Include full transaction objects (true) or just tx hashes (false, default)',
            },
          },
          required: ['block_number'],
        },
      },
      // ── Gas API ────────────────────────────────────────────────────────────
      {
        name: 'estimate_gas',
        description: 'Estimate the gas required for a transaction — specify from, to, value, and optional data',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Sender address (0x…)',
            },
            to: {
              type: 'string',
              description: 'Recipient address or contract (0x…)',
            },
            value: {
              type: 'string',
              description: 'ETH value to send in wei (hex, e.g. "0xde0b6b3a7640000" = 1 ETH)',
            },
            data: {
              type: 'string',
              description: 'Encoded calldata for contract interactions (hex)',
            },
          },
          required: ['to'],
        },
      },
      {
        name: 'get_gas_price',
        description: 'Get the current recommended gas price in wei for the configured network',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Webhooks (Notify API) ──────────────────────────────────────────────
      {
        name: 'list_webhooks',
        description: 'List all Alchemy Notify webhooks configured for the account — address activity, mined transactions, dropped transactions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Create an Alchemy Notify webhook to monitor address activity or mined/dropped transactions',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_url: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST payloads',
            },
            webhook_type: {
              type: 'string',
              description: 'Type of webhook: MINED_TRANSACTION, DROPPED_TRANSACTION, ADDRESS_ACTIVITY, NFT_ACTIVITY',
            },
            addresses: {
              type: 'array',
              description: 'Wallet addresses (0x…) to monitor for ADDRESS_ACTIVITY type webhooks',
              items: { type: 'string' },
            },
          },
          required: ['webhook_url', 'webhook_type'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete an Alchemy Notify webhook by webhook ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'Webhook ID to delete (from list_webhooks response)',
            },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_nfts_for_owner':      return this.getNftsForOwner(args);
        case 'get_nft_metadata':        return this.getNftMetadata(args);
        case 'get_nft_collection':      return this.getNftCollection(args);
        case 'get_owners_for_nft':      return this.getOwnersForNft(args);
        case 'get_owners_for_contract': return this.getOwnersForContract(args);
        case 'search_nfts_by_keyword':  return this.searchNftsByKeyword(args);
        case 'get_token_balances':      return this.getTokenBalances(args);
        case 'get_token_metadata':      return this.getTokenMetadata(args);
        case 'get_asset_transfers':     return this.getAssetTransfers(args);
        case 'get_transaction':         return this.getTransaction(args);
        case 'get_transaction_receipt': return this.getTransactionReceipt(args);
        case 'get_token_price':         return this.getTokenPrice(args);
        case 'get_latest_block':        return this.getLatestBlock();
        case 'get_block_by_number':     return this.getBlockByNumber(args);
        case 'estimate_gas':            return this.estimateGas(args);
        case 'get_gas_price':           return this.getGasPrice();
        case 'list_webhooks':           return this.listWebhooks();
        case 'create_webhook':          return this.createWebhook(args);
        case 'delete_webhook':          return this.deleteWebhook(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get rpcUrl(): string {
    if (this.baseUrlOverride) return this.baseUrlOverride;
    return `https://${this.network}.g.alchemy.com/v2/${this.apiKey}`;
  }

  private get nftBaseUrl(): string {
    if (this.baseUrlOverride) return this.baseUrlOverride;
    return `https://${this.network}.g.alchemy.com/nft/v3/${this.apiKey}`;
  }

  private get notifyBaseUrl(): string {
    return 'https://dashboard.alchemy.com/api';
  }

  private async rpcCall(method: string, params: unknown[]): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `RPC error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { result?: unknown; error?: { message: string } };
    if (data.error) {
      return { content: [{ type: 'text', text: `RPC error: ${data.error.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data.result) }], isError: false };
  }

  private async nftGet(endpoint: string, params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.nftBaseUrl}/${endpoint}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `NFT API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async notifyRequest(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.notifyBaseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        'X-Alchemy-Token': this.apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Notify API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── NFT methods ────────────────────────────────────────────────────────────

  private async getNftsForOwner(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner) return { content: [{ type: 'text', text: 'owner is required' }], isError: true };
    const params: Record<string, string> = {
      owner: args.owner as string,
      withMetadata: String((args.with_metadata as boolean) ?? true),
      pageSize: String((args.page_size as number) ?? 100),
    };
    if (args.page_key) params.pageKey = args.page_key as string;
    if (Array.isArray(args.contract_addresses)) {
      (args.contract_addresses as string[]).forEach((addr, i) => {
        params[`contractAddresses[${i}]`] = addr;
      });
    }
    return this.nftGet('getNFTsForOwner', params);
  }

  private async getNftMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contract_address || !args.token_id) {
      return { content: [{ type: 'text', text: 'contract_address and token_id are required' }], isError: true };
    }
    const params: Record<string, string> = {
      contractAddress: args.contract_address as string,
      tokenId: args.token_id as string,
    };
    if (args.token_type)    params.tokenType    = args.token_type as string;
    if (args.refresh_cache) params.refreshCache = String(args.refresh_cache);
    return this.nftGet('getNFTMetadata', params);
  }

  private async getNftCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contract_address) {
      return { content: [{ type: 'text', text: 'contract_address is required' }], isError: true };
    }
    return this.nftGet('getContractMetadata', { contractAddress: args.contract_address as string });
  }

  private async getOwnersForNft(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contract_address || !args.token_id) {
      return { content: [{ type: 'text', text: 'contract_address and token_id are required' }], isError: true };
    }
    return this.nftGet('getOwnersForNFT', {
      contractAddress: args.contract_address as string,
      tokenId: args.token_id as string,
    });
  }

  private async getOwnersForContract(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contract_address) {
      return { content: [{ type: 'text', text: 'contract_address is required' }], isError: true };
    }
    const params: Record<string, string> = {
      contractAddress: args.contract_address as string,
    };
    if (args.with_token_balances) params.withTokenBalances = String(args.with_token_balances);
    if (args.page_key)            params.pageKey           = args.page_key as string;
    return this.nftGet('getOwnersForContract', params);
  }

  private async searchNftsByKeyword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.nftGet('searchContractMetadata', { query: args.query as string });
  }

  // ── Token methods ──────────────────────────────────────────────────────────

  private async getTokenBalances(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    const params: unknown[] = args.contract_addresses
      ? [args.address, args.contract_addresses]
      : [args.address, 'erc20'];
    if (args.page_key) {
      (params as Array<unknown>).push({ pageKey: args.page_key });
    }
    return this.rpcCall('alchemy_getTokenBalances', params);
  }

  private async getTokenMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contract_address) {
      return { content: [{ type: 'text', text: 'contract_address is required' }], isError: true };
    }
    return this.rpcCall('alchemy_getTokenMetadata', [args.contract_address]);
  }

  // ── Transfer methods ───────────────────────────────────────────────────────

  private async getAssetTransfers(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {
      fromBlock: (args.from_block as string) ?? '0x0',
      toBlock: (args.to_block as string) ?? 'latest',
      category: (args.category as string[]) ?? ['external', 'erc20', 'erc721', 'erc1155'],
      withMetadata: true,
      excludeZeroValue: true,
    };
    if (args.from_address)       payload.fromAddress       = args.from_address;
    if (args.to_address)         payload.toAddress         = args.to_address;
    if (args.contract_addresses) payload.contractAddresses = args.contract_addresses;
    if (args.max_count)          payload.maxCount          = args.max_count;
    if (args.page_key)           payload.pageKey           = args.page_key;
    return this.rpcCall('alchemy_getAssetTransfers', [payload]);
  }

  // ── Transaction methods ────────────────────────────────────────────────────

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tx_hash) return { content: [{ type: 'text', text: 'tx_hash is required' }], isError: true };
    return this.rpcCall('eth_getTransactionByHash', [args.tx_hash]);
  }

  private async getTransactionReceipt(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tx_hash) return { content: [{ type: 'text', text: 'tx_hash is required' }], isError: true };
    return this.rpcCall('eth_getTransactionReceipt', [args.tx_hash]);
  }

  // ── Price method ───────────────────────────────────────────────────────────

  private async getTokenPrice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contract_address) {
      return { content: [{ type: 'text', text: 'contract_address is required' }], isError: true };
    }
    const network = (args.network as string) ?? this.network;
    const url = `https://api.g.alchemy.com/prices/v1/${this.apiKey}/tokens/by-address`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ network, address: args.contract_address }],
      }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Price API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Block methods ──────────────────────────────────────────────────────────

  private async getLatestBlock(): Promise<ToolResult> {
    return this.rpcCall('eth_getBlockByNumber', ['latest', false]);
  }

  private async getBlockByNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.block_number) return { content: [{ type: 'text', text: 'block_number is required' }], isError: true };
    return this.rpcCall('eth_getBlockByNumber', [
      args.block_number,
      (args.include_transactions as boolean) ?? false,
    ]);
  }

  // ── Gas methods ────────────────────────────────────────────────────────────

  private async estimateGas(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to) return { content: [{ type: 'text', text: 'to is required' }], isError: true };
    const tx: Record<string, unknown> = { to: args.to };
    if (args.from)  tx.from  = args.from;
    if (args.value) tx.value = args.value;
    if (args.data)  tx.data  = args.data;
    return this.rpcCall('eth_estimateGas', [tx]);
  }

  private async getGasPrice(): Promise<ToolResult> {
    return this.rpcCall('eth_gasPrice', []);
  }

  // ── Webhook methods ────────────────────────────────────────────────────────

  private async listWebhooks(): Promise<ToolResult> {
    return this.notifyRequest('GET', '/team-webhooks');
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_url || !args.webhook_type) {
      return { content: [{ type: 'text', text: 'webhook_url and webhook_type are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      network: this.network,
      webhook_type: args.webhook_type,
      webhook_url: args.webhook_url,
    };
    if (args.addresses) body.addresses = args.addresses;
    return this.notifyRequest('POST', '/create-webhook', body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.notifyRequest('DELETE', `/delete-webhook?webhook_id=${encodeURIComponent(args.webhook_id as string)}`);
  }
}
