import { resetMockDb } from '../../../__mocks__/firebase';
import { addSong } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

const BASE = {
  coupleId: 'couple1',
  addedBy:  'user1',
  title:    '봄날',
  artist:   'BTS',
};

beforeEach(() => resetMockDb());

describe('[BR-1/2/5] addSong', () => {
  test('[BR-5] 결과에 id, coupleId, title, artist, createdAt 포함', async () => {
    const result = await addSong(BASE);
    expect(result.id).toBeTruthy();
    expect(result.coupleId).toBe('couple1');
    expect(result.title).toBe('봄날');
    expect(result.artist).toBe('BTS');
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  test('period, memo 있는 경우 포함', async () => {
    const result = await addSong({ ...BASE, period: '2022 여름', memo: '드라이브할 때 들었어' });
    expect(result.period).toBe('2022 여름');
    expect(result.memo).toBe('드라이브할 때 들었어');
  });

  test('period, memo 없으면 undefined', async () => {
    const result = await addSong(BASE);
    expect(result.period).toBeUndefined();
    expect(result.memo).toBeUndefined();
  });

  test('period 공백만 입력하면 undefined로 저장', async () => {
    const result = await addSong({ ...BASE, period: '   ' });
    expect(result.period).toBeUndefined();
  });

  test('[BR-5] 여러 곡 추가 시 각각 다른 id', async () => {
    const r1 = await addSong(BASE);
    const r2 = await addSong({ ...BASE, title: 'Dynamite' });
    expect(r1.id).not.toBe(r2.id);
  });
});
