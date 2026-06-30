# Wawu World 2 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, publish, and deploy a mobile-first Wawu World 2 demo whose real playable loop is onboarding → dual-character walk → memory shards → companion suggestion → check-in → item reward → storage → recap.

**Architecture:** A new Next.js 16 App Router application keeps deterministic game rules in pure TypeScript, persists one versioned game state through file or Coze PostgreSQL repositories, and exposes narrow route handlers. Client components render AMap JS API 2.0 with an honest training fallback; Coze model calls are isolated behind timeout-and-parse adapters with personality-specific deterministic fallback.

**Tech Stack:** Next.js 16.2.9, React 19.2.1, TypeScript 5.7, Vitest 3.2.6, Playwright 1.61.1, `coze-coding-dev-sdk` 0.7.24, `postgres` 3.4.7, direct AMap JS API 2.0 loader, pnpm 11.

---

## File structure

- `src/domain/*`: pure contracts, MBTI catalog, game reducer, walk and ledger rules.
- `src/server/*`: sessions, repositories, AMap/Coze adapters, API helpers and health checks.
- `src/app/api/*`: thin route handlers that authenticate, validate and call domain/server modules.
- `src/components/*`: mobile shell, onboarding, map, companion, storage and showcase surfaces.
- `src/app/*`: page entrypoints only; shared logic remains in focused modules.
- `public/assets/generated/*`: final Imagegen outputs grouped by avatars, map, items and scenes.
- `public/assets/manifest.json`: stable asset IDs, file paths, prompt IDs and review status.
- `tests/e2e/*`: browser acceptance flows.
- `.coze`, `.cozeproj/scripts/*`, `scripts/coze-preview-*`: Coze build and run contract.

### Task 1: Scaffold the verified application

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `next.config.mjs`
- Create: `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.env.example`

- [ ] **Step 1: Add the project manifest**

```json
{
  "name": "wawu-world-2",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@next/eslint-plugin-next": "16.2.9",
    "coze-coding-dev-sdk": "^0.7.24",
    "lucide-react": "0.469.0",
    "next": "16.2.9",
    "postgres": "3.4.7",
    "react": "19.2.1",
    "react-dom": "19.2.1"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@types/node": "22.10.2",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "eslint": "^9.39.4",
    "eslint-config-next": "16.2.9",
    "typescript": "5.7.2",
    "vitest": "3.2.6"
  }
}
```

- [ ] **Step 2: Add minimal configuration and a smoke page**

```tsx
// src/app/page.tsx
export default function Page() {
  return <main><h1>娃屋世界 2</h1></main>;
}
```

`.env.example` must contain names only:

```dotenv
NEXT_PUBLIC_AMAP_JS_KEY=
NEXT_PUBLIC_AMAP_SECURITY_CODE=
AMAP_WEB_SERVICE_KEY=
WAWU_STORAGE_DRIVER=file
WAWU_DATA_FILE=.data/wawu-world-2.json
```

- [ ] **Step 3: Install and verify the empty shell**

Run: `pnpm install`

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all commands exit `0`; Vitest reports no failing tests.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json next.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts src/app .env.example
git commit -m "chore: scaffold wawu world 2"
```

### Task 2: Define the MBTI catalog and versioned game state

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/mbti.ts`
- Create: `src/domain/state.ts`
- Test: `src/domain/mbti.test.ts`
- Test: `src/domain/state.test.ts`

- [ ] **Step 1: Write failing tests for all 16 personalities and the initial state**

```ts
import { describe, expect, it } from "vitest";
import { MBTI_CATALOG, getMbtiProfile } from "./mbti";
import { createInitialState } from "./state";

describe("MBTI catalog", () => {
  it("defines 16 unique types with behavior tuning and asset ids", () => {
    expect(MBTI_CATALOG).toHaveLength(16);
    expect(new Set(MBTI_CATALOG.map((entry) => entry.type)).size).toBe(16);
    expect(MBTI_CATALOG.every((entry) => entry.portraitAssetId && entry.walkAssetId)).toBe(true);
  });

  it("maps ENFP to an active discovery profile", () => {
    expect(getMbtiProfile("ENFP").poiBias).toContain("unexpected");
  });
});

describe("initial state", () => {
  it("starts behind onboarding with memory shards as the only balance", () => {
    const state = createInitialState("user-1");
    expect(state.onboarding.stage).toBe("meet");
    expect(state.wallet.memoryShards).toBe(0);
    expect(Object.keys(state.wallet)).toEqual(["memoryShards"]);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/domain/mbti.test.ts src/domain/state.test.ts`

Expected: FAIL because `mbti.ts` and `state.ts` do not exist.

- [ ] **Step 3: Implement exact contracts**

```ts
export type MbtiType =
  | "INTJ" | "INTP" | "ENTJ" | "ENTP"
  | "INFJ" | "INFP" | "ENFJ" | "ENFP"
  | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ"
  | "ISTP" | "ISFP" | "ESTP" | "ESFP";

export type Relationship = "mirror" | "companion" | "chronicler" | "guardian";
export type OnboardingStage =
  | "meet" | "mbti" | "tune" | "relationship"
  | "permissions" | "first-walk" | "first-shard" | "complete";
export type WalkMode = "real" | "training";
export type AnchorStatus = "locked" | "discovered" | "explored";
```

`GameStateV1` must contain `schemaVersion`, `revision`, `user`, `onboarding`, `agent`, `wallet`, `walks`, `anchors`, `ledger`, `inventory`, `reports` and `processedActionIds`. It must not contain another currency balance.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm vitest run src/domain/mbti.test.ts src/domain/state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat: define mbti companion state"
```

### Task 3: Build the memory-shard ledger and idempotent reducer

**Files:**
- Create: `src/domain/actions.ts`
- Create: `src/domain/reducer.ts`
- Create: `src/domain/reducer.test.ts`

- [ ] **Step 1: Write failing reducer tests**

```ts
it("claims walking shards once", () => {
  const initial = readyState({ memoryShards: 0 });
  const action = {
    id: "claim-1",
    type: "CLAIM_WALK_SHARDS",
    createdAt: "2026-06-30T10:00:00.000Z",
    payload: { steps: 5230 }
  } as const;
  const first = applyGameAction(initial, action);
  const second = applyGameAction(first, action);
  expect(first.wallet.memoryShards).toBe(52);
  expect(second.wallet.memoryShards).toBe(52);
});

it("rejects an action when shards are insufficient", () => {
  expect(() => applyGameAction(readyState({ memoryShards: 3 }), {
    id: "spend-1",
    type: "COMPLETE_AGENT_ACTION",
    createdAt: "2026-06-30T10:00:00.000Z",
    payload: { actionType: "explore", shardCost: 10, rewardItemId: "old-radio" }
  })).toThrow("INSUFFICIENT_MEMORY_SHARDS");
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/domain/reducer.test.ts`

Expected: FAIL because reducer behavior is missing.

- [ ] **Step 3: Implement minimal pure transitions**

`CLAIM_WALK_SHARDS` uses `Math.min(Math.floor(steps / 100), 80)`. `COMPLETE_AGENT_ACTION` verifies balance, appends one negative ledger entry and one inventory item in the same returned state. Every processed action ID deduplicates before mutation.

- [ ] **Step 4: Verify GREEN and full unit suite**

Run: `pnpm test`

Expected: PASS with reducer, MBTI and initial-state tests green.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat: add memory shard ledger"
```

### Task 4: Add repositories, sessions and onboarding gate

**Files:**
- Create: `src/server/repository.ts`
- Create: `src/server/storage.ts`
- Create: `src/server/session.ts`
- Create: `src/server/api.ts`
- Create: `src/proxy.ts`
- Create: `src/app/api/state/route.ts`
- Create: `src/app/api/onboarding/complete/route.ts`
- Test: `src/server/repository.test.ts`
- Test: `src/server/api.test.ts`

- [ ] **Step 1: Write failing repository and gate tests**

```ts
it("deduplicates actions in the repository", async () => {
  const repository = new MemoryGameRepository();
  await repository.saveInitialState("user-1", createInitialState("user-1"));
  const first = await repository.applyAction("user-1", claimAction("same"));
  const second = await repository.applyAction("user-1", claimAction("same"));
  expect(first.deduped).toBe(false);
  expect(second.deduped).toBe(true);
});

it("redirects incomplete users to onboarding", async () => {
  expect(await destinationFor(stateAt("mbti"), "/map")).toBe("/onboarding");
  expect(await destinationFor(stateAt("complete"), "/map")).toBe("/map");
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/server/repository.test.ts src/server/api.test.ts`

Expected: FAIL because repository and gate modules are missing.

- [ ] **Step 3: Implement file and PostgreSQL repositories**

Use a `GameRepository` interface with `getState`, `saveInitialState`, `applyAction`, `createSession`, `findSession` and `deleteSession`. File storage is development-only. PostgreSQL stores versioned state JSON and action IDs inside a transaction with `SELECT ... FOR UPDATE`.

- [ ] **Step 4: Implement cookie session and proxy gate**

Use a random opaque session token, persist only its SHA-256 hash, set `HttpOnly`, `SameSite=Lax`, `Secure` in production and a 30-day expiry. Only `/onboarding`, `/api/onboarding/*`, static assets and `/api/health` bypass the completed-onboarding gate.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm test`

Expected: repository, session and gate tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server src/app/api src/proxy.ts
git commit -m "feat: add onboarding persistence gate"
```

### Task 5: Generate and register Imagegen assets

**Files:**
- Create: `docs/assets/style-bible.md`
- Create: `docs/assets/prompts.json`
- Create: `public/assets/manifest.json`
- Create: `public/assets/generated/avatars/*`
- Create: `public/assets/generated/map/*`
- Create: `public/assets/generated/items/*`
- Create: `public/assets/generated/scenes/*`
- Create: `scripts/validate-assets.mjs`

- [ ] **Step 1: Define the style bible and manifest schema**

```json
{
  "id": "avatar-enfp-portrait",
  "path": "/assets/generated/avatars/enfp-portrait.webp",
  "kind": "avatar-portrait",
  "promptId": "mbti-enfp-portrait-v1",
  "review": "approved"
}
```

The shared style prompt must name the inspected anchors: detailed warm Chinese storybook linework, modern guofeng clothing, rice-paper texture, muted teal, cinnabar, memory gold, clean silhouette, no text, no watermark.

- [ ] **Step 2: Generate assets one at a time with built-in Imagegen**

Generate 32 MBTI character assets, 24 map assets, 30 storage items and 10 scene/state illustrations. Use separate prompts for distinct assets. For transparent assets, generate a flat chroma-key background, copy into the project, run the installed `remove_chroma_key.py`, and inspect alpha corners and edge fringing.

- [ ] **Step 3: Validate the asset set**

`scripts/validate-assets.mjs` must fail when an expected asset is missing, duplicated, outside its directory, lacks a manifest entry, or is still marked unreviewed.

Run: `node scripts/validate-assets.mjs`

Expected: `96 approved assets`.

- [ ] **Step 4: Commit**

```bash
git add docs/assets public/assets scripts/validate-assets.mjs
git commit -m "feat: add generated wawu art system"
```

### Task 6: Implement strict onboarding and MBTI avatar selection

**Files:**
- Create: `src/app/onboarding/page.tsx`
- Create: `src/components/onboarding/onboarding-flow.tsx`
- Create: `src/components/onboarding/mbti-grid.tsx`
- Create: `src/components/onboarding/companion-preview.tsx`
- Create: `src/components/onboarding/first-walk.tsx`
- Test: `src/components/onboarding/onboarding-model.test.ts`

- [ ] **Step 1: Write failing onboarding model tests**

Test that selection stores the chosen MBTI and independent avatar ID, default relationship is `companion`, permission denial advances to training mode rather than completing onboarding, and completion requires the first shard action.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/components/onboarding/onboarding-model.test.ts`

Expected: FAIL because the onboarding model does not exist.

- [ ] **Step 3: Implement the flow**

Render 16 image-backed cards with readable labels; selection opens a detail panel with Persona Tags and “保留性格，换外观”. Use explicit steps `meet → mbti → tune → relationship → permissions → first-walk → first-shard → complete`. A denied permission routes to labeled training walk.

- [ ] **Step 4: Verify tests and mobile rendering**

Run: `pnpm test && pnpm typecheck`

Start: `pnpm dev`

Open `/onboarding` at 390×844. Expected: no horizontal overflow, all hit targets at least 44px, all 16 cards reachable, and no bypass to `/map`.

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding src/components/onboarding
git commit -m "feat: add mbti companion onboarding"
```

### Task 7: Integrate AMap and server-side location services

**Files:**
- Create: `src/server/amap.ts`
- Create: `src/server/amap.test.ts`
- Create: `src/components/map/amap-loader.ts`
- Create: `src/components/map/amap-surface.tsx`
- Create: `src/components/map/fallback-map.tsx`
- Create: `src/app/api/map/nearby/route.ts`
- Create: `src/app/api/map/walking-route/route.ts`

- [ ] **Step 1: Write failing AMap adapter tests**

Mock `fetch` and assert that `searchNearby` sends the server key only to `restapi.amap.com`, validates coordinates, caps radius at 3000m and converts failed responses to `AMAP_UNAVAILABLE` without including the key in the error.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/server/amap.test.ts`

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement the adapters**

Client loader sets `window._AMapSecurityConfig.securityJsCode`, loads `https://webapi.amap.com/loader.js`, then requests JS API 2.0 with the public key. Server routes call AMap REST for POI and walking routes with `AMAP_WEB_SERVICE_KEY`. Responses return only required POI fields.

- [ ] **Step 4: Add honest fallback behavior**

If JS API loading, geolocation or server search fails, render the generated Chengdu fallback scene, show “地图降级模式”, and expose training anchors. Never mark training anchors as real LBS check-ins.

- [ ] **Step 5: Verify**

Run: `pnpm test && pnpm typecheck && pnpm build`

Manual: with valid env values, `/map` displays the AMap logo/tiles and Chengdu center; with keys absent, fallback mode is interactive and clearly labeled.

- [ ] **Step 6: Commit**

```bash
git add src/server/amap* src/components/map src/app/api/map
git commit -m "feat: add amap exploration surface"
```

### Task 8: Implement dual-character walking and companion observations

**Files:**
- Create: `src/domain/walk.ts`
- Create: `src/domain/walk.test.ts`
- Create: `src/server/companion-ai.ts`
- Create: `src/server/companion-ai.test.ts`
- Create: `src/app/api/walks/start/route.ts`
- Create: `src/app/api/walks/observe/route.ts`
- Create: `src/app/api/walks/finish/route.ts`
- Create: `src/components/map/walk-companion.tsx`
- Create: `src/components/map/companion-suggestion.tsx`
- Create: `src/components/map/walk-recap.tsx`

- [ ] **Step 1: Write failing walk and AI tests**

Test that real sessions require location consent, training sessions cannot create real check-ins, endpoints blur the first and last route segments, MBTI changes POI ranking, model output is length-limited and malformed/timeout output returns `modelSource: "safe-fallback"`.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/domain/walk.test.ts src/server/companion-ai.test.ts`

Expected: FAIL because walk and AI modules are missing.

- [ ] **Step 3: Implement the walk coordinator**

`startWalk(mode)`, `observeWalk(context)` and `finishWalk(session)` are the only domain entrypoints. The companion marker is an animated visual offset around the user marker; it never receives an independent geographic coordinate.

- [ ] **Step 4: Implement Coze observation with fallback**

Use `LLMClient(new Config())`, model `doubao-seed-2-0-mini-260215`, 8-second timeout and JSON fields `line`, `suggestedAnchorId`, `reason`. Sanitize control characters and cap the line at 72 Chinese characters. Fallback templates are selected by MBTI family.

- [ ] **Step 5: Verify**

Run: `pnpm test && pnpm typecheck`

Manual: begin training walk, see user dot plus companion, receive a suggestion, reject it without state mutation, accept another, and finish to a recap.

- [ ] **Step 6: Commit**

```bash
git add src/domain/walk* src/server/companion-ai* src/app/api/walks src/components/map
git commit -m "feat: add companion walking sessions"
```

### Task 9: Add anchors, check-ins, agent actions and daily reports

**Files:**
- Create: `src/domain/anchors.ts`
- Create: `src/domain/anchors.test.ts`
- Create: `src/domain/agent-actions.ts`
- Create: `src/server/report-ai.ts`
- Create: `src/app/api/anchors/check-in/route.ts`
- Create: `src/app/api/agent/actions/route.ts`
- Create: `src/app/api/reports/daily/route.ts`
- Create: `src/app/agent/page.tsx`
- Create: `src/app/agent/report/page.tsx`
- Create: `src/components/agent/*`

- [ ] **Step 1: Write failing check-in and action tests**

Real check-ins require a distance at or below 120m, training check-ins return `training: true`, action costs cannot create negative balances, and a report contains 3–5 bounded entries with explicit model source.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/domain/anchors.test.ts src/domain/agent-actions.test.ts src/server/report-ai.test.ts`

Expected: FAIL because the behavior is missing.

- [ ] **Step 3: Implement the minimal behavior**

Seed the Chengdu route with 10 anchors. Add five actions: explore, learn, socialize, create and offline-care. Persist every cost in `ShardLedgerEntry`. Reports may propose changes but store them as `pendingApproval` until the user approves or rejects.

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm typecheck`

Manual: complete a training anchor, spend shards on explore, inspect the ledger, view a 3–5 item report and reject a proposed public action.

- [ ] **Step 5: Commit**

```bash
git add src/domain src/server/report-ai* src/app/api/anchors src/app/api/agent src/app/api/reports src/app/agent src/components/agent
git commit -m "feat: add agent actions and reports"
```

### Task 10: Build creation desk and storage-cabinet dollhouse

**Files:**
- Create: `src/domain/inventory.ts`
- Create: `src/domain/inventory.test.ts`
- Create: `src/server/creation-ai.ts`
- Create: `src/app/api/creation/route.ts`
- Create: `src/app/api/inventory/route.ts`
- Create: `src/app/api/inventory/[id]/equip/route.ts`
- Create: `src/app/house/page.tsx`
- Create: `src/app/agent/creation/page.tsx`
- Create: `src/components/inventory/*`

- [ ] **Step 1: Write failing inventory tests**

Test category filtering, one equipped item per slot, provenance display, idempotent rewards, recycling only for owned unequipped items, and creation refunds on failed atomic completion.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/domain/inventory.test.ts`

Expected: FAIL because inventory rules are missing.

- [ ] **Step 3: Implement storage and creation**

The house page is a cabinet with `furniture`, `clothing`, `souvenir` and `postcard` filters. Every card uses a generated asset and code-rendered name, provenance, rarity and actions. Creation accepts one sentence, spends shards only when a result is committed, and returns a manifest-backed item rather than creating arbitrary files at runtime.

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm typecheck`

Manual: generate/fallback one object, find it in storage, equip it, inspect provenance and recycle an unequipped duplicate.

- [ ] **Step 5: Commit**

```bash
git add src/domain/inventory* src/server/creation-ai.ts src/app/api/creation src/app/api/inventory src/app/house src/app/agent/creation src/components/inventory
git commit -m "feat: add creation desk and storage cabinet"
```

### Task 11: Complete showcase surfaces, health and Coze deployment

**Files:**
- Create: `src/app/profile/page.tsx`
- Create: `src/app/routes/page.tsx`
- Create: `src/app/challenges/page.tsx`
- Create: `src/app/postcards/page.tsx`
- Create: `src/components/mobile-shell.tsx`
- Create: `src/server/health.ts`
- Create: `src/app/api/health/route.ts`
- Create: `.coze`
- Create: `scripts/coze-preview-build.sh`, `scripts/coze-preview-run.sh`
- Create: `.cozeproj/scripts/deploy_build.sh`, `.cozeproj/scripts/deploy_run.sh`
- Test: `src/server/health.test.ts`

- [ ] **Step 1: Write failing health tests**

Assert local health reports file storage and optional integrations, while production health is not ready unless database, session, AMap JS/Web and Coze model configuration are detected. Never return secret values.

- [ ] **Step 2: Verify RED**

Run: `pnpm vitest run src/server/health.test.ts`

Expected: FAIL because health inspection is missing.

- [ ] **Step 3: Implement shallow but honest showcase pages**

Routes, challenges and postcards must expose at least one interactive state and link back into the core loop. Profile shows ledger, privacy controls, account recovery and export entry. Labels distinguish “演示内容”, “训练记录” and “真实打卡”.

- [ ] **Step 4: Add Coze scripts**

Build uses `pnpm install --ignore-scripts && pnpm run build`; run uses `next start --hostname 0.0.0.0 --port "${PORT:-5000}"`. `.coze` declares `project_type = "web"` and a service deployment profile.

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Start: `$env:PORT=5000; pnpm start`

Expected: `/api/health` returns `ok: true` locally and no secret values; every bottom-tab and showcase route loads.

- [ ] **Step 6: Commit**

```bash
git add src/app src/components/mobile-shell.tsx src/server/health* .coze .cozeproj scripts
git commit -m "feat: complete demo and coze runtime"
```

### Task 12: End-to-end acceptance and adversarial review

**Files:**
- Create: `tests/e2e/core-loop.spec.ts`
- Create: `tests/e2e/fallbacks.spec.ts`
- Create: `docs/reviews/product-adversarial-review.md`
- Create: `docs/reviews/engineering-adversarial-review.md`
- Modify: implementation files only for findings proven by tests or runtime evidence

- [ ] **Step 1: Write browser acceptance tests**

```ts
test("new player completes the playable loop", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole("button", { name: "ENFP · 追光者" }).click();
  await page.getByRole("button", { name: "开始训练同行" }).click();
  await page.getByRole("button", { name: "领取记忆碎片" }).click();
  await page.getByRole("button", { name: "一起去看看" }).click();
  await page.getByRole("button", { name: "完成训练打卡" }).click();
  await page.getByRole("link", { name: "我的娃屋" }).click();
  await expect(page.getByText("训练所得")).toBeVisible();
});
```

- [ ] **Step 2: Run E2E and fix only proven failures**

Run: `pnpm exec playwright install chromium`

Run: `pnpm test:e2e`

Expected: core loop and fallback tests PASS at mobile and desktop projects.

- [ ] **Step 3: Run adversarial product review**

Review PRD alignment, single-resource discipline, MBTI behavioral impact, dual-character immersion, training/real labeling, storage-cabinet role and full-feature navigation. Record severity, evidence, affected path and resolution.

- [ ] **Step 4: Run adversarial engineering review**

Review secret scanning, route privacy, idempotency, negative balances, session cookies, XSS in model output, AMap/Coze timeouts, mobile accessibility, asset licensing, health truthfulness and deployment scripts.

- [ ] **Step 5: Re-run complete verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`

Run: `git grep -n -E "(NEXT_PUBLIC_AMAP_JS_KEY|NEXT_PUBLIC_AMAP_SECURITY_CODE|AMAP_WEB_SERVICE_KEY)=.+" -- . ":(exclude).env.example"`

Expected: all checks exit `0`; secret scan has no matches; high-priority review findings are closed.

- [ ] **Step 6: Commit**

```bash
git add tests docs/reviews src
git commit -m "test: complete adversarial acceptance"
```

### Task 13: Configure AMap MCP, publish GitHub and deploy Coze

**Files:**
- Modify: narrow local Codex MCP configuration outside the repository
- Create: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Configure AMap MCP without committing the key**

Add a local Streamable HTTP MCP server named `amap-maps-streamableHTTP`. Construct its `https://mcp.amap.com/mcp?key=` URL from the Web Service Key already supplied by the user at configuration time, and do not print or commit the completed URL. Restart or reload Codex, list tools, and call one harmless geocode/POI operation to prove the server is live.

- [ ] **Step 2: Create README and deployment evidence**

Document local setup using variable names only, the training-mode path, AMap domain restrictions, Coze services required, health expectations and the exact acceptance flow.

- [ ] **Step 3: Create and push the GitHub repository**

Use the authenticated GitHub account to create a new repository named `wawu-world-2`, add it as `origin`, and push `main`. Before push, verify `git status --short` is empty and `git log --oneline` contains the reviewed commits.

- [ ] **Step 4: Deploy to Coze**

Create/import an independent Coze Web project, configure AMap and storage/model environment values in the Coze UI, build, publish and wait for the public version. If Coze CLI reports unsupported project type, use the verified Web version-card deployment flow from the reference project.

- [ ] **Step 5: Final public acceptance**

Open the public URL in a clean browser session. Verify `/`, strict onboarding, AMap real map, training fallback, the complete core loop, `/api/health`, mobile viewport and no console errors. Capture the GitHub and Coze URLs plus screenshots.

- [ ] **Step 6: Commit final docs and tag**

```bash
git add README.md .env.example docs
git commit -m "docs: add production handoff"
git tag v0.1.0-demo
git push origin main --tags
```

Stop only when the GitHub repository and Coze public URL are both accessible and the final acceptance evidence is recorded, or when a documented human-only authorization step blocks publication.
