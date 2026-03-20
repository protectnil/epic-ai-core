#!/usr/bin/env node
/**
 * @epic-ai/core — CLI Setup Tool
 * `npx epic-ai setup` — idempotent environment setup.
 * Detects Ollama, pulls model, validates connection, generates config.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DEFAULT_MODEL = 'mistral-small-3';
const OLLAMA_URL = 'http://localhost:11434';
const CONFIG_FILE = './epic-ai.config.ts';

interface SetupOptions {
  model: string;
  skipModel: boolean;
  forceConfig: boolean;
}

function parseArgs(args: string[]): SetupOptions {
  const options: SetupOptions = {
    model: DEFAULT_MODEL,
    skipModel: false,
    forceConfig: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--model':
        options.model = args[++i] ?? DEFAULT_MODEL;
        break;
      case '--skip-model':
        options.skipModel = true;
        break;
      case '--force-config':
        options.forceConfig = true;
        break;
      case 'setup':
        // skip the "setup" subcommand itself
        break;
      default:
        if (args[i] && !args[i].startsWith('-')) {
          // Ignore unknown positional args
        }
    }
  }

  return options;
}

async function detectOllama(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OLLAMA_URL}/api/version`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json() as { version?: string };
      return data.version ?? 'unknown';
    }
    return null;
  } catch {
    return null;
  }
}

async function checkModel(model: string): Promise<boolean> {
  try {
    const output = execFileSync('ollama', ['list'], { encoding: 'utf-8', timeout: 10000 });
    return output.includes(model);
  } catch {
    return false;
  }
}

function pullModel(model: string): boolean {
  try {
    console.log(`Pulling model: ${model}...`);
    execFileSync('ollama', ['pull', model], { stdio: 'inherit', timeout: 600000 });
    return true;
  } catch {
    return false;
  }
}

async function validateConnection(model: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Respond with OK' }],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function generateConfig(model: string, forceConfig: boolean): boolean {
  if (existsSync(CONFIG_FILE) && !forceConfig) {
    console.log(`Config file already exists: ${CONFIG_FILE} (use --force-config to overwrite)`);
    return true;
  }

  const config = `import { EpicAI } from '@epic-ai/core';

const agent = await EpicAI.create({
  orchestrator: {
    provider: 'ollama',
    model: '${model}',
  },

  federation: {
    servers: [
      // Add your MCP servers here
      // { name: 'example', transport: 'stdio', command: 'mcp-example-server' },
    ],
  },

  autonomy: {
    tiers: {
      auto: ['read', 'query', 'search', 'list'],
      escalate: ['write', 'update', 'modify'],
      approve: ['delete', 'revoke', 'terminate'],
    },
  },

  persona: {
    name: 'assistant',
    tone: 'professional',
    domain: 'general',
    systemPrompt: 'You are a helpful AI assistant powered by Epic AI\u00AE.',
  },

  audit: {
    store: 'memory',
    integrity: 'sha256-chain',
  },
});

await agent.start();
const result = await agent.run('Hello, Epic AI\u00AE!');
console.log(result.response);
await agent.stop();
`;

  writeFileSync(CONFIG_FILE, config, 'utf-8');
  console.log(`Config generated: ${CONFIG_FILE}`);
  return true;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('');
  console.log('  Epic AI\u00AE Intelligence Platform — Setup');
  console.log('  ========================================');
  console.log('');

  // 1. Detect Ollama
  console.log('Checking Ollama...');
  const version = await detectOllama();

  if (!version) {
    console.log('');
    console.log('  Ollama not detected. Install it first:');
    console.log('');

    switch (process.platform) {
      case 'darwin':
        console.log('    brew install ollama');
        break;
      case 'linux':
        console.log('    curl -fsSL https://ollama.com/install.sh | sh');
        break;
      case 'win32':
        console.log('    Download from: https://ollama.com/download');
        break;
      default:
        console.log('    Visit: https://ollama.com/download');
    }

    console.log('');
    console.log('  Then run: ollama serve');
    console.log('  Then retry: npx epic-ai setup');
    console.log('');
    process.exit(1);
  }

  console.log(`  Ollama detected (v${version})`);

  // 2. Check/pull model
  if (!options.skipModel) {
    console.log(`Checking model: ${options.model}...`);
    const hasModel = await checkModel(options.model);

    if (hasModel) {
      console.log(`  Model ${options.model} already available`);
    } else {
      const pulled = pullModel(options.model);
      if (!pulled) {
        console.error(`  Failed to pull model: ${options.model}`);
        process.exit(2);
      }
      console.log(`  Model ${options.model} pulled successfully`);
    }
  } else {
    console.log('  Skipping model pull (--skip-model)');
  }

  // 3. Validate connection
  if (!options.skipModel) {
    console.log('Validating connection...');
    const valid = await validateConnection(options.model);

    if (!valid) {
      console.error('  Connection validation failed.');
      console.error('  Make sure Ollama is running: ollama serve');
      process.exit(3);
    }

    console.log('  Connection validated');
  }

  // 4. Generate config
  console.log('Generating config...');
  generateConfig(options.model, options.forceConfig);

  // 5. Ready
  console.log('');
  console.log('  Ready.');
  console.log('');
  console.log('  Next steps:');
  console.log('');
  console.log("    import { EpicAI } from '@epic-ai/core';");
  console.log('');
  console.log('  Or edit epic-ai.config.ts to add your MCP servers.');
  console.log('');
  console.log('  Built on the Epic AI\u00AE Intelligence Platform');
  console.log('  Epic AI\u00AE is a registered trademark of protectNIL Inc. (U.S. Reg. No. 7,748,019)');
  console.log('');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
