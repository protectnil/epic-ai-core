/**
 * Amazon Bedrock MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/awslabs/mcp
// The awslabs/mcp repository contains bedrock-kb-retrieval-mcp-server (Knowledge Bases
// retrieval only) and amazon-bedrock-agentcore-mcp-server (AgentCore docs only).
// Neither covers general Bedrock inference, model management, guardrails, or agent CRUD.
// This adapter provides the full inference + model management + agents + guardrails surface.
// Recommendation: Use this adapter for the complete API surface. Use vendor MCP only for
// Knowledge Base retrieval in isolation.
//
// Base URL (control plane): https://bedrock.{region}.amazonaws.com
// Base URL (runtime):       https://bedrock-runtime.{region}.amazonaws.com
// Base URL (agents):        https://bedrock-agent.{region}.amazonaws.com
// Base URL (agents runtime):https://bedrock-agent-runtime.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (no simple API key; requires accessKeyId + secretAccessKey)
// Docs: https://docs.aws.amazon.com/bedrock/latest/APIReference/welcome.html
// Rate limits: Per-model and per-account; varies by region and model family

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BedrockConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

// AWS Signature Version 4 signing — required for all Bedrock REST calls.
async function awsSigV4Sign(
  method: string,
  url: string,
  extraHeaders: Record<string, string>,
  body: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken?: string,
): Promise<Record<string, string>> {
  const parsedUrl = new URL(url);
  const service = parsedUrl.hostname.split('.')[0];

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const allHeaders: Record<string, string> = {
    ...extraHeaders,
    host: parsedUrl.host,
    'x-amz-date': amzDate,
  };
  if (sessionToken) allHeaders['x-amz-security-token'] = sessionToken;

  const sortedKeys = Object.keys(allHeaders).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = sortedKeys
    .map(lk => {
      const origKey = Object.keys(allHeaders).find(k => k.toLowerCase() === lk)!;
      return `${lk}:${allHeaders[origKey].trim()}`;
    })
    .join('\n') + '\n';
  const signedHeadersStr = sortedKeys.join(';');

  const encoder = new TextEncoder();
  const payloadHashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const payloadHash = Array.from(new Uint8Array(payloadHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const canonicalRequest = [method, parsedUrl.pathname, parsedUrl.searchParams.toString(), canonicalHeaders, signedHeadersStr, payloadHash].join('\n');

  const crHashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const crHash = Array.from(new Uint8Array(crHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crHash}`;

  async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = Array.from(new Uint8Array(await hmac(kSigning, stringToSign))).map(b => b.toString(16).padStart(2, '0')).join('');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  const finalHeaders: Record<string, string> = { ...allHeaders };
  delete finalHeaders.host;
  finalHeaders.Authorization = authorization;
  return finalHeaders;
}

export class AmazonBedrockMCPServer extends MCPAdapterBase {
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly sessionToken?: string;

  constructor(config: BedrockConfig) {
    super();
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sessionToken = config.sessionToken;
  }

  private runtimeBase(): string {
    return `https://bedrock-runtime.${this.region}.amazonaws.com`;
  }

  private controlBase(): string {
    return `https://bedrock.${this.region}.amazonaws.com`;
  }

  private agentBase(): string {
    return `https://bedrock-agent.${this.region}.amazonaws.com`;
  }

  private agentRuntimeBase(): string {
    return `https://bedrock-agent-runtime.${this.region}.amazonaws.com`;
  }

  private async signedGet(url: string): Promise<ToolResult> {
    const signedHeaders = await awsSigV4Sign('GET', url, {}, '', this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: signedHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async signedPost(url: string, body: unknown, contentType = 'application/json'): Promise<ToolResult> {
    const bodyStr = JSON.stringify(body);
    const baseHeaders = { 'Content-Type': contentType };
    const signedHeaders = await awsSigV4Sign('POST', url, baseHeaders, bodyStr, this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: signedHeaders, body: bodyStr });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    if (response.status === 202 || response.headers.get('content-length') === '0') {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Runtime: Inference ---
      {
        name: 'invoke_model',
        description: 'Invoke a Bedrock foundation model synchronously using the model-native request body format. Returns raw model output. Use converse for a unified cross-model chat interface.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Model ID, ARN, or cross-region inference profile ID (e.g. amazon.titan-text-express-v1, us.anthropic.claude-3-5-sonnet-20240620-v1:0)' },
            body: { type: 'object', description: 'Model-native request body. Format varies by model — see AWS Bedrock model parameters documentation.' },
            accept: { type: 'string', description: 'Response MIME type (default: application/json). Use image/png for image generation models.' },
          },
          required: ['model_id', 'body'],
        },
      },
      {
        name: 'converse',
        description: 'Send a multi-turn chat to any Bedrock model using the unified Converse API with a consistent messages format across all models.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Model ID or cross-region inference profile ID (e.g. us.anthropic.claude-3-5-sonnet-20240620-v1:0)' },
            messages: { type: 'array', description: 'Array of message objects with role (user|assistant) and content fields.', items: { type: 'object' } },
            system: { type: 'array', description: 'Optional system prompt as array of content blocks (e.g. [{ text: "You are helpful." }])', items: { type: 'object' } },
            inference_config: { type: 'object', description: 'Optional inference config: maxTokens, temperature, topP, stopSequences' },
          },
          required: ['model_id', 'messages'],
        },
      },
      {
        name: 'count_tokens',
        description: 'Count the number of tokens in text for a specific Bedrock model before sending an inference request.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Model ID to count tokens for' },
            messages: { type: 'array', description: 'Array of message objects with role and content', items: { type: 'object' } },
            system: { type: 'array', description: 'Optional system prompt content blocks', items: { type: 'object' } },
          },
          required: ['model_id', 'messages'],
        },
      },
      {
        name: 'start_async_invoke',
        description: 'Start an asynchronous model invocation job for large-scale or long-running inference tasks in Bedrock.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Model ID to invoke asynchronously' },
            model_input: { type: 'object', description: 'Model-native input body' },
            output_data_config: { type: 'object', description: 'Output destination config, e.g. { s3OutputDataConfig: { s3Uri: "s3://bucket/prefix" } }' },
            client_request_token: { type: 'string', description: 'Optional idempotency token' },
          },
          required: ['model_id', 'model_input', 'output_data_config'],
        },
      },
      {
        name: 'get_async_invoke',
        description: 'Get the status and result of an asynchronous Bedrock model invocation job by its ARN.',
        inputSchema: {
          type: 'object',
          properties: {
            invocation_arn: { type: 'string', description: 'The async invocation ARN returned by start_async_invoke' },
          },
          required: ['invocation_arn'],
        },
      },
      {
        name: 'list_async_invokes',
        description: 'List asynchronous Bedrock model invocation jobs with optional filtering by status or submit time range.',
        inputSchema: {
          type: 'object',
          properties: {
            status_equals: { type: 'string', description: 'Filter by status: InProgress, Completed, Failed' },
            max_results: { type: 'number', description: 'Maximum number of results (default: 50, max: 1000)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
            sort_order: { type: 'string', description: 'Sort order: Ascending or Descending (default: Descending)' },
          },
        },
      },
      // --- Control: Foundation Models ---
      {
        name: 'list_foundation_models',
        description: 'List available Amazon Bedrock foundation models with optional filtering by provider, output modality, inference type, or customization type.',
        inputSchema: {
          type: 'object',
          properties: {
            by_provider: { type: 'string', description: 'Filter by model provider (e.g. Amazon, Anthropic, Cohere, Meta, Mistral AI)' },
            by_output_modality: { type: 'string', description: 'Filter by output modality: TEXT, IMAGE, or EMBEDDING' },
            by_inference_type: { type: 'string', description: 'Filter by inference type: ON_DEMAND or PROVISIONED' },
            by_customization_type: { type: 'string', description: 'Filter by customization support: FINE_TUNING, CONTINUED_PRE_TRAINING, or DISTILLATION' },
          },
        },
      },
      {
        name: 'get_foundation_model',
        description: 'Get details for a specific Amazon Bedrock foundation model by its ID including supported features and modalities.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: { type: 'string', description: 'Foundation model ID (e.g. amazon.titan-text-express-v1)' },
          },
          required: ['model_id'],
        },
      },
      // --- Control: Inference Profiles ---
      {
        name: 'list_inference_profiles',
        description: 'List cross-region inference profiles available in the account for routing inference across regions.',
        inputSchema: {
          type: 'object',
          properties: {
            type_equals: { type: 'string', description: 'Filter by profile type: SYSTEM_DEFINED or APPLICATION' },
            max_results: { type: 'number', description: 'Maximum number of results to return' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      {
        name: 'get_inference_profile',
        description: 'Get details of a specific Amazon Bedrock inference profile by its ID or ARN.',
        inputSchema: {
          type: 'object',
          properties: {
            inference_profile_identifier: { type: 'string', description: 'The inference profile ID or ARN' },
          },
          required: ['inference_profile_identifier'],
        },
      },
      // --- Control: Custom Models ---
      {
        name: 'list_custom_models',
        description: 'List custom models (fine-tuned or continued pre-training) in the account with optional name and base model filters.',
        inputSchema: {
          type: 'object',
          properties: {
            name_contains: { type: 'string', description: 'Filter: return only models whose name contains this string' },
            base_model_arn_equals: { type: 'string', description: 'Filter by base model ARN' },
            max_results: { type: 'number', description: 'Maximum number of results (max 1000)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
            sort_order: { type: 'string', description: 'Sort order: Ascending or Descending' },
          },
        },
      },
      {
        name: 'get_custom_model',
        description: 'Get details of a specific Amazon Bedrock custom model by its ID or ARN.',
        inputSchema: {
          type: 'object',
          properties: {
            model_identifier: { type: 'string', description: 'Custom model ID or ARN' },
          },
          required: ['model_identifier'],
        },
      },
      // --- Control: Model Customization Jobs ---
      {
        name: 'list_model_customization_jobs',
        description: 'List model customization (fine-tuning) jobs with optional status and name filters.',
        inputSchema: {
          type: 'object',
          properties: {
            name_contains: { type: 'string', description: 'Filter by job name substring' },
            status_equals: { type: 'string', description: 'Filter by status: InProgress, Completed, Failed, Stopping, Stopped' },
            max_results: { type: 'number', description: 'Maximum number of results (max 1000)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
            sort_order: { type: 'string', description: 'Sort order: Ascending or Descending' },
          },
        },
      },
      {
        name: 'get_model_customization_job',
        description: 'Get the status and details of a model customization (fine-tuning) job by its ARN.',
        inputSchema: {
          type: 'object',
          properties: {
            job_identifier: { type: 'string', description: 'The customization job ARN or name' },
          },
          required: ['job_identifier'],
        },
      },
      {
        name: 'stop_model_customization_job',
        description: 'Stop a running Bedrock model customization (fine-tuning) job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_identifier: { type: 'string', description: 'The customization job ARN to stop' },
          },
          required: ['job_identifier'],
        },
      },
      // --- Control: Provisioned Throughput ---
      {
        name: 'list_provisioned_throughputs',
        description: 'List provisioned model throughput reservations in the account with optional name and model filters.',
        inputSchema: {
          type: 'object',
          properties: {
            name_contains: { type: 'string', description: 'Filter by provisioned throughput name substring' },
            status_equals: { type: 'string', description: 'Filter by status: Creating, InService, Updating, Failed' },
            model_arn_equals: { type: 'string', description: 'Filter by model ARN' },
            max_results: { type: 'number', description: 'Maximum number of results (max 1000)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
            sort_order: { type: 'string', description: 'Sort order: Ascending or Descending' },
          },
        },
      },
      {
        name: 'get_provisioned_throughput',
        description: 'Get details of a specific provisioned model throughput reservation by its ARN.',
        inputSchema: {
          type: 'object',
          properties: {
            provisioned_model_id: { type: 'string', description: 'Provisioned model ARN or name' },
          },
          required: ['provisioned_model_id'],
        },
      },
      // --- Control: Guardrails ---
      {
        name: 'list_guardrails',
        description: 'List Bedrock guardrails in the account for content filtering and safety policies.',
        inputSchema: {
          type: 'object',
          properties: {
            guardrail_identifier: { type: 'string', description: 'Filter to a specific guardrail ARN or ID' },
            max_results: { type: 'number', description: 'Maximum number of results to return' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      {
        name: 'get_guardrail',
        description: 'Get details of a specific Bedrock guardrail by its ID, including content filters and topic policies.',
        inputSchema: {
          type: 'object',
          properties: {
            guardrail_identifier: { type: 'string', description: 'Guardrail ID or ARN' },
            guardrail_version: { type: 'string', description: 'Guardrail version (default: DRAFT)' },
          },
          required: ['guardrail_identifier'],
        },
      },
      {
        name: 'apply_guardrail',
        description: 'Apply a Bedrock guardrail to text content to evaluate it against safety and content policies.',
        inputSchema: {
          type: 'object',
          properties: {
            guardrail_identifier: { type: 'string', description: 'Guardrail ID or ARN to apply' },
            guardrail_version: { type: 'string', description: 'Guardrail version to use (e.g. "1" or "DRAFT")' },
            source: { type: 'string', description: 'Source of the content: INPUT or OUTPUT' },
            content: { type: 'array', description: 'Array of content blocks to evaluate, e.g. [{ text: { text: "..." } }]', items: { type: 'object' } },
          },
          required: ['guardrail_identifier', 'guardrail_version', 'source', 'content'],
        },
      },
      // --- Agents: Knowledge Bases ---
      {
        name: 'list_knowledge_bases',
        description: 'List Bedrock Knowledge Bases in the account with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Maximum number of results to return (max: 100)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      {
        name: 'get_knowledge_base',
        description: 'Get details of a specific Bedrock Knowledge Base by its ID including data sources and vector store config.',
        inputSchema: {
          type: 'object',
          properties: {
            knowledge_base_id: { type: 'string', description: 'Knowledge Base ID' },
          },
          required: ['knowledge_base_id'],
        },
      },
      {
        name: 'retrieve_from_knowledge_base',
        description: 'Query a Bedrock Knowledge Base with a natural language query to retrieve relevant document chunks.',
        inputSchema: {
          type: 'object',
          properties: {
            knowledge_base_id: { type: 'string', description: 'Knowledge Base ID to query' },
            query: { type: 'string', description: 'Natural language query to retrieve relevant information' },
            number_of_results: { type: 'number', description: 'Number of results to return (default: 10)' },
            retrieval_configuration: { type: 'object', description: 'Optional retrieval config including vectorSearchConfiguration' },
          },
          required: ['knowledge_base_id', 'query'],
        },
      },
      // --- Agents: Agent Management ---
      {
        name: 'list_agents',
        description: 'List Bedrock agents in the account with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Maximum number of results to return (max: 100)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get details of a specific Bedrock agent by its ID including configuration, action groups, and knowledge bases.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Bedrock agent ID' },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'invoke_agent',
        description: 'Invoke a Bedrock agent to process a user request. Agents can call tools, query knowledge bases, and take multi-step actions.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'The Bedrock agent ID to invoke' },
            agent_alias_id: { type: 'string', description: 'The agent alias ID (use TSTALIASID for the working draft)' },
            session_id: { type: 'string', description: 'Session ID for multi-turn conversation continuity' },
            input_text: { type: 'string', description: 'The user input text to send to the agent' },
            enable_trace: { type: 'boolean', description: 'Enable trace output to see agent reasoning steps (default: false)' },
            end_session: { type: 'boolean', description: 'End the session after this invocation (default: false)' },
          },
          required: ['agent_id', 'agent_alias_id', 'session_id', 'input_text'],
        },
      },
      // --- Control: Model Invocation Jobs (Batch) ---
      {
        name: 'create_model_invocation_job',
        description: 'Create a batch inference job that processes large volumes of model requests stored in S3.',
        inputSchema: {
          type: 'object',
          properties: {
            job_name: { type: 'string', description: 'Display name for the batch inference job' },
            model_id: { type: 'string', description: 'Model ID to use for batch inference' },
            role_arn: { type: 'string', description: 'IAM role ARN granting Bedrock access to the input/output S3 buckets' },
            input_data_config: { type: 'object', description: 'Input data config: { s3InputDataConfig: { s3Uri, s3InputFormat, s3BucketOwner? } }' },
            output_data_config: { type: 'object', description: 'Output data config: { s3OutputDataConfig: { s3Uri, s3BucketOwner? } }' },
          },
          required: ['job_name', 'model_id', 'role_arn', 'input_data_config', 'output_data_config'],
        },
      },
      {
        name: 'get_model_invocation_job',
        description: 'Get the status and details of a Bedrock batch inference job by its ARN.',
        inputSchema: {
          type: 'object',
          properties: {
            job_identifier: { type: 'string', description: 'Batch inference job ARN' },
          },
          required: ['job_identifier'],
        },
      },
      {
        name: 'list_model_invocation_jobs',
        description: 'List Bedrock batch inference jobs with optional status, name, and time range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            status_equals: { type: 'string', description: 'Filter by status: Submitted, InProgress, Completed, Failed, Stopping, Stopped, PartiallyCompleted, Expired, Validating, Scheduled' },
            name_contains: { type: 'string', description: 'Filter by job name substring' },
            max_results: { type: 'number', description: 'Maximum number of results (max: 1000)' },
            next_token: { type: 'string', description: 'Pagination token from a previous response' },
            sort_order: { type: 'string', description: 'Sort order: Ascending or Descending' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'invoke_model': return await this.invokeModel(args);
        case 'converse': return await this.converse(args);
        case 'count_tokens': return await this.countTokens(args);
        case 'start_async_invoke': return await this.startAsyncInvoke(args);
        case 'get_async_invoke': return await this.getAsyncInvoke(args);
        case 'list_async_invokes': return await this.listAsyncInvokes(args);
        case 'list_foundation_models': return await this.listFoundationModels(args);
        case 'get_foundation_model': return await this.getFoundationModel(args);
        case 'list_inference_profiles': return await this.listInferenceProfiles(args);
        case 'get_inference_profile': return await this.getInferenceProfile(args);
        case 'list_custom_models': return await this.listCustomModels(args);
        case 'get_custom_model': return await this.getCustomModel(args);
        case 'list_model_customization_jobs': return await this.listModelCustomizationJobs(args);
        case 'get_model_customization_job': return await this.getModelCustomizationJob(args);
        case 'stop_model_customization_job': return await this.stopModelCustomizationJob(args);
        case 'list_provisioned_throughputs': return await this.listProvisionedThroughputs(args);
        case 'get_provisioned_throughput': return await this.getProvisionedThroughput(args);
        case 'list_guardrails': return await this.listGuardrails(args);
        case 'get_guardrail': return await this.getGuardrail(args);
        case 'apply_guardrail': return await this.applyGuardrail(args);
        case 'list_knowledge_bases': return await this.listKnowledgeBases(args);
        case 'get_knowledge_base': return await this.getKnowledgeBase(args);
        case 'retrieve_from_knowledge_base': return await this.retrieveFromKnowledgeBase(args);
        case 'list_agents': return await this.listAgents(args);
        case 'get_agent': return await this.getAgent(args);
        case 'invoke_agent': return await this.invokeAgent(args);
        case 'create_model_invocation_job': return await this.createModelInvocationJob(args);
        case 'get_model_invocation_job': return await this.getModelInvocationJob(args);
        case 'list_model_invocation_jobs': return await this.listModelInvocationJobs(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async invokeModel(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const body = args.body as Record<string, unknown>;
    const accept = (args.accept as string) ?? 'application/json';
    if (!modelId || !body) return { content: [{ type: 'text', text: 'model_id and body are required' }], isError: true };
    const url = `${this.runtimeBase()}/model/${encodeURIComponent(modelId)}/invoke`;
    const bodyStr = JSON.stringify(body);
    const baseHeaders = { 'Content-Type': 'application/json', Accept: accept };
    const signedHeaders = await awsSigV4Sign('POST', url, baseHeaders, bodyStr, this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: signedHeaders, body: bodyStr });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async converse(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const messages = args.messages as unknown[];
    if (!modelId || !messages) return { content: [{ type: 'text', text: 'model_id and messages are required' }], isError: true };
    const url = `${this.runtimeBase()}/model/${encodeURIComponent(modelId)}/converse`;
    const bodyObj: Record<string, unknown> = { messages };
    if (args.system) bodyObj.system = args.system;
    if (args.inference_config) bodyObj.inferenceConfig = args.inference_config;
    return this.signedPost(url, bodyObj);
  }

  private async countTokens(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    const messages = args.messages as unknown[];
    if (!modelId || !messages) return { content: [{ type: 'text', text: 'model_id and messages are required' }], isError: true };
    const url = `${this.runtimeBase()}/model/${encodeURIComponent(modelId)}/converse-count-tokens`;
    const bodyObj: Record<string, unknown> = { messages };
    if (args.system) bodyObj.system = args.system;
    return this.signedPost(url, bodyObj);
  }

  private async startAsyncInvoke(args: Record<string, unknown>): Promise<ToolResult> {
    const { model_id, model_input, output_data_config } = args;
    if (!model_id || !model_input || !output_data_config) {
      return { content: [{ type: 'text', text: 'model_id, model_input, and output_data_config are required' }], isError: true };
    }
    const url = `${this.runtimeBase()}/async-invoke`;
    const body: Record<string, unknown> = { modelId: model_id, modelInput: model_input, outputDataConfig: output_data_config };
    if (args.client_request_token) body.clientRequestToken = args.client_request_token;
    return this.signedPost(url, body);
  }

  private async getAsyncInvoke(args: Record<string, unknown>): Promise<ToolResult> {
    const invocationArn = args.invocation_arn as string;
    if (!invocationArn) return { content: [{ type: 'text', text: 'invocation_arn is required' }], isError: true };
    const url = `${this.runtimeBase()}/async-invoke/${encodeURIComponent(invocationArn)}`;
    return this.signedGet(url);
  }

  private async listAsyncInvokes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.status_equals) params.push(`statusEquals=${encodeURIComponent(args.status_equals as string)}`);
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    if (args.sort_order) params.push(`sortOrder=${encodeURIComponent(args.sort_order as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.runtimeBase()}/async-invoke${qs}`);
  }

  private async listFoundationModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.by_provider) params.push(`byProvider=${encodeURIComponent(args.by_provider as string)}`);
    if (args.by_output_modality) params.push(`byOutputModality=${encodeURIComponent(args.by_output_modality as string)}`);
    if (args.by_inference_type) params.push(`byInferenceType=${encodeURIComponent(args.by_inference_type as string)}`);
    if (args.by_customization_type) params.push(`byCustomizationType=${encodeURIComponent(args.by_customization_type as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.controlBase()}/foundation-models${qs}`);
  }

  private async getFoundationModel(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.model_id as string;
    if (!modelId) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.signedGet(`${this.controlBase()}/foundation-models/${encodeURIComponent(modelId)}`);
  }

  private async listInferenceProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.type_equals) params.push(`typeEquals=${encodeURIComponent(args.type_equals as string)}`);
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.controlBase()}/inference-profiles${qs}`);
  }

  private async getInferenceProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.inference_profile_identifier as string;
    if (!id) return { content: [{ type: 'text', text: 'inference_profile_identifier is required' }], isError: true };
    return this.signedGet(`${this.controlBase()}/inference-profiles/${encodeURIComponent(id)}`);
  }

  private async listCustomModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.name_contains) params.push(`nameContains=${encodeURIComponent(args.name_contains as string)}`);
    if (args.base_model_arn_equals) params.push(`baseModelArnEquals=${encodeURIComponent(args.base_model_arn_equals as string)}`);
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    if (args.sort_order) params.push(`sortOrder=${encodeURIComponent(args.sort_order as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.controlBase()}/custom-models${qs}`);
  }

  private async getCustomModel(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.model_identifier as string;
    if (!id) return { content: [{ type: 'text', text: 'model_identifier is required' }], isError: true };
    return this.signedGet(`${this.controlBase()}/custom-models/${encodeURIComponent(id)}`);
  }

  private async listModelCustomizationJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.name_contains) params.push(`nameContains=${encodeURIComponent(args.name_contains as string)}`);
    if (args.status_equals) params.push(`statusEquals=${encodeURIComponent(args.status_equals as string)}`);
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    if (args.sort_order) params.push(`sortOrder=${encodeURIComponent(args.sort_order as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.controlBase()}/model-customization-jobs${qs}`);
  }

  private async getModelCustomizationJob(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.job_identifier as string;
    if (!id) return { content: [{ type: 'text', text: 'job_identifier is required' }], isError: true };
    return this.signedGet(`${this.controlBase()}/model-customization-jobs/${encodeURIComponent(id)}`);
  }

  private async stopModelCustomizationJob(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.job_identifier as string;
    if (!id) return { content: [{ type: 'text', text: 'job_identifier is required' }], isError: true };
    return this.signedPost(`${this.controlBase()}/model-customization-jobs/${encodeURIComponent(id)}/stop`, {});
  }

  private async listProvisionedThroughputs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.name_contains) params.push(`nameContains=${encodeURIComponent(args.name_contains as string)}`);
    if (args.status_equals) params.push(`statusEquals=${encodeURIComponent(args.status_equals as string)}`);
    if (args.model_arn_equals) params.push(`modelArnEquals=${encodeURIComponent(args.model_arn_equals as string)}`);
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    if (args.sort_order) params.push(`sortOrder=${encodeURIComponent(args.sort_order as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.controlBase()}/provisioned-model-throughputs${qs}`);
  }

  private async getProvisionedThroughput(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.provisioned_model_id as string;
    if (!id) return { content: [{ type: 'text', text: 'provisioned_model_id is required' }], isError: true };
    return this.signedGet(`${this.controlBase()}/provisioned-model-throughputs/${encodeURIComponent(id)}`);
  }

  private async listGuardrails(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.guardrail_identifier) params.push(`guardrailIdentifier=${encodeURIComponent(args.guardrail_identifier as string)}`);
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.controlBase()}/guardrails${qs}`);
  }

  private async getGuardrail(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.guardrail_identifier as string;
    if (!id) return { content: [{ type: 'text', text: 'guardrail_identifier is required' }], isError: true };
    const version = (args.guardrail_version as string) ?? 'DRAFT';
    return this.signedGet(`${this.controlBase()}/guardrails/${encodeURIComponent(id)}?guardrailVersion=${encodeURIComponent(version)}`);
  }

  private async applyGuardrail(args: Record<string, unknown>): Promise<ToolResult> {
    const { guardrail_identifier, guardrail_version, source, content } = args;
    if (!guardrail_identifier || !guardrail_version || !source || !content) {
      return { content: [{ type: 'text', text: 'guardrail_identifier, guardrail_version, source, and content are required' }], isError: true };
    }
    const url = `${this.runtimeBase()}/guardrail/${encodeURIComponent(guardrail_identifier as string)}/version/${encodeURIComponent(guardrail_version as string)}/apply`;
    return this.signedPost(url, { source, content });
  }

  private async listKnowledgeBases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.agentBase()}/knowledgebases${qs}`);
  }

  private async getKnowledgeBase(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.knowledge_base_id as string;
    if (!id) return { content: [{ type: 'text', text: 'knowledge_base_id is required' }], isError: true };
    return this.signedGet(`${this.agentBase()}/knowledgebases/${encodeURIComponent(id)}`);
  }

  private async retrieveFromKnowledgeBase(args: Record<string, unknown>): Promise<ToolResult> {
    const { knowledge_base_id, query } = args;
    if (!knowledge_base_id || !query) {
      return { content: [{ type: 'text', text: 'knowledge_base_id and query are required' }], isError: true };
    }
    const url = `${this.agentRuntimeBase()}/knowledgebases/${encodeURIComponent(knowledge_base_id as string)}/retrieve`;
    const body: Record<string, unknown> = {
      retrievalQuery: { text: query },
    };
    if (args.number_of_results || args.retrieval_configuration) {
      body.retrievalConfiguration = args.retrieval_configuration ?? {
        vectorSearchConfiguration: { numberOfResults: args.number_of_results ?? 10 },
      };
    }
    return this.signedPost(url, body);
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.agentBase()}/agents${qs}`);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    const agentId = args.agent_id as string;
    if (!agentId) return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    return this.signedGet(`${this.agentBase()}/agents/${encodeURIComponent(agentId)}`);
  }

  private async invokeAgent(args: Record<string, unknown>): Promise<ToolResult> {
    const { agent_id, agent_alias_id, session_id, input_text } = args;
    if (!agent_id || !agent_alias_id || !session_id || !input_text) {
      return { content: [{ type: 'text', text: 'agent_id, agent_alias_id, session_id, and input_text are required' }], isError: true };
    }
    const url = `${this.agentRuntimeBase()}/agents/${encodeURIComponent(agent_id as string)}/agentAliases/${encodeURIComponent(agent_alias_id as string)}/sessions/${encodeURIComponent(session_id as string)}/text`;
    const body: Record<string, unknown> = { inputText: input_text };
    if (args.enable_trace !== undefined) body.enableTrace = args.enable_trace;
    if (args.end_session !== undefined) body.endSession = args.end_session;
    return this.signedPost(url, body);
  }

  private async createModelInvocationJob(args: Record<string, unknown>): Promise<ToolResult> {
    const { job_name, model_id, role_arn, input_data_config, output_data_config } = args;
    if (!job_name || !model_id || !role_arn || !input_data_config || !output_data_config) {
      return { content: [{ type: 'text', text: 'job_name, model_id, role_arn, input_data_config, and output_data_config are required' }], isError: true };
    }
    return this.signedPost(`${this.controlBase()}/model-invocation-job`, {
      jobName: job_name,
      modelId: model_id,
      roleArn: role_arn,
      inputDataConfig: input_data_config,
      outputDataConfig: output_data_config,
    });
  }

  private async getModelInvocationJob(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.job_identifier as string;
    if (!id) return { content: [{ type: 'text', text: 'job_identifier is required' }], isError: true };
    return this.signedGet(`${this.controlBase()}/model-invocation-job/${encodeURIComponent(id)}`);
  }

  private async listModelInvocationJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.status_equals) params.push(`statusEquals=${encodeURIComponent(args.status_equals as string)}`);
    if (args.name_contains) params.push(`nameContains=${encodeURIComponent(args.name_contains as string)}`);
    if (args.max_results) params.push(`maxResults=${encodeURIComponent(args.max_results as string)}`);
    if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
    if (args.sort_order) params.push(`sortOrder=${encodeURIComponent(args.sort_order as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.signedGet(`${this.controlBase()}/model-invocation-job${qs}`);
  }

  static catalog() {
    return {
      name: 'amazon-bedrock',
      displayName: 'Amazon Bedrock',
      version: '1.0.0',
      category: 'ai-ml' as const,
      keywords: ['amazon-bedrock', 'amazon', 'bedrock'],
      toolNames: ['invoke_model', 'converse', 'count_tokens', 'start_async_invoke', 'get_async_invoke', 'list_async_invokes', 'list_foundation_models', 'get_foundation_model', 'list_inference_profiles', 'get_inference_profile', 'list_custom_models', 'get_custom_model', 'list_model_customization_jobs', 'get_model_customization_job', 'stop_model_customization_job', 'list_provisioned_throughputs', 'get_provisioned_throughput', 'list_guardrails', 'get_guardrail', 'apply_guardrail', 'list_knowledge_bases', 'get_knowledge_base', 'retrieve_from_knowledge_base', 'list_agents', 'get_agent', 'invoke_agent', 'create_model_invocation_job', 'get_model_invocation_job', 'list_model_invocation_jobs'],
      description: 'Amazon Bedrock adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
