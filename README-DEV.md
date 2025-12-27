# Developer notes: running tests and seed in Node (Codespaces / CI)

1. Install deps:
   - npm install

2. Run unit tests (domain-only):
   - npm run test

3. Run integration tests (they use fake-indexeddb shim automatically via Vitest `setupFiles`):
   - npm run test

Notes:
- `fake-indexeddb` is used via `src/infra/dexie/indexedDbShim.ts` which is listed in `vitest.config.ts` as a `setupFile` so Node tests get an IndexedDB implementation.
- The `seed:node` script preloads `fake-indexeddb/auto` and runs `seedDemoData` from the compiled `dist`. Run `npm run build` then `npm run seed:node`.
- Tests create isolated DB instances via `new AppDB(dbName)` which ensures no cross-talk between suites.
