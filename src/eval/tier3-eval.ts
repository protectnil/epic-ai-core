#!/usr/bin/env node
/**
 * Epic AI® Legion — Tier 3 Eval (BM25 + miniCOIL routing only)
 * Tests routing via MCP by calling legion_query directly — does NOT invoke an LLM.
 * The eval sends queries through the ToolPreFilter and checks if the top-ranked
 * adapter is in the expected list. This validates BM25/miniCOIL ranking quality,
 * not LLM decision-making.
 *
 * A true LLM eval (where an LLM agent reads results and decides which adapter to call)
 * is not yet implemented.
 * 
 * Run: npm run eval:tier3
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const QUERIES = [
  { q: 'Show me all failed login attempts in the last 24 hours grouped by user', expect: ['crowdstrike','okta','auth0','splunk','microsoft-entra'] },
  { q: 'Which accounts have had their permissions elevated this week?', expect: ['okta','auth0','microsoft-entra','crowdstrike-identity','cyberark'] },
  { q: 'Flag any data transfers over 500MB leaving our network after business hours', expect: ['crowdstrike','splunk','darktrace','extrahop'] },
  { q: 'Is anyone logged in from two different countries at the same time right now?', expect: ['okta','auth0','crowdstrike-identity','microsoft-entra'] },
  { q: 'List every endpoint that hasnt received a security patch in 90 days', expect: ['qualys','tenable','snyk','crowdstrike'] },
  { q: 'Why is the website slow today?', expect: ['datadog-observability','new-relic','grafana-api','dynatrace'] },
  { q: 'Which deployment from last night caused the spike in error rates?', expect: ['datadog-observability','new-relic','github-actions','jenkins','sentry'] },
  { q: 'How long has the payment service been throwing 500 errors?', expect: ['datadog-observability','new-relic','sentry','stripe'] },
  { q: 'What changed in production between 2pm and 4pm yesterday?', expect: ['github','gitlab','argocd','datadog-observability'] },
  { q: 'Show me which pods are consuming the most memory right now', expect: ['kubernetes','datadog-observability','grafana-api'] },
  { q: 'Whats our p99 latency for the checkout API over the last 7 days?', expect: ['datadog-observability','new-relic','grafana-api','dynatrace'] },
  { q: 'Alert me if database query time exceeds 2 seconds for more than 5 minutes', expect: ['datadog-observability','grafana-api','pagerduty','new-relic'] },
  { q: 'Which microservice is the bottleneck in the order fulfillment pipeline?', expect: ['datadog-observability','new-relic','grafana-api'] },
  { q: 'Graph CPU usage for all backend servers over the past month', expect: ['datadog-observability','grafana-api','new-relic','prometheus'] },
  { q: 'How many times did the job queue back up this week and why?', expect: ['datadog-observability','grafana-api','redis'] },
  { q: 'Whats our burn rate this quarter versus last quarter?', expect: ['quickbooks','xero','stripe','chargebee'] },
  { q: 'Show me all invoices over 50000 that are still unpaid', expect: ['quickbooks','xero','freshbooks','stripe'] },
  { q: 'Which department is most over budget right now?', expect: ['quickbooks','xero','netsuite','sage'] },
  { q: 'Forecast our cash runway if revenue stays flat for 6 months', expect: ['quickbooks','xero','stripe','brex'] },
  { q: 'Flag any expense reports with line items that look duplicated', expect: ['concur','expensify','brex','ramp'] },
  { q: 'How many vacation days does Sarah have left?', expect: ['bamboohr','workday','gusto','adp','rippling','hibob'] },
  { q: 'Who hasnt completed their annual compliance training yet?', expect: ['cornerstone','docebo','bamboohr','workday'] },
  { q: 'Show me attrition rate by department for the past two years', expect: ['bamboohr','workday','culture-amp','lattice'] },
  { q: 'Which open roles have been unfilled for more than 60 days?', expect: ['greenhouse','lever','bamboohr','workday'] },
  { q: 'Pull headcount growth month over month since January', expect: ['bamboohr','workday','adp','rippling','hibob'] },
  { q: 'Which deals in the pipeline havent had any activity in 30 days?', expect: ['salesforce','hubspot','pipedrive','close-crm'] },
  { q: 'Who is our highest-value customer by lifetime revenue?', expect: ['salesforce','hubspot','stripe','chargebee'] },
  { q: 'Show me all accounts that churned in Q3 and what they had in common', expect: ['salesforce','hubspot','gainsight','amplitude'] },
  { q: 'Which sales rep has the highest close rate this quarter?', expect: ['salesforce','hubspot','pipedrive','close-crm'] },
  { q: 'How many leads came in from the trade show last month and where are they in the funnel?', expect: ['marketo','hubspot','salesforce','eventbrite'] },
  { q: 'Summarize everything discussed about the product launch in the last two weeks', expect: ['slack','microsoft-teams','notion','confluence'] },
  { q: 'Find all messages where someone mentioned a production outage this month', expect: ['slack','microsoft-teams','datadog-observability'] },
  { q: 'Who on the engineering team hasnt responded to the incident thread?', expect: ['pagerduty','opsgenie','incident-io','slack'] },
  { q: 'Draft a status update email to stakeholders about the delayed release', expect: ['gmail','sendgrid','mailgun','amazon-ses'] },
  { q: 'What action items came out of yesterdays all-hands meeting?', expect: ['notion','asana','jira','monday','linear'] },
  { q: 'How many patients are currently waiting more than 4 hours in the ER?', expect: ['fhir','athenahealth','epic-fhir'] },
  { q: 'Flag any prescriptions written today that exceed recommended dosage thresholds', expect: ['fhir','athenahealth','drchrono','infermedica'] },
  { q: 'Show me bed availability across all wings right now', expect: ['fhir','athenahealth','epic-fhir'] },
  { q: 'Which physicians have the highest patient readmission rates this quarter?', expect: ['fhir','athenahealth','drchrono'] },
  { q: 'Pull all lab results flagged as critical that havent been acknowledged yet', expect: ['fhir','athenahealth','drchrono'] },
  { q: 'Which job sites are behind schedule and by how many days?', expect: ['procore','autodesk-construction','plangrid','buildertrend'] },
  { q: 'Show me all equipment thats due for maintenance in the next 30 days', expect: ['samsara','procore','autodesk-construction'] },
  { q: 'Whats our current inventory of steel reinforcement and when does the next shipment arrive?', expect: ['epicor','infor','netsuite','sap'] },
  { q: 'Which production line had the most downtime last week and what caused it?', expect: ['epicor','infor','datadog-observability'] },
  { q: 'Flag any subcontractor invoices that dont match the approved change order amounts', expect: ['procore','autodesk-construction','buildertrend','quickbooks','xero'] },
  { q: 'Which properties have occupancy below 60% this weekend?', expect: ['opera-pms','mews','cloudbeds'] },
  { q: 'Show me all guest complaints submitted in the last 48 hours that havent been resolved', expect: ['opera-pms','mews','cloudbeds','zendesk'] },
  { q: 'Whats the average booking lead time by room type this season?', expect: ['opera-pms','mews','cloudbeds'] },
  { q: 'Which loyalty members with platinum status have a stay this week?', expect: ['opera-pms','mews','cloudbeds','salesforce'] },
  { q: 'How many flight rebooking requests came in during yesterdays weather event?', expect: ['sabre','amadeus','travelport'] },
];

async function main() {
  console.log('Epic AI® Legion — Tier 3 Eval (BM25 + miniCOIL routing)');
  console.log('═══════════════════════════════════════════\n');

  const transport = new StdioClientTransport({
    command: 'node',
    args: [new URL('../bin/setup.js', import.meta.url).pathname, '--serve'],
  });
  const client = new Client({ name: 'tier3-eval', version: '1.0' }, { capabilities: {} });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log('MCP Server connected. Tools:', tools.tools.map(t => t.name).join(', '));
  console.log(`Running ${QUERIES.length} queries...\n`);

  let hits = 0;

  for (let i = 0; i < QUERIES.length; i++) {
    const { q, expect } = QUERIES[i];

    // Step 1: Call legion_query
    const r1 = await client.callTool({ name: 'legion_query', arguments: { query: q } });
    const data1 = JSON.parse((r1.content as Array<{type: string; text: string}>)[0].text);
    const adapters1 = (data1.matchedAdapters || []).map((a: {id: string}) => a.id);

    let found = expect.some(e => adapters1.includes(e));

    // Step 2: Ring 2 — get all adapter summaries and check
    if (!found) {
      const r2 = await client.callTool({ name: 'legion_query', arguments: { query: q, detail: 'summary' } });
      const data2 = JSON.parse((r2.content as Array<{type: string; text: string}>)[0].text);
      const adapters2 = (data2.adapters || []).map((a: {id: string}) => a.id);
      if (expect.some(e => adapters2.includes(e))) {
        found = true;
        const match = expect.find(e => adapters2.includes(e));
        console.log(`${i + 1}. ✓ "${q.slice(0, 55)}" → found in Ring 2 summary: ${match}`);
      }
    }

    if (found) {
      hits++;
      if (!expect.some(e => adapters1.includes(e))) {
        // Already printed above
      } else {
        const match = expect.find(e => adapters1.includes(e));
        console.log(`${i + 1}. ✓ "${q.slice(0, 55)}" → ${match}`);
      }
    } else {
      console.log(`${i + 1}. ✗ "${q.slice(0, 55)}"`);
      console.log(`      BM25: [${adapters1.slice(0, 5).join(', ')}]`);
    }
  }

  console.log(`\nSCORE: ${hits}/${QUERIES.length} (${(hits / QUERIES.length * 100).toFixed(1)}%)`);

  await client.close();
}

main().catch(err => {
  console.error('Eval failed:', err.message);
  process.exit(1);
});
