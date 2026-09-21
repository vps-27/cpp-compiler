# C++ Compiler

A browser-based C++17 playground for writing, compiling, and running small programs with clear diagnostics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/cpp-compiler` — responsive React/Vite compiler interface
- `artifacts/api-server/src/routes/compile.ts` — isolated C++ compile/run endpoint
- `lib/api-spec/openapi.yaml` — source of truth for the compile API contract

## Architecture decisions

- The frontend uses the generated API hook for the compile request so the request and response stay aligned with OpenAPI.
- Compilation and execution happen in a temporary server-side directory with separate compile and run time limits.
- Programs compile with GCC using the C++17 standard and bounded output to keep the playground responsive.

## Product

Users can edit C++ source, provide optional stdin, choose starter examples, run programs, inspect stdout and stderr, and see exit code and duration.

## User preferences

No additional preferences recorded.

## Gotchas

- The API server needs `g++` available on the host to compile submissions.
- The app should be run through its managed artifact workflow so `PORT` and `BASE_PATH` are supplied.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
