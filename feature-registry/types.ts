export type FeatureStatus = 'experimental' | 'active' | 'hidden' | 'deprecated';

export interface AppFeature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
}
