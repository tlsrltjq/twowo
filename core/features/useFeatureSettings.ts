import { useEffect, useState } from 'react';

import { subscribeFeatureSettings } from './index';

export function useFeatureSettings(coupleId: string | null): Record<string, boolean> {
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFeatureSettings(coupleId, setSettings);
  }, [coupleId]);

  return settings;
}
