import { describe, expect, it } from 'vitest';
import { ANALYTES } from '../src/data/analytes';
import { classify, lookupInterval, REFERENCE_INTERVALS } from '../src/data/referenceIntervals';

describe('참고구간 조회', () => {
  it('성인 남성 크레아티닌 19–<60세: 60–110 µmol/L', () => {
    const r = lookupInterval({ analyteId: 'creatinine', age: 45, sex: 'M', specimen: 'serum' });
    expect(r).toMatchObject({ low: 60, high: 110, unitId: 'umol/L' });
  });
  it('성인 여성 크레아티닌: 45–90 µmol/L', () => {
    const r = lookupInterval({ analyteId: 'creatinine', age: 30, sex: 'F', specimen: 'plasma' });
    expect(r).toMatchObject({ low: 45, high: 90 });
  });
  it('60세 이상 크레아티닌은 공표 구간이 없으므로 외삽하지 않는다', () => {
    expect(lookupInterval({ analyteId: 'creatinine', age: 65, sex: 'M', specimen: 'serum' })).toBeUndefined();
  });
  it('소아(10세) 나트륨은 데이터가 없으므로 undefined', () => {
    expect(lookupInterval({ analyteId: 'sodium', age: 10, sex: 'F', specimen: 'serum' })).toBeUndefined();
  });
  it('인: 18–<20세와 20세 이상 구간이 구분된다', () => {
    expect(lookupInterval({ analyteId: 'phosphate', age: 19, sex: 'M', specimen: 'serum' })?.high).toBe(1.65);
    expect(lookupInterval({ analyteId: 'phosphate', age: 20, sex: 'M', specimen: 'serum' })?.high).toBe(1.5);
  });
  it('ALP는 22세부터만 공표 → 20세는 없음', () => {
    expect(lookupInterval({ analyteId: 'alp', age: 20, sex: 'M', specimen: 'serum' })).toBeUndefined();
    expect(lookupInterval({ analyteId: 'alp', age: 22, sex: 'M', specimen: 'serum' })).toBeDefined();
  });
  it('데이터 무결성: 분석물·단위 id가 실제 정의와 일치, low < high', () => {
    for (const r of REFERENCE_INTERVALS) {
      const a = ANALYTES.find((x) => x.id === r.analyteId);
      expect(a, r.analyteId).toBeDefined();
      expect(a!.units.map((u) => u.id)).toContain(r.unitId);
      expect(r.low).toBeLessThan(r.high);
      expect(r.ageMin).toBeLessThan(r.ageMax);
    }
  });
  it('같은 분석물·성별 구간끼리 나이가 겹치지 않는다', () => {
    for (const a of REFERENCE_INTERVALS)
      for (const b of REFERENCE_INTERVALS) {
        if (a === b || a.analyteId !== b.analyteId) continue;
        if (a.sex !== 'all' && b.sex !== 'all' && a.sex !== b.sex) continue;
        expect(a.ageMax <= b.ageMin || b.ageMax <= a.ageMin).toBe(true);
      }
  });
});

describe('판정', () => {
  const r = { low: 3.5, high: 5.2 };
  it.each([
    [3.4, 'low'],
    [3.5, 'normal'],
    [5.2, 'normal'],
    [5.3, 'high'],
  ] as const)('%f → %s', (v, f) => {
    expect(classify(v, r)).toBe(f);
  });
});
