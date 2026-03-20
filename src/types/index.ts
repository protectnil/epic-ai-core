/**
 * @epicai/core — Type Definitions
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// =============================================================================
// LLM Provider Types
// =============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: LLMToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export type LLMFunction = (params: {
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
}) => Promise<LLMResponse>;

// =============================================================================
// Orchestrator / Generator Configuration
// =============================================================================

export interface OrchestratorConfig {
  provider: 'ollama' | 'vllm' | 'apple-foundation' | 'custom';
  model: string;
  adapter?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxIterations?: number;
  llm?: LLMFunction;
}

export interface GeneratorConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxTokens?: number;
  llm?: LLMFunction;
}

// =============================================================================
// Federation Types
// =============================================================================

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'api-key';
  token?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  headerName?: string;
}

export interface ServerConnection {
  name: string;
  transport: 'stdio' | 'streamable-http';
  url?: string;
  command?: string;
  args?: string[];
  auth?: AuthConfig;
  timeoutMs?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs?: number;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ConnectionHealth {
  server: string;
  status: ConnectionStatus;
  lastPingMs?: number;
  lastError?: string;
  toolCount: number;
}

export interface FederationConfig {
  servers: ServerConnection[];
  retryPolicy?: RetryPolicy;
  healthCheckIntervalMs?: number;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  server: string;
}

export interface ToolResult {
  content: unknown;
  isError: boolean;
  server: string;
  tool: string;
  durationMs: number;
}

export interface CorrelationQuery {
  timeRange: { start: Date; end: Date };
  entities: string[];
  servers?: string[];
}

export interface CorrelatedEntity {
  id: string;
  sources: { server: string; data: Record<string, unknown> }[];
}

export interface CorrelatedEvent {
  timestamp: Date;
  server: string;
  tool: string;
  entity: string;
  data: Record<string, unknown>;
}

export interface CorrelationResult {
  entities: Map<string, CorrelatedEntity>;
  timeline: CorrelatedEvent[];
  serversCovered: string[];
}

// =============================================================================
// Autonomy Types
// =============================================================================

export interface AutonomyRules {
  auto: string[];
  escalate: string[];
  approve: string[];
}

export interface ActionContext {
  tool: string;
  server: string;
  args: Record<string, unknown>;
  persona: string;
  userId?: string;
  timestamp: Date;
  priorActions: ActionRecord[];
}

export interface AutonomyPolicy {
  name: string;
  condition: (action: ActionContext) => boolean;
  override: 'auto' | 'escalate' | 'approve';
  priority?: number;
}

export type ApprovalState = 'pending' | 'approved' | 'denied' | 'expired';

export interface PendingApproval {
  id: string;
  action: ActionContext;
  tier: 'escalate' | 'approve';
  state: ApprovalState;
  createdAt: Date;
  expiresAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  denyReason?: string;
}

export interface ActionDecision {
  id: string;
  action: string;
  tier: 'auto' | 'escalate' | 'approve';
  allowed: boolean;
  reason?: string;
  approvedBy?: string;
  timestamp: Date;
  policyApplied?: string;
}

export interface ApprovalQueueConfig {
  persistence: 'memory' | 'redis';
  redis?: { host: string; port: number; password?: string };
  ttlMs: number;
  onExpire?: 'deny' | 'escalate-to-admin';
}

export interface AutonomyConfig {
  tiers: AutonomyRules;
  policies?: AutonomyPolicy[];
  approvalQueue?: ApprovalQueueConfig;
}

// =============================================================================
// Retrieval Types
// =============================================================================

export interface SearchOptions {
  maxResults?: number;
  minScore?: number;
}

export interface IndexDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ScoredResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface FusionSource {
  type: 'dense' | 'sparse' | 'bm25';
  rank: number;
  originalScore: number;
}

export interface RetrievalResult {
  id: string;
  content: string;
  fusionScore: number;
  fusionSources: FusionSource[];
  metadata: Record<string, unknown>;
}

export interface VectorStoreAdapter {
  searchDense(query: string, options: SearchOptions): Promise<ScoredResult[]>;
  searchSparse(query: string, options: SearchOptions): Promise<ScoredResult[]>;
  searchBM25(query: string, options: SearchOptions): Promise<ScoredResult[]>;
  index(documents: IndexDocument[]): Promise<{ indexed: number; dense: number; sparse: number; bm25: number }>;
}

export interface VectorStoreConfig {
  provider: 'qdrant' | 'pinecone' | 'memory' | 'custom';
  method?: 'dense' | 'minicoil' | 'bm25';
  host?: string;
  port?: number;
  collection?: string;
  apiKey?: string;
  adapter?: VectorStoreAdapter;
}

export interface HybridRetrieverConfig {
  dense: VectorStoreConfig;
  sparse: VectorStoreConfig;
  bm25: VectorStoreConfig;
  fusion: 'rrf' | 'weighted' | 'custom';
  fusionWeights?: { dense: number; sparse: number; bm25: number };
  customFusion?: (results: Map<string, ScoredResult[]>) => RetrievalResult[];
  maxResults: number;
  minScore: number;
}

// =============================================================================
// Memory Types
// =============================================================================

export type MemoryImportance = 'normal' | 'medium' | 'high';

export interface MemoryEntry {
  type: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  importance: MemoryImportance;
}

export interface StoredMemory extends MemoryEntry {
  id: string;
  userId: string;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date | null;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface RecallOptions {
  type?: string;
  importance?: MemoryImportance;
  limit?: number;
  since?: Date;
  sortBy?: 'importance' | 'recency' | 'frequency';
}

export interface ContextSummary {
  totalMemories: number;
  memoryTypes: Map<string, number>;
  lastInteraction: Date | null;
  importantMemories: number;
  oldestMemory: Date | null;
  newestMemory: Date | null;
}

export interface MemoryStoreAdapter {
  save(userId: string, entry: MemoryEntry): Promise<StoredMemory>;
  recall(userId: string, options: RecallOptions): Promise<StoredMemory[]>;
  context(userId: string): Promise<ContextSummary>;
  delete(userId: string, memoryId: string): Promise<void>;
}

export interface MemoryConfig {
  store: MemoryStoreAdapter;
  cacheTTLMs: number;
}

export interface RetrievalConfig {
  hybrid?: HybridRetrieverConfig;
  memory?: {
    store: string;
    redis?: { host: string; port: number; password?: string };
    mongo?: { uri: string; db: string };
    cacheTTLMs?: number;
  };
}

// =============================================================================
// Persona Types
// =============================================================================

export interface PersonaConfig {
  name: string;
  tone: string;
  domain: string;
  systemPrompt: string;
  vocabulary?: Record<string, string>;
  constraints?: string[];
  adapterPath?: string;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messageHistory: LLMMessage[];
  retrievedMemories: StoredMemory[];
  activeTools: string[];
}

// =============================================================================
// Audit Types
// =============================================================================

export interface ActionRecord {
  id: string;
  sequenceNumber: number;
  previousHash: string;
  timestamp: Date;
  action: string;
  tool: string;
  server: string;
  tier: 'auto' | 'escalate' | 'approve';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  persona: string;
  approvedBy?: string;
  deniedBy?: string;
  denyReason?: string;
  durationMs: number;
  hash: string;
}

export interface AuditFilter {
  since?: Date;
  until?: Date;
  tier?: 'auto' | 'escalate' | 'approve';
  server?: string;
  tool?: string;
  persona?: string;
  approvedBy?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStoreAdapter {
  append(record: ActionRecord): Promise<void>;
  query(filter: AuditFilter): Promise<ActionRecord[]>;
  verify(): Promise<{ valid: boolean; chainLength: number; brokenAt?: number }>;
}

export interface AuditConfig {
  store: 'append-only-log' | 'memory' | 'custom';
  path?: string;
  adapter?: AuditStoreAdapter;
  integrity: 'sha256-chain' | 'none';
  retention?: {
    maxAgeDays?: number;
    maxSizeBytes?: number;
  };
  export?: ('json' | 'csv' | 'syslog')[];
}

// =============================================================================
// Transport Types
// =============================================================================

export type TransportMode = 'sse' | 'json';

export type StreamEventType =
  | 'plan'
  | 'action'
  | 'approval-needed'
  | 'result'
  | 'memory'
  | 'narrative'
  | 'error'
  | 'done';

// Discriminated union — each event type has an exact payload shape
export interface PlanEvent { type: 'plan'; data: { iteration: number; toolCalls: string[] }; timestamp: Date }
export interface ActionEvent { type: 'action'; data: { tool: string; server: string; durationMs: number }; timestamp: Date }
export interface ApprovalNeededEvent { type: 'approval-needed'; data: { actionId: string; tool: string; server: string; tier: string }; timestamp: Date }
export interface ResultEvent { type: 'result'; data: { tool: string; content: unknown; isError: boolean }; timestamp: Date }
export interface NarrativeEvent { type: 'narrative'; data: { text: string }; timestamp: Date }
export interface MemoryEvent { type: 'memory'; data: { etched: boolean; findingsCount: number }; timestamp: Date }
export interface ErrorEvent { type: 'error'; data: { message: string; tool?: string; server?: string }; timestamp: Date }
export interface DoneEvent { type: 'done'; data: { loopIterations: number; actionsExecuted: number; actionsPending: number }; timestamp: Date }

export type StreamEvent =
  | PlanEvent
  | ActionEvent
  | ApprovalNeededEvent
  | ResultEvent
  | NarrativeEvent
  | MemoryEvent
  | ErrorEvent
  | DoneEvent;

export interface RunResult {
  response: string;
  events: StreamEvent[];
  actionsExecuted: number;
  actionsPending: number;
  persona: string;
  durationMs: number;
}

// =============================================================================
// Top-Level Configuration
// =============================================================================

export interface EpicAIConfig {
  orchestrator: OrchestratorConfig;
  generator?: GeneratorConfig;
  federation: FederationConfig;
  autonomy: AutonomyConfig;
  retrieval?: RetrievalConfig;
  persona: PersonaConfig;
  audit: AuditConfig;
  transport?: TransportMode;
}

// =============================================================================
// Agent Interface
// =============================================================================

export interface EpicAIAuditAccessor {
  query(filter: AuditFilter): Promise<ActionRecord[]>;
  verify(): Promise<{ valid: boolean; chainLength: number; brokenAt?: number }>;
  export(format: 'json' | 'csv' | 'syslog'): Promise<string>;
}

export interface EpicAIFederationAccessor {
  health(): ConnectionHealth[];
  listTools(): Tool[];
}

export interface EpicAIAutonomyAccessor {
  pending(): Promise<PendingApproval[]>;
  listPolicies(): AutonomyPolicy[];
}

export interface EpicAIAgent {
  start(): Promise<void>;
  stop(): Promise<void>;
  run(query: string): Promise<RunResult>;
  stream(query: string): AsyncGenerator<StreamEvent>;
  approve(actionId: string, opts: { approver: string }): Promise<ActionDecision>;
  deny(actionId: string, opts: { approver: string; reason: string }): Promise<ActionDecision>;
  readonly audit: EpicAIAuditAccessor;
  readonly federation: EpicAIFederationAccessor;
  readonly autonomy: EpicAIAutonomyAccessor;
}
