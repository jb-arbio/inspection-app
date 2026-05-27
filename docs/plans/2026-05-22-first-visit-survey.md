# First Visit Survey — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the offline-capable scaffolding for a "First Visit Survey" mode inside a fork of `iuliia-arbio/inspection-app`. Staff can pick a deal from the Onboarding_tool hub, walk a property, see hub-prefilled values, accept or overwrite them, capture media, and submit — with answers and media safely round-tripping back to the hub even across offline gaps.

**Architecture:** Two Supabase clients in one Next.js app. Inspection mode keeps its own anon-access Supabase (untouched). First Visit uses a new authenticated client pointing at the Onboarding_tool hub's Supabase (`onboarding` schema). All First Visit writes go through an IndexedDB outbox so the network is optional. Mapped answers also upsert `onboarding.data_point_values` with `source='staff_first_visit'` on submit, surfacing in the hub's existing conflict UI.

**Tech Stack:**
- Next.js 14 App Router (TypeScript)
- Two Supabase clients (`@supabase/supabase-js`)
- Dexie.js — IndexedDB wrapper
- JSZip — client-side zip export
- next-pwa — service worker / install
- Tailwind CSS + DM Sans (inherited from upstream)
- Vitest + React Testing Library — unit/integration tests
- Playwright — E2E smoke (one happy-path test only for the scaffolding milestone)

**Design source of truth:** `docs/plans/2026-05-22-first-visit-survey-design.md`

**Working repo:** A new fork of `iuliia-arbio/inspection-app`, cloned locally. **Not** the `Onboarding_tool` repo. Phase 1 sets this up.

---

## Phase 1 — Bootstrap

### Task 1: Fork upstream and clone

**Files:** None (shell only).

**Step 1: Fork on GitHub**

```bash
gh repo fork iuliia-arbio/inspection-app --clone=false --org=<your-arbio-org>
```

If `--org` is not appropriate, fork to your user namespace. Expected: a new repo URL like `https://github.com/<owner>/inspection-app`.

**Step 2: Clone the fork next to Onboarding_tool**

```bash
cd /Users/Joshua/Documents/01_Projects
gh repo clone <owner>/inspection-app inspection-app-fork
cd inspection-app-fork
```

**Step 3: Add upstream remote**

```bash
git remote add upstream https://github.com/iuliia-arbio/inspection-app.git
git remote -v
```

Expected output: two remotes, `origin` (fork) and `upstream` (iuliia-arbio).

**Step 4: Install dependencies and verify the app boots**

```bash
npm install
npm run dev
```

Expected: dev server runs on `http://localhost:3000` (upstream default — we won't change it). Mock data renders if no `.env.local` yet.

**Step 5: Create the work branch**

```bash
git checkout -b feature/first-visit-scaffolding
```

**Step 6: Commit a marker (empty) so the branch exists on origin**

```bash
git commit --allow-empty -m "chore: start first visit survey scaffolding"
git push -u origin feature/first-visit-scaffolding
```

---

### Task 2: Install new dependencies

**Files:** `package.json`, `package-lock.json`.

**Step 1: Install runtime deps**

```bash
npm install dexie jszip next-pwa
```

**Step 2: Install dev deps for testing**

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event fake-indexeddb playwright @playwright/test
```

**Step 3: Verify `package.json` has the expected entries**

Open `package.json` and confirm under `dependencies`: `dexie`, `jszip`, `next-pwa`. Under `devDependencies`: `vitest`, `@testing-library/react`, `jsdom`, `fake-indexeddb`, `playwright`.

**Step 4: Add npm scripts**

Modify `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add dexie, jszip, next-pwa, vitest, playwright"
```

---

### Task 3: Configure Vitest

**Files:** Create `vitest.config.ts`, `vitest.setup.ts`.

**Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Install the React plugin:

```bash
npm install -D @vitejs/plugin-react
```

**Step 2: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

**Step 3: Sanity test**

Create `src/lib/firstVisit/__tests__/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 4: Run it**

```bash
npm test
```

Expected: 1 passed.

**Step 5: Commit**

```bash
git add vitest.config.ts vitest.setup.ts src/lib/firstVisit/__tests__/sanity.test.ts package.json package-lock.json
git commit -m "chore: configure vitest with jsdom + fake-indexeddb"
```

---

### Task 4: Create the folder skeleton

**Files:** Create empty index files so directories exist.

**Step 1: Create dirs**

```bash
mkdir -p src/app/first-visit
mkdir -p src/app/api/first-visit
mkdir -p src/lib/firstVisit
mkdir -p src/components/firstVisit
mkdir -p supabase/migrations
```

(`supabase/migrations` already exists; the `-p` is a no-op there.)

**Step 2: Add a placeholder README so empty dirs survive git**

Create `src/lib/firstVisit/README.md`:

```markdown
# firstVisit module

All First Visit Survey code lives here. See docs/plans/2026-05-22-first-visit-survey-design.md.
```

**Step 3: Commit**

```bash
git add src/app/first-visit src/app/api/first-visit src/lib/firstVisit src/components/firstVisit
git commit -m "chore: scaffold first-visit directories"
```

---

## Phase 2 — Two Supabase clients

### Task 5: Add hub Supabase client

**Files:** Create `src/lib/firstVisit/hubSupabase.ts`. Modify `.env.local.example` (create if missing).

**Step 1: Write the failing test**

Create `src/lib/firstVisit/__tests__/hubSupabase.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getHubSupabase } from '../hubSupabase';

describe('getHubSupabase', () => {
  it('returns null when env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_HUB_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY;
    expect(getHubSupabase()).toBeNull();
  });

  it('returns a client when env vars are set', () => {
    process.env.NEXT_PUBLIC_HUB_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY = 'anon-key';
    const client = getHubSupabase();
    expect(client).not.toBeNull();
    expect(typeof client?.from).toBe('function');
  });
});
```

**Step 2: Run — expect failure**

```bash
npm test -- hubSupabase
```

Expected: FAIL "Cannot find module '../hubSupabase'".

**Step 3: Implement**

Create `src/lib/firstVisit/hubSupabase.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _initializedWith: string | null = null;

export function getHubSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  const fingerprint = `${url}::${key}`;
  if (_client && _initializedWith === fingerprint) return _client;
  _client = createClient(url, key, {
    db: { schema: 'onboarding' },
    auth: { persistSession: true, autoRefreshToken: true },
  });
  _initializedWith = fingerprint;
  return _client;
}
```

**Step 4: Run — expect pass**

```bash
npm test -- hubSupabase
```

Expected: 2 passed.

**Step 5: Document env vars**

Create `.env.local.example`:

```
# Inspection mode (upstream)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# First Visit (Onboarding hub)
NEXT_PUBLIC_HUB_SUPABASE_URL=
NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY=
```

**Step 6: Commit**

```bash
git add src/lib/firstVisit/hubSupabase.ts src/lib/firstVisit/__tests__/hubSupabase.test.ts .env.local.example
git commit -m "feat(first-visit): add hub supabase client (onboarding schema)"
```

---

## Phase 3 — Database migrations

### Task 6: Migration — first_visit_inspections

**Files:** Create `supabase/migrations/first_visit_001_inspections.sql`.

**Step 1: Write the SQL**

```sql
-- First Visit Survey — inspections table
-- Run in Onboarding_tool's Supabase project (Studio SQL editor).
-- After applying: NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS onboarding.first_visit_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES onboarding.deals(id) ON DELETE CASCADE,
  location_id UUID REFERENCES onboarding.locations(id) ON DELETE SET NULL,
  unit_category_id UUID REFERENCES onboarding.unit_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','discarded')) DEFAULT 'draft',
  inspector_email TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_first_visit_inspections_inspector
  ON onboarding.first_visit_inspections(inspector_email);
CREATE INDEX IF NOT EXISTS idx_first_visit_inspections_deal
  ON onboarding.first_visit_inspections(deal_id);

ALTER TABLE onboarding.first_visit_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read first_visit_inspections"
  ON onboarding.first_visit_inspections FOR SELECT TO authenticated
  USING (onboarding.is_staff());
CREATE POLICY "Staff insert first_visit_inspections"
  ON onboarding.first_visit_inspections FOR INSERT TO authenticated
  WITH CHECK (onboarding.is_staff());
CREATE POLICY "Staff update first_visit_inspections"
  ON onboarding.first_visit_inspections FOR UPDATE TO authenticated
  USING (onboarding.is_staff());
```

**Step 2: Commit (do not apply yet — runs manually later per migration_workflow memory)**

```bash
git add supabase/migrations/first_visit_001_inspections.sql
git commit -m "feat(first-visit): migration 001 - inspections table"
```

---

### Task 7: Migration — first_visit_answers

**Files:** Create `supabase/migrations/first_visit_002_answers.sql`.

**Step 1: Write the SQL**

```sql
CREATE TABLE IF NOT EXISTS onboarding.first_visit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES onboarding.first_visit_inspections(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  area_key TEXT NOT NULL,
  value JSONB,
  notes TEXT,
  data_point_slug TEXT,  -- resolved to data_point_id at write-back time
  hub_suggestion_snapshot JSONB,
  was_prefilled BOOLEAN NOT NULL DEFAULT false,
  was_accepted_as_is BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  UNIQUE (inspection_id, question_key, area_key)
);

CREATE INDEX IF NOT EXISTS idx_first_visit_answers_inspection
  ON onboarding.first_visit_answers(inspection_id);

ALTER TABLE onboarding.first_visit_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read first_visit_answers"
  ON onboarding.first_visit_answers FOR SELECT TO authenticated
  USING (onboarding.is_staff());
CREATE POLICY "Staff insert first_visit_answers"
  ON onboarding.first_visit_answers FOR INSERT TO authenticated
  WITH CHECK (onboarding.is_staff());
CREATE POLICY "Staff update first_visit_answers"
  ON onboarding.first_visit_answers FOR UPDATE TO authenticated
  USING (onboarding.is_staff());
```

**Step 2: Commit**

```bash
git add supabase/migrations/first_visit_002_answers.sql
git commit -m "feat(first-visit): migration 002 - answers table"
```

---

### Task 8: Migration — first_visit_media

**Files:** Create `supabase/migrations/first_visit_003_media.sql`.

**Step 1: Write the SQL**

```sql
CREATE TABLE IF NOT EXISTS onboarding.first_visit_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES onboarding.first_visit_inspections(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES onboarding.first_visit_answers(id) ON DELETE SET NULL,
  area_key TEXT NOT NULL,
  question_key TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('photo','video','audio')),
  storage_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_first_visit_media_inspection
  ON onboarding.first_visit_media(inspection_id);

ALTER TABLE onboarding.first_visit_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read first_visit_media"
  ON onboarding.first_visit_media FOR SELECT TO authenticated
  USING (onboarding.is_staff());
CREATE POLICY "Staff insert first_visit_media"
  ON onboarding.first_visit_media FOR INSERT TO authenticated
  WITH CHECK (onboarding.is_staff());
CREATE POLICY "Staff update first_visit_media"
  ON onboarding.first_visit_media FOR UPDATE TO authenticated
  USING (onboarding.is_staff());
```

**Step 2: Commit**

```bash
git add supabase/migrations/first_visit_003_media.sql
git commit -m "feat(first-visit): migration 003 - media table"
```

---

### Task 9: Storage buckets (documented, applied manually)

**Files:** Create `supabase/migrations/first_visit_004_storage.md`.

**Step 1: Write apply-instructions**

```markdown
# First Visit — Storage Bucket Setup (manual)

Run in the Onboarding_tool Supabase project, Studio → Storage → New bucket.

| Bucket | Public | Max file size |
|---|---|---|
| `first-visit-photos` | No | 25 MB |
| `first-visit-videos` | No | 200 MB |
| `first-visit-audio` | No | 25 MB |

For each bucket:
- Storage → bucket → Policies → New policy → `INSERT` allowed for authenticated where `onboarding.is_staff()`.
- Same for `SELECT` and `UPDATE`.

Path conventions:
- photos: `{inspection_id}/{answer_id|area_key}/{media_id}.jpg`
- videos: `{inspection_id}/{answer_id|area_key}/{media_id}.{mp4|webm}`
- audio:  `{inspection_id}/{answer_id|area_key}/{media_id}.webm`
```

**Step 2: Commit**

```bash
git add supabase/migrations/first_visit_004_storage.md
git commit -m "docs(first-visit): storage bucket setup instructions"
```

---

## Phase 4 — Auth + middleware + mode picker

### Task 10: Auth middleware

**Files:** Create `middleware.ts` at repo root. Create `src/lib/firstVisit/auth.ts`.

**Step 1: Write the failing test**

Create `src/lib/firstVisit/__tests__/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from '../auth';

describe('isAllowedEmail', () => {
  it('allows arbio.com', () => {
    expect(isAllowedEmail('joshua@arbio.com')).toBe(true);
  });
  it('rejects other domains', () => {
    expect(isAllowedEmail('foo@gmail.com')).toBe(false);
    expect(isAllowedEmail('joshua@arbio-group.com')).toBe(false);  // intentional per memory
  });
  it('rejects empty', () => {
    expect(isAllowedEmail('')).toBe(false);
    expect(isAllowedEmail(undefined as unknown as string)).toBe(false);
  });
});
```

**Step 2: Run — expect failure**

```bash
npm test -- auth
```

**Step 3: Implement**

Create `src/lib/firstVisit/auth.ts`:

```ts
export const ALLOWED_DOMAIN = 'arbio.com';

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const [, domain] = email.split('@');
  return domain?.toLowerCase() === ALLOWED_DOMAIN;
}
```

**Step 4: Run — expect pass**

```bash
npm test -- auth
```

**Step 5: Create `middleware.ts` at repo root**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAllowedEmail } from '@/lib/firstVisit/auth';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Allow auth callback and public assets through.
  if (
    url.pathname.startsWith('/auth/callback') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_HUB_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, o) => res.cookies.set({ name: n, value: v, ...o }),
        remove: (n, o) => res.cookies.set({ name: n, value: '', ...o }),
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/((?!login|auth/callback|_next/static|_next/image|favicon.ico).*)'],
};
```

**Step 6: Install `@supabase/ssr`**

```bash
npm install @supabase/ssr
```

**Step 7: Commit**

```bash
git add middleware.ts src/lib/firstVisit/auth.ts src/lib/firstVisit/__tests__/auth.test.ts package.json package-lock.json
git commit -m "feat(first-visit): auth middleware gates entire app, arbio.com only"
```

---

### Task 11: Login page

**Files:** Create `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`.

**Step 1: Login page**

```tsx
'use client';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_HUB_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY!,
  );

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold">Arbio Inspection</h1>
        <p className="text-sm text-gray-600">Sign in with your @arbio.com account.</p>
        <button
          onClick={signIn}
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
```

**Step 2: Callback route**

Create `src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_HUB_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n) => cookieStore.get(n)?.value,
          set: (n, v, o) => cookieStore.set({ name: n, value: v, ...o }),
          remove: (n, o) => cookieStore.set({ name: n, value: '', ...o }),
        },
      },
    );
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL('/', request.url));
}
```

**Step 3: Manual smoke**

```bash
npm run dev
```

Visit `http://localhost:3000`. Expected: redirect to `/login`. Sign in flow won't work end-to-end without real OAuth config in Supabase yet — that's a deferred env-vars step.

**Step 4: Commit**

```bash
git add src/app/login src/app/auth
git commit -m "feat(first-visit): login page + oauth callback"
```

---

### Task 12: Move inspection root to /inspect, add mode picker

**Files:** Modify `src/app/page.tsx`. Create `src/app/inspect/page.tsx`.

**Step 1: Move existing root content to /inspect**

Read upstream `src/app/page.tsx`:

```tsx
import { getDealsWithApartments } from "@/lib/data";
import DealSelectionClient from "./DealSelectionClient";

export const dynamic = "force-dynamic";

export default async function DealSelectionPage() {
  const deals = await getDealsWithApartments();
  return <DealSelectionClient deals={deals} />;
}
```

Copy that content into `src/app/inspect/page.tsx` (note: `DealSelectionClient` is imported relatively — adjust path):

```tsx
import { getDealsWithApartments } from '@/lib/data';
import DealSelectionClient from '../DealSelectionClient';

export const dynamic = 'force-dynamic';

export default async function InspectModeRoot() {
  const deals = await getDealsWithApartments();
  return <DealSelectionClient deals={deals} />;
}
```

**Step 2: Replace `src/app/page.tsx` with the mode picker**

```tsx
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ModePicker() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="grid w-full max-w-md gap-4">
        <h1 className="text-center text-2xl font-semibold">Arbio Inspection</h1>
        <Link
          href="/inspect"
          className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm hover:bg-gray-50"
        >
          <div className="text-lg font-medium">Inspection</div>
          <div className="text-sm text-gray-500">Recurring property inspection</div>
        </Link>
        <Link
          href="/first-visit"
          className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm hover:bg-gray-50"
        >
          <div className="text-lg font-medium">First Visit Survey</div>
          <div className="text-sm text-gray-500">Pre-takeover property visit</div>
        </Link>
      </div>
    </main>
  );
}
```

**Step 3: Manual smoke**

```bash
npm run dev
```

After login, expected: two cards. Inspection card → goes to `/inspect` and renders upstream's deal list. First Visit card → `/first-visit` → 404 for now.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/app/inspect/page.tsx
git commit -m "feat: mode picker root, move inspection to /inspect"
```

---

## Phase 5 — Local store + outbox

### Task 13: Dexie schema

**Files:** Create `src/lib/firstVisit/db.ts`. Test `src/lib/firstVisit/__tests__/db.test.ts`.

**Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '../db';

describe('localDb', () => {
  beforeEach(async () => {
    await localDb.inspections.clear();
    await localDb.answers.clear();
    await localDb.media.clear();
    await localDb.outbox.clear();
  });

  it('stores and reads an inspection', async () => {
    await localDb.inspections.put({
      id: 'i1',
      deal_id: 'd1',
      status: 'draft',
      inspector_email: 'a@arbio.com',
      started_at: new Date().toISOString(),
    });
    const got = await localDb.inspections.get('i1');
    expect(got?.deal_id).toBe('d1');
  });

  it('enqueues outbox jobs', async () => {
    await localDb.outbox.add({
      kind: 'answer_upsert',
      payload: { foo: 'bar' },
      created_at: Date.now(),
      attempts: 0,
    });
    const jobs = await localDb.outbox.toArray();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe('answer_upsert');
  });
});
```

**Step 2: Run — expect failure**

```bash
npm test -- db.test
```

**Step 3: Implement**

```ts
// src/lib/firstVisit/db.ts
import Dexie, { type Table } from 'dexie';

export type LocalInspection = {
  id: string;
  deal_id: string;
  location_id?: string;
  unit_category_id?: string;
  status: 'draft' | 'submitted' | 'discarded';
  inspector_email: string;
  started_at: string;
  submitted_at?: string;
  synced_at?: string;
};

export type LocalAnswer = {
  id: string;
  inspection_id: string;
  question_key: string;
  area_key: string;
  value: unknown;
  notes?: string;
  data_point_slug?: string;
  hub_suggestion_snapshot?: unknown;
  was_prefilled: boolean;
  was_accepted_as_is: boolean;
  created_at: string;
  updated_at: string;
  synced_at?: string;
};

export type LocalMedia = {
  id: string;
  inspection_id: string;
  answer_id?: string;
  area_key: string;
  question_key?: string;
  kind: 'photo' | 'video' | 'audio';
  blob: Blob;
  content_hash: string;
  size_bytes: number;
  captured_at: string;
  uploaded_at?: string;
  verified_at?: string;
};

export type OutboxJob = {
  id?: number;
  kind: 'inspection_upsert' | 'answer_upsert' | 'media_upload' | 'media_metadata' | 'submit' | 'discard';
  payload: unknown;
  created_at: number;
  attempts: number;
  last_error?: string;
  last_attempt_at?: number;
};

class FirstVisitDexie extends Dexie {
  inspections!: Table<LocalInspection, string>;
  answers!: Table<LocalAnswer, string>;
  media!: Table<LocalMedia, string>;
  outbox!: Table<OutboxJob, number>;

  constructor() {
    super('first_visit');
    this.version(1).stores({
      inspections: 'id, deal_id, status, synced_at',
      answers: 'id, inspection_id, [inspection_id+question_key+area_key], synced_at',
      media: 'id, inspection_id, answer_id, verified_at',
      outbox: '++id, kind, created_at',
    });
  }
}

export const localDb = new FirstVisitDexie();
```

**Step 4: Run — expect pass**

```bash
npm test -- db.test
```

**Step 5: Commit**

```bash
git add src/lib/firstVisit/db.ts src/lib/firstVisit/__tests__/db.test.ts
git commit -m "feat(first-visit): dexie local store schema + outbox"
```

---

### Task 14: Outbox enqueue + drain skeleton

**Files:** Create `src/lib/firstVisit/sync.ts`. Test `src/lib/firstVisit/__tests__/sync.test.ts`.

**Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb } from '../db';
import { enqueue, drainOutbox } from '../sync';

describe('sync engine', () => {
  beforeEach(async () => {
    await localDb.outbox.clear();
  });

  it('enqueues a job', async () => {
    await enqueue('answer_upsert', { foo: 1 });
    const jobs = await localDb.outbox.toArray();
    expect(jobs).toHaveLength(1);
  });

  it('drains jobs by calling the registered handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    await enqueue('answer_upsert', { foo: 1 });
    await drainOutbox({ answer_upsert: handler } as never);
    expect(handler).toHaveBeenCalledOnce();
    expect(await localDb.outbox.count()).toBe(0);
  });

  it('keeps job in outbox on handler failure, increments attempts', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    await enqueue('answer_upsert', { foo: 1 });
    await drainOutbox({ answer_upsert: handler } as never);
    const jobs = await localDb.outbox.toArray();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].attempts).toBe(1);
    expect(jobs[0].last_error).toContain('boom');
  });
});
```

**Step 2: Run — expect failure**

```bash
npm test -- sync.test
```

**Step 3: Implement**

```ts
// src/lib/firstVisit/sync.ts
import { localDb, type OutboxJob } from './db';

export type JobHandlers = Record<OutboxJob['kind'], (payload: unknown) => Promise<void>>;

export async function enqueue(kind: OutboxJob['kind'], payload: unknown): Promise<void> {
  await localDb.outbox.add({
    kind,
    payload,
    created_at: Date.now(),
    attempts: 0,
  });
}

export async function drainOutbox(handlers: JobHandlers): Promise<void> {
  const jobs = await localDb.outbox.orderBy('created_at').toArray();
  for (const job of jobs) {
    const handler = handlers[job.kind];
    if (!handler) continue;
    try {
      await handler(job.payload);
      await localDb.outbox.delete(job.id!);
    } catch (err) {
      await localDb.outbox.update(job.id!, {
        attempts: job.attempts + 1,
        last_error: err instanceof Error ? err.message : String(err),
        last_attempt_at: Date.now(),
      });
    }
  }
}

export async function outboxCount(): Promise<number> {
  return localDb.outbox.count();
}
```

**Step 4: Run — expect pass**

```bash
npm test -- sync.test
```

**Step 5: Commit**

```bash
git add src/lib/firstVisit/sync.ts src/lib/firstVisit/__tests__/sync.test.ts
git commit -m "feat(first-visit): outbox enqueue + drain with retry tracking"
```

---

### Task 15: useOnlineStatus + sync trigger hooks

**Files:** Create `src/lib/firstVisit/useSyncEngine.ts`. Test `src/lib/firstVisit/__tests__/useSyncEngine.test.tsx`.

**Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../useSyncEngine';

describe('useOnlineStatus', () => {
  it('starts with navigator.onLine value', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(navigator.onLine);
  });

  it('updates on offline/online events', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/lib/firstVisit/useSyncEngine.ts
'use client';
import { useEffect, useState, useCallback } from 'react';
import { drainOutbox, outboxCount, type JobHandlers } from './sync';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function useSyncEngine(handlers: JobHandlers): {
  pending: number;
  syncNow: () => Promise<void>;
  syncing: boolean;
} {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const online = useOnlineStatus();

  const refresh = useCallback(async () => {
    setPending(await outboxCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await drainOutbox(handlers);
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [handlers, syncing, refresh]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (online) syncNow().catch(() => {});
  }, [online, syncNow]);

  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) syncNow().catch(() => {});
    }, 30_000);
    const onFocus = () => {
      if (navigator.onLine) syncNow().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncNow]);

  return { pending, syncNow, syncing };
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/lib/firstVisit/useSyncEngine.ts src/lib/firstVisit/__tests__/useSyncEngine.test.tsx
git commit -m "feat(first-visit): online status hook + sync engine"
```

---

## Phase 6 — Activity log helper + write-back

### Task 16: Copy logValueSubmitted helper

**Files:** Create `src/lib/firstVisit/activityLog.ts`. Test `src/lib/firstVisit/__tests__/activityLog.test.ts`.

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { logValueSubmitted } from '../activityLog';

describe('logValueSubmitted', () => {
  it('inserts a value_submitted activity row', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) };
    await logValueSubmitted(supabase as never, {
      data_point_id: 'dp-1',
      scope_id: 'sc-1',
      source: 'staff_first_visit',
      value: 'King',
      actor_name: 'a@arbio.com',
    });
    expect(supabase.from).toHaveBeenCalledWith('activity_log');
    expect(insert).toHaveBeenCalledWith({
      data_point_id: 'dp-1',
      scope_id: 'sc-1',
      event_type: 'value_submitted',
      actor_name: 'a@arbio.com',
      detail: { source: 'staff_first_visit', value: 'King' },
    });
  });

  it('never throws on error', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) };
    await expect(
      logValueSubmitted(supabase as never, {
        data_point_id: 'dp-1',
        scope_id: 'sc-1',
        source: 'staff_first_visit',
        value: 'King',
        actor_name: 'a@arbio.com',
      }),
    ).resolves.toBeUndefined();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement (verbatim copy from Onboarding_tool `src/lib/data-room/activity-log.ts`)**

```ts
// src/lib/firstVisit/activityLog.ts
// Copied from Onboarding_tool/src/lib/data-room/activity-log.ts.
// Source of truth lives in the hub repo; this is a verbatim copy because
// the fork can't import across repos. Keep in sync if the upstream helper changes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function logValueSubmitted(
  supabase: SupabaseLike,
  args: {
    data_point_id: string;
    scope_id: string;
    source: string;
    value: unknown;
    actor_name: string;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from('activity_log').insert({
      data_point_id: args.data_point_id,
      scope_id: args.scope_id,
      event_type: 'value_submitted',
      actor_name: args.actor_name,
      detail: { source: args.source, value: args.value },
    });
    if (error) {
      console.error(
        `[activity-log] insert failed for dp=${args.data_point_id} scope=${args.scope_id}: ${error.message}`,
      );
    }
  } catch (err) {
    console.error('[activity-log] insert threw:', err);
  }
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/lib/firstVisit/activityLog.ts src/lib/firstVisit/__tests__/activityLog.test.ts
git commit -m "feat(first-visit): copy logValueSubmitted helper from onboarding repo"
```

---

### Task 17: Scope resolver

**Files:** Create `src/lib/firstVisit/resolveScope.ts`. Test `src/lib/firstVisit/__tests__/resolveScope.test.ts`.

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveScopeId } from '../resolveScope';

const ctx = { deal_id: 'd', location_id: 'l', unit_category_id: 'u' };

describe('resolveScopeId', () => {
  it('returns deal_id for deal level', () => {
    expect(resolveScopeId('deal', ctx)).toBe('d');
  });
  it('returns unit_category_id for unit/property/listing levels', () => {
    expect(resolveScopeId('unit', ctx)).toBe('u');
    expect(resolveScopeId('property', ctx)).toBe('u');
    expect(resolveScopeId('listing', ctx)).toBe('u');
  });
  it('returns null for unsupported level', () => {
    expect(resolveScopeId('owner', ctx)).toBeNull();
    expect(resolveScopeId('reservation', ctx)).toBeNull();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/lib/firstVisit/resolveScope.ts
export type DataPointLevel =
  | 'deal' | 'property' | 'owner' | 'unit' | 'listing' | 'reservation';

export type InspectionScopeContext = {
  deal_id: string;
  location_id?: string;
  unit_category_id?: string;
};

export function resolveScopeId(
  level: DataPointLevel,
  ctx: InspectionScopeContext,
): string | null {
  switch (level) {
    case 'deal':
      return ctx.deal_id;
    case 'property':
    case 'unit':
    case 'listing':
      return ctx.unit_category_id ?? null;
    case 'owner':
    case 'reservation':
      // Not addressed in v1 — see design doc §20.4.
      return null;
  }
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/lib/firstVisit/resolveScope.ts src/lib/firstVisit/__tests__/resolveScope.test.ts
git commit -m "feat(first-visit): scope_id resolver per data_points.level"
```

---

## Phase 7 — Question config + types

### Task 18: Question config type + dev sample

**Files:** Create `src/lib/firstVisit/questions.ts`. Test `src/lib/firstVisit/__tests__/questions.test.ts`.

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DEV_QUESTIONS, byArea } from '../questions';

describe('DEV_QUESTIONS', () => {
  it('contains all four field types', () => {
    const types = new Set(DEV_QUESTIONS.map((q) => q.field_type));
    expect(types).toEqual(new Set(['text', 'number', 'select', 'boolean']));
  });

  it('byArea groups questions and preserves order', () => {
    const grouped = byArea(DEV_QUESTIONS);
    const areaKeys = Object.keys(grouped);
    expect(areaKeys.length).toBeGreaterThan(0);
    for (const key of areaKeys) {
      const orders = grouped[key].map((q) => q.order);
      const sorted = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sorted);
    }
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/lib/firstVisit/questions.ts
export type FieldType = 'text' | 'number' | 'select' | 'boolean';

export type FirstVisitQuestion = {
  question_key: string;
  area_key: string;
  label: string;
  field_type: FieldType;
  choices?: { value: string; label: string }[];
  validation?: { min?: number; max?: number; pattern?: string; required?: boolean };
  data_point_slug?: string;
  evidence?: {
    photo?: 'required' | 'optional';
    video?: 'required' | 'optional';
    audio?: 'optional';
  };
  order: number;
  group?: string;
};

// Dev/sample config — proves all field types render. Real list comes from product.
export const DEV_QUESTIONS: FirstVisitQuestion[] = [
  {
    question_key: 'wifi_password',
    area_key: 'access',
    label: 'WiFi password',
    field_type: 'text',
    order: 1,
    evidence: { photo: 'optional' },
  },
  {
    question_key: 'beds_count',
    area_key: 'bedroom',
    label: 'Number of beds',
    field_type: 'number',
    validation: { min: 0, max: 20 },
    order: 1,
  },
  {
    question_key: 'stovetop_type',
    area_key: 'kitchen',
    label: 'Stovetop type',
    field_type: 'select',
    choices: [
      { value: 'induction', label: 'Induction' },
      { value: 'gas', label: 'Gas' },
      { value: 'electric', label: 'Electric (coil/ceramic)' },
    ],
    order: 1,
    evidence: { photo: 'required' },
  },
  {
    question_key: 'smoke_detector_present',
    area_key: 'safety',
    label: 'Smoke detector present and working',
    field_type: 'boolean',
    order: 1,
    evidence: { photo: 'required', video: 'optional' },
  },
];

export function byArea(qs: FirstVisitQuestion[]): Record<string, FirstVisitQuestion[]> {
  const out: Record<string, FirstVisitQuestion[]> = {};
  for (const q of qs) (out[q.area_key] ||= []).push(q);
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.order - b.order);
  return out;
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/lib/firstVisit/questions.ts src/lib/firstVisit/__tests__/questions.test.ts
git commit -m "feat(first-visit): question config type + dev sample (4 field types)"
```

---

## Phase 8 — PrefilledField primitive

### Task 19: PrefilledField — empty state

**Files:** Create `src/components/firstVisit/PrefilledField.tsx`. Test `src/components/firstVisit/__tests__/PrefilledField.empty.test.tsx`.

**Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';

describe('PrefilledField — empty', () => {
  it('renders empty input when no hub value', async () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={{
          question_key: 'wifi',
          area_key: 'a',
          label: 'WiFi',
          field_type: 'text',
          order: 1,
        }}
        hubValue={undefined}
        value=""
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('WiFi')).toHaveValue('');
    expect(screen.queryByText(/Pre-filled/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Accept/i })).toBeNull();
    await userEvent.type(screen.getByLabelText('WiFi'), 'foo');
    expect(onChange).toHaveBeenCalled();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement skeleton (text only, no prefill behavior yet)**

```tsx
// src/components/firstVisit/PrefilledField.tsx
'use client';
import type { FirstVisitQuestion } from '@/lib/firstVisit/questions';

export type PrefilledFieldProps = {
  question: FirstVisitQuestion;
  hubValue: unknown | undefined;
  value: unknown;
  onChange: (next: { value: unknown; wasAcceptedAsIs: boolean }) => void;
};

export function PrefilledField({ question, hubValue, value, onChange }: PrefilledFieldProps) {
  const hasHub = hubValue !== undefined && hubValue !== null && hubValue !== '';
  const id = `q-${question.question_key}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{question.label}</label>
      {hasHub && (
        <div className="flex items-center gap-2 rounded bg-yellow-50 px-2 py-1 text-xs">
          <span className="rounded bg-yellow-200 px-1 py-0.5">Pre-filled</span>
          <span className="text-yellow-900">{String(hubValue)}</span>
          <button
            type="button"
            className="ml-auto rounded bg-yellow-200 px-2 py-0.5"
            onClick={() => onChange({ value: hubValue, wasAcceptedAsIs: true })}
          >
            Accept
          </button>
        </div>
      )}
      <input
        id={id}
        className="rounded border border-gray-300 px-2 py-1"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange({ value: e.target.value, wasAcceptedAsIs: false })}
      />
    </div>
  );
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/components/firstVisit/PrefilledField.tsx src/components/firstVisit/__tests__/PrefilledField.empty.test.tsx
git commit -m "feat(first-visit): PrefilledField empty state"
```

---

### Task 20: PrefilledField — Accept

**Files:** Add `src/components/firstVisit/__tests__/PrefilledField.accept.test.tsx`.

**Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';

describe('PrefilledField — accept', () => {
  it('renders hub value as a "Pre-filled" badge with Accept', () => {
    render(
      <PrefilledField
        question={{
          question_key: 'wifi',
          area_key: 'a',
          label: 'WiFi',
          field_type: 'text',
          order: 1,
        }}
        hubValue="HelloRouter"
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/Pre-filled/i)).toBeInTheDocument();
    expect(screen.getByText('HelloRouter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
  });

  it('calls onChange with wasAcceptedAsIs=true when Accept clicked', async () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={{
          question_key: 'wifi',
          area_key: 'a',
          label: 'WiFi',
          field_type: 'text',
          order: 1,
        }}
        hubValue="HelloRouter"
        value=""
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Accept/i }));
    expect(onChange).toHaveBeenCalledWith({
      value: 'HelloRouter',
      wasAcceptedAsIs: true,
    });
  });

  it('typing a different value calls onChange with wasAcceptedAsIs=false', async () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={{
          question_key: 'wifi',
          area_key: 'a',
          label: 'WiFi',
          field_type: 'text',
          order: 1,
        }}
        hubValue="HelloRouter"
        value=""
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByLabelText('WiFi'), 'x');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ wasAcceptedAsIs: false }));
  });
});
```

**Step 2: Run — expect pass** (already implemented in Task 19's skeleton)

**Step 3: Commit**

```bash
git add src/components/firstVisit/__tests__/PrefilledField.accept.test.tsx
git commit -m "test(first-visit): PrefilledField accept + edit behaviors"
```

---

### Task 21: PrefilledField — number, select, boolean

**Files:** Modify `src/components/firstVisit/PrefilledField.tsx`. Add `src/components/firstVisit/__tests__/PrefilledField.types.test.tsx`.

**Step 1: Failing tests**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrefilledField } from '../PrefilledField';

describe('PrefilledField — field types', () => {
  it('number renders a numeric input', () => {
    render(
      <PrefilledField
        question={{ question_key: 'q', area_key: 'a', label: 'Count', field_type: 'number', order: 1 }}
        hubValue={undefined}
        value={3}
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Count') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.value).toBe('3');
  });

  it('select renders option list', async () => {
    render(
      <PrefilledField
        question={{
          question_key: 'q',
          area_key: 'a',
          label: 'Type',
          field_type: 'select',
          choices: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
          order: 1,
        }}
        hubValue={undefined}
        value=""
        onChange={() => {}}
      />,
    );
    const sel = screen.getByLabelText('Type') as HTMLSelectElement;
    expect(sel.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
  });

  it('boolean renders yes/no toggle', () => {
    render(
      <PrefilledField
        question={{ question_key: 'q', area_key: 'a', label: 'Working', field_type: 'boolean', order: 1 }}
        hubValue={undefined}
        value={false}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Yes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run — expect failures**

**Step 3: Extend implementation**

Replace the single `<input>` in `PrefilledField` with a type-switch:

```tsx
// inside PrefilledField return, replacing the existing <input>
{question.field_type === 'text' && (
  <input
    id={id}
    className="rounded border border-gray-300 px-2 py-1"
    value={value == null ? '' : String(value)}
    onChange={(e) => onChange({ value: e.target.value, wasAcceptedAsIs: false })}
  />
)}
{question.field_type === 'number' && (
  <input
    id={id}
    type="number"
    className="rounded border border-gray-300 px-2 py-1"
    value={value == null ? '' : String(value)}
    onChange={(e) =>
      onChange({ value: e.target.value === '' ? null : Number(e.target.value), wasAcceptedAsIs: false })
    }
  />
)}
{question.field_type === 'select' && (
  <select
    id={id}
    className="rounded border border-gray-300 px-2 py-1"
    value={value == null ? '' : String(value)}
    onChange={(e) => onChange({ value: e.target.value, wasAcceptedAsIs: false })}
  >
    <option value="" />
    {(question.choices ?? []).map((c) => (
      <option key={c.value} value={c.value}>{c.label}</option>
    ))}
  </select>
)}
{question.field_type === 'boolean' && (
  <div className="flex gap-2">
    <button
      type="button"
      aria-pressed={value === true}
      className={`rounded px-3 py-1 ${value === true ? 'bg-black text-white' : 'border border-gray-300'}`}
      onClick={() => onChange({ value: true, wasAcceptedAsIs: false })}
    >
      Yes
    </button>
    <button
      type="button"
      aria-pressed={value === false}
      className={`rounded px-3 py-1 ${value === false ? 'bg-black text-white' : 'border border-gray-300'}`}
      onClick={() => onChange({ value: false, wasAcceptedAsIs: false })}
    >
      No
    </button>
  </div>
)}
```

**Step 4: Run — expect all PrefilledField tests pass**

**Step 5: Commit**

```bash
git add src/components/firstVisit/PrefilledField.tsx src/components/firstVisit/__tests__/PrefilledField.types.test.tsx
git commit -m "feat(first-visit): PrefilledField supports number, select, boolean"
```

---

## Phase 9 — Server API routes (hub side)

### Task 22: POST /api/first-visit/inspections

**Files:** Create `src/app/api/first-visit/inspections/route.ts`. Test via Vitest with mocked Supabase.

**Step 1: Failing test**

Create `src/app/api/first-visit/inspections/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({
  getHubSupabase: vi.fn(),
}));

import { POST } from '../route';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

describe('POST /api/first-visit/inspections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts an inspection row', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    (getHubSupabase as never as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert }),
      auth: { getUser: () => ({ data: { user: { email: 'a@arbio.com' } } }) },
    });

    const req = new Request('http://x/api/first-visit/inspections', {
      method: 'POST',
      body: JSON.stringify({
        id: 'i1', deal_id: 'd1', location_id: 'l1',
        unit_category_id: 'u1', status: 'draft',
        started_at: new Date().toISOString(),
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalled();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/app/api/first-visit/inspections/route.ts
import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

export async function POST(req: Request) {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const body = await req.json();
  const row = {
    id: body.id,
    deal_id: body.deal_id,
    location_id: body.location_id ?? null,
    unit_category_id: body.unit_category_id ?? null,
    status: body.status ?? 'draft',
    inspector_email: user.email,
    started_at: body.started_at ?? new Date().toISOString(),
    submitted_at: body.submitted_at ?? null,
  };
  const { error } = await supabase.from('first_visit_inspections').upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/app/api/first-visit/inspections
git commit -m "feat(first-visit): POST /api/first-visit/inspections"
```

---

### Task 23: POST /api/first-visit/answers

**Files:** Create `src/app/api/first-visit/answers/route.ts`. Test similarly.

**Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({ getHubSupabase: vi.fn() }));

import { POST } from '../route';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

describe('POST /api/first-visit/answers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts answer keyed by (inspection_id, question_key, area_key)', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    (getHubSupabase as never as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert }),
      auth: { getUser: () => ({ data: { user: { email: 'a@arbio.com' } } }) },
    });

    const req = new Request('http://x/api/first-visit/answers', {
      method: 'POST',
      body: JSON.stringify({
        id: 'ans1', inspection_id: 'i1', question_key: 'wifi',
        area_key: 'access', value: 'pw',
        was_prefilled: false, was_accepted_as_is: false,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalled();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/app/api/first-visit/answers/route.ts
import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

export async function POST(req: Request) {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const a = await req.json();
  const row = {
    id: a.id,
    inspection_id: a.inspection_id,
    question_key: a.question_key,
    area_key: a.area_key,
    value: a.value ?? null,
    notes: a.notes ?? null,
    data_point_slug: a.data_point_slug ?? null,
    hub_suggestion_snapshot: a.hub_suggestion_snapshot ?? null,
    was_prefilled: !!a.was_prefilled,
    was_accepted_as_is: !!a.was_accepted_as_is,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('first_visit_answers')
    .upsert(row, { onConflict: 'inspection_id,question_key,area_key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/app/api/first-visit/answers
git commit -m "feat(first-visit): POST /api/first-visit/answers"
```

---

### Task 24: POST /api/first-visit/media/upload-url

**Files:** Create `src/app/api/first-visit/media/upload-url/route.ts`.

**Step 1: Implement (with one happy-path test)**

```ts
// src/app/api/first-visit/media/upload-url/route.ts
import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { randomUUID } from 'crypto';

const BUCKETS: Record<string, string> = {
  photo: 'first-visit-photos',
  video: 'first-visit-videos',
  audio: 'first-visit-audio',
};
const EXTS: Record<string, string> = {
  photo: 'jpg',
  video: 'mp4',
  audio: 'webm',
};

export async function POST(req: Request) {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { inspection_id, kind, content_hash } = await req.json();
  const bucket = BUCKETS[kind];
  if (!bucket) return NextResponse.json({ error: 'bad-kind' }, { status: 400 });

  const media_id = randomUUID();
  const path = `${inspection_id}/${media_id}.${EXTS[kind]}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    media_id,
    storage_path: path,
    bucket,
    signed_url: data.signedUrl,
    token: data.token,
    content_hash,
  });
}
```

**Step 2: Smoke test (manual, since storage SDK is hard to mock cleanly)**

For now skip a unit test; integration coverage comes in Phase 13.

**Step 3: Commit**

```bash
git add src/app/api/first-visit/media/upload-url
git commit -m "feat(first-visit): signed upload URL endpoint"
```

---

### Task 25: POST /api/first-visit/media (metadata)

**Files:** Create `src/app/api/first-visit/media/route.ts`.

**Step 1: Implement**

```ts
// src/app/api/first-visit/media/route.ts
import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

export async function POST(req: Request) {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const m = await req.json();
  const BUCKETS: Record<string, string> = {
    photo: 'first-visit-photos',
    video: 'first-visit-videos',
    audio: 'first-visit-audio',
  };

  // Verify upload exists in storage (HEAD via list).
  const folder = m.storage_path.split('/').slice(0, -1).join('/');
  const filename = m.storage_path.split('/').pop();
  const { data: listed, error: listErr } = await supabase.storage
    .from(BUCKETS[m.kind])
    .list(folder, { search: filename });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const match = listed?.find((f) => f.name === filename);
  if (!match) return NextResponse.json({ error: 'not-uploaded' }, { status: 400 });
  // Storage list returns metadata in `metadata.size` for newer SDKs.
  const sizeOk = !m.size_bytes || match.metadata?.size === m.size_bytes;
  if (!sizeOk) return NextResponse.json({ error: 'size-mismatch' }, { status: 400 });

  const { error } = await supabase.from('first_visit_media').insert({
    id: m.id,
    inspection_id: m.inspection_id,
    answer_id: m.answer_id ?? null,
    area_key: m.area_key,
    question_key: m.question_key ?? null,
    kind: m.kind,
    storage_path: m.storage_path,
    content_hash: m.content_hash,
    size_bytes: m.size_bytes,
    captured_at: m.captured_at,
    uploaded_at: new Date().toISOString(),
    verified_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/first-visit/media/route.ts
git commit -m "feat(first-visit): media metadata endpoint with upload verification"
```

---

### Task 26: POST /api/first-visit/submit

**Files:** Create `src/app/api/first-visit/submit/route.ts`. Test `src/app/api/first-visit/submit/__tests__/route.test.ts`.

**Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firstVisit/hubSupabase', () => ({ getHubSupabase: vi.fn() }));
vi.mock('@/lib/firstVisit/activityLog', () => ({ logValueSubmitted: vi.fn() }));

import { POST } from '../route';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { logValueSubmitted } from '@/lib/firstVisit/activityLog';

describe('POST /api/first-visit/submit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes data_point_values for mapped answers and logs activity', async () => {
    const inspectionRow = { id: 'i1', deal_id: 'd1', unit_category_id: 'u1' };
    const answerRows = [
      { question_key: 'beds', value: 2, data_point_slug: 'beds-count' },
      { question_key: 'wifi', value: 'pw', data_point_slug: null },
    ];
    const dpRow = { id: 'dp1', slug: 'beds-count', level: 'unit' };

    const from = vi.fn((table: string) => {
      if (table === 'first_visit_inspections') {
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          select: () => ({ eq: () => ({ single: () => ({ data: inspectionRow, error: null }) }) }),
        };
      }
      if (table === 'first_visit_answers') {
        return { select: () => ({ eq: () => ({ data: answerRows, error: null }) }) };
      }
      if (table === 'data_points') {
        return { select: () => ({ in: () => ({ data: [dpRow], error: null }) }) };
      }
      if (table === 'data_point_values') {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    (getHubSupabase as never as ReturnType<typeof vi.fn>).mockReturnValue({
      from,
      auth: { getUser: () => ({ data: { user: { email: 'a@arbio.com' } } }) },
    });

    const req = new Request('http://x/api/first-visit/submit', {
      method: 'POST',
      body: JSON.stringify({ inspection_id: 'i1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(logValueSubmitted).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/app/api/first-visit/submit/route.ts
import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { logValueSubmitted } from '@/lib/firstVisit/activityLog';
import { resolveScopeId, type DataPointLevel } from '@/lib/firstVisit/resolveScope';

export async function POST(req: Request) {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { inspection_id } = await req.json();

  const { data: inspection, error: iErr } = await supabase
    .from('first_visit_inspections')
    .select('id, deal_id, location_id, unit_category_id')
    .eq('id', inspection_id)
    .single();
  if (iErr || !inspection) return NextResponse.json({ error: 'no-inspection' }, { status: 404 });

  const { data: answers, error: aErr } = await supabase
    .from('first_visit_answers')
    .select('question_key, area_key, value, data_point_slug')
    .eq('inspection_id', inspection_id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const slugs = (answers ?? [])
    .map((a) => a.data_point_slug)
    .filter((s): s is string => !!s);
  let dataPoints: { id: string; slug: string; level: DataPointLevel }[] = [];
  if (slugs.length > 0) {
    const { data, error } = await supabase
      .from('data_points')
      .select('id, slug, level')
      .in('slug', slugs);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    dataPoints = data ?? [];
  }
  const slugToDp = Object.fromEntries(dataPoints.map((dp) => [dp.slug, dp]));

  const ctx = {
    deal_id: inspection.deal_id,
    location_id: inspection.location_id ?? undefined,
    unit_category_id: inspection.unit_category_id ?? undefined,
  };

  for (const a of answers ?? []) {
    if (!a.data_point_slug) continue;
    const dp = slugToDp[a.data_point_slug];
    if (!dp) continue;
    const scope_id = resolveScopeId(dp.level, ctx);
    if (!scope_id) continue;

    const { error: upErr } = await supabase
      .from('data_point_values')
      .upsert({
        data_point_id: dp.id,
        scope_id,
        source: 'staff_first_visit',
        value: a.value,
      }, { onConflict: 'data_point_id,scope_id,source' });
    if (upErr) continue;

    await logValueSubmitted(supabase, {
      data_point_id: dp.id,
      scope_id,
      source: 'staff_first_visit',
      value: a.value,
      actor_name: user.email!,
    });
  }

  const { error: subErr } = await supabase
    .from('first_visit_inspections')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', inspection_id);
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/app/api/first-visit/submit
git commit -m "feat(first-visit): submit endpoint writes back to data_point_values"
```

---

## Phase 10 — Outbox handlers

### Task 27: Wire outbox handlers to API routes

**Files:** Create `src/lib/firstVisit/handlers.ts`. Test `src/lib/firstVisit/__tests__/handlers.test.ts`.

**Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHandlers } from '../handlers';

describe('handlers', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('answer_upsert POSTs to /api/first-visit/answers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }) as never,
    );
    const handlers = createHandlers();
    await handlers.answer_upsert({ id: 'a1' });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/first-visit/answers',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on non-200 so outbox retains the job', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 }) as never,
    );
    const handlers = createHandlers();
    await expect(handlers.answer_upsert({ id: 'a1' })).rejects.toThrow();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/lib/firstVisit/handlers.ts
import { localDb } from './db';
import type { JobHandlers } from './sync';

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${await res.text()}`);
  return res.json();
}

export function createHandlers(): JobHandlers {
  return {
    inspection_upsert: async (p) => { await postJSON('/api/first-visit/inspections', p); },
    answer_upsert: async (p) => {
      await postJSON('/api/first-visit/answers', p);
      const a = p as { id: string };
      await localDb.answers.update(a.id, { synced_at: new Date().toISOString() });
    },
    media_upload: async (p) => {
      const { media_id, inspection_id, kind, content_hash, size_bytes } = p as {
        media_id: string; inspection_id: string; kind: 'photo'|'video'|'audio';
        content_hash: string; size_bytes: number;
      };
      const local = await localDb.media.get(media_id);
      if (!local) return;
      const { signed_url, storage_path } = await postJSON(
        '/api/first-visit/media/upload-url',
        { inspection_id, kind, content_hash },
      );
      const put = await fetch(signed_url, { method: 'PUT', body: local.blob });
      if (!put.ok) throw new Error(`PUT failed ${put.status}`);
      await postJSON('/api/first-visit/media', {
        id: media_id,
        inspection_id,
        answer_id: local.answer_id,
        area_key: local.area_key,
        question_key: local.question_key,
        kind,
        storage_path,
        content_hash,
        size_bytes,
        captured_at: local.captured_at,
      });
      await localDb.media.update(media_id, {
        uploaded_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      });
    },
    media_metadata: async () => { /* handled inside media_upload */ },
    submit: async (p) => { await postJSON('/api/first-visit/submit', p); },
    discard: async () => { /* future */ },
  };
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```bash
git add src/lib/firstVisit/handlers.ts src/lib/firstVisit/__tests__/handlers.test.ts
git commit -m "feat(first-visit): outbox handlers wired to API routes"
```

---

## Phase 11 — Hub deal data fetcher (server side)

### Task 28: Deal list + deal snapshot endpoints

**Files:** Create `src/app/api/first-visit/deals/route.ts`, `src/app/api/first-visit/deals/[dealId]/snapshot/route.ts`.

**Step 1: Deal list**

```ts
// src/app/api/first-visit/deals/route.ts
import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

export async function GET() {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });
  const { data, error } = await supabase
    .from('deals')
    .select('id, name, created_at')  // adjust columns once verified against the live schema
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data ?? [] });
}
```

**Step 2: Snapshot endpoint**

```ts
// src/app/api/first-visit/deals/[dealId]/snapshot/route.ts
import { NextResponse } from 'next/server';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';

export async function GET(_req: Request, { params }: { params: { dealId: string } }) {
  const supabase = getHubSupabase();
  if (!supabase) return NextResponse.json({ error: 'no-hub' }, { status: 500 });

  const { data: deal } = await supabase
    .from('deals').select('*').eq('id', params.dealId).single();
  const { data: locations } = await supabase
    .from('locations').select('*').eq('deal_id', params.dealId);
  const { data: units } = await supabase
    .from('unit_categories').select('*').eq('deal_id', params.dealId);
  const { data: values } = await supabase
    .from('data_point_values')
    .select('data_point_id, scope_id, source, value, submitted_at')
    .in('scope_id', [
      params.dealId,
      ...(locations ?? []).map((l) => l.id),
      ...(units ?? []).map((u) => u.id),
    ]);
  const { data: points } = await supabase
    .from('data_points').select('id, slug, level');

  return NextResponse.json({ deal, locations, units, values, points });
}
```

**Step 3: Smoke note** — leave untested at unit level; covered by manual smoke in Phase 13.

**Step 4: Commit**

```bash
git add src/app/api/first-visit/deals
git commit -m "feat(first-visit): deal list + snapshot endpoints"
```

---

## Phase 12 — First Visit UI flow

### Task 29: /first-visit landing page

**Files:** Create `src/app/first-visit/page.tsx`, `src/app/first-visit/MyVisits.tsx`.

**Step 1: Landing page (server)**

```tsx
// src/app/first-visit/page.tsx
import Link from 'next/link';
import MyVisits from './MyVisits';

export const dynamic = 'force-dynamic';

export default function FirstVisitLanding() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">First Visit Survey</h1>
      <Link
        href="/first-visit/new"
        className="mt-4 block rounded-md bg-black px-4 py-2 text-center text-white"
      >
        Start a new visit
      </Link>
      <h2 className="mt-8 text-sm font-medium text-gray-600">My visits</h2>
      <MyVisits />
    </main>
  );
}
```

**Step 2: MyVisits (client, reads Dexie)**

```tsx
// src/app/first-visit/MyVisits.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { localDb, type LocalInspection } from '@/lib/firstVisit/db';

export default function MyVisits() {
  const [rows, setRows] = useState<LocalInspection[]>([]);
  useEffect(() => {
    localDb.inspections.toArray().then(setRows);
  }, []);
  if (rows.length === 0) return <p className="mt-2 text-sm text-gray-500">No visits yet.</p>;
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded border border-gray-200 p-3">
          <Link href={`/first-visit/${r.deal_id}/${r.id}`} className="block">
            <div className="text-sm font-medium">Deal {r.deal_id.slice(0, 8)}…</div>
            <div className="text-xs text-gray-500">
              {r.status} · started {new Date(r.started_at).toLocaleDateString()}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/first-visit/page.tsx src/app/first-visit/MyVisits.tsx
git commit -m "feat(first-visit): landing page + my visits list"
```

---

### Task 30: /first-visit/new — deal picker

**Files:** Create `src/app/first-visit/new/page.tsx`, `src/app/first-visit/new/DealPicker.tsx`.

**Step 1: Server page**

```tsx
// src/app/first-visit/new/page.tsx
import DealPicker from './DealPicker';

export const dynamic = 'force-dynamic';

async function getDeals() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/first-visit/deals`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const { deals } = await res.json();
  return deals as { id: string; name: string }[];
}

export default async function NewVisitPage() {
  const deals = await getDeals();
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Pick a deal</h1>
      <DealPicker deals={deals} />
    </main>
  );
}
```

**Step 2: Client component**

```tsx
// src/app/first-visit/new/DealPicker.tsx
'use client';
import { useRouter } from 'next/navigation';

export default function DealPicker({ deals }: { deals: { id: string; name: string }[] }) {
  const router = useRouter();
  if (deals.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No deals available (or offline).</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {deals.map((d) => (
        <li key={d.id}>
          <button
            onClick={() => router.push(`/first-visit/${d.id}`)}
            className="block w-full rounded border border-gray-200 p-3 text-left"
          >
            <div className="text-sm font-medium">{d.name}</div>
            <div className="text-xs text-gray-500">{d.id}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/first-visit/new
git commit -m "feat(first-visit): deal picker page (online required)"
```

---

### Task 31: /first-visit/[dealId] — unit picker + snapshot fetch

**Files:** Create `src/app/first-visit/[dealId]/page.tsx`, `src/app/first-visit/[dealId]/UnitPicker.tsx`.

**Step 1: Server page**

```tsx
// src/app/first-visit/[dealId]/page.tsx
import UnitPicker from './UnitPicker';

export const dynamic = 'force-dynamic';

async function getSnapshot(dealId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/first-visit/deals/${dealId}/snapshot`,
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function DealPage({ params }: { params: { dealId: string } }) {
  const snap = await getSnapshot(params.dealId);
  if (!snap) return <main className="p-6">Deal not found.</main>;
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">{snap.deal?.name ?? params.dealId}</h1>
      <UnitPicker dealId={params.dealId} snapshot={snap} />
    </main>
  );
}
```

**Step 2: Client — caches snapshot in Dexie, creates draft inspection, navigates**

```tsx
// src/app/first-visit/[dealId]/UnitPicker.tsx
'use client';
import { useRouter } from 'next/navigation';
import { localDb } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';

type Unit = { id: string; name?: string };
type Snap = { deal: { id: string; name?: string }; locations: Unit[]; units: Unit[] };

export default function UnitPicker({ dealId, snapshot }: { dealId: string; snapshot: Snap }) {
  const router = useRouter();
  const units = snapshot.units ?? [];

  const start = async (unit: Unit) => {
    const id = crypto.randomUUID();
    const inspection = {
      id,
      deal_id: dealId,
      location_id: snapshot.locations?.[0]?.id,
      unit_category_id: unit.id,
      status: 'draft' as const,
      inspector_email: '', // filled server-side from session
      started_at: new Date().toISOString(),
    };
    await localDb.inspections.put(inspection);
    await enqueue('inspection_upsert', inspection);
    router.push(`/first-visit/${dealId}/${id}`);
  };

  if (units.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No unit categories on this deal.</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {units.map((u) => (
        <li key={u.id}>
          <button
            onClick={() => start(u)}
            className="block w-full rounded border border-gray-200 p-3 text-left"
          >
            {u.name ?? u.id}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/first-visit/[dealId]
git commit -m "feat(first-visit): unit picker creates draft + snapshots locally"
```

---

### Task 32: Survey flow page

**Files:** Create `src/app/first-visit/[dealId]/[inspectionId]/page.tsx`, `src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx`.

**Step 1: Page (client wrapper)**

```tsx
// src/app/first-visit/[dealId]/[inspectionId]/page.tsx
import SurveyFlow from './SurveyFlow';

export default function SurveyPage({
  params,
}: { params: { dealId: string; inspectionId: string } }) {
  return <SurveyFlow dealId={params.dealId} inspectionId={params.inspectionId} />;
}
```

**Step 2: SurveyFlow client (minimal — renders DEV_QUESTIONS, wires PrefilledField, saves answers locally + enqueues)**

```tsx
// src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx
'use client';
import { useEffect, useState, useMemo } from 'react';
import { DEV_QUESTIONS, byArea, type FirstVisitQuestion } from '@/lib/firstVisit/questions';
import { PrefilledField } from '@/components/firstVisit/PrefilledField';
import { localDb, type LocalAnswer } from '@/lib/firstVisit/db';
import { enqueue } from '@/lib/firstVisit/sync';
import { useSyncEngine } from '@/lib/firstVisit/useSyncEngine';
import { createHandlers } from '@/lib/firstVisit/handlers';

export default function SurveyFlow({ dealId, inspectionId }: { dealId: string; inspectionId: string }) {
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const handlers = useMemo(() => createHandlers(), []);
  const { pending, syncNow, syncing } = useSyncEngine(handlers);

  useEffect(() => {
    (async () => {
      const rows = await localDb.answers
        .where('inspection_id').equals(inspectionId).toArray();
      const map: Record<string, LocalAnswer> = {};
      for (const r of rows) map[`${r.area_key}::${r.question_key}`] = r;
      setAnswers(map);
    })();
  }, [inspectionId]);

  const onChange = async (q: FirstVisitQuestion, next: { value: unknown; wasAcceptedAsIs: boolean }) => {
    const key = `${q.area_key}::${q.question_key}`;
    const now = new Date().toISOString();
    const existing = answers[key];
    const row: LocalAnswer = {
      id: existing?.id ?? crypto.randomUUID(),
      inspection_id: inspectionId,
      question_key: q.question_key,
      area_key: q.area_key,
      value: next.value,
      data_point_slug: q.data_point_slug,
      hub_suggestion_snapshot: existing?.hub_suggestion_snapshot,
      was_prefilled: !!existing?.was_prefilled,
      was_accepted_as_is: next.wasAcceptedAsIs,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await localDb.answers.put(row);
    setAnswers((a) => ({ ...a, [key]: row }));
    await enqueue('answer_upsert', row);
  };

  const grouped = byArea(DEV_QUESTIONS);

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="sticky top-0 bg-white pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">First Visit</h1>
          <div className="flex items-center gap-2 text-xs">
            <span>{pending} pending</span>
            <button
              onClick={syncNow}
              disabled={syncing}
              className="rounded border border-gray-300 px-2 py-0.5"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
      </header>

      {Object.entries(grouped).map(([area, qs]) => (
        <section key={area} className="mt-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">{area}</h2>
          <div className="mt-2 flex flex-col gap-3">
            {qs.map((q) => {
              const key = `${q.area_key}::${q.question_key}`;
              return (
                <PrefilledField
                  key={key}
                  question={q}
                  hubValue={undefined /* TODO: read from snapshot in Task 33 */}
                  value={answers[key]?.value ?? ''}
                  onChange={(c) => onChange(q, c)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
```

**Step 3: Manual smoke**

`npm run dev`, navigate `/first-visit/<dealId>/<inspectionId>` (use the URL the unit picker generated). Expected: form renders with all four field types, typing saves to IndexedDB, pending counter increments. (Sync will fail to a 401 without proper auth wiring — that's expected; the outbox should retain jobs.)

**Step 4: Commit**

```bash
git add "src/app/first-visit/[dealId]/[inspectionId]"
git commit -m "feat(first-visit): survey flow renders questions + autosaves to outbox"
```

---

### Task 33: Wire hub snapshot into PrefilledField

**Files:** Modify `src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx`. Add helper `src/lib/firstVisit/snapshot.ts`.

**Step 1: Failing test**

Create `src/lib/firstVisit/__tests__/snapshot.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lookupHubValue } from '../snapshot';

const snapshot = {
  deal: { id: 'd' },
  locations: [{ id: 'l' }],
  units: [{ id: 'u' }],
  values: [
    { data_point_id: 'dp1', scope_id: 'd', source: 'owner', value: 'X', submitted_at: '2026-01-01' },
    { data_point_id: 'dp1', scope_id: 'd', source: 'prefill_hubspot', value: 'Y', submitted_at: '2026-01-02' },
    { data_point_id: 'dp2', scope_id: 'u', source: 'staff_first_visit', value: 'Z', submitted_at: '2026-01-03' },
  ],
  points: [
    { id: 'dp1', slug: 'wifi', level: 'deal' },
    { id: 'dp2', slug: 'beds', level: 'unit' },
  ],
};

const ctx = { deal_id: 'd', location_id: 'l', unit_category_id: 'u' };

describe('lookupHubValue', () => {
  it('returns highest-priority non-self value at the right scope', () => {
    // Owner wins over prefill; staff_first_visit is excluded.
    expect(lookupHubValue(snapshot as never, ctx, 'wifi')).toBe('X');
  });

  it('excludes staff_first_visit so pre-fill never shows our own prior write', () => {
    expect(lookupHubValue(snapshot as never, ctx, 'beds')).toBeUndefined();
  });

  it('returns undefined when no data point matches', () => {
    expect(lookupHubValue(snapshot as never, ctx, 'unknown')).toBeUndefined();
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/lib/firstVisit/snapshot.ts
import { resolveScopeId, type DataPointLevel, type InspectionScopeContext } from './resolveScope';

export type HubSnapshot = {
  deal: { id: string };
  locations: { id: string }[];
  units: { id: string }[];
  values: {
    data_point_id: string;
    scope_id: string;
    source: string;
    value: unknown;
    submitted_at: string;
  }[];
  points: { id: string; slug: string; level: DataPointLevel }[];
};

// Source priority (highest first). Anything not listed is lower-priority.
const PRIORITY = ['owner', 'prefill_hubspot', 'prefill_scraper', 'prefill_places'];

export function lookupHubValue(
  snapshot: HubSnapshot,
  ctx: InspectionScopeContext,
  data_point_slug: string,
): unknown {
  const dp = snapshot.points.find((p) => p.slug === data_point_slug);
  if (!dp) return undefined;
  const scope_id = resolveScopeId(dp.level, ctx);
  if (!scope_id) return undefined;

  const candidates = snapshot.values.filter(
    (v) => v.data_point_id === dp.id && v.scope_id === scope_id && v.source !== 'staff_first_visit',
  );
  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const ap = PRIORITY.indexOf(a.source);
    const bp = PRIORITY.indexOf(b.source);
    const ar = ap === -1 ? 999 : ap;
    const br = bp === -1 ? 999 : bp;
    if (ar !== br) return ar - br;
    return b.submitted_at.localeCompare(a.submitted_at);
  });
  return candidates[0].value;
}
```

**Step 4: Run — expect pass**

**Step 5: Wire into SurveyFlow**

Update SurveyFlow to receive `snapshot` via prop (load from Dexie or refetch). Easiest path: re-fetch on mount.

In SurveyFlow:

```tsx
const [snapshot, setSnapshot] = useState<HubSnapshot | null>(null);
useEffect(() => {
  fetch(`/api/first-visit/deals/${dealId}/snapshot`)
    .then((r) => (r.ok ? r.json() : null))
    .then(setSnapshot)
    .catch(() => setSnapshot(null));
}, [dealId]);

// ...
<PrefilledField
  question={q}
  hubValue={snapshot && q.data_point_slug
    ? lookupHubValue(snapshot, { deal_id: dealId, unit_category_id: /* TODO from inspection */ undefined }, q.data_point_slug)
    : undefined}
  value={answers[key]?.value ?? ''}
  onChange={(c) => onChange(q, c)}
/>
```

You'll need `unit_category_id` on hand. Read it from `localDb.inspections.get(inspectionId)` in the same `useEffect`.

**Step 6: Commit**

```bash
git add src/lib/firstVisit/snapshot.ts src/lib/firstVisit/__tests__/snapshot.test.ts "src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx"
git commit -m "feat(first-visit): pre-fill values from hub snapshot with source priority"
```

---

## Phase 13 — Media capture

### Task 34: useMediaCapture (photo)

**Files:** Create `src/lib/firstVisit/useMediaCapture.ts`. Test minimally; manual smoke is the real check.

**Step 1: Implement**

```ts
// src/lib/firstVisit/useMediaCapture.ts
'use client';
import { useCallback } from 'react';
import { localDb } from './db';
import { enqueue } from './sync';

export async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useMediaCapture(inspectionId: string) {
  const persist = useCallback(
    async (blob: Blob, kind: 'photo'|'video'|'audio', meta: { area_key: string; question_key?: string; answer_id?: string }) => {
      const id = crypto.randomUUID();
      const content_hash = await sha256(blob);
      await localDb.media.put({
        id,
        inspection_id: inspectionId,
        answer_id: meta.answer_id,
        area_key: meta.area_key,
        question_key: meta.question_key,
        kind,
        blob,
        content_hash,
        size_bytes: blob.size,
        captured_at: new Date().toISOString(),
      });
      await enqueue('media_upload', {
        media_id: id, inspection_id: inspectionId, kind, content_hash, size_bytes: blob.size,
      });
      return id;
    },
    [inspectionId],
  );
  return { persist };
}
```

**Step 2: Commit**

```bash
git add src/lib/firstVisit/useMediaCapture.ts
git commit -m "feat(first-visit): media capture hook (hash + enqueue)"
```

---

### Task 35: Photo + video + audio buttons in survey

**Files:** Create `src/components/firstVisit/MediaButtons.tsx`. Wire into SurveyFlow.

**Step 1: Implement**

```tsx
// src/components/firstVisit/MediaButtons.tsx
'use client';
import { useRef } from 'react';
import { useMediaCapture } from '@/lib/firstVisit/useMediaCapture';

export function MediaButtons({
  inspectionId, areaKey, questionKey, answerId,
}: {
  inspectionId: string; areaKey: string; questionKey?: string; answerId?: string;
}) {
  const { persist } = useMediaCapture(inspectionId);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const onPick = async (kind: 'photo'|'video', file: File | undefined) => {
    if (!file) return;
    await persist(file, kind, { area_key: areaKey, question_key: questionKey, answer_id: answerId });
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => photoRef.current?.click()}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      >
        📷 Photo
      </button>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick('photo', e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => videoRef.current?.click()}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      >
        🎥 Video
      </button>
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick('video', e.target.files?.[0])}
      />
    </div>
  );
}
```

Wire under each `<PrefilledField>` in SurveyFlow:

```tsx
<MediaButtons
  inspectionId={inspectionId}
  areaKey={q.area_key}
  questionKey={q.question_key}
  answerId={answers[key]?.id}
/>
```

**Step 2: Commit**

```bash
git add src/components/firstVisit/MediaButtons.tsx "src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx"
git commit -m "feat(first-visit): photo + video capture via file input fallback"
```

---

### Task 36: In-app MediaRecorder hook (audio, then enhanced video)

**Files:** Create `src/lib/firstVisit/useVoiceRecorder.ts` (new — do NOT confuse with upstream's `src/lib/useVoiceRecorder.ts` which stays for inspection mode).

**Step 1: Implement audio recorder** (mirroring upstream's pattern; safe to copy and adapt).

```ts
// src/lib/firstVisit/useVoiceRecorder.ts
'use client';
import { useRef, useState, useCallback } from 'react';

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const chunks = useRef<Blob[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks.current = [];
    r.ondataavailable = (e) => chunks.current.push(e.data);
    r.start();
    recorder.current = r;
    setRecording(true);
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const r = recorder.current;
    if (!r) return null;
    return new Promise((resolve) => {
      r.onstop = () => {
        setRecording(false);
        r.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks.current, { type: 'audio/webm' }));
      };
      r.stop();
    });
  }, []);

  return { recording, start, stop };
}
```

**Step 2: Skip wiring into UI for the scaffolding milestone.** The scaffolding contract (§16) requires audio capture works — but the file-input route covers photo/video. Audio via `<input accept="audio/*" capture>` is unreliable across iOS Safari, so we provide the hook but wire a UI button only if time allows in Phase 14.

**Step 3: Commit**

```bash
git add src/lib/firstVisit/useVoiceRecorder.ts
git commit -m "feat(first-visit): audio recorder hook (MediaRecorder/webm)"
```

---

## Phase 14 — Export

### Task 37: Zip export

**Files:** Create `src/lib/firstVisit/export.ts`. Test `src/lib/firstVisit/__tests__/export.test.ts`.

**Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { localDb } from '../db';
import { exportInspection } from '../export';

describe('exportInspection', () => {
  it('produces a zip containing answers.csv and manifest.json', async () => {
    await localDb.inspections.clear();
    await localDb.answers.clear();
    await localDb.media.clear();
    await localDb.inspections.put({
      id: 'i', deal_id: 'd', status: 'draft',
      inspector_email: 'a@arbio.com', started_at: '2026-05-22T00:00:00Z',
    });
    await localDb.answers.put({
      id: 'a', inspection_id: 'i', question_key: 'q', area_key: 'r',
      value: 'v', was_prefilled: false, was_accepted_as_is: false,
      created_at: '', updated_at: '',
    });
    const blob = await exportInspection('i');
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file('answers.csv')).not.toBeNull();
    expect(zip.file('manifest.json')).not.toBeNull();
    const csv = await zip.file('answers.csv')!.async('string');
    expect(csv).toContain('q,r,v');
  });
});
```

**Step 2: Run — expect failure**

**Step 3: Implement**

```ts
// src/lib/firstVisit/export.ts
import JSZip from 'jszip';
import { localDb } from './db';

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportInspection(inspectionId: string): Promise<Blob> {
  const zip = new JSZip();

  const inspection = await localDb.inspections.get(inspectionId);
  const answers = await localDb.answers.where('inspection_id').equals(inspectionId).toArray();
  const media = await localDb.media.where('inspection_id').equals(inspectionId).toArray();

  // CSV
  const header = [
    'question_key','area_key','value','notes',
    'was_prefilled','was_accepted_as_is','hub_suggestion_snapshot','captured_at',
  ].join(',');
  const rows = answers.map((a) => [
    a.question_key, a.area_key, a.value, a.notes ?? '',
    a.was_prefilled, a.was_accepted_as_is,
    a.hub_suggestion_snapshot ?? '', a.created_at,
  ].map(csvCell).join(','));
  zip.file('answers.csv', [header, ...rows].join('\n'));

  // Manifest
  zip.file('manifest.json', JSON.stringify({ inspection, media_count: media.length }, null, 2));

  // Media
  for (const m of media) {
    const folder = `${m.kind}s`;
    const ext = m.kind === 'photo' ? 'jpg' : m.kind === 'video' ? 'mp4' : 'webm';
    const safeArea = m.area_key.replace(/[^a-z0-9_-]/gi, '_');
    const safeQuestion = (m.question_key ?? 'general').replace(/[^a-z0-9_-]/gi, '_');
    zip.file(`${folder}/${safeArea}_${safeQuestion}_${m.id}.${ext}`, m.blob);
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function downloadInspectionZip(inspectionId: string): Promise<void> {
  const blob = await exportInspection(inspectionId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `first-visit-${inspectionId}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 4: Run — expect pass**

**Step 5: Wire an Export button into SurveyFlow header**

```tsx
<button onClick={() => downloadInspectionZip(inspectionId)} className="rounded border border-gray-300 px-2 py-0.5 text-xs">Export</button>
```

**Step 6: Commit**

```bash
git add src/lib/firstVisit/export.ts src/lib/firstVisit/__tests__/export.test.ts "src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx"
git commit -m "feat(first-visit): zip export (csv + manifest + media)"
```

---

## Phase 15 — Submit + finalize

### Task 38: Submit button

**Files:** Modify `src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx`.

**Step 1: Add submit handler**

```tsx
const submit = async () => {
  if (!confirm('Submit this visit? You will not be able to edit it after.')) return;
  await localDb.inspections.update(inspectionId, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  });
  await enqueue('submit', { inspection_id: inspectionId });
  syncNow().catch(() => {});
};
```

Add a button at the bottom of the form:

```tsx
<button onClick={submit} className="mt-6 w-full rounded-md bg-black px-4 py-3 text-white">
  Submit visit
</button>
```

**Step 2: Manual smoke**

Run `npm run dev`. Walk a full flow. Watch DevTools → Application → IndexedDB → `first_visit` → confirm inspection becomes `submitted`. Outbox `submit` job should clear if logged in and online.

**Step 3: Commit**

```bash
git add "src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx"
git commit -m "feat(first-visit): submit visit button"
```

---

## Phase 16 — PWA + offline polish

### Task 39: next-pwa config

**Files:** Modify `next.config.ts`. Create `public/manifest.json`.

**Step 1: Update `next.config.ts`**

```ts
import withPWA from 'next-pwa';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig);
```

**Step 2: `public/manifest.json`**

```json
{
  "name": "Arbio Inspection",
  "short_name": "Arbio Insp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

**Step 3: Link manifest in layout**

In `src/app/layout.tsx`, add:

```tsx
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#000000" />
</head>
```

(Or use Next's metadata API — simpler: `export const metadata: Metadata = { manifest: '/manifest.json' };`)

**Step 4: Build to verify SW is generated**

```bash
npm run build
ls public/sw.js  # exists
```

**Step 5: Commit**

```bash
git add next.config.ts public/manifest.json src/app/layout.tsx
git commit -m "feat: next-pwa service worker + manifest"
```

---

### Task 40: Request persistent storage on app load

**Files:** Create `src/components/firstVisit/PersistGate.tsx`. Wire into `/first-visit/layout.tsx`.

**Step 1: Implement**

```tsx
// src/components/firstVisit/PersistGate.tsx
'use client';
import { useEffect } from 'react';

export function PersistGate() {
  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);
  return null;
}
```

**Step 2: Add to first-visit layout**

Create `src/app/first-visit/layout.tsx`:

```tsx
import { PersistGate } from '@/components/firstVisit/PersistGate';

export default function FirstVisitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PersistGate />
      {children}
    </>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/firstVisit/PersistGate.tsx src/app/first-visit/layout.tsx
git commit -m "feat(first-visit): request persistent IndexedDB storage"
```

---

## Phase 17 — Failure UX polish

### Task 41: Sync state indicator

**Files:** Create `src/components/firstVisit/SyncBadge.tsx`. Wire into SurveyFlow header.

**Step 1: Implement**

```tsx
// src/components/firstVisit/SyncBadge.tsx
'use client';
import { useOnlineStatus } from '@/lib/firstVisit/useSyncEngine';

export function SyncBadge({ pending, syncing }: { pending: number; syncing: boolean }) {
  const online = useOnlineStatus();
  if (syncing) return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Syncing…</span>;
  if (!online) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">Offline — {pending} pending</span>;
  if (pending > 0) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">{pending} pending</span>;
  return <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Synced</span>;
}
```

Replace the inline pending text in SurveyFlow header with `<SyncBadge pending={pending} syncing={syncing} />`.

**Step 2: Commit**

```bash
git add src/components/firstVisit/SyncBadge.tsx "src/app/first-visit/[dealId]/[inspectionId]/SurveyFlow.tsx"
git commit -m "feat(first-visit): sync state badge (offline/pending/synced/syncing)"
```

---

## Phase 18 — Analytics (lightweight)

### Task 42: Analytics shim

**Files:** Create `src/lib/firstVisit/analytics.ts`. Add `useEffect` calls in key components.

**Step 1: Implement no-op shim**

```ts
// src/lib/firstVisit/analytics.ts
type Props = Record<string, unknown>;

const ENABLED = !!process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;

export function track(event: string, props: Props = {}) {
  if (!ENABLED) {
    if (process.env.NODE_ENV !== 'production') console.debug('[track]', event, props);
    return;
  }
  fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, props, ts: Date.now() }),
    keepalive: true,
  }).catch(() => {});
}
```

**Step 2: Wire the key events**

In:
- `MyVisits.tsx` mount → no event
- `DealPicker.tsx` `onClick` → `track('deal_selected', { deal_id: d.id })`
- `UnitPicker.tsx` `start()` → `track('first_visit_started', { inspection_id: id, deal_id: dealId })` and `track('unit_selected', { unit_id: unit.id })`
- `PrefilledField` Accept button → emit `question_prefill_accepted` (add an optional callback prop)
- `SurveyFlow` `onChange` when not accepted-as-is and `was_prefilled` → `question_prefill_edited`
- `SurveyFlow` `onChange` always → `answer_saved`
- `useMediaCapture` `persist()` → `media_captured`
- `useSyncEngine` syncNow start/end → `sync_started` / `sync_completed`; on rejection of any handler → `sync_failed`
- offline detection → `offline_entered` / `online_returned`
- `submit` → `submit_clicked`; on submit handler resolution → `submit_synced`
- `downloadInspectionZip` → `export_generated`

Add minimal `track(...)` calls inline. Skip TDD here — these are pure side-effects with no semantic logic.

**Step 3: Commit**

```bash
git add src/lib/firstVisit/analytics.ts src/app/first-visit src/components/firstVisit src/lib/firstVisit
git commit -m "feat(first-visit): analytics events (no-op until endpoint configured)"
```

---

## Phase 19 — Smoke test + cleanup

### Task 43: Full-stack manual smoke

**Step 1: Apply migrations to the Onboarding hub Supabase**

Open Supabase Studio → SQL Editor. Paste in order, each followed by `NOTIFY pgrst, 'reload schema';`:

1. `supabase/migrations/first_visit_001_inspections.sql`
2. `supabase/migrations/first_visit_002_answers.sql`
3. `supabase/migrations/first_visit_003_media.sql`

Then Storage → create the three buckets per `first_visit_004_storage.md`.

**Step 2: Configure env vars in `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=<upstream inspection-app supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<upstream anon key>

NEXT_PUBLIC_HUB_SUPABASE_URL=<onboarding hub url>
NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY=<onboarding hub anon key>

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 3: Enable Google OAuth on the hub Supabase**

Supabase Studio → Authentication → Providers → Google. Use existing OAuth client; allowed callback URL: `http://localhost:3000/auth/callback`.

**Step 4: Run dev and walk the full flow**

```bash
npm run dev
```

- Visit `http://localhost:3000` → redirect to `/login`.
- Sign in with `@arbio.com` account.
- Mode picker → First Visit Survey → landing page.
- Start new visit → deal picker → pick a deal that has data_point_values → unit picker → start.
- Survey renders DEV_QUESTIONS. Pre-fill badges appear if hub has matching data points.
- Accept one, overwrite one. Capture one photo. Watch DevTools → IndexedDB.
- Toggle DevTools "Offline" mode. Change another answer. Sync badge turns yellow with pending count.
- Toggle back to online. Sync badge flips to green; outbox drains.
- Click Export. Zip downloads with CSV + 1 photo.
- Click Submit. Confirm dialog. Inspection moves to `submitted`. Submit job drains. Check Supabase → `first_visit_inspections.status='submitted'` and `data_point_values` has new `staff_first_visit` rows for any mapped DEV_QUESTIONS.

**Step 5: Document the result**

Update the design doc `docs/plans/2026-05-22-first-visit-survey-design.md` §16's "Scaffolding complete" checklist with PASS/FAIL per item.

**Step 6: Commit any fixes** discovered during smoke. Then:

```bash
git push -u origin feature/first-visit-scaffolding
gh pr create --title "First Visit Survey scaffolding" --body-file pr-body.md
```

(Compose `pr-body.md` listing what's in, what's deferred, the smoke results, and links to the design doc.)

---

## Phase 20 — Out-of-scope reminders for the engineer

These belong to a follow-up phase, **not** this scaffolding milestone:

- Real question list and `data_point_slug` mappings from product (replaces `DEV_QUESTIONS`).
- "Reopen submitted inspection" flow.
- Push-notification of sync state.
- iOS install-prompt UX polish.
- Per-deal access control (currently any staff sees all deals).
- E2E Playwright tests beyond the manual smoke.

---

## Reference

- Design doc: `docs/plans/2026-05-22-first-visit-survey-design.md`
- Project CLAUDE.md (Onboarding_tool) for hub schema conventions
- Memory: `migration_workflow.md`, `conflict_resolution_model.md`, `allowed_email_domain.md`
