import { resetMockDb, getMockDb } from '../../../__mocks__/firebase';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

import { addWishlistItem, toggleReceived, deleteWishlistItem } from '../index';

beforeEach(() => resetMockDb());

describe('addWishlistItem', () => {
  it('[BR-GW1] 61자 reject', async () => {
    await expect(
      addWishlistItem('c1', 'u1', 'a'.repeat(61)),
    ).rejects.toThrow('1~60자');
  });

  it('[BR-GW1] 공백만 reject', async () => {
    await expect(
      addWishlistItem('c1', 'u1', '   '),
    ).rejects.toThrow('1~60자');
  });

  it('[BR-GW2] memo, priceRange 저장 확인', async () => {
    await addWishlistItem('c1', 'u1', '에어팟', '퀄리티 좋은 것', '~30만원대');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('wishlistItems/'));
    expect(docs[0]![1].memo).toBe('퀄리티 좋은 것');
    expect(docs[0]![1].priceRange).toBe('~30만원대');
  });

  it('[BR-GW3] addedBy 필드 확인', async () => {
    await addWishlistItem('c1', 'myUid', '선물');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('wishlistItems/'));
    expect(docs[0]![1].addedBy).toBe('myUid');
    expect(docs[0]![1].received).toBe(false);
  });

  it('[BR-GW4] toggleReceived true → false 토글', async () => {
    await addWishlistItem('c1', 'u1', '선물');
    const db1 = getMockDb();
    const id  = [...db1.entries()].filter(([k]) => k.startsWith('wishlistItems/'))[0]![0].split('/')[1]!;
    await toggleReceived(id, true);
    const db2 = getMockDb();
    expect(db2.get(`wishlistItems/${id}`)?.received).toBe(true);
    await toggleReceived(id, false);
    const db3 = getMockDb();
    expect(db3.get(`wishlistItems/${id}`)?.received).toBe(false);
  });

  it('[BR-GW6] deleteWishlistItem 후 삭제', async () => {
    await addWishlistItem('c1', 'u1', '삭제할 선물');
    const db1 = getMockDb();
    const id  = [...db1.entries()].filter(([k]) => k.startsWith('wishlistItems/'))[0]![0].split('/')[1]!;
    await deleteWishlistItem(id);
    const db2 = getMockDb();
    expect([...db2.entries()].filter(([k]) => k.startsWith('wishlistItems/'))).toHaveLength(0);
  });
});
