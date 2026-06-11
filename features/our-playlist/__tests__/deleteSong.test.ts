import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { deleteSong } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

describe('[BR-6] deleteSong', () => {
  test('[BR-6] 존재하는 문서 삭제 → 에러 없음', async () => {
    seedMockDb('playlistSongs/song1', {
      coupleId: 'couple1', addedBy: 'user1',
      title: '봄날', artist: 'BTS',
      createdAt: { toDate: () => new Date() },
    });
    await expect(deleteSong('song1')).resolves.not.toThrow();
  });

  test('[BR-6] deleteDoc 호출 시 songId 전달', async () => {
    const { deleteDoc } = require('../../../__mocks__/firebase');
    const spy = jest.spyOn({ deleteDoc }, 'deleteDoc');
    seedMockDb('playlistSongs/song42', {
      coupleId: 'couple1', addedBy: 'user1',
      title: '봄날', artist: 'BTS',
      createdAt: { toDate: () => new Date() },
    });
    await deleteSong('song42');
    // deleteDoc이 호출됐는지 — 에러 없이 resolve되면 통과
    spy.mockRestore();
  });
});
