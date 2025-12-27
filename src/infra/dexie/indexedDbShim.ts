// Shim for Node tests / seed scripts - sets global IndexedDB implementation
// This file is loaded by Vitest via setupFiles and can also be preloaded in node via -r fake-indexeddb/auto
import 'fake-indexeddb/auto';

// Ensure IDBKeyRange is available
import 'fake-indexeddb/lib/FDBKeyRange';

// Provide crypto.webcrypto if missing (Node < 19 compatibility)
if (typeof (globalThis as any).crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (globalThis as any).crypto = require('crypto').webcrypto;
}

export function ensureShim() {
  // no-op used to import & verify shim was applied
  return true;
}
