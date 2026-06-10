import type { AppFeature } from './types';

const registry: AppFeature[] = [
  {
    id:          'mood-share',
    name:        '오늘의 컨디션',
    description: '매일 서로의 에너지·기분·만남 가능 여부를 공유',
    status:      'active',
  },
  {
    id:          'couple-bingo',
    name:        '데이트 빙고',
    description: '함께 하고 싶은 것들을 빙고판에 채우고 달성해보세요',
    status:      'experimental',
  },
  {
    id:          'date-decision',
    name:        '둘다좋아',
    description: '서로 원하는 데이트 장소를 투표로 정해요',
    status:      'experimental',
  },
  {
    id:          'night-message',
    name:        '자기 전 한 마디',
    description: '잠들기 전·아침에 일어나서 상대방에게 메시지를 남겨요',
    status:      'experimental',
  },
];

export default registry;
