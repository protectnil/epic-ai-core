/**
 * HashiCorp Vault MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hashicorp/vault-mcp-server — transport: stdio + streamable-HTTP, auth: Vault token
// Vendor MCP covers 16 tools (KV: list_secrets, create_secret, read_secret, delete_secret;
//   sys: list_mounts, create_mount, delete_mount;
//   PKI: enable_pki, create_pki_issuer, list_pki_issuers, read_pki_issuer, create_pki_role,
//        read_pki_role, list_pki_roles, delete_pki_role, issue_pki_certificate).
// Our adapter covers 25 tools adding: sys/health, sys/auth, full policy CRUD, token lifecycle,
//   lease management, and Transit encryption — none of which the official MCP exposes.
// Recommendation: use-both. MCP provides PKI tools our adapter lacks; our adapter provides
//   health, auth methods, policies, token ops, leases, and transit that the MCP lacks.
//
// Base URL: https://{vaultAddr}/v1 — caller supplies their Vault address (no default; Vault is self-hosted)
// Auth: X-Vault-Token header (canonical). Vault Enterprise: X-Vault-Namespace header.
// Docs: https://developer.hashicorp.com/vault/api-docs
// Rate limits: No documented global rate limit; Vault performance replication and HA impose node limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HashiCorpVaultConfig {
  /** Full Vault address, e.g. https://vault.example.com (no trailing slash, no /v1 suffix). */
  vaultAddr: string;
  /** Vault token — service token, AppRole token, or any valid auth token. */
  token: string;
  /** Vault Enterprise namespace (e.g. admin/team-a). Omit for open-source Vault. */
  namespace?: string;
}

export class HashiCorpVaultMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly namespace?: string;

  constructor(config: HashiCorpVaultConfig) {
    super();
    this.baseUrl = `${config.vaultAddr.replace(/\/$/, '')}/v1`;
    this.token = config.token;
    this.namespace = config.namespace;
  }

  static catalog() {
    return {
      name: 'hashicorp-vault',
      displayName: 'HashiCorp Vault',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: [
        'vault', 'hashicorp', 'secrets', 'secret management', 'kv', 'key-value',
        'pki', 'certificate', 'token', 'policy', 'lease', 'transit', 'encrypt',
        'decrypt', 'mount', 'auth', 'namespace', 'dynamic credentials',
      ],
      toolNames: [
        'health_check', 'list_mounts', 'list_auth_methods',
        'read_secret', 'write_secret', 'delete_secret', 'undelete_secret',
        'destroy_secret', 'list_secrets', 'read_secret_metadata', 'patch_secret_metadata',
        'list_policies', 'get_policy', 'create_or_update_policy', 'delete_policy',
        'create_token', 'lookup_token', 'renew_token', 'revoke_token',
        'list_leases', 'renew_lease', 'revoke_lease',
        'transit_encrypt', 'transit_decrypt', 'transit_list_keys',
      ],
      description: 'Manage HashiCorp Vault: KV secrets, policies, token lifecycle, lease management, and Transit encryption via the HTTP API v1.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'health_check',
        description: 'Check Vault server health status including initialized, sealed, and standby state. Does not require authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            standbyok: { type: 'boolean', description: 'Return 200 even if in standby mode (default: false).' },
          },
        },
      },
      {
        name: 'list_mounts',
        description: 'List all secrets engine mounts in Vault with their types and configurations.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_auth_methods',
        description: 'List all enabled authentication methods in Vault (token, approle, kubernetes, ldap, etc.).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'read_secret',
        description: 'Read a secret from a KV v2 secrets engine. Returns latest version unless a specific version is requested.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path (e.g. secret).' },
            path: { type: 'string', description: 'Secret path within the mount (e.g. myapp/database).' },
            version: { type: 'number', description: 'Specific version to read (omit for latest).' },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'write_secret',
        description: 'Create or update a secret in a KV v2 secrets engine. Creates a new version if the secret already exists.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path (e.g. secret).' },
            path: { type: 'string', description: 'Secret path within the mount (e.g. myapp/database).' },
            data: { type: 'object', description: 'Key-value pairs to store as the secret data.' },
            cas: { type: 'number', description: 'Check-and-Set version number. Set to 0 to only write if no prior version exists.' },
          },
          required: ['mount', 'path', 'data'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Soft-delete the latest or specified versions of a KV v2 secret. Data is not permanently destroyed and can be recovered with undelete_secret.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path.' },
            path: { type: 'string', description: 'Secret path.' },
            versions: { type: 'array', description: 'Version numbers to soft-delete. Omit to delete the latest version.', items: { type: 'number' } },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'undelete_secret',
        description: 'Restore (undelete) previously soft-deleted versions of a KV v2 secret.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path.' },
            path: { type: 'string', description: 'Secret path.' },
            versions: { type: 'array', description: 'Version numbers to restore.', items: { type: 'number' } },
          },
          required: ['mount', 'path', 'versions'],
        },
      },
      {
        name: 'destroy_secret',
        description: 'Permanently destroy specified versions of a KV v2 secret. This is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path.' },
            path: { type: 'string', description: 'Secret path.' },
            versions: { type: 'array', description: 'Version numbers to permanently destroy.', items: { type: 'number' } },
          },
          required: ['mount', 'path', 'versions'],
        },
      },
      {
        name: 'list_secrets',
        description: 'List secret paths at a location in a KV v2 secrets engine. Returns path names, not secret values.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path (e.g. secret).' },
            path: { type: 'string', description: 'Path prefix to list. Use empty string for the mount root.' },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'read_secret_metadata',
        description: 'Read metadata for a KV v2 secret including all version history, creation times, and deletion status.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path.' },
            path: { type: 'string', description: 'Secret path.' },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'patch_secret_metadata',
        description: 'Update metadata settings for a KV v2 secret such as max versions, delete-version-after TTL, or custom metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path.' },
            path: { type: 'string', description: 'Secret path.' },
            maxVersions: { type: 'number', description: 'Maximum number of versions to keep (0 = unlimited).' },
            deleteVersionAfter: { type: 'string', description: 'Duration after which versions are deleted (e.g. "30d", "0s" to disable).' },
            customMetadata: { type: 'object', description: 'Arbitrary key-value metadata to attach to the secret.' },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'list_policies',
        description: 'List all ACL policies defined in Vault.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_policy',
        description: 'Read the HCL rules of a specific Vault ACL policy by name.',
        inputSchema: {
          type: 'object',
          properties: {
            policyName: { type: 'string', description: 'The policy name (e.g. default, admin, read-only).' },
          },
          required: ['policyName'],
        },
      },
      {
        name: 'create_or_update_policy',
        description: 'Create or update a Vault ACL policy with HCL rules defining path-level permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            policyName: { type: 'string', description: 'The policy name to create or update.' },
            policy: { type: 'string', description: 'HCL policy rules (e.g. path "secret/*" { capabilities = ["read"] }).' },
          },
          required: ['policyName', 'policy'],
        },
      },
      {
        name: 'delete_policy',
        description: 'Delete a Vault ACL policy. Tokens using this policy will lose the permissions it granted.',
        inputSchema: {
          type: 'object',
          properties: {
            policyName: { type: 'string', description: 'The policy name to delete.' },
          },
          required: ['policyName'],
        },
      },
      {
        name: 'create_token',
        description: 'Create a new Vault token with specified policies, TTL, and usage limits.',
        inputSchema: {
          type: 'object',
          properties: {
            policies: { type: 'array', description: 'Policy names to attach to the token.', items: { type: 'string' } },
            ttl: { type: 'string', description: 'Time-to-live for the token (e.g. 1h, 30m, 24h).' },
            display_name: { type: 'string', description: 'Display name for audit log identification.' },
            renewable: { type: 'boolean', description: 'Whether the token can be renewed (default: true).' },
            num_uses: { type: 'number', description: 'Max number of uses (0 = unlimited).' },
            no_parent: { type: 'boolean', description: 'Create an orphan token with no parent (default: false).' },
          },
        },
      },
      {
        name: 'lookup_token',
        description: 'Look up information about the current token (self-lookup) or a specific token by accessor.',
        inputSchema: {
          type: 'object',
          properties: {
            accessor: { type: 'string', description: 'Token accessor to look up. Omit to look up the current token.' },
          },
        },
      },
      {
        name: 'renew_token',
        description: 'Renew a token to extend its TTL. Only renewable tokens can be renewed.',
        inputSchema: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'The token to renew. Omit to renew the current token.' },
            increment: { type: 'string', description: 'Requested renewal period (e.g. 1h). Server may cap this at max TTL.' },
          },
        },
      },
      {
        name: 'revoke_token',
        description: 'Revoke a token by its accessor, immediately invalidating it and all its child tokens.',
        inputSchema: {
          type: 'object',
          properties: {
            accessor: { type: 'string', description: 'Token accessor to revoke.' },
          },
          required: ['accessor'],
        },
      },
      {
        name: 'list_leases',
        description: 'List lease IDs at a given prefix path (e.g. aws/creds/my-role). Returns the IDs of active leases.',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: { type: 'string', description: 'Lease prefix path to list under (e.g. aws/creds/my-role).' },
          },
          required: ['prefix'],
        },
      },
      {
        name: 'renew_lease',
        description: 'Renew a secret lease by its ID to extend access to a dynamic credential.',
        inputSchema: {
          type: 'object',
          properties: {
            leaseId: { type: 'string', description: 'The lease ID to renew.' },
            increment: { type: 'string', description: 'Requested renewal period (e.g. 1h).' },
          },
          required: ['leaseId'],
        },
      },
      {
        name: 'revoke_lease',
        description: 'Revoke a secret lease by its ID, immediately invalidating the dynamic credential.',
        inputSchema: {
          type: 'object',
          properties: {
            leaseId: { type: 'string', description: 'The lease ID to revoke.' },
          },
          required: ['leaseId'],
        },
      },
      {
        name: 'transit_encrypt',
        description: 'Encrypt plaintext using a named Transit secrets engine key. Returns ciphertext without storing the data.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'Transit secrets engine mount path (e.g. transit).' },
            keyName: { type: 'string', description: 'Name of the Transit key to use for encryption.' },
            plaintext: { type: 'string', description: 'Base64-encoded plaintext to encrypt.' },
            context: { type: 'string', description: 'Base64-encoded context for derived key encryption (required for convergent encryption).' },
          },
          required: ['mount', 'keyName', 'plaintext'],
        },
      },
      {
        name: 'transit_decrypt',
        description: 'Decrypt ciphertext using a named Transit secrets engine key. Returns base64-encoded plaintext.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'Transit secrets engine mount path (e.g. transit).' },
            keyName: { type: 'string', description: 'Name of the Transit key to use for decryption.' },
            ciphertext: { type: 'string', description: 'Ciphertext to decrypt (vault:v1:... format).' },
            context: { type: 'string', description: 'Base64-encoded context for derived key decryption (required if used during encryption).' },
          },
          required: ['mount', 'keyName', 'ciphertext'],
        },
      },
      {
        name: 'transit_list_keys',
        description: 'List all Transit encryption keys available in a Transit secrets engine mount.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'Transit secrets engine mount path (e.g. transit).' },
          },
          required: ['mount'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'health_check':          return await this.healthCheck(args);
        case 'list_mounts':           return await this.listMounts();
        case 'list_auth_methods':     return await this.listAuthMethods();
        case 'read_secret':           return await this.readSecret(args);
        case 'write_secret':          return await this.writeSecret(args);
        case 'delete_secret':         return await this.deleteSecret(args);
        case 'undelete_secret':       return await this.undeleteSecret(args);
        case 'destroy_secret':        return await this.destroySecret(args);
        case 'list_secrets':          return await this.listSecrets(args);
        case 'read_secret_metadata':  return await this.readSecretMetadata(args);
        case 'patch_secret_metadata': return await this.patchSecretMetadata(args);
        case 'list_policies':         return await this.listPolicies();
        case 'get_policy':            return await this.getPolicy(args);
        case 'create_or_update_policy': return await this.createOrUpdatePolicy(args);
        case 'delete_policy':         return await this.deletePolicy(args);
        case 'create_token':          return await this.createToken(args);
        case 'lookup_token':          return await this.lookupToken(args);
        case 'renew_token':           return await this.renewToken(args);
        case 'revoke_token':          return await this.revokeToken(args);
        case 'list_leases':           return await this.listLeases(args);
        case 'renew_lease':           return await this.renewLease(args);
        case 'revoke_lease':          return await this.revokeLease(args);
        case 'transit_encrypt':       return await this.transitEncrypt(args);
        case 'transit_decrypt':       return await this.transitDecrypt(args);
        case 'transit_list_keys':     return await this.transitListKeys(args);
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

  private buildHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'X-Vault-Token': this.token,
      'Content-Type': 'application/json',
    };
    if (this.namespace) h['X-Vault-Namespace'] = this.namespace;
    return h;
  }

  private cleanPath(path: string): string {
    return path.replace(/^\//, '');
  }

  private async vaultGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `Vault error ${response.status} ${response.statusText}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async vaultPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `Vault error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const text = await response.text();
    if (!text.trim()) return { content: [{ type: 'text', text: JSON.stringify({ status: 'success' }) }], isError: false };
    return { content: [{ type: 'text', text: this.truncate(JSON.parse(text)) }], isError: false };
  }

  private async vaultPatch(path: string, body: unknown): Promise<ToolResult> {
    const headers = { ...this.buildHeaders(), 'Content-Type': 'application/merge-patch+json' };
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `Vault error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async vaultDelete(path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `Vault error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success' }) }], isError: false };
  }

  private async vaultPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `Vault error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const text = await response.text();
    if (!text.trim()) return { content: [{ type: 'text', text: JSON.stringify({ status: 'success' }) }], isError: false };
    return { content: [{ type: 'text', text: this.truncate(JSON.parse(text)) }], isError: false };
  }

  // ---------------------------------------------------------------------------
  // Tool implementations
  // ---------------------------------------------------------------------------

  private async healthCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.standbyok) params.set('standbyok', 'true');
    const qs = params.toString();
    // Health endpoint returns non-200 for sealed/standby states; still parse the body
    const response = await this.fetchWithRetry(`${this.baseUrl}/sys/health${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMounts(): Promise<ToolResult> {
    return this.vaultGet('sys/mounts');
  }

  private async listAuthMethods(): Promise<ToolResult> {
    return this.vaultGet('sys/auth');
  }

  private async readSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = args.path as string;
    if (!mount || !path) return { content: [{ type: 'text', text: 'mount and path are required' }], isError: true };
    const cleanedPath = this.cleanPath(path);
    const versionQs = typeof args.version === 'number' ? `?version=${encodeURIComponent(String(args.version))}` : '';
    return this.vaultGet(`${mount}/data/${cleanedPath}${versionQs}`);
  }

  private async writeSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = args.path as string;
    const data = args.data;
    if (!mount || !path || !data) return { content: [{ type: 'text', text: 'mount, path, and data are required' }], isError: true };
    const body: Record<string, unknown> = { data };
    if (typeof args.cas === 'number') body.options = { cas: args.cas };
    return this.vaultPost(`${mount}/data/${this.cleanPath(path)}`, body);
  }

  private async deleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = args.path as string;
    if (!mount || !path) return { content: [{ type: 'text', text: 'mount and path are required' }], isError: true };
    const versions = args.versions as number[] | undefined;
    if (Array.isArray(versions) && versions.length > 0) {
      return this.vaultPost(`${mount}/delete/${this.cleanPath(path)}`, { versions });
    }
    return this.vaultDelete(`${mount}/data/${this.cleanPath(path)}`);
  }

  private async undeleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = args.path as string;
    const versions = args.versions as number[];
    if (!mount || !path || !Array.isArray(versions)) return { content: [{ type: 'text', text: 'mount, path, and versions are required' }], isError: true };
    return this.vaultPost(`${mount}/undelete/${this.cleanPath(path)}`, { versions });
  }

  private async destroySecret(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = args.path as string;
    const versions = args.versions as number[];
    if (!mount || !path || !Array.isArray(versions)) return { content: [{ type: 'text', text: 'mount, path, and versions are required' }], isError: true };
    return this.vaultPost(`${mount}/destroy/${this.cleanPath(path)}`, { versions });
  }

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = (args.path as string) ?? '';
    if (!mount) return { content: [{ type: 'text', text: 'mount is required' }], isError: true };
    return this.vaultGet(`${mount}/metadata/${this.cleanPath(path)}?list=true`);
  }

  private async readSecretMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = args.path as string;
    if (!mount || !path) return { content: [{ type: 'text', text: 'mount and path are required' }], isError: true };
    return this.vaultGet(`${mount}/metadata/${this.cleanPath(path)}`);
  }

  private async patchSecretMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const path = args.path as string;
    if (!mount || !path) return { content: [{ type: 'text', text: 'mount and path are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (typeof args.maxVersions === 'number') body.max_versions = args.maxVersions;
    if (args.deleteVersionAfter) body.delete_version_after = args.deleteVersionAfter;
    if (args.customMetadata) body.custom_metadata = args.customMetadata;
    return this.vaultPatch(`${mount}/metadata/${this.cleanPath(path)}`, body);
  }

  private async listPolicies(): Promise<ToolResult> {
    return this.vaultGet('sys/policies/acl?list=true');
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.policyName as string;
    if (!name) return { content: [{ type: 'text', text: 'policyName is required' }], isError: true };
    return this.vaultGet(`sys/policies/acl/${encodeURIComponent(name)}`);
  }

  private async createOrUpdatePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.policyName as string;
    const policy = args.policy as string;
    if (!name || !policy) return { content: [{ type: 'text', text: 'policyName and policy are required' }], isError: true };
    return this.vaultPut(`sys/policies/acl/${encodeURIComponent(name)}`, { policy });
  }

  private async deletePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.policyName as string;
    if (!name) return { content: [{ type: 'text', text: 'policyName is required' }], isError: true };
    return this.vaultDelete(`sys/policies/acl/${encodeURIComponent(name)}`);
  }

  private async createToken(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (Array.isArray(args.policies)) body.policies = args.policies;
    if (args.ttl) body.ttl = args.ttl;
    if (args.display_name) body.display_name = args.display_name;
    if (typeof args.renewable === 'boolean') body.renewable = args.renewable;
    if (typeof args.num_uses === 'number') body.num_uses = args.num_uses;
    if (typeof args.no_parent === 'boolean') body.no_parent = args.no_parent;
    const endpoint = args.no_parent === true ? 'auth/token/create-orphan' : 'auth/token/create';
    return this.vaultPost(endpoint, body);
  }

  private async lookupToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.accessor) {
      return this.vaultPost('auth/token/lookup-accessor', { accessor: args.accessor });
    }
    return this.vaultGet('auth/token/lookup-self');
  }

  private async renewToken(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.increment) body.increment = args.increment;
    // If a specific token is provided, use /auth/token/renew (renews any token by value).
    // Otherwise use /auth/token/renew-self (renews the caller's own token).
    if (args.token) {
      body.token = args.token;
      return this.vaultPost('auth/token/renew', body);
    }
    return this.vaultPost('auth/token/renew-self', body);
  }

  private async revokeToken(args: Record<string, unknown>): Promise<ToolResult> {
    const accessor = args.accessor as string;
    if (!accessor) return { content: [{ type: 'text', text: 'accessor is required' }], isError: true };
    return this.vaultPost('auth/token/revoke-accessor', { accessor });
  }

  private async listLeases(args: Record<string, unknown>): Promise<ToolResult> {
    const prefix = args.prefix as string;
    if (!prefix) return { content: [{ type: 'text', text: 'prefix is required' }], isError: true };
    return this.vaultPost('sys/leases/lookup', { prefix });
  }

  private async renewLease(args: Record<string, unknown>): Promise<ToolResult> {
    const leaseId = args.leaseId as string;
    if (!leaseId) return { content: [{ type: 'text', text: 'leaseId is required' }], isError: true };
    const body: Record<string, unknown> = { lease_id: leaseId };
    if (args.increment) body.increment = args.increment;
    return this.vaultPost('sys/leases/renew', body);
  }

  private async revokeLease(args: Record<string, unknown>): Promise<ToolResult> {
    const leaseId = args.leaseId as string;
    if (!leaseId) return { content: [{ type: 'text', text: 'leaseId is required' }], isError: true };
    return this.vaultPost('sys/leases/revoke', { lease_id: leaseId });
  }

  private async transitEncrypt(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const keyName = args.keyName as string;
    const plaintext = args.plaintext as string;
    if (!mount || !keyName || !plaintext) return { content: [{ type: 'text', text: 'mount, keyName, and plaintext are required' }], isError: true };
    const body: Record<string, unknown> = { plaintext };
    if (args.context) body.context = args.context;
    return this.vaultPost(`${mount}/encrypt/${encodeURIComponent(keyName)}`, body);
  }

  private async transitDecrypt(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    const keyName = args.keyName as string;
    const ciphertext = args.ciphertext as string;
    if (!mount || !keyName || !ciphertext) return { content: [{ type: 'text', text: 'mount, keyName, and ciphertext are required' }], isError: true };
    const body: Record<string, unknown> = { ciphertext };
    if (args.context) body.context = args.context;
    return this.vaultPost(`${mount}/decrypt/${encodeURIComponent(keyName)}`, body);
  }

  private async transitListKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const mount = args.mount as string;
    if (!mount) return { content: [{ type: 'text', text: 'mount is required' }], isError: true };
    return this.vaultGet(`${mount}/keys?list=true`);
  }
}
