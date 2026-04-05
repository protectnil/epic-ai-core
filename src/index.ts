/**
 * Epic AI® — Zero LLM Context MCP Orchestrator
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 *
 * Epic AI is a registered trademark of protectNIL Inc.
 * U.S. Trademark Registration No. 7,748,019
 */

// Entrypoint
export { EpicAI } from './EpicAI.js';

// Federation
export { FederationManager } from './federation/FederationManager.js';
export { ConnectionPool } from './federation/ConnectionPool.js';
export { ToolRegistry } from './federation/ToolRegistry.js';
export { ToolPreFilter } from './federation/ToolPreFilter.js';
export type { PreFilterOptions } from './federation/ToolPreFilter.js';
export { Correlator } from './federation/Correlator.js';
export { MCPClientAdapter } from './federation/adapters/MCPClientAdapter.js';
export type { MCPAdapter } from './federation/adapters/base.js';

// Autonomy
export { TieredAutonomy } from './autonomy/TieredAutonomy.js';
export { PolicyEngine } from './autonomy/PolicyEngine.js';
export { ApprovalQueue } from './autonomy/ApprovalQueue.js';
export { RedisQueue } from './autonomy/adapters/RedisQueue.js';

// Persona
export { PersonaManager } from './persona/PersonaManager.js';
export { SystemPromptBuilder } from './persona/SystemPromptBuilder.js';

// Retrieval
export { HybridRetriever } from './retrieval/HybridRetriever.js';
export { RankFusion } from './retrieval/RankFusion.js';
export { InMemoryAdapter } from './retrieval/adapters/InMemoryAdapter.js';
export { QdrantAdapter } from './retrieval/adapters/QdrantAdapter.js';

// Memory
export { PersistentMemory } from './memory/PersistentMemory.js';
export { InMemoryStore } from './memory/adapters/InMemoryStore.js';
export { RedisMongoAdapter } from './memory/adapters/RedisMongoAdapter.js';

// Audit
export { AuditTrail } from './audit/AuditTrail.js';
export { HashChain } from './audit/HashChain.js';
export { InMemoryAuditAdapter } from './audit/adapters/InMemoryAdapter.js';
export { JSONLAdapter } from './audit/adapters/JSONLAdapter.js';

// Orchestrator
export { Orchestrator } from './orchestrator/Orchestrator.js';
export { createOrchestratorLLM } from './orchestrator/OrchestratorProvider.js';
export { createGeneratorLLM } from './orchestrator/GeneratorProvider.js';

// Transport
export { StreamManager } from './transport/StreamManager.js';
export { SSEWriter } from './transport/SSEWriter.js';
export { JSONResponse } from './transport/JSONResponse.js';

// Logger
export { createLogger, flushAllLogs } from './logger.js';
export type { LoggerInterface } from './logger.js';

// Observability
export { ObservabilityEmitter } from './observability/EventEmitter.js';
export type { LogLevel, LogEntry, EventCallback, LogCallback } from './observability/EventEmitter.js';
export { RunTelemetryCollector } from './observability/RunTelemetry.js';
export type { RunTelemetrySnapshot, RunTelemetryStep, RunTelemetryLog } from './observability/RunTelemetry.js';
export { TokenTracker } from './observability/TokenTracker.js';
export type { TokenUsage, CostEntry, CostSummary } from './observability/TokenTracker.js';
export { createOTelEventCallback, createOTelLogCallback } from './observability/OpenTelemetry.js';
export type { OTelSpan, OTelLogRecord, SpanExporter } from './observability/OpenTelemetry.js';

// Resilience
export { RateLimiter } from './resilience/RateLimiter.js';
export type { RateLimitConfig } from './resilience/RateLimiter.js';
export { ErrorClassifier } from './resilience/ErrorClassifier.js';
export type { ErrorCategory, ClassifiedError } from './resilience/ErrorClassifier.js';
export { GracefulShutdown } from './resilience/GracefulShutdown.js';
export type { ShutdownTask } from './resilience/GracefulShutdown.js';
export { FileCheckpointStore, InMemoryCheckpointStore } from './resilience/Checkpoint.js';
export type { CheckpointData, CheckpointStore } from './resilience/Checkpoint.js';
export { PromptCache } from './resilience/PromptCache.js';

// Federation V2
export { AdapterCatalog } from './federation/AdapterCatalog.js';
export type { AdapterCatalogEntry, AdapterCategory, CatalogSourceConfig } from './federation/AdapterCatalog.js';
export { DomainClassifier } from './federation/DomainClassifier.js';
export type { DomainClassifierConfig } from './federation/DomainClassifier.js';
export { AdaptivePool } from './federation/AdaptivePool.js';
export type { AdaptivePoolConfig, PoolStats } from './federation/AdaptivePool.js';
export { EpicAIAdapter } from './federation/adapters/base.js';
export type { EpicAIAdapterConstructor } from './federation/adapters/base.js';

// Trust
export {
  AuthMiddleware,
  AuthError,
  AccessPolicyEngine,
  ArtifactVerifier,
  loadPolicyFromFile,
  validatePolicyRules,
  createSecretsProvider,
} from './trust/index.js';
export type {
  SecretsProvider,
  TenantContext,
  PolicyRule,
  PolicyDecision,
  TrustConfig,
  JWTAuthConfig,
  MTLSConfig,
  SecretsConfig,
} from './trust/index.js';

// Sandbox
export { SandboxManager } from './federation/sandbox/SandboxManager.js';
export type { SandboxedAdapter } from './federation/sandbox/SandboxManager.js';
export type { AdapterSandboxConfig, SandboxMode } from './federation/sandbox/types.js';

// Observability (V2)
export { PrometheusExporter } from './observability/PrometheusExporter.js';

// Types — all public interfaces
export type {
  // LLM
  LLMFunction,
  LLMMessage,
  LLMToolDefinition,
  LLMToolCall,
  LLMResponse,

  // Config
  EpicAIConfig,
  OrchestratorConfig,
  GeneratorConfig,

  // Agent
  EpicAIAgent,
  EpicAIAuditAccessor,
  EpicAIFederationAccessor,
  EpicAIAutonomyAccessor,
  RunResult,

  // Federation
  FederationConfig,
  ServerConnection,
  AuthConfig,
  RetryPolicy,
  ConnectionHealth,
  ConnectionStatus,
  Tool,
  ToolTier,
  ToolResult,
  CorrelationQuery,
  CorrelationResult,
  CorrelatedEntity,
  CorrelatedEvent,

  // Autonomy
  AutonomyConfig,
  AutonomyRules,
  AutonomyPolicy,
  ActionContext,
  ActionDecision,
  PendingApproval,
  ApprovalState,
  ApprovalQueueConfig,

  // Retrieval
  RetrievalConfig,
  HybridRetrieverConfig,
  VectorStoreAdapter,
  VectorStoreConfig,
  IndexDocument,
  ScoredResult,
  FusionSource,
  RetrievalResult,
  SearchOptions,

  // Memory
  MemoryConfig,
  MemoryEntry,
  MemoryImportance,
  StoredMemory,
  RecallOptions,
  ContextSummary,
  MemoryStoreAdapter,

  // Persona
  PersonaConfig,
  ConversationContext,

  // Audit
  AuditConfig,
  ActionRecord,
  AuditFilter,
  AuditStoreAdapter,

  // Transport
  TransportMode,
  StreamEvent,
  StreamEventType,
  PlanEvent,
  ActionEvent,
  ApprovalNeededEvent,
  ResultEvent,
  NarrativeEvent,
  MemoryEvent,
  ErrorEvent,
  DoneEvent,
  RunTiming,
} from './types/index.js';
