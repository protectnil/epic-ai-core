/**
 * Infura MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Infura MCP server was found on GitHub or npm. Community servers that USE Infura as a
// provider (e.g. zhangzhongnan928/mcp-evm-signer) exist but are not Infura-published MCP servers.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api — no official Infura MCP server exists.
//
// Base URL: https://{network}.infura.io/v3/{projectId}  (projectId embedded in URL per Infura convention)
// Auth: Project ID in URL path. Optional API key secret via Authorization: Basic base64(:{apiSecret})
//       for additional security when "Require API Key Secret" is enabled on the project.
// Docs: https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/
// Rate limits: Credit-based daily quota (resets 00:00 UTC). Free tier: 100,000 credits/day.
//              Each method consumes a specific number of credits (e.g. eth_blockNumber = 80 credits).
//              Throughput limit applies per second. Exceeding daily quota suspends access until reset.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InfuraConfig {
  projectId: string;
  apiSecret?: string;  // Optional — required only if project has "Require API Key Secret" enabled
  network?: string;    // Ethereum network (default: mainnet)
}

export class InfuraMCPServer extends MCPAdapterBase {
  private readonly projectId: string;
  private readonly apiSecret: string | null;
  private readonly network: string;

  constructor(config: InfuraConfig) {
    super();
    this.projectId = config.projectId;
    this.apiSecret = config.apiSecret ?? null;
    this.network = config.network || 'mainnet';
  }

  static catalog() {
    return {
      name: 'infura',
      displayName: 'Infura',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'infura', 'ethereum', 'blockchain', 'web3', 'eth', 'evm', 'node', 'rpc', 'json-rpc',
        'smart contract', 'wallet', 'transaction', 'gas', 'block', 'defi', 'nft',
        'polygon', 'arbitrum', 'optimism', 'ipfs', 'metamask', 'crypto',
      ],
      toolNames: [
        'eth_block_number', 'eth_get_block', 'eth_get_transaction', 'eth_get_transaction_receipt',
        'eth_get_balance', 'eth_get_transaction_count', 'eth_get_code', 'eth_call',
        'eth_estimate_gas', 'eth_gas_price', 'eth_fee_history',
        'eth_get_logs', 'eth_get_storage_at',
        'net_version', 'web3_client_version',
        'eth_send_raw_transaction',
        'eth_get_block_transaction_count', 'eth_get_uncle_count',
      ],
      description: 'Infura Ethereum node infrastructure: query blocks, transactions, balances, logs, gas prices, and submit raw transactions via JSON-RPC.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'eth_block_number',
        description: 'Get the current latest Ethereum block number (chain height) on the configured network',
        inputSchema: {
          type: 'object',
          properties: {
            network: {
              type: 'string',
              description: 'Override the default network: mainnet, sepolia, holesky, polygon-mainnet, arbitrum-mainnet, optimism-mainnet (optional)',
            },
          },
        },
      },
      {
        name: 'eth_get_block',
        description: 'Get full block data by block number or hash including transactions, gas used, and miner',
        inputSchema: {
          type: 'object',
          properties: {
            block: {
              type: 'string',
              description: 'Block number in hex (e.g. 0x10d4f), block hash (0x...), or tag: latest, earliest, pending',
            },
            full_transactions: {
              type: 'boolean',
              description: 'If true, return full transaction objects; if false, return tx hashes only (default: false)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional — uses constructor default)',
            },
          },
          required: ['block'],
        },
      },
      {
        name: 'eth_get_transaction',
        description: 'Get a transaction by hash including sender, recipient, value, gas, and input data',
        inputSchema: {
          type: 'object',
          properties: {
            tx_hash: {
              type: 'string',
              description: 'Transaction hash (0x-prefixed 64-character hex string)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['tx_hash'],
        },
      },
      {
        name: 'eth_get_transaction_receipt',
        description: 'Get a transaction receipt including status (success/failure), gas used, logs, and contract address if deployed',
        inputSchema: {
          type: 'object',
          properties: {
            tx_hash: {
              type: 'string',
              description: 'Transaction hash (0x-prefixed)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['tx_hash'],
        },
      },
      {
        name: 'eth_get_balance',
        description: 'Get the ETH balance of an Ethereum address in wei at a specified block',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Ethereum address (0x-prefixed, 40 hex chars)',
            },
            block: {
              type: 'string',
              description: 'Block tag: latest, earliest, pending, or block number in hex (default: latest)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'eth_get_transaction_count',
        description: 'Get the nonce (number of transactions sent) for an Ethereum address — used for constructing new transactions',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Ethereum address (0x-prefixed)',
            },
            block: {
              type: 'string',
              description: 'Block tag: latest, pending, earliest, or block number in hex (default: latest)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'eth_get_code',
        description: 'Get the bytecode deployed at an Ethereum contract address — returns 0x for EOAs',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Contract address (0x-prefixed)',
            },
            block: {
              type: 'string',
              description: 'Block tag: latest, earliest, pending, or block number in hex (default: latest)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'eth_call',
        description: 'Execute a read-only smart contract call (view/pure function) without creating a transaction',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Contract address to call (0x-prefixed)',
            },
            data: {
              type: 'string',
              description: 'ABI-encoded call data (function selector + encoded parameters, 0x-prefixed)',
            },
            from: {
              type: 'string',
              description: 'Sender address for the call (optional — may affect view functions that check msg.sender)',
            },
            block: {
              type: 'string',
              description: 'Block tag: latest, earliest, pending, or block number in hex (default: latest)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['to', 'data'],
        },
      },
      {
        name: 'eth_estimate_gas',
        description: 'Estimate gas required for a transaction before submitting it to the network',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Sender address (0x-prefixed)',
            },
            to: {
              type: 'string',
              description: 'Recipient or contract address (0x-prefixed)',
            },
            data: {
              type: 'string',
              description: 'ABI-encoded call data (for contract interactions, 0x-prefixed)',
            },
            value: {
              type: 'string',
              description: 'ETH value to send in hex wei (e.g. 0xDE0B6B3A7640000 for 1 ETH — optional)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
        },
      },
      {
        name: 'eth_gas_price',
        description: 'Get the current gas price in wei — use for legacy (type 0) transactions',
        inputSchema: {
          type: 'object',
          properties: {
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
        },
      },
      {
        name: 'eth_fee_history',
        description: 'Get historical gas fee data including base fees and priority fees for EIP-1559 transaction fee estimation',
        inputSchema: {
          type: 'object',
          properties: {
            block_count: {
              type: 'number',
              description: 'Number of blocks to include in the history (1–1024, default: 10)',
            },
            newest_block: {
              type: 'string',
              description: 'Most recent block to include: latest, pending, or block number in hex (default: latest)',
            },
            reward_percentiles: {
              type: 'string',
              description: 'Comma-separated percentiles for priority fee sampling (e.g. "25,50,75")',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
        },
      },
      {
        name: 'eth_get_logs',
        description: 'Query Ethereum event logs by contract address, topics, and block range for indexing and monitoring',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Contract address to filter logs for (0x-prefixed)',
            },
            from_block: {
              type: 'string',
              description: 'Start block in hex or tag (latest, earliest — default: latest)',
            },
            to_block: {
              type: 'string',
              description: 'End block in hex or tag (default: latest)',
            },
            topics: {
              type: 'string',
              description: 'JSON array of topic filters (e.g. ["0xddf252..."] for ERC-20 Transfer events)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
        },
      },
      {
        name: 'eth_get_storage_at',
        description: 'Get the value stored at a specific storage slot of a smart contract at a given block',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Contract address (0x-prefixed)',
            },
            position: {
              type: 'string',
              description: 'Storage slot position in hex (e.g. 0x0 for slot 0)',
            },
            block: {
              type: 'string',
              description: 'Block tag: latest, earliest, pending, or block number in hex (default: latest)',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['address', 'position'],
        },
      },
      {
        name: 'net_version',
        description: 'Get the network ID of the connected Ethereum network (e.g. 1 for mainnet, 11155111 for Sepolia)',
        inputSchema: {
          type: 'object',
          properties: {
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
        },
      },
      {
        name: 'web3_client_version',
        description: 'Get the Infura client version string for the connected node',
        inputSchema: {
          type: 'object',
          properties: {
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
        },
      },
      {
        name: 'eth_send_raw_transaction',
        description: 'Broadcast a signed raw transaction to the Ethereum network — returns the transaction hash',
        inputSchema: {
          type: 'object',
          properties: {
            signed_tx: {
              type: 'string',
              description: 'RLP-encoded signed transaction as a 0x-prefixed hex string',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['signed_tx'],
        },
      },
      {
        name: 'eth_get_block_transaction_count',
        description: 'Get the number of transactions in a block by block number or hash',
        inputSchema: {
          type: 'object',
          properties: {
            block: {
              type: 'string',
              description: 'Block number in hex, block hash (0x...), or tag: latest, earliest, pending',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['block'],
        },
      },
      {
        name: 'eth_get_uncle_count',
        description: 'Get the number of uncle blocks for a given block — relevant for proof-of-work era analysis',
        inputSchema: {
          type: 'object',
          properties: {
            block: {
              type: 'string',
              description: 'Block number in hex, block hash (0x...), or tag: latest, earliest',
            },
            network: {
              type: 'string',
              description: 'Network override (optional)',
            },
          },
          required: ['block'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'eth_block_number':
          return this.rpcCall('eth_blockNumber', [], args.network as string | undefined);
        case 'eth_get_block': {
          const fullTx = args.full_transactions === true;
          const method = args.block && String(args.block).startsWith('0x') && String(args.block).length === 66
            ? 'eth_getBlockByHash'
            : 'eth_getBlockByNumber';
          return this.rpcCall(method, [args.block as string || 'latest', fullTx], args.network as string | undefined);
        }
        case 'eth_get_transaction':
          if (!args.tx_hash) return { content: [{ type: 'text', text: 'tx_hash is required' }], isError: true };
          return this.rpcCall('eth_getTransactionByHash', [args.tx_hash as string], args.network as string | undefined);
        case 'eth_get_transaction_receipt':
          if (!args.tx_hash) return { content: [{ type: 'text', text: 'tx_hash is required' }], isError: true };
          return this.rpcCall('eth_getTransactionReceipt', [args.tx_hash as string], args.network as string | undefined);
        case 'eth_get_balance':
          if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
          return this.rpcCall('eth_getBalance', [args.address as string, (args.block as string) || 'latest'], args.network as string | undefined);
        case 'eth_get_transaction_count':
          if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
          return this.rpcCall('eth_getTransactionCount', [args.address as string, (args.block as string) || 'latest'], args.network as string | undefined);
        case 'eth_get_code':
          if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
          return this.rpcCall('eth_getCode', [args.address as string, (args.block as string) || 'latest'], args.network as string | undefined);
        case 'eth_call': {
          if (!args.to || !args.data) return { content: [{ type: 'text', text: 'to and data are required' }], isError: true };
          const callObj: Record<string, string> = { to: args.to as string, data: args.data as string };
          if (args.from) callObj.from = args.from as string;
          return this.rpcCall('eth_call', [callObj, (args.block as string) || 'latest'], args.network as string | undefined);
        }
        case 'eth_estimate_gas': {
          const gasObj: Record<string, string> = {};
          if (args.from) gasObj.from = args.from as string;
          if (args.to) gasObj.to = args.to as string;
          if (args.data) gasObj.data = args.data as string;
          if (args.value) gasObj.value = args.value as string;
          return this.rpcCall('eth_estimateGas', [gasObj], args.network as string | undefined);
        }
        case 'eth_gas_price':
          return this.rpcCall('eth_gasPrice', [], args.network as string | undefined);
        case 'eth_fee_history': {
          const blockCount = (args.block_count as number) || 10;
          const newestBlock = (args.newest_block as string) || 'latest';
          const percentiles = args.reward_percentiles
            ? String(args.reward_percentiles).split(',').map(Number)
            : [25, 50, 75];
          return this.rpcCall('eth_feeHistory', [blockCount, newestBlock, percentiles], args.network as string | undefined);
        }
        case 'eth_get_logs': {
          const filter: Record<string, unknown> = {};
          if (args.address) filter.address = args.address;
          if (args.from_block) filter.fromBlock = args.from_block;
          if (args.to_block) filter.toBlock = args.to_block;
          if (args.topics) {
            try {
              filter.topics = JSON.parse(args.topics as string);
            } catch {
              return { content: [{ type: 'text', text: 'topics must be a valid JSON array' }], isError: true };
            }
          }
          return this.rpcCall('eth_getLogs', [filter], args.network as string | undefined);
        }
        case 'eth_get_storage_at':
          if (!args.address || !args.position) return { content: [{ type: 'text', text: 'address and position are required' }], isError: true };
          return this.rpcCall('eth_getStorageAt', [args.address as string, args.position as string, (args.block as string) || 'latest'], args.network as string | undefined);
        case 'net_version':
          return this.rpcCall('net_version', [], args.network as string | undefined);
        case 'web3_client_version':
          return this.rpcCall('web3_clientVersion', [], args.network as string | undefined);
        case 'eth_send_raw_transaction':
          if (!args.signed_tx) return { content: [{ type: 'text', text: 'signed_tx is required' }], isError: true };
          return this.rpcCall('eth_sendRawTransaction', [args.signed_tx as string], args.network as string | undefined);
        case 'eth_get_block_transaction_count': {
          if (!args.block) return { content: [{ type: 'text', text: 'block is required' }], isError: true };
          const blockStr = args.block as string;
          const method = blockStr.length === 66 ? 'eth_getBlockTransactionCountByHash' : 'eth_getBlockTransactionCountByNumber';
          return this.rpcCall(method, [blockStr], args.network as string | undefined);
        }
        case 'eth_get_uncle_count': {
          if (!args.block) return { content: [{ type: 'text', text: 'block is required' }], isError: true };
          const blockStr = args.block as string;
          const method = blockStr.length === 66 ? 'eth_getUncleCountByBlockHash' : 'eth_getUncleCountByBlockNumber';
          return this.rpcCall(method, [blockStr], args.network as string | undefined);
        }
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

  private getEndpointUrl(network?: string): string {
    const net = network || this.network;
    return `https://${net}.infura.io/v3/${this.projectId}`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiSecret) {
      // Basic auth with empty username and API secret as password
      const encoded = Buffer.from(`:${this.apiSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }
    return headers;
  }

  private async rpcCall(method: string, params: unknown[], network?: string): Promise<ToolResult> {
    const url = this.getEndpointUrl(network);
    const body = {
      jsonrpc: '2.0',
      method,
      params,
      id: 1,
    };
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { error?: { message: string; code: number }; result?: unknown };
    if (data.error) {
      return { content: [{ type: 'text', text: `JSON-RPC error ${data.error.code}: ${data.error.message}` }], isError: true };
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}
