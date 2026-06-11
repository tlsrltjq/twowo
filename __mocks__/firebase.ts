/**
 * Firebase 단위 테스트용 in-memory mock.
 * 통합 테스트는 이 mock 을 *사용하지 않고* 실제 에뮬레이터에 연결한다.
 *
 * 사용:
 *   jest.mock('firebase/firestore');   // → 자동으로 이 파일이 로드됨
 *   // 또는 setup 파일에서 한 번에 모킹
 */

type DocRef = { path: string; id: string };
type QueryRef = { __collection: string; __filters: [string, string, any][] };

const store = new Map<string, Record<string, any>>();
const listeners = new Map<string, Set<(snap: any) => void>>();

const emitDoc = (path: string) => {
  const data = store.get(path);
  listeners.get(path)?.forEach(cb => cb({
    exists: () => data !== undefined,
    data:   () => data,
    id:     path.split('/').pop(),
  }));
};

export const resetMockDb = () => { store.clear(); listeners.clear(); _autoId = 1; };
export const seedMockDb  = (path: string, data: Record<string, any>) => { store.set(path, data); emitDoc(path); };
export const getMockDb   = () => new Map(store);

export const doc = jest.fn((dbOrColRef: any, collectionPath?: string, id?: string): DocRef => {
  if (collectionPath === undefined) {
    // doc(colRef) form — Firestore auto-ID generation
    const colName: string = (dbOrColRef as QueryRef).__collection ?? 'unknown';
    const newId = `auto_${_autoId++}`;
    return { path: `${colName}/${newId}`, id: newId };
  }
  return { path: `${collectionPath}/${id}`, id: id! };
});

export const collection = jest.fn((_db: any, name: string): QueryRef => ({
  __collection: name, __filters: [],
}));

export const getDoc = jest.fn(async (ref: DocRef) => {
  const data = store.get(ref.path);
  return { exists: () => data !== undefined, data: () => data, id: ref.id };
});

let _autoId = 1;
export const addDoc = jest.fn(async (colRef: QueryRef, data: Record<string, any>) => {
  const id   = `auto_${_autoId++}`;
  const path = `${colRef.__collection}/${id}`;
  store.set(path, data);
  emitDoc(path);
  return { id, path };
});

export const setDoc = jest.fn(async (ref: DocRef, data: Record<string, any>, opts?: { merge?: boolean }) => {
  if (opts?.merge && store.has(ref.path)) {
    store.set(ref.path, { ...store.get(ref.path), ...data });
  } else {
    store.set(ref.path, data);
  }
  emitDoc(ref.path);
});

export const updateDoc = jest.fn(async (ref: DocRef, patch: Record<string, any>) => {
  store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...patch });
  emitDoc(ref.path);
});

export const deleteDoc = jest.fn(async (ref: DocRef) => {
  store.delete(ref.path);
  emitDoc(ref.path);
});

export const runTransaction = jest.fn(async (_db: any, updateFn: (tx: any) => Promise<any>) => {
  // 매우 단순화된 트랜잭션 — 실제 격리 X. BR-5 같이 트랜잭션 자체의 ACID 가 중요한 경우는 통합 테스트에서.
  const tx = {
    get: async (ref: DocRef) => getDoc(ref),
    set: async (ref: DocRef, data: any, opts?: any) => setDoc(ref, data, opts),
    update: async (ref: DocRef, patch: any) => updateDoc(ref, patch),
    delete: async (ref: DocRef) => deleteDoc(ref),
  };
  return updateFn(tx);
});

export const onSnapshot = jest.fn((ref: DocRef | QueryRef, cb: (snap: any) => void) => {
  if ('__collection' in ref) {
    // 쿼리 스냅샷
    const orderByClauses: { field: string; dir: string }[] = [];
    const whereClauses:   [string, string, any][]          = [];
    for (const f of (ref.__filters as any[])) {
      if (f && '__orderBy' in f) orderByClauses.push({ field: f.__orderBy, dir: f.__dir ?? 'asc' });
      else if (Array.isArray(f)) whereClauses.push(f as [string, string, any]);
    }
    const docs: any[] = [];
    for (const [path, data] of store.entries()) {
      if (!path.startsWith(ref.__collection + '/')) continue;
      const matches = whereClauses.every(([field, op, value]) => {
        if (op === '==') return data[field] === value;
        return false;
      });
      if (matches) docs.push({ data: () => data, id: path.split('/').pop(), __raw: data });
    }
    // orderBy 적용
    if (orderByClauses.length > 0) {
      docs.sort((a, b) => {
        for (const { field, dir } of orderByClauses) {
          const av = a.__raw[field]; const bv = b.__raw[field];
          if (av === bv) continue;
          const cmp = av < bv ? -1 : 1;
          return dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }
    cb({ docs });
    return () => {};
  }
  // 단일 문서 스냅샷 (기존 동작 유지)
  if (!listeners.has(ref.path)) listeners.set(ref.path, new Set());
  listeners.get(ref.path)!.add(cb);
  const data = store.get(ref.path);
  cb({ exists: () => data !== undefined, data: () => data, id: ref.id });
  return () => { listeners.get(ref.path)?.delete(cb); };
});

export const serverTimestamp = jest.fn(() => new Date());
export const Timestamp = {
  now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }),
  fromDate: (d: Date) => ({ toMillis: () => d.getTime(), toDate: () => d }),
  fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) }),
};

export const arrayUnion = (...vals: any[]) => ({ __op: 'arrayUnion', vals });
export const arrayRemove = (...vals: any[]) => ({ __op: 'arrayRemove', vals });
export const deleteField = () => ({ __op: 'deleteField' });

export const limit   = (_n: number) => ({ __limit: _n });
export const where   = (field: string, op: string, value: any) => [field, op, value];
export const orderBy = (field: string, dir: 'asc' | 'desc' = 'asc') => ({ __orderBy: field, __dir: dir });
export const query   = (ref: QueryRef, ...filters: any[]) => ({ ...ref, __filters: filters });

export const writeBatch = jest.fn((_db: any) => {
  const ops: (() => Promise<void>)[] = [];
  const batch = {
    set:    (ref: DocRef, data: any, opts?: any) => { ops.push(() => setDoc(ref, data, opts)); return batch; },
    update: (ref: DocRef, patch: any)            => { ops.push(() => updateDoc(ref, patch));   return batch; },
    delete: (ref: DocRef)                        => { ops.push(() => deleteDoc(ref));           return batch; },
    commit: async () => { for (const op of ops) await op(); },
  };
  return batch;
});

export const getDocs = jest.fn(async (q: QueryRef) => {
  const docs: any[] = [];
  for (const [path, data] of store.entries()) {
    if (!path.startsWith(q.__collection + '/')) continue;
    const matches = q.__filters.every((f: any) => {
      if (!Array.isArray(f)) return true; // limit / orderBy markers — ignored
      const [field, op, value] = f as [string, string, any];
      if (op === '==') return data[field] === value;
      if (op === '!=') return data[field] !== value;
      if (op === '<')  return data[field] <  value;
      if (op === '>')  return data[field] >  value;
      return true;
    });
    if (matches) docs.push({ id: path.split('/').pop(), data: () => data, ref: { path } });
  }
  return { docs, forEach: (cb: (d: any) => void) => docs.forEach(cb), size: docs.length, empty: docs.length === 0 };
});
