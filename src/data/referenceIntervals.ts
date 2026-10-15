// 참고구간 데이터 — 공표된 구간만 그대로 옮긴다 (외삽·보간 없음)
//
// 기본 출처: RCPA Manual, Table 6 – Harmonised reference intervals for chemical pathology
// TODO(verify): 이 작업 환경의 네트워크 정책으로 rcpa.edu.au 원문 페이지를 직접 열 수 없었다.
//   아래 값은 웹 검색 결과에 인용된 Table 6 발췌(분석물·LOINC(LN-RCPA)·나이 구간·상하한)를
//   옮긴 것이므로, 배포 전 원문과 한 줄씩 대조해야 한다.
// 원문에서 확인하지 못한 분석물(ALT, AST, GGT, LD, 빌리루빈, 알부민, 요소, 중탄산염 등)과
// 18세 미만 소아 구간은 넣지 않았다 (README의 "데이터 공백" 참고).

import type { Source } from './analytes';

export type Sex = 'M' | 'F';
export type Specimen = 'serum' | 'plasma';

export interface ReferenceInterval {
  analyteId: string;
  /** 'all' 이면 성별 무관 */
  sex: Sex | 'all';
  /** 나이 구간 [ageMin, ageMax) — 년 */
  ageMin: number;
  ageMax: number;
  specimens: Specimen[];
  low: number;
  high: number;
  /** 분석물 단위 id (src/data/analytes.ts) */
  unitId: string;
  unitLabel: string;
  loinc?: string;
  note?: string;
  source: Source;
  verified: false;
}

export const RCPA_TABLE6: Source = {
  label: 'RCPA Manual – Table 6: Harmonised reference intervals for chemical pathology',
  url: 'https://www.rcpa.edu.au/Manuals/RCPA-Manual/General-Information/IG/Table-6-Harmonised-reference-intervals-for-chem',
};

export const CALIPER: Source = {
  label: 'CALIPER – Canadian Laboratory Initiative on Paediatric Reference Intervals',
  url: 'https://caliperproject.ca',
};

const SP: Specimen[] = ['serum', 'plasma'];

const ri = (
  analyteId: string,
  sex: Sex | 'all',
  ageMin: number,
  ageMax: number,
  low: number,
  high: number,
  unitId: string,
  unitLabel: string,
  extra: Partial<ReferenceInterval> = {},
): ReferenceInterval => ({
  analyteId,
  sex,
  ageMin,
  ageMax,
  specimens: SP,
  low,
  high,
  unitId,
  unitLabel,
  source: RCPA_TABLE6,
  verified: false,
  ...extra,
});

export const REFERENCE_INTERVALS: ReferenceInterval[] = [
  ri('sodium', 'all', 18, 120, 135, 145, 'mmol/L', 'mmol/L', { loinc: '2951-2' }),
  ri('potassium', 'all', 18, 120, 3.5, 5.2, 'mmol/L', 'mmol/L', {
    loinc: '2823-3',
    note: 'Table 6 주석: 혈청 기준. 헤파린 혈장에도 같은 구간을 적용할 수 있으나 헤파린 혈장만 쓰는 검사실은 더 낮은 구간을 택할 수 있음.',
  }),
  ri('chloride', 'all', 18, 120, 95, 110, 'mmol/L', 'mmol/L', { loinc: '2075-0' }),
  ri('calcium', 'all', 18, 120, 2.1, 2.6, 'mmol/L', 'mmol/L', { loinc: '2000-8' }),
  ri('phosphate', 'all', 18, 20, 0.75, 1.65, 'mmol/L', 'mmol/L'),
  ri('phosphate', 'all', 20, 120, 0.75, 1.5, 'mmol/L', 'mmol/L'),
  ri('magnesium', 'all', 18, 120, 0.7, 1.1, 'mmol/L', 'mmol/L', { loinc: '2601-3' }),
  ri('creatinine', 'M', 15, 19, 50, 100, 'umol/L', 'µmol/L', {
    loinc: '14682-9',
    note: 'Table 6 주석: Vitros 효소법 기준.',
  }),
  ri('creatinine', 'F', 15, 19, 38, 82, 'umol/L', 'µmol/L', {
    loinc: '14682-9',
    note: 'Table 6 주석: Vitros 효소법 기준.',
  }),
  ri('creatinine', 'M', 19, 60, 60, 110, 'umol/L', 'µmol/L', {
    loinc: '14682-9',
    note: '조화 구간은 60세 미만까지만 공표됨. 60세 이상은 검사실 자체 구간을 따른다.',
  }),
  ri('creatinine', 'F', 19, 60, 45, 90, 'umol/L', 'µmol/L', {
    loinc: '14682-9',
    note: '조화 구간은 60세 미만까지만 공표됨. 60세 이상은 검사실 자체 구간을 따른다.',
  }),
  ri('alp', 'all', 22, 120, 30, 110, 'U/L', 'U/L'),
  ri('total-protein', 'all', 18, 120, 60, 80, 'g/L', 'g/L', { loinc: '2885-2' }),
];

export const SPECIMEN_LABEL: Record<Specimen, string> = {
  serum: '혈청 (serum)',
  plasma: '혈장 (plasma)',
};

export interface LookupQuery {
  analyteId: string;
  age: number;
  sex: Sex;
  specimen: Specimen;
}

/** 조건에 정확히 들어맞는 공표 구간만 반환 (외삽하지 않음) */
export function lookupInterval(q: LookupQuery): ReferenceInterval | undefined {
  return REFERENCE_INTERVALS.find(
    (r) =>
      r.analyteId === q.analyteId &&
      (r.sex === 'all' || r.sex === q.sex) &&
      r.specimens.includes(q.specimen) &&
      q.age >= r.ageMin &&
      q.age < r.ageMax,
  );
}

export function intervalsFor(analyteId: string): ReferenceInterval[] {
  return REFERENCE_INTERVALS.filter((r) => r.analyteId === analyteId);
}

export type Flag = 'low' | 'normal' | 'high';

/** 상하한 포함(닫힌 구간)으로 판정 */
export function classify(value: number, r: Pick<ReferenceInterval, 'low' | 'high'>): Flag {
  if (value < r.low) return 'low';
  if (value > r.high) return 'high';
  return 'normal';
}
