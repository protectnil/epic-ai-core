# Known Issues

## Llama 3.1 8B Instruct — No Structured Tool Calls via llama.cpp

**Severity:** Model limitation (not an SDK bug)
**Affected:** `llama3.1:8b-instruct` through llama.cpp's OpenAI-compatible endpoint
**Status:** Expected behavior — model does not activate tool-calling without specific configuration

### Symptom

When using `llama3.1:8b` as the orchestrator model with llama.cpp server (`llama-server`), the model receives tool definitions but never produces structured `tool_calls` in its response. The SDK correctly sends tools, logs the absence of tool calls, and falls back to text-only response.

### Root Cause

Llama 3.1 8B Instruct does not emit structured tool call JSON through llama.cpp's `/v1/chat/completions` endpoint without the `--jinja` flag enabled on the llama.cpp server. The model may require Jinja2 chat template processing to activate its function-calling behavior.

### Workarounds

1. **Start llama-server with `--jinja` flag** (untested — may resolve the issue):
   ```bash
   llama-server --model models/llama-3.1-8b-instruct.gguf --port 8080 --jinja
   ```

2. **Use a function-calling model** — switch to `functionary-small-v3.2` which is purpose-built for structured tool calls through llama.cpp:
   ```typescript
   orchestrator: {
     provider: 'auto',
     model: 'functionary-small-v3.2',
   }
   ```

3. **Use vLLM** — vLLM's tool-calling implementation handles Llama 3.1 tool calls natively without special flags.

### SDK Behavior

The SDK handles this correctly:
- Tools are sent in the request
- The model's text-only response is processed without error
- No tool calls are executed (expected when the model doesn't produce them)
- The response is returned as text

This is not an SDK failure. The SDK works as designed — the model simply does not activate tool-calling behavior in this configuration.
