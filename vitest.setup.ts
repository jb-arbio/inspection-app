import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { localDb } from './src/lib/firstVisit/db';

// Deterministic per-test DB isolation.
//
// The whole suite shares ONE global fake-indexeddb instance (fake-indexeddb/auto
// above) and the app uses a singleton Dexie connection (`localDb`). Without a
// global reset, rows written by one test/file can bleed into the next test's
// expectations — individual test files cleared inconsistent subsets of tables
// (some cleared inspections/answers/media/outbox but not targets, some only
// media/outbox), which is what made the suite intermittently flaky.
//
// Clearing ALL tables before every test guarantees every test starts from an
// empty database regardless of what ran before it. We open the DB first (a
// no-op if already open) so the table-clear is safe even on the very first test.
beforeEach(async () => {
  if (!localDb.isOpen()) {
    await localDb.open();
  }
  await Promise.all(localDb.tables.map((t) => t.clear()));
});
