/**
 * @epicai/legion — Query Expander
 * Maps common natural language phrases to adapter keywords.
 * Runs before BM25 to close the semantic gap without inference.
 * Zero cost. Zero latency. Zero cloud calls.
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

/** Expansion rules: if query contains the key phrase, inject these terms */
const EXPANSIONS: Record<string, string[]> = {
  // Security
  'brute force': ['crowdstrike', 'okta', 'auth0', 'sentinelone', 'login', 'authentication'],
  'malware': ['crowdstrike', 'sentinelone', 'carbon-black', 'malwarebytes', 'endpoint'],
  'ransomware': ['crowdstrike', 'sentinelone', 'carbon-black', 'backup', 'endpoint'],
  'vulnerability': ['qualys', 'tenable', 'snyk', 'aqua-security', 'cve', 'patch'],
  'vulnerabilities': ['qualys', 'tenable', 'snyk', 'aqua-security', 'cve', 'patch'],
  'firewall': ['palo-alto', 'fortinet', 'checkpoint', 'crowdstrike', 'network'],
  'block ip': ['palo-alto', 'fortinet', 'checkpoint', 'crowdstrike', 'firewall'],
  'phishing': ['proofpoint', 'crowdstrike', 'abnormal-security', 'email'],
  'unusual location': ['okta', 'crowdstrike-identity', 'microsoft-entra', 'auth0', 'login'],
  'suspicious login': ['okta', 'crowdstrike-identity', 'microsoft-entra', 'auth0'],
  'mfa': ['okta', 'auth0', 'microsoft-entra', 'duo'],

  // Incident management
  'page': ['pagerduty', 'opsgenie', 'incident-io', 'oncall', 'alert'],
  'on-call': ['pagerduty', 'opsgenie', 'incident-io', 'oncall'],
  'oncall': ['pagerduty', 'opsgenie', 'incident-io'],
  'incident': ['pagerduty', 'opsgenie', 'incident-io', 'jira', 'servicenow'],
  'outage': ['pagerduty', 'datadog-observability', 'statuspage', 'opsgenie'],
  'alert': ['pagerduty', 'opsgenie', 'datadog-observability', 'grafana-api'],

  // Observability
  'response time': ['datadog-observability', 'new-relic', 'grafana-api', 'dynatrace', 'apm'],
  'latency': ['datadog-observability', 'new-relic', 'grafana-api', 'dynatrace'],
  'error rate': ['datadog-observability', 'new-relic', 'grafana-api', 'sentry', 'splunk'],
  'spiking': ['datadog-observability', 'new-relic', 'grafana-api', 'monitoring'],
  'memory': ['datadog-observability', 'grafana-api', 'kubernetes', 'prometheus'],
  'cpu': ['datadog-observability', 'grafana-api', 'kubernetes', 'prometheus'],
  'logs': ['splunk', 'datadog-observability', 'elastic-apm', 'grafana-api'],

  // DevOps
  'deploy': ['github-actions', 'jenkins', 'circleci', 'argocd', 'gitlab'],
  'deployment': ['github-actions', 'jenkins', 'circleci', 'argocd', 'gitlab'],
  'build failure': ['github-actions', 'jenkins', 'circleci', 'buildkite', 'gitlab'],
  'build failures': ['github-actions', 'jenkins', 'circleci', 'buildkite', 'gitlab'],
  'staging': ['github-actions', 'jenkins', 'argocd', 'vercel', 'netlify'],
  'container': ['kubernetes', 'docker-hub', 'aws-ecs', 'container'],
  'replica': ['kubernetes', 'aws-ecs', 'docker-hub'],
  'pipeline': ['github-actions', 'jenkins', 'circleci', 'gitlab', 'bitbucket'],

  // Scheduling & Calendar
  'appointment': ['google-calendar', 'calendly', 'fhir', 'scheduling'],
  'schedule meeting': ['google-calendar', 'calendly', 'microsoft-graph'],
  'schedule a meeting': ['google-calendar', 'calendly', 'microsoft-graph'],
  'follow-up': ['google-calendar', 'calendly', 'hubspot', 'salesforce'],
  'calendar': ['google-calendar', 'calendly', 'microsoft-graph'],

  // Finance
  'refund': ['stripe', 'paypal', 'square', 'shopify', 'payment'],
  'invoice': ['quickbooks', 'xero', 'freshbooks', 'stripe', 'billing'],
  'revenue': ['stripe', 'quickbooks', 'xero', 'chargebee', 'billing'],
  'payment': ['stripe', 'paypal', 'square', 'adyen'],
  'subscription': ['stripe', 'chargebee', 'recurly', 'billing'],

  // Communication
  'email': ['gmail', 'sendgrid', 'mailgun', 'amazon-ses', 'postmark'],
  'send email': ['gmail', 'sendgrid', 'mailgun', 'amazon-ses'],
  'slack message': ['slack', 'microsoft-teams'],
  'call': ['twilio', 'aircall', 'ringcentral', 'vonage', 'phone'],
  'sms': ['twilio', 'vonage', 'bandwidth', 'plivo'],

  // Travel
  'flight': ['sabre', 'amadeus', 'travelport', 'airline'],
  'hotel': ['sabre', 'amadeus', 'opera-pms', 'mews', 'cloudbeds', 'booking'],
  'book a flight': ['sabre', 'amadeus', 'travelport'],
  'book a hotel': ['sabre', 'amadeus', 'opera-pms', 'mews', 'cloudbeds'],

  // Hospitality
  'check in': ['opera-pms', 'mews', 'cloudbeds', 'hotel'],
  'check out': ['opera-pms', 'mews', 'cloudbeds', 'hotel'],
  'occupancy': ['opera-pms', 'mews', 'cloudbeds', 'hotel', 'room'],
  'room': ['opera-pms', 'mews', 'cloudbeds', 'hotel'],
  'guest': ['opera-pms', 'mews', 'cloudbeds', 'hotel'],

  // CRM
  'deal': ['salesforce', 'hubspot', 'pipedrive', 'close-crm'],
  'lead': ['salesforce', 'hubspot', 'marketo', 'apollo'],
  'prospect': ['salesforce', 'hubspot', 'outreach', 'apollo'],

  // IoT
  'thermostat': ['netatmo', 'google-home', 'ecobee', 'iot'],
  'temperature': ['netatmo', 'google-home', 'ecobee', 'iot'],
  'sensor': ['opto22-pac', 'particle', 'samsara', 'iot'],

  // AI
  'code review': ['github', 'openai-codex', 'codex-mcp', 'gitlab'],
  'generate image': ['openai-mcp', 'gemini-mcp', 'stability-ai', 'dalle'],
  'image generation': ['openai-mcp', 'gemini-mcp', 'stability-ai'],

  // Website
  'website is down': ['datadog-observability', 'statuspage', 'pingdom', 'uptime'],
  'website down': ['datadog-observability', 'statuspage', 'pingdom', 'uptime'],
  'website slow': ['datadog-observability', 'new-relic', 'grafana-api', 'dynatrace', 'apm'],
  'bottleneck': ['datadog-observability', 'new-relic', 'grafana-api', 'dynatrace'],
  'microservice': ['datadog-observability', 'new-relic', 'grafana-api', 'kubernetes'],
  'gpu': ['datadog-observability', 'grafana-api', 'new-relic'],
  'graph': ['datadog-observability', 'grafana-api', 'new-relic'],
  'summarize': ['slack', 'microsoft-teams', 'notion', 'confluence'],
  'discussed': ['slack', 'microsoft-teams', 'notion', 'confluence'],
  'conversation': ['slack', 'microsoft-teams', 'discord'],
  'launch': ['jira', 'asana', 'monday', 'linear', 'notion'],

  // HR & People
  'vacation': ['bamboohr', 'workday', 'gusto', 'adp', 'rippling', 'hibob'],
  'time off': ['bamboohr', 'workday', 'gusto', 'adp', 'rippling'],
  'pto': ['bamboohr', 'workday', 'gusto', 'adp'],
  'headcount': ['bamboohr', 'workday', 'adp', 'rippling', 'hibob'],
  'attrition': ['bamboohr', 'workday', 'culture-amp', 'lattice'],
  'compliance training': ['cornerstone', 'docebo', 'bamboohr', 'workday'],
  'open roles': ['greenhouse', 'lever', 'bamboohr', 'workday', 'recruitee'],
  'unfilled': ['greenhouse', 'lever', 'bamboohr', 'workday'],
  'employee': ['bamboohr', 'workday', 'gusto', 'adp', 'rippling', 'hibob'],

  // Healthcare expanded
  'patient': ['fhir', 'athenahealth', 'drchrono', 'epic-fhir'],
  'prescription': ['fhir', 'athenahealth', 'drchrono', 'infermedica'],
  'dosage': ['fhir', 'athenahealth', 'drchrono', 'infermedica'],
  'lab result': ['fhir', 'athenahealth', 'drchrono'],
  'bed availability': ['fhir', 'athenahealth', 'epic-fhir'],
  'readmission': ['fhir', 'athenahealth', 'drchrono'],
  'physician': ['fhir', 'athenahealth', 'drchrono'],
  'waiting': ['fhir', 'athenahealth', 'epic-fhir'],
  'er ': ['fhir', 'athenahealth', 'epic-fhir'],

  // Construction expanded
  'job site': ['procore', 'autodesk-construction', 'plangrid', 'buildertrend'],
  'behind schedule': ['procore', 'autodesk-construction', 'buildertrend', 'jira', 'asana'],
  'subcontractor': ['procore', 'autodesk-construction', 'buildertrend'],
  'change order': ['procore', 'autodesk-construction', 'buildertrend'],
  'equipment maintenance': ['samsara', 'procore'],
  'equipment': ['samsara', 'procore', 'autodesk-construction'],

  // Manufacturing expanded
  'production line': ['epicor', 'infor', 'netsuite', 'sap'],
  'downtime': ['epicor', 'infor', 'datadog-observability', 'pagerduty'],
  'inventory': ['epicor', 'infor', 'netsuite', 'shopify', 'sap'],
  'shipment': ['fedex', 'ups', 'easypost', 'shippo', 'flexport'],
  'steel': ['epicor', 'infor', 'netsuite', 'sap'],

  // Security expanded
  'login attempt': ['crowdstrike', 'okta', 'auth0', 'splunk', 'microsoft-entra'],
  'failed login': ['crowdstrike', 'okta', 'auth0', 'splunk', 'microsoft-entra'],
  'permission': ['okta', 'auth0', 'microsoft-entra', 'crowdstrike-identity'],
  'elevated': ['crowdstrike', 'okta', 'microsoft-entra', 'cyberark'],
  'data transfer': ['crowdstrike', 'splunk', 'darktrace', 'extrahop'],
  'security patch': ['qualys', 'tenable', 'snyk', 'crowdstrike'],
  'logged in': ['okta', 'auth0', 'crowdstrike-identity', 'microsoft-entra'],
  'endpoint': ['crowdstrike', 'sentinelone', 'carbon-black', 'qualys'],

  // DevOps expanded
  '500 error': ['datadog-observability', 'new-relic', 'sentry', 'grafana-api'],
  'changed in production': ['github', 'gitlab', 'argocd', 'datadog-observability'],
  'pod': ['kubernetes', 'datadog-observability', 'grafana-api'],
  'job queue': ['redis', 'datadog-observability', 'grafana-api'],

  // Finance expanded
  'burn rate': ['quickbooks', 'xero', 'stripe', 'chargebee'],
  'over budget': ['quickbooks', 'xero', 'netsuite', 'sage'],
  'budget': ['quickbooks', 'xero', 'netsuite', 'sage'],
  'cash runway': ['quickbooks', 'xero', 'stripe', 'brex'],
  'expense report': ['concur', 'expensify', 'brex', 'ramp'],
  'unpaid': ['quickbooks', 'xero', 'freshbooks', 'stripe'],

  // CRM expanded
  'churn': ['salesforce', 'hubspot', 'gainsight', 'amplitude'],
  'close rate': ['salesforce', 'hubspot', 'pipedrive', 'close-crm'],
  'sales rep': ['salesforce', 'hubspot', 'pipedrive', 'outreach'],
  'trade show': ['marketo', 'hubspot', 'salesforce', 'eventbrite'],
  'funnel': ['hubspot', 'salesforce', 'marketo', 'amplitude', 'mixpanel'],

  // Communication expanded
  'stakeholder': ['gmail', 'sendgrid', 'slack', 'microsoft-teams'],
  'status update': ['gmail', 'sendgrid', 'slack', 'jira'],
  'action items': ['notion', 'asana', 'jira', 'monday', 'linear'],

  // Hospitality expanded
  'guest complaint': ['opera-pms', 'mews', 'cloudbeds', 'zendesk'],
  'booking lead time': ['opera-pms', 'mews', 'cloudbeds', 'sabre'],
  'loyalty member': ['opera-pms', 'mews', 'salesforce'],
  'vip': ['opera-pms', 'mews', 'cloudbeds', 'salesforce'],
  'rebooking': ['sabre', 'amadeus', 'travelport'],
};

/**
 * Expand a query with domain-specific keywords.
 * Returns the original query with injected terms appended.
 */
export function expandQuery(query: string): string {
  const lower = query.toLowerCase();
  const additions: Set<string> = new Set();

  for (const [phrase, terms] of Object.entries(EXPANSIONS)) {
    if (lower.includes(phrase)) {
      for (const term of terms) {
        additions.add(term);
      }
    }
  }

  if (additions.size === 0) return query;
  return query + ' ' + [...additions].join(' ');
}
