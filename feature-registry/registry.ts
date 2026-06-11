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
  {
    id:          'compliment-jar',
    name:        '칭찬 저금통',
    description: '서로에게 칭찬을 쌓아두고 언제든 꺼내 읽어요',
    status:      'experimental',
  },
  {
    id:          'daily-food',
    name:        '오늘 뭐 먹었어?',
    description: '오늘 먹은 것을 기록하고 상대방과 공유해요',
    status:      'experimental',
  },
  {
    id:          'first-moments',
    name:        '우리가 처음 한 것들',
    description: '처음 함께 한 특별한 순간들을 기록해요',
    status:      'experimental',
  },
  {
    id:          'gift-wishlist',
    name:        '선물 위시리스트',
    description: '갖고 싶은 것을 적어두면 상대방이 선물 아이디어를 얻어요',
    status:      'experimental',
  },
  {
    id:          'daily-gratitude',
    name:        '오늘의 고마움',
    description: '매일 서로에게 고마운 점을 한 마디로 전해요',
    status:      'experimental',
  },
  {
    id:          'our-playlist',
    name:        '우리의 플레이리스트',
    description: '그때 자주 듣던 노래들을 기억과 함께 기록해요',
    status:      'experimental',
  },
];

export default registry;
