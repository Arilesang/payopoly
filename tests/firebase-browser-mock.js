// Browser-test adapter only. Playwright intercepts the Firebase module; production never imports this file.
const storageKey = 'payopoly-test-db';
const listeners = new Set();
const read = () => JSON.parse(localStorage.getItem(storageKey) ?? '{}');
function at(tree, path) { return path.split('/').filter(Boolean).reduce((v, k) => v?.[k], tree) ?? null; }
function put(tree, path, value) {
  const keys = path.split('/').filter(Boolean);
  let node = tree;
  for (const k of keys.slice(0, -1)) node = node[k] ??= {};
  if (value === null) delete node[keys.at(-1)]; else node[keys.at(-1)] = value;
}
const snap = value => ({ val: () => structuredClone(value), exists: () => value !== null });
function emit() { for (const l of listeners) { const value = l.path === '.info/connected' ? true : l.path === '.info/serverTimeOffset' ? 0 : at(read(), l.path); const serialized = JSON.stringify(value); if (serialized !== l.last) { l.last = serialized; l.callback(snap(value)); } } }
window.addEventListener('storage', e => { if (e.key === storageKey) emit(); });
window.__testEmit = emit;
export const getDatabase = () => ({});
export const ref = (_, path) => ({ path });
export const serverTimestamp = () => Date.now();
export async function set(r, value) { await navigator.locks.request(storageKey, () => { const tree = read(); put(tree, r.path, value); localStorage.setItem(storageKey, JSON.stringify(tree)); }); emit(); }
export async function update(r, updates) { await navigator.locks.request(storageKey, () => { const tree = read(); for (const [key, value] of Object.entries(updates)) put(tree, `${r.path}/${key}`, value); localStorage.setItem(storageKey, JSON.stringify(tree)); }); emit(); }
export async function get(r) { return snap(at(read(), r.path)); }
export function onValue(r, callback) { const l = { path: r.path, callback }; listeners.add(l); queueMicrotask(emit); return () => listeners.delete(l); }
export function onDisconnect() { return { set: async () => {}, cancel: async () => {} }; }
export function push(r, value) { const child = { path: `${r.path}/${crypto.randomUUID()}` }; return value === undefined ? child : set(child, value); }
export async function runTransaction(r, transform) {
  let result;
  await navigator.locks.request(storageKey, () => {
    const tree = read(); const current = at(tree, r.path); const next = transform(structuredClone(current));
    if (next === undefined) { result = { committed: false, snapshot: snap(current) }; return; }
    put(tree, r.path, next); localStorage.setItem(storageKey, JSON.stringify(tree)); result = { committed: true, snapshot: snap(next) };
  });
  if (result.committed) emit();
  return result;
}
