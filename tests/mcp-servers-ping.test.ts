/**
 * @epic-ai/core — MCP Server Endpoint Validation
 * Pings every vendor's API base URL to verify:
 * - DNS resolves (hostname is correct)
 * - HTTPS connects (port is correct)
 * - Endpoint exists (not 404)
 * - Auth layer reached (401/403 = PASS, 404 = FAIL)
 *
 * No API keys required. A 401 is a passing test.
 */

import { describe, it, expect } from 'vitest';

interface VendorEndpoint {
  name: string;
  url: string;
  expectedStatus: number[];  // 401, 403, 200, 301 are all valid
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  timeout?: number;
}

const VENDORS: VendorEndpoint[] = [
  // SIEM
  { name: 'Datadog Security', url: 'https://api.datadoghq.com/api/v2/security_monitoring/signals', expectedStatus: [401, 403] },
  { name: 'Sumo Logic', url: 'https://api.us2.sumologic.com/api/v1/dashboards', expectedStatus: [401, 403] },

  // EDR
  { name: 'CrowdStrike Falcon', url: 'https://api.crowdstrike.com/oauth2/token', expectedStatus: [400, 401, 403, 415], method: 'POST' },
  { name: 'SentinelOne', url: 'https://usea1-partners.sentinelone.net/web/api/v2.1/system/status', expectedStatus: [401, 403, 200] },
  { name: 'Trend Micro Vision One', url: 'https://api.xdr.trendmicro.com/v3.0/healthcheck', expectedStatus: [401, 403, 200] },

  // Network Security
  { name: 'Zscaler ZIA', url: 'https://zsapi.zscaler.net/api/v1/status', expectedStatus: [401, 403, 302] },

  // Identity
  { name: 'Ping Identity', url: 'https://api.pingone.com/v1/environments', expectedStatus: [401, 403] },
  { name: 'Auth0', url: 'https://login.us.auth0.com/api/v2/users', expectedStatus: [401, 403] },

  // Vulnerability Management
  { name: 'Tenable', url: 'https://cloud.tenable.com/server/status', expectedStatus: [200, 401, 403] },
  { name: 'Qualys', url: 'https://qualysapi.qualys.com/api/2.0/fo/scan/', expectedStatus: [302, 401, 403, 405] },

  // Cloud Security
  { name: 'Recorded Future', url: 'https://api.recordedfuture.com/v2/ip/1.1.1.1', expectedStatus: [401, 403] },
  { name: 'Prisma Cloud', url: 'https://api.prismacloud.io/login', expectedStatus: [400, 401, 403, 405], method: 'POST' },

  // Threat Intelligence
  { name: 'Mandiant', url: 'https://api.intelligence.mandiant.com/v4/indicator', expectedStatus: [401, 403] },
  { name: 'Anomali ThreatStream', url: 'https://api.threatstream.com/api/v2/intelligence/', expectedStatus: [401, 403] },

  // Email Security
  { name: 'Proofpoint TAP', url: 'https://tap-api-v2.proofpoint.com/v2/siem/all', expectedStatus: [401, 403] },

  // GRC / Compliance
  { name: 'Drata', url: 'https://public-api.drata.com/public/controls', expectedStatus: [401, 403] },

  // Existing MCP vendors (verify they're still up)
  { name: 'Snyk', url: 'https://api.snyk.io/rest/self', expectedStatus: [401, 403] },
  { name: 'GitGuardian', url: 'https://api.gitguardian.com/v1/health', expectedStatus: [200, 401, 403] },
];

// Some vendors have dynamic hostnames (customer-specific) — we can't ping those
// without knowing the customer's instance. Skipped:
// - Splunk (self-hosted, no public endpoint)
// - QRadar (self-hosted)
// - Microsoft Sentinel (Azure subscription-specific)
// - Sophos (tenant-specific)
// - Carbon Black (deployment-specific)
// - Fortinet (self-hosted firewall)
// - Check Point (self-hosted)
// - Palo Alto (self-hosted firewall)
// - Cisco Secure (self-hosted)
// - CyberArk (self-hosted)
// - BeyondTrust (self-hosted)
// - Delinea (self-hosted)
// - Rapid7 (self-hosted)
// - Cybereason (customer-specific)
// - LogRhythm (self-hosted)
// - Wiz (customer-specific)
// - Lacework (customer-specific)
// - Orca (customer-specific)
// - Darktrace (customer-specific)
// - ServiceNow (instance-specific)
// - OneTrust (customer-specific)
// - Mimecast (region-specific)
// - Barracuda (self-hosted)
// - ThreatConnect (customer-specific)

async function pingEndpoint(vendor: VendorEndpoint): Promise<{ status: number; ok: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), vendor.timeout ?? 10000);

    const response = await fetch(vendor.url, {
      method: vendor.method ?? 'GET',
      headers: {
        'User-Agent': 'EpicAI-Core/0.1.0 (endpoint-validation)',
        'Accept': 'application/json',
        ...vendor.headers,
      },
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects — we want to see them
    });

    clearTimeout(timeout);

    return {
      status: response.status,
      ok: vendor.expectedStatus.includes(response.status),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // AbortError = timeout — endpoint didn't respond in time
    if (msg.includes('abort') || msg.includes('AbortError')) {
      return { status: 0, ok: false, error: `Timeout after ${vendor.timeout ?? 10000}ms` };
    }

    // DNS resolution failure
    if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      return { status: 0, ok: false, error: `DNS failed: hostname not found` };
    }

    // Connection refused
    if (msg.includes('ECONNREFUSED')) {
      return { status: 0, ok: false, error: `Connection refused` };
    }

    // TLS/SSL error
    if (msg.includes('CERT') || msg.includes('SSL') || msg.includes('TLS')) {
      return { status: 0, ok: false, error: `TLS error: ${msg}` };
    }

    return { status: 0, ok: false, error: msg };
  }
}

describe('MCP Server Endpoint Validation', () => {
  for (const vendor of VENDORS) {
    it(`${vendor.name} — ${vendor.url}`, async () => {
      const result = await pingEndpoint(vendor);

      if (result.error) {
        console.log(`  ${vendor.name}: FAIL — ${result.error}`);
      } else {
        const statusLabel = result.ok ? 'PASS' : 'FAIL';
        console.log(`  ${vendor.name}: ${statusLabel} — HTTP ${result.status} (expected: ${vendor.expectedStatus.join('|')})`);
      }

      expect(
        result.ok,
        `${vendor.name} returned HTTP ${result.status}${result.error ? ` (${result.error})` : ''}, expected one of [${vendor.expectedStatus.join(', ')}]`,
      ).toBe(true);
    });
  }
});
