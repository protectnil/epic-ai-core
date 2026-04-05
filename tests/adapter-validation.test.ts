/**
 * @epicai/legion — Adapter Structure Validation
 * Imports all 113 adapters, instantiates with mock config,
 * verifies: tools getter returns ToolDefinition[], callTool exists,
 * every tool has name + description + inputSchema.
 */

import { describe, it, expect } from 'vitest';

import { AnomaliMCPServer } from '../src/mcp-servers/anomali.js';
import { AnthropicMCPServer } from '../src/mcp-servers/anthropic-api.js';
import { ArgoCDMCPServer } from '../src/mcp-servers/argocd.js';
import { AsanaMCPServer } from '../src/mcp-servers/asana.js';
import { AWSMCPServer } from '../src/mcp-servers/aws.js';
import { AzureMCPServer } from '../src/mcp-servers/azure.js';
import { BarracudaMCPServer } from '../src/mcp-servers/barracuda.js';
import { BeyondTrustMCPServer } from '../src/mcp-servers/beyondtrust.js';
import { BigQueryMCPServer } from '../src/mcp-servers/bigquery.js';
import { BitbucketMCPServer } from '../src/mcp-servers/bitbucket.js';
import { CarbonBlackMCPServer } from '../src/mcp-servers/carbon-black.js';
import { CheckPointMCPServer } from '../src/mcp-servers/checkpoint.js';
import { CircleCIMCPServer } from '../src/mcp-servers/circleci.js';
import { CiscoSecureMCPServer } from '../src/mcp-servers/cisco-secure.js';
import { CloudflareMCPServer } from '../src/mcp-servers/cloudflare.js';
import { ConfluenceMCPServer } from '../src/mcp-servers/confluence.js';
import { CoralogixMCPServer } from '../src/mcp-servers/coralogix.js';
import { CrowdStrikeIdentityMCPServer } from '../src/mcp-servers/crowdstrike-identity.js';
import { CrowdStrikeMCPServer } from '../src/mcp-servers/crowdstrike.js';
import { CyberArkMCPServer } from '../src/mcp-servers/cyberark.js';
import { CybereasonMCPServer } from '../src/mcp-servers/cybereason.js';
import { DarktraceMCPServer } from '../src/mcp-servers/darktrace.js';
import { DatadogObservabilityMCPServer } from '../src/mcp-servers/datadog-observability.js';
import { DatadogSecurityMCPServer } from '../src/mcp-servers/datadog-security.js';
import { DelineaMCPServer } from '../src/mcp-servers/delinea.js';
import { DevToMCPServer } from '../src/mcp-servers/devto.js';
import { DiscordMCPServer } from '../src/mcp-servers/discord.js';
import { DockerHubMCPServer } from '../src/mcp-servers/docker-hub.js';
import { DrataMCPServer } from '../src/mcp-servers/drata.js';
import { DynatraceMCPServer } from '../src/mcp-servers/dynatrace.js';
import { ElasticsearchMCPServer } from '../src/mcp-servers/elasticsearch.js';
import { FigmaMCPServer } from '../src/mcp-servers/figma.js';
import { FortinetMCPServer } from '../src/mcp-servers/fortinet.js';
import { GitHubMCPServer } from '../src/mcp-servers/github.js';
import { GitLabMCPServer } from '../src/mcp-servers/gitlab.js';
import { GmailMCPServer } from '../src/mcp-servers/gmail.js';
import { GoogleCalendarMCPServer } from '../src/mcp-servers/google-calendar.js';
import { GoogleCloudMCPServer } from '../src/mcp-servers/google-cloud.js';
import { GoogleDriveMCPServer } from '../src/mcp-servers/google-drive.js';
import { GoogleWorkspaceMCPServer } from '../src/mcp-servers/google-workspace.js';
import { GrafanaAPIMCPServer } from '../src/mcp-servers/grafana-api.js';
import { HubSpotMCPServer } from '../src/mcp-servers/hubspot.js';
import { HuggingFaceMCPServer } from '../src/mcp-servers/huggingface.js';
import { IncidentIoMCPServer } from '../src/mcp-servers/incident-io.js';
import { JiraMCPServer } from '../src/mcp-servers/jira.js';
import { KubernetesMCPServer } from '../src/mcp-servers/kubernetes.js';
import { LaceworkMCPServer } from '../src/mcp-servers/lacework.js';
import { LangChainMCPServer } from '../src/mcp-servers/langchain-api.js';
import { LinearMCPServer } from '../src/mcp-servers/linear.js';
import { LinkedInMCPServer } from '../src/mcp-servers/linkedin.js';
import { LlamaIndexMCPServer } from '../src/mcp-servers/llamaindex-api.js';
import { LogRhythmMCPServer } from '../src/mcp-servers/logrhythm.js';
import { MandiantMCPServer } from '../src/mcp-servers/mandiant.js';
import { MicrosoftGraphMCPServer } from '../src/mcp-servers/microsoft-graph.js';
import { MicrosoftTeamsMCPServer } from '../src/mcp-servers/microsoft-teams.js';
import { MimecastMCPServer } from '../src/mcp-servers/mimecast.js';
import { MongoDBMCPServer } from '../src/mcp-servers/mongodb.js';
import { NeonMCPServer } from '../src/mcp-servers/neon.js';
import { NewRelicMCPServer } from '../src/mcp-servers/new-relic.js';
import { NotionMCPServer } from '../src/mcp-servers/notion.js';
import { OllamaMCPServer } from '../src/mcp-servers/ollama-api.js';
import { OneTrustMCPServer } from '../src/mcp-servers/onetrust.js';
import { OpenAIMCPServer } from '../src/mcp-servers/openai-api.js';
import { OrcaMCPServer } from '../src/mcp-servers/orca.js';
import { PagerDutyMCPServer } from '../src/mcp-servers/pagerduty.js';
import { PaloAltoMCPServer } from '../src/mcp-servers/palo-alto.js';
import { PayPalMCPServer } from '../src/mcp-servers/paypal.js';
import { PingIdentityMCPServer } from '../src/mcp-servers/ping-identity.js';
import { PlaidMCPServer } from '../src/mcp-servers/plaid.js';
import { PostgreSQLMCPServer } from '../src/mcp-servers/postgresql.js';
import { PrismaCloudMCPServer } from '../src/mcp-servers/prisma-cloud.js';
import { PrometheusMCPServer } from '../src/mcp-servers/prometheus.js';
import { ProofpointMCPServer } from '../src/mcp-servers/proofpoint.js';
import { QRadarMCPServer } from '../src/mcp-servers/qradar.js';
import { QualysMCPServer } from '../src/mcp-servers/qualys.js';
import { QuickBooksMCPServer } from '../src/mcp-servers/quickbooks.js';
import { Rapid7MCPServer } from '../src/mcp-servers/rapid7.js';
import { RecordedFutureMCPServer } from '../src/mcp-servers/recorded-future.js';
import { RedditMCPServer } from '../src/mcp-servers/reddit.js';
import { RedisMCPServer } from '../src/mcp-servers/redis.js';
import { RetoolMCPServer } from '../src/mcp-servers/retool.js';
import { SalesforceMCPServer } from '../src/mcp-servers/salesforce.js';
import { SendGridMCPServer } from '../src/mcp-servers/sendgrid.js';
import { SentinelMCPServer } from '../src/mcp-servers/sentinel.js';
import { SentinelOneMCPServer } from '../src/mcp-servers/sentinelone.js';
import { SentryMCPServer } from '../src/mcp-servers/sentry.js';
import { ServiceNowGRCMCPServer } from '../src/mcp-servers/servicenow-grc.js';
import { ServiceNowITSMMCPServer } from '../src/mcp-servers/servicenow-itsm.js';
import { ShopifyMCPServer } from '../src/mcp-servers/shopify.js';
import { SlackMCPServer } from '../src/mcp-servers/slack.js';
import { SnowflakeMCPServer } from '../src/mcp-servers/snowflake.js';
import { SophosMCPServer } from '../src/mcp-servers/sophos.js';
import { SplunkMCPServer } from '../src/mcp-servers/splunk.js';
import { StackOverflowMCPServer } from '../src/mcp-servers/stackoverflow.js';
import { StripeMCPServer } from '../src/mcp-servers/stripe.js';
import { SubstackMCPServer } from '../src/mcp-servers/substack.js';
import { SumoLogicMCPServer } from '../src/mcp-servers/sumo-logic.js';
import { SupabaseMCPServer } from '../src/mcp-servers/supabase.js';
import { TenableMCPServer } from '../src/mcp-servers/tenable.js';
import { TerraformRegistryMCPServer } from '../src/mcp-servers/terraform-registry.js';
import { ThreatConnectMCPServer } from '../src/mcp-servers/threatconnect.js';
import { TrendMicroMCPServer } from '../src/mcp-servers/trend-micro.js';
import { TwilioMCPServer } from '../src/mcp-servers/twilio.js';
import { TwitchMCPServer } from '../src/mcp-servers/twitch.js';
import { TwitterMCPServer } from '../src/mcp-servers/twitter.js';
import { VercelMCPServer } from '../src/mcp-servers/vercel.js';
import { WandBMCPServer } from '../src/mcp-servers/wandb.js';
import { WizMCPServer } from '../src/mcp-servers/wiz.js';
import { XeroMCPServer } from '../src/mcp-servers/xero.js';
import { YouTubeMCPServer } from '../src/mcp-servers/youtube.js';
import { ZendeskMCPServer } from '../src/mcp-servers/zendesk.js';
import { ZoomMCPServer } from '../src/mcp-servers/zoom.js';
import { ZscalerMCPServer } from '../src/mcp-servers/zscaler.js';
import { DocuSignMCPServer } from '../src/mcp-servers/docusign.js';
import { PandaDocMCPServer } from '../src/mcp-servers/pandadoc.js';
import { FreshdeskMCPServer } from '../src/mcp-servers/freshdesk.js';
import { IntercomMCPServer } from '../src/mcp-servers/intercom.js';
import { HelpScoutMCPServer } from '../src/mcp-servers/help-scout.js';
import { PipedriveMCPServer } from '../src/mcp-servers/pipedrive.js';
import { ZohoCRMMCPServer } from '../src/mcp-servers/zoho-crm.js';
import { Dynamics365MCPServer } from '../src/mcp-servers/dynamics-365.js';
import { OutreachMCPServer } from '../src/mcp-servers/outreach.js';
import { SalesloftMCPServer } from '../src/mcp-servers/salesloft.js';

// Mock config that satisfies any adapter constructor
const mockConfig: Record<string, unknown> = {
  apiKey: 'test-key',
  api_key: 'test-key',
  baseUrl: 'https://mock.example.com',
  host: 'mock.example.com',
  token: 'test-token',
  accessToken: 'test-token',
  username: 'test-user',
  password: 'test-pass',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  orgKey: 'test-org',
  orgId: 'test-org',
  accountId: 'test-account',
  tenantId: 'test-tenant',
  workspaceId: 'test-workspace',
  environmentId: 'test-env',
  subdomain: 'test',
  instance: 'test',
  region: 'us1',
  email: 'test@test.com',
  sessionCookie: 'test-cookie',
  apiKeyId: 'test-key-id',
  subscriptionId: '00000000-0000-0000-0000-000000000000',
  resourceGroup: 'test-rg',
  workspaceName: 'test-ws',
  shopName: 'test-shop',
  apiToken: 'test-token',
  connectorId: 'test-connector',
  appId: 'test-app',
  basePath: 'na1.docusign.net',
  domain: 'test',
  organizationUrl: 'https://mock.crm.dynamics.com',
  endpoint: 'https://mock.example.com',
  api_server: 'https://mock.example.com',
};

interface AdapterEntry {
  name: string;
  factory: () => { tools: unknown[]; callTool: (name: string, args: Record<string, unknown>) => Promise<unknown> };
}

const adapters: AdapterEntry[] = [
  { name: 'anomali', factory: () => new AnomaliMCPServer(mockConfig as any) },
  { name: 'anthropic-api', factory: () => new AnthropicMCPServer(mockConfig as any) },
  { name: 'argocd', factory: () => new ArgoCDMCPServer(mockConfig as any) },
  { name: 'asana', factory: () => new AsanaMCPServer(mockConfig as any) },
  { name: 'aws', factory: () => new AWSMCPServer(mockConfig as any) },
  { name: 'azure', factory: () => new AzureMCPServer(mockConfig as any) },
  { name: 'barracuda', factory: () => new BarracudaMCPServer(mockConfig as any) },
  { name: 'beyondtrust', factory: () => new BeyondTrustMCPServer(mockConfig as any) },
  { name: 'bigquery', factory: () => new BigQueryMCPServer(mockConfig as any) },
  { name: 'bitbucket', factory: () => new BitbucketMCPServer(mockConfig as any) },
  { name: 'carbon-black', factory: () => new CarbonBlackMCPServer(mockConfig as any) },
  { name: 'checkpoint', factory: () => new CheckPointMCPServer(mockConfig as any) },
  { name: 'circleci', factory: () => new CircleCIMCPServer(mockConfig as any) },
  { name: 'cisco-secure', factory: () => new CiscoSecureMCPServer(mockConfig as any) },
  { name: 'cloudflare', factory: () => new CloudflareMCPServer(mockConfig as any) },
  { name: 'confluence', factory: () => new ConfluenceMCPServer(mockConfig as any) },
  { name: 'coralogix', factory: () => new CoralogixMCPServer(mockConfig as any) },
  { name: 'crowdstrike-identity', factory: () => new CrowdStrikeIdentityMCPServer(mockConfig as any) },
  { name: 'crowdstrike', factory: () => new CrowdStrikeMCPServer(mockConfig as any) },
  { name: 'cyberark', factory: () => new CyberArkMCPServer(mockConfig as any) },
  { name: 'cybereason', factory: () => new CybereasonMCPServer(mockConfig as any) },
  { name: 'darktrace', factory: () => new DarktraceMCPServer(mockConfig as any) },
  { name: 'datadog-observability', factory: () => new DatadogObservabilityMCPServer(mockConfig as any) },
  { name: 'datadog-security', factory: () => new DatadogSecurityMCPServer(mockConfig as any) },
  { name: 'delinea', factory: () => new DelineaMCPServer(mockConfig as any) },
  { name: 'devto', factory: () => new DevToMCPServer(mockConfig as any) },
  { name: 'discord', factory: () => new DiscordMCPServer(mockConfig as any) },
  { name: 'docker-hub', factory: () => new DockerHubMCPServer(mockConfig as any) },
  { name: 'drata', factory: () => new DrataMCPServer(mockConfig as any) },
  { name: 'dynatrace', factory: () => new DynatraceMCPServer(mockConfig as any) },
  { name: 'elasticsearch', factory: () => new ElasticsearchMCPServer(mockConfig as any) },
  { name: 'figma', factory: () => new FigmaMCPServer(mockConfig as any) },
  { name: 'fortinet', factory: () => new FortinetMCPServer(mockConfig as any) },
  { name: 'github', factory: () => new GitHubMCPServer(mockConfig as any) },
  { name: 'gitlab', factory: () => new GitLabMCPServer(mockConfig as any) },
  { name: 'gmail', factory: () => new GmailMCPServer(mockConfig as any) },
  { name: 'google-calendar', factory: () => new GoogleCalendarMCPServer(mockConfig as any) },
  { name: 'google-cloud', factory: () => new GoogleCloudMCPServer(mockConfig as any) },
  { name: 'google-drive', factory: () => new GoogleDriveMCPServer(mockConfig as any) },
  { name: 'google-workspace', factory: () => new GoogleWorkspaceMCPServer(mockConfig as any) },
  { name: 'grafana-api', factory: () => new GrafanaAPIMCPServer(mockConfig as any) },
  { name: 'hubspot', factory: () => new HubSpotMCPServer(mockConfig as any) },
  { name: 'huggingface', factory: () => new HuggingFaceMCPServer(mockConfig as any) },
  { name: 'incident-io', factory: () => new IncidentIoMCPServer(mockConfig as any) },
  { name: 'jira', factory: () => new JiraMCPServer(mockConfig as any) },
  { name: 'kubernetes', factory: () => new KubernetesMCPServer(mockConfig as any) },
  { name: 'lacework', factory: () => new LaceworkMCPServer(mockConfig as any) },
  { name: 'langchain-api', factory: () => new LangChainMCPServer(mockConfig as any) },
  { name: 'linear', factory: () => new LinearMCPServer(mockConfig as any) },
  { name: 'linkedin', factory: () => new LinkedInMCPServer(mockConfig as any) },
  { name: 'llamaindex-api', factory: () => new LlamaIndexMCPServer(mockConfig as any) },
  { name: 'logrhythm', factory: () => new LogRhythmMCPServer(mockConfig as any) },
  { name: 'mandiant', factory: () => new MandiantMCPServer(mockConfig as any) },
  { name: 'microsoft-graph', factory: () => new MicrosoftGraphMCPServer(mockConfig as any) },
  { name: 'microsoft-teams', factory: () => new MicrosoftTeamsMCPServer(mockConfig as any) },
  { name: 'mimecast', factory: () => new MimecastMCPServer(mockConfig as any) },
  { name: 'mongodb', factory: () => new MongoDBMCPServer(mockConfig as any) },
  { name: 'neon', factory: () => new NeonMCPServer(mockConfig as any) },
  { name: 'new-relic', factory: () => new NewRelicMCPServer(mockConfig as any) },
  { name: 'notion', factory: () => new NotionMCPServer(mockConfig as any) },
  { name: 'ollama-api', factory: () => new OllamaMCPServer(mockConfig as any) },
  { name: 'onetrust', factory: () => new OneTrustMCPServer(mockConfig as any) },
  { name: 'openai-api', factory: () => new OpenAIMCPServer(mockConfig as any) },
  { name: 'orca', factory: () => new OrcaMCPServer(mockConfig as any) },
  { name: 'pagerduty', factory: () => new PagerDutyMCPServer(mockConfig as any) },
  { name: 'palo-alto', factory: () => new PaloAltoMCPServer(mockConfig as any) },
  { name: 'paypal', factory: () => new PayPalMCPServer(mockConfig as any) },
  { name: 'ping-identity', factory: () => new PingIdentityMCPServer(mockConfig as any) },
  { name: 'plaid', factory: () => new PlaidMCPServer(mockConfig as any) },
  { name: 'postgresql', factory: () => new PostgreSQLMCPServer(mockConfig as any) },
  { name: 'prisma-cloud', factory: () => new PrismaCloudMCPServer(mockConfig as any) },
  { name: 'prometheus', factory: () => new PrometheusMCPServer(mockConfig as any) },
  { name: 'proofpoint', factory: () => new ProofpointMCPServer(mockConfig as any) },
  { name: 'qradar', factory: () => new QRadarMCPServer(mockConfig as any) },
  { name: 'qualys', factory: () => new QualysMCPServer(mockConfig as any) },
  { name: 'quickbooks', factory: () => new QuickBooksMCPServer(mockConfig as any) },
  { name: 'rapid7', factory: () => new Rapid7MCPServer(mockConfig as any) },
  { name: 'recorded-future', factory: () => new RecordedFutureMCPServer(mockConfig as any) },
  { name: 'reddit', factory: () => new RedditMCPServer(mockConfig as any) },
  { name: 'redis', factory: () => new RedisMCPServer(mockConfig as any) },
  { name: 'retool', factory: () => new RetoolMCPServer(mockConfig as any) },
  { name: 'salesforce', factory: () => new SalesforceMCPServer(mockConfig as any) },
  { name: 'sendgrid', factory: () => new SendGridMCPServer(mockConfig as any) },
  { name: 'sentinel', factory: () => new SentinelMCPServer(mockConfig as any) },
  { name: 'sentinelone', factory: () => new SentinelOneMCPServer(mockConfig as any) },
  { name: 'sentry', factory: () => new SentryMCPServer(mockConfig as any) },
  { name: 'servicenow-grc', factory: () => new ServiceNowGRCMCPServer(mockConfig as any) },
  { name: 'servicenow-itsm', factory: () => new ServiceNowITSMMCPServer(mockConfig as any) },
  { name: 'shopify', factory: () => new ShopifyMCPServer(mockConfig as any) },
  { name: 'slack', factory: () => new SlackMCPServer(mockConfig as any) },
  { name: 'snowflake', factory: () => new SnowflakeMCPServer(mockConfig as any) },
  { name: 'sophos', factory: () => new SophosMCPServer(mockConfig as any) },
  { name: 'splunk', factory: () => new SplunkMCPServer(mockConfig as any) },
  { name: 'stackoverflow', factory: () => new StackOverflowMCPServer(mockConfig as any) },
  { name: 'stripe', factory: () => new StripeMCPServer(mockConfig as any) },
  { name: 'substack', factory: () => new SubstackMCPServer(mockConfig as any) },
  { name: 'sumo-logic', factory: () => new SumoLogicMCPServer(mockConfig as any) },
  { name: 'supabase', factory: () => new SupabaseMCPServer(mockConfig as any) },
  { name: 'tenable', factory: () => new TenableMCPServer(mockConfig as any) },
  { name: 'terraform-registry', factory: () => new TerraformRegistryMCPServer(mockConfig as any) },
  { name: 'threatconnect', factory: () => new ThreatConnectMCPServer(mockConfig as any) },
  { name: 'trend-micro', factory: () => new TrendMicroMCPServer(mockConfig as any) },
  { name: 'twilio', factory: () => new TwilioMCPServer(mockConfig as any) },
  { name: 'twitch', factory: () => new TwitchMCPServer(mockConfig as any) },
  { name: 'twitter', factory: () => new TwitterMCPServer(mockConfig as any) },
  { name: 'vercel', factory: () => new VercelMCPServer(mockConfig as any) },
  { name: 'wandb', factory: () => new WandBMCPServer(mockConfig as any) },
  { name: 'wiz', factory: () => new WizMCPServer(mockConfig as any) },
  { name: 'xero', factory: () => new XeroMCPServer(mockConfig as any) },
  { name: 'youtube', factory: () => new YouTubeMCPServer(mockConfig as any) },
  { name: 'zendesk', factory: () => new ZendeskMCPServer(mockConfig as any) },
  { name: 'zoom', factory: () => new ZoomMCPServer(mockConfig as any) },
  { name: 'zscaler', factory: () => new ZscalerMCPServer(mockConfig as any) },
  { name: 'docusign', factory: () => new DocuSignMCPServer(mockConfig as any) },
  { name: 'pandadoc', factory: () => new PandaDocMCPServer(mockConfig as any) },
  { name: 'freshdesk', factory: () => new FreshdeskMCPServer(mockConfig as any) },
  { name: 'intercom', factory: () => new IntercomMCPServer(mockConfig as any) },
  { name: 'help-scout', factory: () => new HelpScoutMCPServer(mockConfig as any) },
  { name: 'pipedrive', factory: () => new PipedriveMCPServer(mockConfig as any) },
  { name: 'zoho-crm', factory: () => new ZohoCRMMCPServer(mockConfig as any) },
  { name: 'dynamics-365', factory: () => new Dynamics365MCPServer(mockConfig as any) },
  { name: 'outreach', factory: () => new OutreachMCPServer(mockConfig as any) },
  { name: 'salesloft', factory: () => new SalesloftMCPServer(mockConfig as any) },
];

describe('Adapter Structure Validation (113 adapters)', () => {
  for (const adapter of adapters) {
    describe(adapter.name, () => {
      it('instantiates without throwing', () => {
        expect(() => adapter.factory()).not.toThrow();
      });

      it('has tools getter returning non-empty array', () => {
        const instance = adapter.factory();
        const tools = instance.tools;
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
      });

      it('every tool has name, description, inputSchema', () => {
        const instance = adapter.factory();
        for (const tool of instance.tools as any[]) {
          expect(typeof tool.name).toBe('string');
          expect(tool.name.length).toBeGreaterThan(0);
          expect(typeof tool.description).toBe('string');
          expect(tool.description.length).toBeGreaterThan(0);
          expect(tool.inputSchema).toBeDefined();
          expect(tool.inputSchema.type).toBe('object');
          expect(tool.inputSchema.properties).toBeDefined();
        }
      });

      it('has callTool method', () => {
        const instance = adapter.factory();
        expect(typeof instance.callTool).toBe('function');
      });

      it('callTool returns error for unknown tool', async () => {
        const instance = adapter.factory();
        const result = await instance.callTool('__nonexistent_tool__', {}) as any;
        expect(result.isError).toBe(true);
      });
    });
  }
});
