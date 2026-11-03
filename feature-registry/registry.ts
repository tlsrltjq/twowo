import type { AppFeature } from './types';

const registry: AppFeature[] = [
  {
    id:          'mood-share',
    name:        '오늘의 컨디션',
    description: '에너지·기분·만날 수 있는지를 매일 나눠요',
    status:      'active',
  },
  {
    id:          'couple-bingo',
    name:        '데이트 빙고',
    description: '같이 하고 싶은 일을 빙고판에 채우고 하나씩 지워요',
    status:      'experimental',
  },
  {
    id:          'date-decision',
    name:        '둘다좋아',
    description: '데이트 장소를 둘이 투표해서 정해요',
    status:      'experimental',
  },
  {
    id:          'night-message',
    name:        '자기 전 한 마디',
    description: '잘 자, 좋은 아침 인사를 남겨요',
    status:      'experimental',
  },
  {
    id:          'compliment-jar',
    name:        '칭찬 저금통',
    description: '칭찬을 모아 두고 생각날 때 꺼내 읽어요',
    status:      'experimental',
  },
  {
    id:          'daily-food',
    name:        '오늘의 밥',
    description: '오늘 먹은 끼니를 사진으로 서로 보여줘요',
    status:      'experimental',
  },
  {
    id:          'first-moments',
    name:        '우리가 처음 한 것들',
    description: '둘이 처음 해본 일을 날짜와 함께 남겨요',
    status:      'experimental',
  },
  {
    id:          'gift-wishlist',
    name:        '선물 위시리스트',
    description: '갖고 싶은 것을 적어 두면 선물 고를 때 참고해요',
    status:      'experimental',
  },
  {
    id:          'daily-gratitude',
    name:        '오늘의 고마움',
    description: '하루에 한 번, 고마웠던 일을 적어요',
    status:      'experimental',
  },
  {
    id:          'our-playlist',
    name:        '우리의 플레이리스트',
    description: '그때 자주 듣던 노래를 메모와 함께 모아요',
    status:      'experimental',
  },
];

export default registry;
