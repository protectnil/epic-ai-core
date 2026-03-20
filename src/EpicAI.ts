/**
 * @epic-ai/core — EpicAI Entrypoint
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { z } from 'zod';
import type {
  EpicAIConfig,
  EpicAIAgent,
  EpicAIAuditAccessor,
  EpicAIFederationAccessor,
  EpicAIAutonomyAccessor,
  RunResult,
  StreamEvent,
  ActionDecision,
  AuditFilter,
  ConnectionHealth,
  Tool,
  PendingApproval,
  AutonomyPolicy,
  LLMFunction,
} from './types/index.js';
import { FederationManager } from './federation/FederationManager.js';
import { TieredAutonomy } from './autonomy/TieredAutonomy.js';
import { PersonaManager } from './persona/PersonaManager.js';
import { AuditTrail } from './audit/AuditTrail.js';
import { Orchestrator } from './orchestrator/Orchestrator.js';
import { createOrchestratorLLM } from './orchestrator/OrchestratorProvider.js';
import { createGeneratorLLM } from './orchestrator/GeneratorProvider.js';

// =============================================================================
// Config Validation Schemas
// =============================================================================

const AuthConfigSchema = z.object({
  type: z.enum(['bearer', 'basic', 'api-key']),
  token: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  headerName: z.string().optional(),
});

const ServerConnectionSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['stdio', 'streamable-http']),
  url: z.string().url().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  auth: AuthConfigSchema.optional(),
  timeoutMs: z.number().positive().optional(),
});

const RetryPolicySchema = z.object({
  maxRetries: z.number().int().min(0),
  backoffMs: z.number().positive(),
  maxBackoffMs: z.number().positive().optional(),
});

const OrchestratorConfigSchema = z.object({
  provider: z.enum(['ollama', 'vllm', 'apple-foundation', 'custom']),
  model: z.string().min(1),
  adapter: z.string().optional(),
  baseUrl: z.string().url().optional(),
  timeoutMs: z.number().positive().optional(),
  maxIterations: z.number().int().positive().optional(),
  llm: z.function().optional(),
});

const GeneratorConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'ollama', 'custom']),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  timeoutMs: z.number().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  llm: z.function().optional(),
});

const FederationConfigSchema = z.object({
  servers: z.array(ServerConnectionSchema),
  retryPolicy: RetryPolicySchema.optional(),
  healthCheckIntervalMs: z.number().positive().optional(),
});

const AutonomyRulesSchema = z.object({
  auto: z.array(z.string()),
  escalate: z.array(z.string()),
  approve: z.array(z.string()),
});

const ApprovalQueueConfigSchema = z.object({
  persistence: z.enum(['memory', 'redis']),
  redis: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    password: z.string().optional(),
  }).optional(),
  ttlMs: z.number().positive(),
  onExpire: z.enum(['deny', 'escalate-to-admin']).optional(),
});

const AutonomyConfigSchema = z.object({
  tiers: AutonomyRulesSchema,
  policies: z.array(z.object({
    name: z.string(),
    condition: z.function(),
    override: z.enum(['auto', 'escalate', 'approve']),
    priority: z.number().optional(),
  })).optional(),
  approvalQueue: ApprovalQueueConfigSchema.optional(),
});

const PersonaConfigSchema = z.object({
  name: z.string().min(1),
  tone: z.string().min(1),
  domain: z.string().min(1),
  systemPrompt: z.string().min(1),
  vocabulary: z.record(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  adapterPath: z.string().optional(),
});

const AuditAdapterSchema = z.object({}).passthrough().superRefine((val, ctx) => {
  const obj = val as Record<string, unknown>;
  for (const method of ['append', 'query', 'verify']) {
    if (typeof obj[method] !== 'function') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `AuditStoreAdapter must have a "${method}" method`,
      });
    }
  }
});

const AuditConfigSchema = z.object({
  store: z.enum(['append-only-log', 'memory', 'custom']),
  path: z.string().optional(),
  adapter: AuditAdapterSchema.optional(),
  integrity: z.enum(['sha256-chain', 'none']),
  retention: z.object({
    maxAgeDays: z.number().positive().optional(),
    maxSizeBytes: z.number().positive().optional(),
  }).optional(),
  export: z.array(z.enum(['json', 'csv', 'syslog'])).optional(),
});

const RetrievalConfigSchema = z.object({
  hybrid: z.object({
    dense: z.object({ provider: z.string(), collection: z.string().optional() }).passthrough().optional(),
    sparse: z.object({ provider: z.string(), collection: z.string().optional() }).passthrough().optional(),
    bm25: z.object({ provider: z.string(), collection: z.string().optional() }).passthrough().optional(),
    fusion: z.enum(['rrf', 'weighted', 'custom']).optional(),
    maxResults: z.number().int().positive().optional(),
    minScore: z.number().min(0).max(1).optional(),
  }).optional(),
  memory: z.object({
    store: z.string().min(1),
    redis: z.object({ host: z.string(), port: z.number() }).optional(),
    mongo: z.object({ uri: z.string(), db: z.string() }).optional(),
    cacheTTLMs: z.number().positive().optional(),
  }).optional(),
}).optional();

const EpicAIConfigSchema = z.object({
  orchestrator: OrchestratorConfigSchema,
  generator: GeneratorConfigSchema.optional(),
  federation: FederationConfigSchema,
  autonomy: AutonomyConfigSchema,
  retrieval: RetrievalConfigSchema,
  persona: PersonaConfigSchema,
  audit: AuditConfigSchema,
  transport: z.enum(['sse', 'json']).optional(),
});

// =============================================================================
// Validation Helpers
// =============================================================================

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateActionId(actionId: string): void {
  if (!UUID_PATTERN.test(actionId)) {
    throw new Error(`Invalid actionId format: "${actionId}". Expected UUID.`);
  }
}

// =============================================================================
// EpicAI — Static Factory
// =============================================================================

export class EpicAI {
  /**
   * Create and configure an EpicAI agent.
   * Validates all configuration, instantiates all layers,
   * and returns a ready-to-start EpicAIAgent.
   */
  static async create(config: EpicAIConfig): Promise<EpicAIAgent> {
    const validated = EpicAIConfigSchema.parse(config);
    return new EpicAIAgentImpl(validated as EpicAIConfig);
  }
}

// =============================================================================
// EpicAIAgentImpl — Agent Lifecycle
// =============================================================================

class EpicAIAgentImpl implements EpicAIAgent {
  private readonly config: EpicAIConfig;
  private started = false;

  private readonly federationManager: FederationManager;
  private readonly tieredAutonomy: TieredAutonomy;
  private readonly personaManager: PersonaManager;
  private readonly auditTrail: AuditTrail;
  private orchestrator: Orchestrator | null = null;

  readonly audit: EpicAIAuditAccessor;
  readonly federation: EpicAIFederationAccessor;
  readonly autonomy: EpicAIAutonomyAccessor;

  constructor(config: EpicAIConfig) {
    this.config = config;

    // Instantiate real layer implementations
    this.federationManager = new FederationManager(config.federation);
    this.tieredAutonomy = new TieredAutonomy(
      config.autonomy.tiers,
      config.autonomy.approvalQueue,
    );
    this.personaManager = new PersonaManager();
    this.personaManager.register(config.persona);
    this.auditTrail = new AuditTrail(config.audit);

    // Register dynamic policies if provided
    if (config.autonomy.policies) {
      for (const policy of config.autonomy.policies) {
        this.tieredAutonomy.addPolicy(policy);
      }
    }

    // Wire real accessors
    this.audit = {
      query: async (filter: AuditFilter) => {
        return this.auditTrail.query(filter);
      },
      verify: async () => {
        return this.auditTrail.verify();
      },
      export: async (format: 'json' | 'csv' | 'syslog') => {
        return this.auditTrail.export(format);
      },
    };

    this.federation = {
      health: (): ConnectionHealth[] => {
        // ConnectionPool.health() is async, but the accessor interface is sync.
        // Return cached tool-count-based health from ToolRegistry.
        const tools = this.federationManager.listTools();
        const serverMap = new Map<string, number>();
        for (const t of tools) {
          serverMap.set(t.server, (serverMap.get(t.server) ?? 0) + 1);
        }
        const result: ConnectionHealth[] = [];
        for (const [server, toolCount] of serverMap) {
          result.push({ server, status: 'connected', toolCount });
        }
        return result;
      },
      listTools: (): Tool[] => {
        return this.federationManager.listTools();
      },
    };

    this.autonomy = {
      pending: async (): Promise<PendingApproval[]> => {
        return this.tieredAutonomy.pending();
      },
      listPolicies: (): AutonomyPolicy[] => {
        return this.tieredAutonomy.listPolicies();
      },
    };
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Agent already started');
    }

    // VALIDATE FIRST — no side effects until config is proven valid
    const orchestratorLLM = createOrchestratorLLM(this.config.orchestrator);

    let generatorLLM: LLMFunction;
    if (this.config.generator) {
      generatorLLM = createGeneratorLLM(this.config.generator);
    } else if (this.config.orchestrator.provider === 'ollama') {
      generatorLLM = orchestratorLLM;
    } else {
      throw new Error(
        'Generator config is required when orchestrator is not Ollama. ' +
        'Provide a generator config or use provider: "ollama" for the orchestrator to handle both roles.'
      );
    }

    // SIDE EFFECTS — only after validation passes
    await this.federationManager.connectAll();
    await this.auditTrail.init();

    this.orchestrator = new Orchestrator({
      orchestratorLLM,
      generatorLLM,
      federation: this.federationManager,
      autonomy: this.tieredAutonomy,
      persona: this.personaManager,
      audit: this.auditTrail,
      maxIterations: this.config.orchestrator.maxIterations,
    });

    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      throw new Error('Agent not started');
    }

    // Disconnect from all MCP servers
    await this.federationManager.disconnectAll();

    // Clean up autonomy timers
    this.tieredAutonomy.destroy();

    this.orchestrator = null;
    this.started = false;
  }

  async run(query: string): Promise<RunResult> {
    if (!this.started || !this.orchestrator) {
      throw new Error('Agent not started. Call start() first.');
    }
    return this.orchestrator.run(query);
  }

  async *stream(query: string): AsyncGenerator<StreamEvent> {
    if (!this.started || !this.orchestrator) {
      throw new Error('Agent not started. Call start() first.');
    }
    yield* this.orchestrator.stream(query);
  }

  async approve(actionId: string, opts: { approver: string }): Promise<ActionDecision> {
    validateActionId(actionId);
    const result = this.tieredAutonomy.approve(actionId, opts.approver);
    if (result instanceof Promise) {
      return result;
    }
    return result;
  }

  async deny(actionId: string, opts: { approver: string; reason: string }): Promise<ActionDecision> {
    validateActionId(actionId);
    const result = this.tieredAutonomy.deny(actionId, opts.approver, opts.reason);
    if (result instanceof Promise) {
      return result;
    }
    return result;
  }
}
