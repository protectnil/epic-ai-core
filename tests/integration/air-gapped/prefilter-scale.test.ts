/**
 * @epicai/core — Pre-Filter Scale Integration Test
 * Proves that ToolPreFilter enables correct tool calling when the full catalog
 * exceeds what a 7B model can handle.
 *
 * Setup: 30 tools across 6 servers. Without pre-filter, qwen2.5:7b would choke.
 * With pre-filter, only ~8 relevant tools reach the model.
 *
 * Run: EPICAI_LOG=info npm run test:integration -- prefilter-scale
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createOrchestratorLLM } from '../../../src/orchestrator/OrchestratorProvider.js';
import { ToolPreFilter } from '../../../src/federation/ToolPreFilter.js';
import type { LLMToolDefinition, Tool } from '../../../src/types/index.js';

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = process.env.EPICAI_TEST_MODEL || 'qwen2.5:7b';
const TIMEOUT_MS = 120_000;

async function ollamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// 30 tools across 6 servers — realistic enterprise catalog
const FULL_CATALOG: Tool[] = [
  // CrowdStrike EDR (5)
  { name: 'crowdstrike:list_detections', description: 'List recent threat detections from EDR sensors on endpoints', parameters: { type: 'object', properties: { severity: { type: 'string' } }, required: [] }, server: 'crowdstrike' },
  { name: 'crowdstrike:get_detection', description: 'Get full details for a specific threat detection by ID', parameters: { type: 'object', properties: { detectionId: { type: 'string' } }, required: ['detectionId'] }, server: 'crowdstrike' },
  { name: 'crowdstrike:search_hosts', description: 'Search for endpoints by hostname IP or operating system', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, server: 'crowdstrike' },
  { name: 'crowdstrike:quarantine_host', description: 'Network isolate a compromised endpoint via EDR', parameters: { type: 'object', properties: { hostname: { type: 'string' }, reason: { type: 'string' } }, required: ['hostname', 'reason'] }, server: 'crowdstrike' },
  { name: 'crowdstrike:list_prevention_policies', description: 'List EDR prevention policies and their assignments', parameters: { type: 'object', properties: {}, required: [] }, server: 'crowdstrike' },
  // Splunk SIEM (5)
  { name: 'splunk:search', description: 'Run a Splunk SPL query across indexed security log data', parameters: { type: 'object', properties: { query: { type: 'string' }, earliest: { type: 'string' } }, required: ['query'] }, server: 'splunk' },
  { name: 'splunk:list_alerts', description: 'List triggered correlation alerts from the SIEM', parameters: { type: 'object', properties: { severity: { type: 'string' } }, required: [] }, server: 'splunk' },
  { name: 'splunk:get_notable', description: 'Get details of a notable security event by ID', parameters: { type: 'object', properties: { eventId: { type: 'string' } }, required: ['eventId'] }, server: 'splunk' },
  { name: 'splunk:create_investigation', description: 'Create a new investigation from a notable event', parameters: { type: 'object', properties: { notableId: { type: 'string' }, title: { type: 'string' } }, required: ['notableId'] }, server: 'splunk' },
  { name: 'splunk:list_saved_searches', description: 'List saved correlation searches and their schedules', parameters: { type: 'object', properties: {}, required: [] }, server: 'splunk' },
  // Vault Secrets (5)
  { name: 'vault:read_secret', description: 'Read a secret value from HashiCorp Vault key-value store', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }, server: 'vault' },
  { name: 'vault:list_secrets', description: 'List secret keys at a given path in Vault', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }, server: 'vault' },
  { name: 'vault:write_secret', description: 'Write or update a secret in Vault KV store', parameters: { type: 'object', properties: { path: { type: 'string' }, data: { type: 'object' } }, required: ['path', 'data'] }, server: 'vault' },
  { name: 'vault:list_policies', description: 'List access control policies in Vault', parameters: { type: 'object', properties: {}, required: [] }, server: 'vault' },
  { name: 'vault:get_health', description: 'Check Vault cluster health and seal status', parameters: { type: 'object', properties: {}, required: [] }, server: 'vault' },
  // GitHub Code (5)
  { name: 'github:search_code', description: 'Search source code across all repositories', parameters: { type: 'object', properties: { query: { type: 'string' }, language: { type: 'string' } }, required: ['query'] }, server: 'github' },
  { name: 'github:list_pulls', description: 'List open pull requests for a repository', parameters: { type: 'object', properties: { repo: { type: 'string' } }, required: ['repo'] }, server: 'github' },
  { name: 'github:get_commit', description: 'Get commit details and diff by SHA', parameters: { type: 'object', properties: { repo: { type: 'string' }, sha: { type: 'string' } }, required: ['repo', 'sha'] }, server: 'github' },
  { name: 'github:create_issue', description: 'Create a new issue in a GitHub repository', parameters: { type: 'object', properties: { repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['repo', 'title'] }, server: 'github' },
  { name: 'github:list_workflows', description: 'List GitHub Actions workflow runs and their status', parameters: { type: 'object', properties: { repo: { type: 'string' } }, required: ['repo'] }, server: 'github' },
  // Sentinel Cloud SIEM (5)
  { name: 'sentinel:query_logs', description: 'Run a KQL query against Azure Sentinel log analytics tables', parameters: { type: 'object', properties: { query: { type: 'string' }, timespan: { type: 'string' } }, required: ['query'] }, server: 'sentinel' },
  { name: 'sentinel:list_incidents', description: 'List active security incidents in Azure Sentinel', parameters: { type: 'object', properties: { severity: { type: 'string' } }, required: [] }, server: 'sentinel' },
  { name: 'sentinel:get_incident', description: 'Get full incident details including entities and alerts', parameters: { type: 'object', properties: { incidentId: { type: 'string' } }, required: ['incidentId'] }, server: 'sentinel' },
  { name: 'sentinel:list_rules', description: 'List active analytics rules in Sentinel', parameters: { type: 'object', properties: {}, required: [] }, server: 'sentinel' },
  { name: 'sentinel:update_incident', description: 'Update severity status or assignee of an incident', parameters: { type: 'object', properties: { incidentId: { type: 'string' }, status: { type: 'string' } }, required: ['incidentId'] }, server: 'sentinel' },
  // Jira Ticketing (5)
  { name: 'jira:create_ticket', description: 'Create a new Jira issue for tracking remediation work', parameters: { type: 'object', properties: { project: { type: 'string' }, summary: { type: 'string' }, type: { type: 'string' } }, required: ['project', 'summary'] }, server: 'jira' },
  { name: 'jira:search_issues', description: 'Search Jira issues using JQL query language', parameters: { type: 'object', properties: { jql: { type: 'string' } }, required: ['jql'] }, server: 'jira' },
  { name: 'jira:get_issue', description: 'Get full details of a Jira issue by key', parameters: { type: 'object', properties: { issueKey: { type: 'string' } }, required: ['issueKey'] }, server: 'jira' },
  { name: 'jira:add_comment', description: 'Add a comment to an existing Jira issue', parameters: { type: 'object', properties: { issueKey: { type: 'string' }, body: { type: 'string' } }, required: ['issueKey', 'body'] }, server: 'jira' },
  { name: 'jira:transition_issue', description: 'Move a Jira issue to a different workflow status', parameters: { type: 'object', properties: { issueKey: { type: 'string' }, transition: { type: 'string' } }, required: ['issueKey', 'transition'] }, server: 'jira' },
];

describe('Pre-Filter Scale Test', () => {
  let available = false;

  beforeAll(async () => {
    available = await ollamaAvailable();
  });

  it('pre-filter narrows 30 tools to ≤8 relevant ones', () => {
    const filter = new ToolPreFilter();
    filter.index(FULL_CATALOG);

    const selected = filter.select('Show me recent threat detections from EDR', { maxTools: 8, maxPerServer: 3 });
    console.log(`Pre-filter: ${FULL_CATALOG.length} → ${selected.length} tools`);
    console.log('Selected:', selected.map(t => t.name));

    expect(selected.length).toBeLessThanOrEqual(8);
    expect(selected.length).toBeGreaterThan(0);
    // Must include CrowdStrike detection tools
    const names = selected.map(t => t.name);
    expect(names).toContain('crowdstrike:list_detections');
  });

  it('model produces correct tool calls with pre-filtered 30-tool catalog', async () => {
    if (!available) {
      console.log('SKIP — Ollama not available');
      return;
    }

    const llm = createOrchestratorLLM({
      provider: 'ollama',
      model: MODEL,
      baseUrl: OLLAMA_URL,
      timeoutMs: TIMEOUT_MS,
    });

    // Pre-filter
    const filter = new ToolPreFilter();
    filter.index(FULL_CATALOG);
    const selected = filter.select('What are the latest threat detections?', { maxTools: 8, maxPerServer: 3 });
    console.log(`Pre-filter: ${FULL_CATALOG.length} → ${selected.length} tools for threat query`);

    const toolDefs: LLMToolDefinition[] = selected.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const response = await llm({
      messages: [
        { role: 'system', content: 'You are a cybersecurity assistant. Use the available tools to answer the user query.' },
        { role: 'user', content: 'What are the latest threat detections?' },
      ],
      tools: toolDefs,
    });

    console.log('Tool calls:', response.toolCalls.map(tc => `${tc.name}(${JSON.stringify(tc.arguments)})`));
    expect(response.toolCalls.length).toBeGreaterThan(0);

    const toolNames = response.toolCalls.map(tc => tc.name);
    // Should pick a detection-related tool
    const detectionTools = ['crowdstrike:list_detections', 'crowdstrike:get_detection', 'splunk:list_alerts', 'sentinel:list_incidents'];
    const hasRelevantTool = toolNames.some(n => detectionTools.includes(n));
    expect(hasRelevantTool).toBe(true);
  }, TIMEOUT_MS);

  it('cross-domain query gets tools from multiple servers', async () => {
    if (!available) {
      console.log('SKIP — Ollama not available');
      return;
    }

    const llm = createOrchestratorLLM({
      provider: 'ollama',
      model: MODEL,
      baseUrl: OLLAMA_URL,
      timeoutMs: TIMEOUT_MS,
    });

    const filter = new ToolPreFilter();
    filter.index(FULL_CATALOG);
    const selected = filter.select('Search the logs for the compromised host and create a Jira ticket', { maxTools: 8, maxPerServer: 3 });
    console.log(`Pre-filter: ${FULL_CATALOG.length} → ${selected.length} tools for cross-domain query`);
    console.log('Selected:', selected.map(t => t.name));

    const servers = new Set(selected.map(t => t.server));
    expect(servers.size).toBeGreaterThanOrEqual(2);

    const toolDefs: LLMToolDefinition[] = selected.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const response = await llm({
      messages: [
        { role: 'system', content: 'You are a cybersecurity assistant. Use the available tools to answer the user query. You may call multiple tools.' },
        { role: 'user', content: 'Search the logs for the compromised host and create a Jira ticket for remediation' },
      ],
      tools: toolDefs,
    });

    console.log('Tool calls:', response.toolCalls.map(tc => `${tc.name}(${JSON.stringify(tc.arguments)})`));
    expect(response.toolCalls.length).toBeGreaterThan(0);
  }, TIMEOUT_MS);
});
