/**
 * Verify new MCP candidates — remote endpoints first, then npm stdio
 * Uses @modelcontextprotocol/sdk Client
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MongoClient } from 'mongodb';
import { writeFileSync } from 'fs';

const MONGO_URI = process.env.ADAPTER_SYNC_MONGO_URI || 'mongodb://localhost:27017';
const TIMEOUT_MS = 10000;
const RESULTS_FILE = '/tmp/new-mcp-verification.json';

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms));
}

async function testRemote(url, name) {
  let client;
  try {
    const transport = new StreamableHTTPClientTransport(new URL(url));
    client = new Client({ name: 'epic-ai-verify', version: '1.0' }, { capabilities: {} });
    await Promise.race([client.connect(transport), timeout(TIMEOUT_MS)]);
    const result = await Promise.race([client.listTools(), timeout(TIMEOUT_MS)]);
    const tools = (result.tools || []).map(t => ({ name: t.name, description: (t.description || '').slice(0, 120) }));
    try { await client.close(); } catch {}
    return { name, type: 'remote', status: 'OK', toolCount: tools.length, tools };
  } catch (err) {
    try { if (client) await client.close(); } catch {}
    const msg = err.message || String(err);
    return { name, type: 'remote', status: msg.includes('TIMEOUT') ? 'TIMEOUT' : msg.includes('406') ? 'NEEDS_HEADER' : 'FAIL', toolCount: 0, error: msg.slice(0, 200) };
  }
}

async function testNpmStdio(packageName, name) {
  let client;
  let transport;
  try {
    transport = new StdioClientTransport({ command: 'npx', args: ['-y', packageName] });
    client = new Client({ name: 'epic-ai-verify', version: '1.0' }, { capabilities: {} });
    await Promise.race([client.connect(transport), timeout(30000)]);
    const result = await Promise.race([client.listTools(), timeout(TIMEOUT_MS)]);
    const tools = (result.tools || []).map(t => ({ name: t.name, description: (t.description || '').slice(0, 120) }));
    try { await client.close(); } catch {}
    return { name, type: 'npm-stdio', status: 'OK', toolCount: tools.length, tools, package: packageName };
  } catch (err) {
    try { if (client) await client.close(); } catch {}
    try { if (transport) await transport.close(); } catch {}
    const msg = err.message || String(err);
    return { name, type: 'npm-stdio', status: msg.includes('TIMEOUT') ? 'TIMEOUT' : 'FAIL', toolCount: 0, error: msg.slice(0, 200), package: packageName };
  }
}

async function main() {
  const mongo = await MongoClient.connect(MONGO_URI);
  const db = mongo.db('epicai_core');
  const candidates = await db.collection('adapters').find({ status: 'candidate' }).toArray();
  console.log('Total candidates:', candidates.length);

  const results = { timestamp: new Date().toISOString(), remote: [], npm: [], summary: {} };
  
  // Remote endpoints first
  const remotes = candidates.filter(c => (c.registry?.remotes || []).length > 0);
  console.log('Testing', remotes.length, 'remote endpoints...');
  
  let remoteOk = 0, remoteFail = 0;
  for (let i = 0; i < remotes.length; i++) {
    const c = remotes[i];
    const url = c.registry.remotes[0].url;
    const r = await testRemote(url, c.adapter_id);
    results.remote.push(r);
    if (r.status === 'OK') remoteOk++;
    else remoteFail++;
    if ((i + 1) % 50 === 0) console.log('  Remote:', i + 1, '/', remotes.length, '| OK:', remoteOk, 'FAIL:', remoteFail);
  }
  console.log('Remote done: OK=' + remoteOk, 'FAIL=' + remoteFail);

  // npm stdio
  const npms = candidates.filter(c => {
    const pkgs = c.registry?.packages || [];
    return pkgs.some(p => p.registryType === 'npm');
  });
  console.log('Testing', npms.length, 'npm packages...');
  
  let npmOk = 0, npmFail = 0;
  for (let i = 0; i < npms.length; i++) {
    const c = npms[i];
    const pkg = c.registry.packages.find(p => p.registryType === 'npm');
    const r = await testNpmStdio(pkg.identifier, c.adapter_id);
    results.npm.push(r);
    if (r.status === 'OK') npmOk++;
    else npmFail++;
    if ((i + 1) % 10 === 0) console.log('  npm:', i + 1, '/', npms.length, '| OK:', npmOk, 'FAIL:', npmFail);
  }
  console.log('npm done: OK=' + npmOk, 'FAIL=' + npmFail);

  results.summary = { remoteTotal: remotes.length, remoteOk, remoteFail, npmTotal: npms.length, npmOk, npmFail, totalVerified: remoteOk + npmOk };
  
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log('Results written to', RESULTS_FILE);
  console.log('VERIFIED TOTAL:', remoteOk + npmOk, 'of', remotes.length + npms.length);
  
  await mongo.close();
}

main().catch(err => { console.error(err); process.exit(1); });
