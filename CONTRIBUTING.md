# Contributing to Epic AI Core

Thank you for your interest in contributing to the Epic AI® Zero LLM Context MCP Orchestrator.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/epic-ai-core.git`
3. Install dependencies: `npm install`
4. Run tests: `npm test`
5. Build: `npm run build`

## Development

```bash
# Run tests in watch mode
npm run test:watch

# Type check without emitting
npm run lint

# Build
npm run build
```

## Pull Request Process

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes
3. Ensure `npm run build` completes with zero errors
4. Ensure `npm test` passes all tests
5. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` — new feature
   - `fix:` — bug fix
   - `docs:` — documentation only
   - `test:` — adding or updating tests
   - `chore:` — maintenance, dependencies
6. Push to your fork and open a Pull Request against `main`

## Architecture

The SDK follows a layered architecture. See `README.md` for the full diagram.

- **Federation** — Multi-MCP server connections and tool discovery
- **Autonomy** — Tiered governance with policy engine and approval queue
- **Persona** — Voice routing and system prompt composition
- **Retrieval** — Hybrid search (dense + miniCOIL + BM25 + RRF)
- **Memory** — Importance-weighted persistent memory
- **Audit** — Hash-chained append-only logging
- **Orchestrator** — Plan-act-observe loop integrating all layers
- **Transport** — SSE and JSON response formatting

Each layer has an adapter interface. Contributions of new adapters (vector stores, memory backends, queue implementations) are especially welcome.

## Code Style

- TypeScript strict mode
- No `any` types without justification
- Interfaces over type aliases for public API surfaces
- JSDoc comments on all public exports

## Reporting Issues

Use [GitHub Issues](https://github.com/protectnil/epic-ai-core/issues). Include:

- Node.js version
- `@epicai/core` version
- Minimal reproduction steps
- Expected vs actual behavior

## Trademark Notice

Epic AI® is a registered trademark of protectNIL Inc. (Reg. No. 7,748,019). Use of the Epic AI® name in derivative works requires compliance with the [Trademark Policy](./TRADEMARK.md).

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
