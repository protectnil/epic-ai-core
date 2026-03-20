/**
 * Epic AI® — DigitalOcean MCP Server Configuration
 *
 * DigitalOcean provides official remote MCP servers for their services.
 * This module provides a helper to generate ServerConnection configs
 * for all 9 DigitalOcean MCP endpoints.
 *
 * These are NATIVE MCP servers — no adapter wrapper needed.
 * They connect directly via the SDK's FederationManager using
 * streamable-http transport.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

interface DOServerConnection {
  name: string;
  transport: 'streamable-http';
  url: string;
  auth: { type: 'bearer'; token: string };
}

const DO_MCP_SERVICES = [
  { name: 'do-apps', endpoint: 'apps', description: 'App Platform management' },
  { name: 'do-droplets', endpoint: 'droplets', description: 'Droplet (VM) management' },
  { name: 'do-doks', endpoint: 'doks', description: 'Kubernetes cluster management' },
  { name: 'do-databases', endpoint: 'databases', description: 'Managed database management' },
  { name: 'do-spaces', endpoint: 'spaces', description: 'Object storage management' },
  { name: 'do-networking', endpoint: 'networking', description: 'VPC, firewall, load balancer management' },
  { name: 'do-accounts', endpoint: 'accounts', description: 'Account and billing management' },
  { name: 'do-insights', endpoint: 'insights', description: 'Monitoring and insights' },
  { name: 'do-marketplace', endpoint: 'marketplace', description: 'Marketplace app management' },
] as const;

/**
 * Generate ServerConnection configs for all DigitalOcean MCP services.
 * Requires a DigitalOcean API token.
 *
 * @param apiToken - DigitalOcean API token (never hardcoded — pass from env)
 * @param services - Optional filter: only connect to these services.
 *   Default: all 9 services.
 *
 * @example
 * ```typescript
 * import { getDigitalOceanConnections } from '@epic-ai/core/mcp-servers/digitalocean';
 *
 * const doConnections = getDigitalOceanConnections(process.env.DO_API_TOKEN!, [
 *   'do-droplets', 'do-databases', 'do-networking'
 * ]);
 * ```
 */
export function getDigitalOceanConnections(
  apiToken: string,
  services?: string[],
): DOServerConnection[] {
  if (!apiToken) {
    throw new Error('DigitalOcean API token is required. Set DO_API_TOKEN env var.');
  }

  const selected = services
    ? DO_MCP_SERVICES.filter(s => services.includes(s.name))
    : DO_MCP_SERVICES;

  return selected.map(s => ({
    name: s.name,
    transport: 'streamable-http' as const,
    url: `https://${s.endpoint}.mcp.digitalocean.com/mcp`,
    auth: { type: 'bearer' as const, token: apiToken },
  }));
}

/**
 * List all available DigitalOcean MCP services.
 */
export function listDigitalOceanServices(): Array<{ name: string; endpoint: string; description: string }> {
  return [...DO_MCP_SERVICES];
}
