import {
  DocumentData,
  DocumentReference,
  onSnapshot,
  Query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface DocState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface QueryState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

export function useFirestoreDoc<T = DocumentData>(
  ref: DocumentReference<T> | null,
): DocState<T> {
  const [state, setState] = useState<DocState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState(s => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      ref,
      snap => setState({ data: snap.exists() ? (snap.data() as T) : null, loading: false, error: null }),
      error => setState({ data: null, loading: false, error }),
    );
    return unsub;
  }, [ref?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

export function useFirestoreQuery<T = DocumentData>(
  query: Query<T> | null,
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState(s => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      query,
      snap => setState({ data: snap.docs.map(d => d.data() as T), loading: false, error: null }),
      error => setState({ data: [], loading: false, error }),
    );
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
