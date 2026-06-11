import { getMockDb,resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { setFeatureEnabled, subscribeFeatureSettings } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

describe('setFeatureEnabled', () => {
  test('[BR-L2] enabled:true 저장 시 Firestore 문서에 필드 반영', async () => {
    await setFeatureEnabled('couple1', 'couple-bingo', true);
    const saved = getMockDb().get('featureSettings/couple1_couple-bingo');
    expect(saved).toMatchObject({ coupleId: 'couple1', featureId: 'couple-bingo', enabled: true });
  });

  test('[BR-L2] enabled:false 저장 시 문서 덮어씀', async () => {
    await setFeatureEnabled('couple1', 'couple-bingo', true);
    await setFeatureEnabled('couple1', 'couple-bingo', false);
    const saved = getMockDb().get('featureSettings/couple1_couple-bingo');
    expect(saved?.enabled).toBe(false);
  });
});

describe('subscribeFeatureSettings', () => {
  test('[BR-L2] 문서 없으면 빈 객체 반환 — 모든 기능 OFF 기본값', () => {
    const cb = jest.fn();
    subscribeFeatureSettings('couple1', cb);
    expect(cb).toHaveBeenCalledWith({});
  });

  test('[BR-L3] 저장된 featureSettings를 featureId→enabled 맵으로 반환', () => {
    seedMockDb('featureSettings/couple1_couple-bingo',  { coupleId: 'couple1', featureId: 'couple-bingo',  enabled: true  });
    seedMockDb('featureSettings/couple1_date-decision', { coupleId: 'couple1', featureId: 'date-decision', enabled: false });

    const cb = jest.fn();
    subscribeFeatureSettings('couple1', cb);
    expect(cb).toHaveBeenCalledWith({ 'couple-bingo': true, 'date-decision': false });
  });

  test('[BR-L3] 다른 커플 설정은 포함하지 않음', () => {
    seedMockDb('featureSettings/coupleX_couple-bingo', { coupleId: 'coupleX', featureId: 'couple-bingo', enabled: true });
    seedMockDb('featureSettings/couple1_date-decision', { coupleId: 'couple1', featureId: 'date-decision', enabled: true });

    const cb = jest.fn();
    subscribeFeatureSettings('couple1', cb);
    const result = cb.mock.calls[0][0] as Record<string, boolean>;
    expect(result['couple-bingo']).toBeUndefined();
    expect(result['date-decision']).toBe(true);
  });
});
