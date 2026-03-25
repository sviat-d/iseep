# MCP Server — Design Spec

> **Goal:** Expose iseep's GTM intelligence as MCP tools for Claude Desktop and other MCP-compatible agents — read context, list ICPs, get scoring results, and submit suggestions.

## 1. Problem

iseep has a one-way API endpoint (`POST /api/drafts`) for submitting suggestions, but no way for agents to read data programmatically. Users must manually copy-paste context to Claude. There is no MCP integration for Claude Desktop.

## 2. Solution

- **3 new read-only API routes** with bearer token auth (same `workspaces.apiToken`)
- **Shared API auth helper** extracted from existing drafts route
- **Standalone MCP server** (`mcp-server/`) that wraps all API routes as MCP tools, communicates via stdio

## 3. API Routes

All routes authenticate via `Authorization: Bearer {workspace.apiToken}` using a shared helper.

### `GET /api/context`

Returns the full GTM context package.

**Query params:**
- `modules` (optional): comma-separated list of `product`, `icps`, `scoring`. Default: all.

**Response 200:**
```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-03-25T12:00:00Z",
  "workspace": { "name": "INXY" },
  "product": { ... },
  "icps": [ ... ],
  "scoring": { ... }
}
```

**Implementation:** Calls `buildFullContext(workspaceId, modules)` from `src/lib/context-export/builders.ts`. Returns JSON directly (the `GtmContextPackage` type).

### `GET /api/icps`

Returns all active ICPs with criteria and personas.

**Response 200:**
```json
{
  "icps": [
    {
      "id": "uuid",
      "name": "FinTech Companies",
      "status": "active",
      "description": "...",
      "criteria": [
        { "group": "firmographic", "category": "industry", "value": "FinTech", "intent": "qualify", "weight": 9 }
      ],
      "personas": [
        { "name": "Head of Payments", "description": "..." }
      ]
    }
  ]
}
```

**Implementation:** Query `icps` WHERE `workspaceId` and `status IN ('active', 'draft')`, join criteria and personas.

### `GET /api/scoring/latest`

Returns the latest scoring run summary with top leads.

**Query params:**
- `uploadId` (optional): specific upload ID. Default: latest by `createdAt`.
- `limit` (optional): number of leads to return. Default: 20, max: 100.

**Response 200:**
```json
{
  "upload": {
    "id": "uuid",
    "fileName": "leads.csv",
    "totalRows": 150,
    "createdAt": "2026-03-25T12:00:00Z"
  },
  "stats": {
    "highFit": 12,
    "borderline": 45,
    "blocked": 8,
    "unmatched": 85
  },
  "leads": [
    {
      "companyName": "PayFlow",
      "industry": "FinTech",
      "fitLevel": "high",
      "fitScore": 87,
      "bestIcpName": "FinTech Companies",
      "matchReasons": [ ... ]
    }
  ]
}
```

**Response 404:** `{ "error": "No scoring runs found" }` if workspace has no uploads.

**Implementation:** Query `scored_uploads` for latest (or by ID), then `scored_leads` with join for ICP name, ordered by fitScore DESC.

### `POST /api/drafts` (existing, no changes)

Already documented in draft system spec. Accepts `{ "drafts": [...] }`.

### Error Responses (all routes)

- `401`: `{ "error": "Invalid or missing API token" }`
- `400`: `{ "error": "..." }` with details
- `500`: `{ "error": "Internal server error" }`

## 4. Shared API Auth Helper

Extract bearer token auth from `src/app/api/drafts/route.ts` into `src/lib/api-auth.ts`:

```typescript
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function authenticateApiRequest(
  request: Request,
): Promise<{ workspaceId: string } | Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.apiToken, token))
    .limit(1);

  if (!workspace) {
    return Response.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  return { workspaceId: workspace.id };
}
```

The existing `POST /api/drafts/route.ts` should be refactored to use this helper instead of inline auth logic.

## 5. MCP Server

### Location

`mcp-server/` directory at project root (not inside `src/`). Standalone Node.js process, separate from Next.js.

### Entry Point

`mcp-server/index.ts` — registers 5 tools with the MCP SDK, starts stdio transport.

### Tools

| Tool Name | Description | Input Schema | API Call |
|-----------|-------------|-------------|---------|
| `get_context` | Get GTM context (product info, ICPs, scoring data) | `{ modules?: string[] }` | `GET /api/context?modules=...` |
| `list_icps` | List all active ICPs with criteria and personas | `{}` (no params) | `GET /api/icps` |
| `get_scoring_results` | Get latest scoring run results | `{ uploadId?: string, limit?: number }` | `GET /api/scoring/latest?...` |
| `submit_suggestions` | Submit change suggestions for review | `{ drafts: DraftInput[] }` | `POST /api/drafts` |

Each tool handler calls the corresponding API route via HTTP, passing the bearer token from env.

### HTTP Client

`mcp-server/client.ts` — thin wrapper around `fetch`:

```typescript
class IseepClient {
  constructor(private baseUrl: string, private apiToken: string) {}

  async get(path: string, params?: Record<string, string>): Promise<any> { ... }
  async post(path: string, body: any): Promise<any> { ... }
}
```

Reads `ISEEP_API_TOKEN` and `ISEEP_BASE_URL` from environment.

### Configuration

Claude Desktop `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "iseep": {
      "command": "npx",
      "args": ["tsx", "mcp-server/index.ts"],
      "env": {
        "ISEEP_API_TOKEN": "your-workspace-api-token",
        "ISEEP_BASE_URL": "https://iseep.io"
      }
    }
  }
}
```

Uses `tsx` for TypeScript execution without build step.

### Dependencies

`mcp-server/package.json`:
```json
{
  "name": "iseep-mcp-server",
  "private": true,
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Installed separately: `cd mcp-server && npm install`.

## 6. File Structure

### New Files

```
src/lib/api-auth.ts                    — shared bearer token auth helper
src/app/api/context/route.ts           — GET /api/context
src/app/api/icps/route.ts              — GET /api/icps (read-only API)
src/app/api/scoring/latest/route.ts    — GET /api/scoring/latest

mcp-server/
  index.ts                             — MCP server entry (stdio transport)
  tools.ts                             — 5 tool definitions with handlers
  client.ts                            — HTTP client for iseep API
  package.json                         — MCP server dependencies
  tsconfig.json                        — TypeScript config for Node.js
```

### Modified Files

```
src/app/api/drafts/route.ts            — refactor to use shared api-auth helper
```

## 7. Security

- All API routes require valid bearer token (same `workspaces.apiToken`)
- Read-only routes expose only workspace-scoped data (no cross-workspace access)
- MCP server runs locally on user's machine, communicates with iseep via HTTPS
- API token stored as env var, never hardcoded
- No new auth mechanism — reuses existing token infrastructure

## 8. Backward Compatibility

- `POST /api/drafts` behavior unchanged — only internal auth code refactored to shared helper
- No database changes
- No UI changes
- MCP server is additive — doesn't affect existing functionality
