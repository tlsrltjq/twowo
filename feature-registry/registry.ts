import type { AppFeature } from './types';

const registry: AppFeature[] = [
  {
    id:          'mood-share',
    name:        '오늘의 컨디션',
    description: '매일 서로의 에너지·기분·만남 가능 여부를 공유',
    status:      'experimental',
  },
];

export default registry;
