/**
 * MockMCPAdapter — synthetic threat event generator for all 10 (ISC)² security domains.
 * Replaces threat-generator.js in the Praetor web app. Zero auth — no constructor config.
 */

import { ToolDefinition, ToolResult } from './types.js';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Severity = 'critical' | 'high' | 'medium' | 'low';
type ActionStatus =
  | 'AWAITING APPROVAL'
  | 'ESCALATED'
  | 'AUTO-CONTAINED'
  | 'AUTO-RESOLVED'
  | 'INVESTIGATING'
  | 'MONITORING';

interface ThreatEvent {
  id: string;
  timestamp: string;
  type: string;
  detail: string;
  severity: Severity;
  source: string;
  target: string;
  action: ActionStatus;
  actionDetail: string;
}

interface EventTemplate {
  type: string;
  subs: string[];
  sev: Severity[];
}

type HeatProfile = 'hot' | 'warm' | 'cool';

interface DomainConfig {
  id: string;
  name: string;
  vendor: string;
  color: string;
  heat: HeatProfile;
  templates: EventTemplate[];
  targets: string[];
}

// ---------------------------------------------------------------------------
// RNG helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randIP(): string {
  return `${randInt(10, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
}

function randTimestamp(hoursBack: number): string {
  const now = Date.now();
  const offset = Math.random() * hoursBack * 3600000;
  return new Date(now - offset).toISOString();
}

// ---------------------------------------------------------------------------
// Heat profiles
// hot:  8-10 events, heavy critical/high  (2-3 domains)
// warm: 5-8  events, mixed               (3-4 domains)
// cool: 3-5  events, mostly low/medium   (3-4 domains)
// ---------------------------------------------------------------------------

const heatProfiles: Record<HeatProfile, { min: number; max: number; sevWeights: Severity[] }> = {
  hot:  { min: 8, max: 10, sevWeights: ['critical','critical','high','high','high','medium'] },
  warm: { min: 5, max: 8,  sevWeights: ['high','medium','medium','medium','low'] },
  cool: { min: 3, max: 5,  sevWeights: ['medium','low','low','low'] },
};

// ---------------------------------------------------------------------------
// Action status pools per severity
// ---------------------------------------------------------------------------

const actionPools: Record<Severity, Array<{ action: ActionStatus; detail: string }>> = {
  critical: [
    { action: 'AWAITING APPROVAL', detail: 'AI recommends containment — needs CISO sign-off' },
    { action: 'AWAITING APPROVAL', detail: 'AI recommends isolation — side effects possible' },
    { action: 'ESCALATED',         detail: 'Bumped to Tier 3 — novel attack pattern' },
    { action: 'ESCALATED',         detail: 'Bumped to Tier 3 — APT indicators' },
    { action: 'AUTO-CONTAINED',    detail: 'Automated playbook executed' },
  ],
  high: [
    { action: 'AUTO-CONTAINED',    detail: 'Automated playbook executed' },
    { action: 'AUTO-CONTAINED',    detail: 'Blocked at perimeter' },
    { action: 'ESCALATED',         detail: 'Escalated to Tier 2 — uncertain containment' },
    { action: 'AWAITING APPROVAL', detail: 'AI recommends remediation — needs approval' },
    { action: 'INVESTIGATING',     detail: 'Analyst reviewing — AI monitoring' },
  ],
  medium: [
    { action: 'AUTO-RESOLVED',  detail: 'Automated triage — false positive' },
    { action: 'AUTO-RESOLVED',  detail: 'Known pattern — suppressed' },
    { action: 'AUTO-CONTAINED', detail: 'Rate limited automatically' },
    { action: 'MONITORING',     detail: 'Below threshold — watching' },
    { action: 'AUTO-RESOLVED',  detail: 'Auto-remediated' },
  ],
  low: [
    { action: 'AUTO-RESOLVED', detail: 'Routine — logged' },
    { action: 'AUTO-RESOLVED', detail: 'Informational — no action' },
    { action: 'MONITORING',    detail: 'Baseline activity' },
  ],
};

// ---------------------------------------------------------------------------
// Domain definitions — 10 (ISC)² security domains
// ---------------------------------------------------------------------------

const DOMAINS: DomainConfig[] = [
  {
    id: 'security-mgmt',
    name: 'Security Management',
    vendor: 'ServiceNow GRC',
    color: '#4fc3f7',
    heat: 'warm',
    templates: [
      {
        type: 'Policy Violation',
        subs: [
          'Unauthorized config change',
          'Expired security certification',
          'Unapproved software installed',
          'Data classification mismatch',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Risk Assessment Alert',
        subs: [
          'Critical CVE affecting production',
          'Compliance gap in PCI-DSS scope',
          'Risk score threshold exceeded',
          'Third-party vendor risk escalation',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Audit Finding',
        subs: [
          'Segregation of duties violation',
          'Privileged access review overdue',
          'Incomplete asset inventory',
          'Missing change approval',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Governance Alert',
        subs: [
          'Board-mandated control failure',
          'Regulatory deadline approaching',
          'Incident response plan untested 90+ days',
        ],
        sev: ['high', 'critical'],
      },
    ],
    targets: ['grc-platform', 'policy-engine-01', 'compliance-db', 'risk-dashboard', 'audit-portal', 'cmdb-prod'],
  },
  {
    id: 'access-control',
    name: 'Access Control',
    vendor: 'CyberArk',
    color: '#d500f9',
    heat: 'cool',
    templates: [
      {
        type: 'Unauthorized Access',
        subs: [
          'Privilege escalation attempt',
          'After-hours admin login',
          'Dormant account reactivation',
          'Role permission drift detected',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Access Policy Violation',
        subs: [
          'Least privilege violation',
          'Shared credential detected',
          'MFA bypass attempt',
          'Emergency access misuse',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Provisioning Anomaly',
        subs: [
          'Bulk account creation',
          'Orphaned account access',
          'Cross-tenant access detected',
          'Service account interactive login',
        ],
        sev: ['medium', 'high', 'critical'],
      },
      {
        type: 'Biometric Alert',
        subs: [
          'Fingerprint mismatch on secure zone',
          'Badge tailgating detected',
          'Facial recognition spoofing attempt',
        ],
        sev: ['high', 'critical'],
      },
    ],
    targets: ['iam-gateway', 'pam-vault', 'directory-services', 'sso-portal', 'mfa-server', 'badge-system'],
  },
  {
    id: 'telecom-network',
    name: 'Telecom & Network',
    vendor: 'Palo Alto Networks',
    color: '#00e5ff',
    heat: 'hot',
    templates: [
      {
        type: 'DDoS Attack',
        subs: [
          'Volumetric flood (340 Gbps)',
          'SYN flood (2.1M pps)',
          'UDP amplification via memcached',
          'DNS amplification (54x factor)',
          'Slowloris connection exhaustion',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Intrusion Attempt',
        subs: [
          'Port scan from known Shodan IP',
          'Lateral scan from compromised host',
          'Exploit attempt on CVE-2024-3400',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'WAF Block',
        subs: [
          'SQL injection on /api/users',
          'XSS reflected via comment field',
          'Path traversal on file upload',
          'API rate limit violation',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Network Anomaly',
        subs: [
          'BGP route leak from AS64500',
          'TLS fingerprint mismatch (Cobalt Strike profile)',
          'DNS tunneling detected',
          'Unexpected VLAN traffic',
        ],
        sev: ['high', 'critical'],
      },
    ],
    targets: ['api-gateway-prod', 'web-frontend-lb', 'dns-resolver-01', 'edge-firewall', 'waf-cluster', 'core-switch-01'],
  },
  {
    id: 'cryptography',
    name: 'Cryptography',
    vendor: 'Entrust',
    color: '#69f0ae',
    heat: 'cool',
    templates: [
      {
        type: 'Certificate Issue',
        subs: [
          'TLS cert expiring in 72 hours',
          'Wildcard cert misuse detected',
          'Certificate transparency log mismatch',
          'Revoked cert still in rotation',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Encryption Weakness',
        subs: [
          'TLS 1.0 connection accepted',
          'Weak cipher suite negotiated (RC4)',
          'Missing HSTS header on login page',
          'Plaintext credentials in transit',
        ],
        sev: ['medium', 'high', 'critical'],
      },
      {
        type: 'Key Management Alert',
        subs: [
          'HSM key rotation overdue',
          'API key exposed in public repo',
          'Symmetric key reuse across environments',
          'KMS access from unauthorized role',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Crypto Attack',
        subs: [
          'Padding oracle attempt detected',
          'Hash collision in authentication token',
          'Downgrade attack on TLS handshake',
        ],
        sev: ['high', 'critical'],
      },
    ],
    targets: ['pki-ca-root', 'hsm-cluster', 'tls-terminator', 'key-vault-prod', 'cert-manager', 'token-service'],
  },
  {
    id: 'security-arch',
    name: 'Security Architecture',
    vendor: 'Wiz',
    color: '#ff9100',
    heat: 'cool',
    templates: [
      {
        type: 'Architecture Violation',
        subs: [
          'Unapproved internet-facing service',
          'Missing WAF on public endpoint',
          'Database directly exposed to DMZ',
          'Microservice bypassing API gateway',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Segmentation Failure',
        subs: [
          'East-west traffic crossing trust boundary',
          'Flat network detected in production',
          'Jump box misconfiguration',
          'Firewall rule permitting any-any',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Design Drift',
        subs: [
          'Shadow IT cloud deployment',
          'Unapproved SaaS data flow',
          'Container running as root in prod',
          'Terraform state drift detected',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Zero Trust Gap',
        subs: [
          'Implicit trust on internal subnet',
          'Missing mutual TLS between services',
          'No identity verification on east-west',
        ],
        sev: ['medium', 'high'],
      },
    ],
    targets: ['cloud-vpc-prod', 'k8s-cluster-01', 'network-segmentation', 'api-mesh', 'dmz-gateway', 'terraform-state'],
  },
  {
    id: 'operations-sec',
    name: 'Operations Security',
    vendor: 'Splunk',
    color: '#ffd740',
    heat: 'warm',
    templates: [
      {
        type: 'SIEM Alert',
        subs: [
          'Correlation rule triggered: brute force + lateral movement',
          'Log source went silent 15 minutes',
          'Alert fatigue threshold exceeded',
          'New detection rule false positive spike',
        ],
        sev: ['medium', 'high', 'critical'],
      },
      {
        type: 'Incident Response',
        subs: [
          'IR playbook activated for ransomware',
          'Containment action pending approval',
          'Evidence preservation initiated',
          'Forensic image collection in progress',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Operational Anomaly',
        subs: [
          'Change window violation',
          'Backup job failed 3 consecutive runs',
          'Monitoring blind spot in new subnet',
          'Patch deployment stalled on 200 hosts',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Threat Hunt Finding',
        subs: [
          'Persistence mechanism in scheduled tasks',
          'Anomalous PowerShell execution pattern',
          'Beacon-like C2 communication interval',
        ],
        sev: ['high', 'critical'],
      },
    ],
    targets: ['siem-cluster', 'soar-platform', 'ir-console', 'log-collector-03', 'edr-console', 'hunt-workstation'],
  },
  {
    id: 'app-dev-sec',
    name: 'Application Security',
    vendor: 'CrowdStrike',
    color: '#ff1744',
    heat: 'hot',
    templates: [
      {
        type: 'Vulnerability Scan',
        subs: [
          'Critical CVSS 9.8 in production dependency',
          'OWASP Top 10 finding in release candidate',
          'Container image with known CVE',
          'Secrets detected in source code',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'SAST/DAST Finding',
        subs: [
          'SQL injection in query builder',
          'Hardcoded credentials in config',
          'Insecure deserialization endpoint',
          'Missing input validation on file upload',
        ],
        sev: ['medium', 'high', 'critical'],
      },
      {
        type: 'Supply Chain Alert',
        subs: [
          'Malicious npm package in dependency tree',
          'Typosquatting package detected',
          'Dependency with revoked maintainer',
          'Build pipeline integrity check failed',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Runtime Protection',
        subs: [
          'RASP blocked RCE attempt',
          'Memory corruption detected in production',
          'API schema violation',
          'Rate limiting triggered on auth endpoint',
        ],
        sev: ['medium', 'high'],
      },
    ],
    targets: ['ci-cd-pipeline', 'staging-cluster', 'container-registry', 'source-repo', 'api-server-prod', 'dependency-proxy'],
  },
  {
    id: 'physical-sec',
    name: 'Physical Security',
    vendor: 'Genetec',
    color: '#e040fb',
    heat: 'cool',
    templates: [
      {
        type: 'Perimeter Breach',
        subs: [
          'Fence sensor triggered — sector 7',
          'Unauthorized vehicle at loading dock',
          'Drone detected over facility',
          'Gate forced open after hours',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Access Control Alert',
        subs: [
          'Tailgating detected at turnstile',
          'Badge used at two locations simultaneously',
          'Expired visitor badge used',
          'Server room access without ticket',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Environmental Alert',
        subs: [
          'Temperature spike in server room B',
          'Water leak sensor triggered — floor 3',
          'UPS battery capacity below 30%',
          'HVAC failure in data center wing',
        ],
        sev: ['medium', 'high', 'critical'],
      },
      {
        type: 'Surveillance Alert',
        subs: [
          'Camera offline in parking garage',
          'Motion detected in restricted zone',
          'License plate on watchlist detected',
          'Loitering alert — main entrance',
        ],
        sev: ['low', 'medium', 'high'],
      },
    ],
    targets: ['datacenter-east', 'hq-building-a', 'parking-garage', 'server-room-b', 'loading-dock', 'perimeter-north'],
  },
  {
    id: 'bcp-dr',
    name: 'Business Continuity',
    vendor: 'Zerto',
    color: '#40c4ff',
    heat: 'warm',
    templates: [
      {
        type: 'DR Test Result',
        subs: [
          'Failover test failed — RTO exceeded by 40 min',
          'Backup restoration incomplete',
          'DR site sync lag at 4 hours',
          'Runbook step 7 failed automation',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Availability Alert',
        subs: [
          'Primary region degraded',
          'Database replication lag exceeding SLA',
          'CDN origin unhealthy',
          'DNS failover triggered',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'BCP Gap',
        subs: [
          'Business impact analysis outdated 12+ months',
          'Key person dependency — no backup',
          'Communication tree not tested this quarter',
          'Vendor SLA breach on recovery commitment',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Resilience Metric',
        subs: [
          'RPO breach — 2 hours data at risk',
          'RTO target missed in simulation',
          'Single point of failure in payment path',
          'Disaster recovery budget shortfall flagged',
        ],
        sev: ['medium', 'high', 'critical'],
      },
    ],
    targets: ['dr-site-west', 'primary-db-cluster', 'backup-vault', 'cdn-origin', 'failover-lb', 'replication-service'],
  },
  {
    id: 'law-ethics',
    name: 'Law & Ethics',
    vendor: 'OneTrust',
    color: '#b388ff',
    heat: 'cool',
    templates: [
      {
        type: 'Regulatory Alert',
        subs: [
          'GDPR data subject request overdue',
          'SEC cyber disclosure deadline in 48 hours',
          'State privacy law effective date approaching',
          'Export control violation flagged',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Forensic Investigation',
        subs: [
          'Chain of custody break in evidence log',
          'Forensic image hash mismatch',
          'Legal hold notification pending',
          'eDiscovery scope expansion required',
        ],
        sev: ['medium', 'high'],
      },
      {
        type: 'Ethics Violation',
        subs: [
          'Insider trading pattern detected',
          'Unauthorized data access by departing employee',
          'Whistleblower report received',
          'Conflict of interest disclosure gap',
        ],
        sev: ['high', 'critical'],
      },
      {
        type: 'Compliance Drift',
        subs: [
          'SOC 2 control exception not remediated',
          'HIPAA training completion below 80%',
          'PCI scope creep detected',
          'ISO 27001 nonconformity open 60+ days',
        ],
        sev: ['medium', 'high'],
      },
    ],
    targets: ['compliance-portal', 'legal-hold-system', 'ediscovery-platform', 'training-lms', 'regulatory-tracker', 'ethics-hotline'],
  },
];

const MAX_EVENTS_PER_DOMAIN = 20;

// ---------------------------------------------------------------------------
// MockMCPAdapter
// ---------------------------------------------------------------------------

export class MockMCPAdapter {
  private readonly state: Map<string, ThreatEvent[]> = new Map();
  private eventCounter: number = 0;

  constructor() {
    this.initThreats();
    const interval = setInterval(() => this.addNewThreats(), 60_000);
    interval.unref();
  }

  // -------------------------------------------------------------------------
  // Event generation
  // -------------------------------------------------------------------------

  private generateId(domainId: string): string {
    this.eventCounter++;
    const prefix = domainId.toUpperCase().replace(/-/g, '');
    return `${prefix}-${String(this.eventCounter).padStart(4, '0')}`;
  }

  private generateEventWithHeat(domain: DomainConfig): ThreatEvent {
    const profile = heatProfiles[domain.heat];
    const tmpl = pick(domain.templates);
    const sub = pick(tmpl.subs);
    const sev: Severity = pick(profile.sevWeights);
    const actionPool = actionPools[sev];
    const actionStatus = pick(actionPool);

    return {
      id: this.generateId(domain.id),
      timestamp: randTimestamp(24),
      type: tmpl.type,
      detail: sub,
      severity: sev,
      source: randIP(),
      target: pick(domain.targets),
      action: actionStatus.action,
      actionDetail: actionStatus.detail,
    };
  }

  private initThreats(): void {
    for (const domain of DOMAINS) {
      const profile = heatProfiles[domain.heat];
      const count = randInt(profile.min, profile.max);
      const events: ThreatEvent[] = [];
      for (let i = 0; i < count; i++) {
        events.push(this.generateEventWithHeat(domain));
      }
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.state.set(domain.id, events);
    }
  }

  private addNewThreats(): void {
    const count = randInt(1, 3);
    for (let i = 0; i < count; i++) {
      const domain = pick(DOMAINS);
      const events = this.state.get(domain.id);
      if (!events) continue;
      events.unshift(this.generateEventWithHeat(domain));
      if (events.length > MAX_EVENTS_PER_DOMAIN) {
        events.pop();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Domain status helper
  // -------------------------------------------------------------------------

  private maxUnresolvedSeverity(events: ThreatEvent[]): string {
    const order: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const resolved = new Set<ActionStatus>(['AUTO-CONTAINED', 'AUTO-RESOLVED']);
    let max = 0;
    for (const e of events) {
      if (!resolved.has(e.action)) {
        const rank = order[e.severity] ?? 0;
        if (rank > max) max = rank;
      }
    }
    return (['clear', 'low', 'medium', 'high', 'critical'] as const)[max] ?? 'clear';
  }

  private buildDomainStatus(domain: DomainConfig): Record<string, unknown> {
    const events = this.state.get(domain.id) ?? [];
    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    let awaitingApproval = 0;
    for (const e of events) {
      counts[e.severity] = (counts[e.severity] ?? 0) + 1;
      if (e.action === 'AWAITING APPROVAL') awaitingApproval++;
    }
    return {
      id: domain.id,
      name: domain.name,
      vendor: domain.vendor,
      color: domain.color,
      heat: domain.heat,
      total: events.length,
      counts,
      awaitingApproval,
      maxSeverity: this.maxUnresolvedSeverity(events),
    };
  }

  // -------------------------------------------------------------------------
  // Tool definitions
  // -------------------------------------------------------------------------

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_events',
        description: 'Returns threat events for a specific (ISC)² security domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain ID (e.g. security-mgmt, access-control, telecom-network)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 10)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_status',
        description: 'Returns a health summary for a specific domain including severity counts and awaiting-approval count',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain ID, or "all" to return summary for every domain',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'contain_threat',
        description: 'Marks a threat event as AUTO-CONTAINED, executing the automated containment playbook',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Event ID in DOMAIN-0001 format',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'escalate_threat',
        description: 'Marks a threat event as ESCALATED for human analyst review',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Event ID in DOMAIN-0001 format',
            },
          },
          required: ['eventId'],
        },
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Tool dispatch
  // -------------------------------------------------------------------------

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_events': {
          const domainId = args.domain as string;
          const limit = (args.limit as number) ?? 10;

          const domain = DOMAINS.find(d => d.id === domainId);
          if (!domain) {
            return {
              content: [{ type: 'text', text: `Unknown domain: ${domainId}. Valid domains: ${DOMAINS.map(d => d.id).join(', ')}` }],
              isError: true,
            };
          }

          const events = (this.state.get(domainId) ?? []).slice(0, limit);
          const result = {
            domain: domainId,
            name: domain.name,
            vendor: domain.vendor,
            events,
          };
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
        }

        case 'get_status': {
          const domainId = args.domain as string;

          if (domainId === 'all') {
            const summary = DOMAINS.map(d => this.buildDomainStatus(d));
            return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }], isError: false };
          }

          const domain = DOMAINS.find(d => d.id === domainId);
          if (!domain) {
            return {
              content: [{ type: 'text', text: `Unknown domain: ${domainId}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(this.buildDomainStatus(domain), null, 2) }],
            isError: false,
          };
        }

        case 'contain_threat': {
          const eventId = args.eventId as string;
          const found = this.findAndUpdateEvent(eventId, 'AUTO-CONTAINED', 'Automated playbook executed — threat neutralized');
          if (!found) {
            return { content: [{ type: 'text', text: `Event not found: ${eventId}` }], isError: true };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, eventId, action: 'AUTO-CONTAINED' }, null, 2) }],
            isError: false,
          };
        }

        case 'escalate_threat': {
          const eventId = args.eventId as string;
          const found = this.findAndUpdateEvent(eventId, 'ESCALATED', 'Escalated to Tier 3 analyst queue');
          if (!found) {
            return { content: [{ type: 'text', text: `Event not found: ${eventId}` }], isError: true };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, eventId, action: 'ESCALATED' }, null, 2) }],
            isError: false,
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // -------------------------------------------------------------------------
  // State mutation helper
  // -------------------------------------------------------------------------

  private findAndUpdateEvent(eventId: string, action: ActionStatus, actionDetail: string): boolean {
    for (const events of this.state.values()) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        event.action = action;
        event.actionDetail = actionDetail;
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Raw state accessors (for direct integration without MCP transport)
  // -------------------------------------------------------------------------

  getAllThreats(): Record<string, { name: string; vendor: string; color: string; events: ThreatEvent[] }> {
    const result: Record<string, { name: string; vendor: string; color: string; events: ThreatEvent[] }> = {};
    for (const domain of DOMAINS) {
      result[domain.id] = {
        name: domain.name,
        vendor: domain.vendor,
        color: domain.color,
        events: this.state.get(domain.id) ?? [],
      };
    }
    return result;
  }

  getDomainList(): ReturnType<typeof this.buildDomainStatus>[] {
    return DOMAINS.map(d => this.buildDomainStatus(d));
  }
}
