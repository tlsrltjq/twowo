import { deleteObject } from 'firebase/storage';

import { getMockDb,resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { deleteEvent } from '../deleteEvent';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({
  deleteObject: jest.fn().mockResolvedValue(undefined),
  ref: jest.fn((_storage: any, path: string) => path),
}));
jest.mock('../../config/firebase', () => ({ db: {}, storage: {} }));

beforeEach(() => {
  resetMockDb();
  (deleteObject as jest.Mock).mockClear();
});

describe('[BR-8] deleteEvent — 이벤트 삭제 시 photos + Storage 일괄 정리', () => {
  test('사진 없는 이벤트 → calendarEvents 문서만 삭제', async () => {
    seedMockDb('calendarEvents/evt1', { title: '테스트', coupleId: 'c1' });

    await deleteEvent('evt1');

    const db = getMockDb();
    expect(db.has('calendarEvents/evt1')).toBe(false);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  test('사진 2장 이벤트 → Storage 4회 삭제 + photos 문서 2개 삭제 + calendarEvents 삭제', async () => {
    seedMockDb('calendarEvents/evt2', { title: '데이트', coupleId: 'c1' });
    seedMockDb('photos/p1', { eventId: 'evt2', storagePath: 'couples/c1/photos/p1.jpg', thumbnailPath: 'couples/c1/photos/p1_thumb.jpg' });
    seedMockDb('photos/p2', { eventId: 'evt2', storagePath: 'couples/c1/photos/p2.jpg', thumbnailPath: 'couples/c1/photos/p2_thumb.jpg' });

    await deleteEvent('evt2');

    const db = getMockDb();
    expect(db.has('calendarEvents/evt2')).toBe(false);
    expect(db.has('photos/p1')).toBe(false);
    expect(db.has('photos/p2')).toBe(false);
    expect(deleteObject).toHaveBeenCalledTimes(4);
    const deletedPaths = (deleteObject as jest.Mock).mock.calls.map((c: any[]) => c[0]);
    expect(deletedPaths).toContain('couples/c1/photos/p1.jpg');
    expect(deletedPaths).toContain('couples/c1/photos/p1_thumb.jpg');
    expect(deletedPaths).toContain('couples/c1/photos/p2.jpg');
    expect(deletedPaths).toContain('couples/c1/photos/p2_thumb.jpg');
  });

  test('Storage 삭제 실패해도 (allSettled) calendarEvents 문서 삭제됨', async () => {
    (deleteObject as jest.Mock).mockRejectedValueOnce(new Error('storage error'));
    seedMockDb('calendarEvents/evt3', { title: '운동', coupleId: 'c1' });
    seedMockDb('photos/p3', { eventId: 'evt3', storagePath: 'broken/path.jpg', thumbnailPath: 'broken/thumb.jpg' });

    await expect(deleteEvent('evt3')).resolves.toBeUndefined();

    const db = getMockDb();
    expect(db.has('calendarEvents/evt3')).toBe(false);
  });
});
