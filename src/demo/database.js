// Opt-in local preview adapter. Vite aliases Firebase here only in demo mode.
const storageKey = 'payopoly-local-demo-db';
const listeners = new Set();
const read = () => JSON.parse(localStorage.getItem(storageKey) ?? '{}');
const snapshot = value => ({ val: () => structuredClone(value), exists: () => value !== null });

function at(tree, path) {
  return path.split('/').filter(Boolean).reduce((value, key) => value?.[key], tree) ?? null;
}
function put(tree, path, value) {
  const keys = path.split('/').filter(Boolean);
  let node = tree;
  for (const key of keys.slice(0, -1)) node = node[key] ??= {};
  if (value === null) delete node[keys.at(-1)];
  else node[keys.at(-1)] = value;
}
function emit() {
  for (const listener of listeners) {
    const value = listener.path === '.info/connected' ? true
      : listener.path === '.info/serverTimeOffset' ? 0 : at(read(), listener.path);
    const serialized = JSON.stringify(value);
    if (serialized !== listener.last) {
      listener.last = serialized;
      listener.callback(snapshot(value));
    }
  }
}
window.addEventListener('storage', event => { if (event.key === storageKey) emit(); });

export const getDatabase = () => ({});
export const ref = (_, path) => ({ path });
export const serverTimestamp = () => Date.now();
export function onValue(reference, callback) {
  const listener = { path: reference.path, callback };
  listeners.add(listener);
  queueMicrotask(emit);
  return () => listeners.delete(listener);
}
export function onDisconnect() {
  return { set: async () => {}, cancel: async () => {} };
}
export async function runTransaction(reference, transform) {
  let result;
  await navigator.locks.request(storageKey, () => {
    const tree = read();
    const current = at(tree, reference.path);
    const next = transform(structuredClone(current));
    if (next === undefined) { result = { committed: false, snapshot: snapshot(current) }; return; }
    put(tree, reference.path, next);
    localStorage.setItem(storageKey, JSON.stringify(tree));
    result = { committed: true, snapshot: snapshot(next) };
  });
  if (result.committed) emit();
  return result;
}
export async function set(reference, value) {
  await runTransaction(reference, () => value);
}
export async function update(reference, updates) {
  await runTransaction(reference, current => {
    const next = current ?? {};
    for (const [key, value] of Object.entries(updates)) put(next, key, value);
    return next;
  });
}
export function readDemoRoom() { return at(read(), 'games/DEMO24'); }
export function seedDemoRoom(room) {
  // Initial setup is synchronous and finishes before the React app mounts.
  const tree = read();
  put(tree, 'games/DEMO24', room);
  localStorage.setItem(storageKey, JSON.stringify(tree));
  emit();
}
