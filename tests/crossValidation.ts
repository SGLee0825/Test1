// 교차 검증 전용 데이터 — 앱 코드에서는 import 하지 않는다.
// 앱은 계수를 UCUM + 분자량으로 "계산"하고, 여기 적힌 외부 표의 값과 허용오차 내에서 일치하는지만 확인한다.
//
// TODO(verify): 작업 환경의 네트워크 정책으로 Labcorp SI Unit Conversion Table, CMEinfo 변환표 PDF,
//   NBME Laboratory Reference Values PDF 원문을 열지 못했다. 아래 Labcorp/CMEinfo 계수는 해당 표들에
//   널리 실린 관례 값(conventional → SI 배수)을 옮긴 것이고, NBME 값은 웹 검색 결과에 인용된 NBME
//   General Chemistry 표 발췌다. 원문 확보 후 한 줄씩 대조해야 한다.

export interface FactorRow {
  analyteId: string;
  from: string;
  to: string;
  factor: number;
  source: 'Labcorp' | 'CMEinfo' | 'Labcorp/CMEinfo';
}

export const TABLE_FACTORS: FactorRow[] = [
  { analyteId: 'glucose', from: 'mg/dL', to: 'mmol/L', factor: 0.0555, source: 'Labcorp/CMEinfo' },
  { analyteId: 'creatinine', from: 'mg/dL', to: 'umol/L', factor: 88.4, source: 'Labcorp/CMEinfo' },
  { analyteId: 'cholesterol', from: 'mg/dL', to: 'mmol/L', factor: 0.0259, source: 'Labcorp/CMEinfo' },
  { analyteId: 'triglycerides', from: 'mg/dL', to: 'mmol/L', factor: 0.0113, source: 'Labcorp/CMEinfo' },
  { analyteId: 'urea', from: 'bun-mg/dL', to: 'mmol/L', factor: 0.357, source: 'Labcorp/CMEinfo' },
  { analyteId: 'uric-acid', from: 'mg/dL', to: 'umol/L', factor: 59.48, source: 'Labcorp/CMEinfo' },
  { analyteId: 'bilirubin', from: 'mg/dL', to: 'umol/L', factor: 17.1, source: 'Labcorp/CMEinfo' },
  { analyteId: 'calcium', from: 'mg/dL', to: 'mmol/L', factor: 0.25, source: 'Labcorp/CMEinfo' },
  { analyteId: 'magnesium', from: 'mg/dL', to: 'mmol/L', factor: 0.4114, source: 'Labcorp/CMEinfo' },
  { analyteId: 'phosphate', from: 'mg/dL', to: 'mmol/L', factor: 0.3229, source: 'Labcorp/CMEinfo' },
  { analyteId: 'iron', from: 'ug/dL', to: 'umol/L', factor: 0.1791, source: 'Labcorp/CMEinfo' },
  { analyteId: 'albumin', from: 'g/dL', to: 'g/L', factor: 10, source: 'Labcorp/CMEinfo' },
  { analyteId: 'total-protein', from: 'g/dL', to: 'g/L', factor: 10, source: 'Labcorp/CMEinfo' },
  { analyteId: 'alt', from: 'U/L', to: 'ukat/L', factor: 0.0167, source: 'Labcorp/CMEinfo' },
];

/** NBME Laboratory Reference Values: 같은 구간의 conventional / SI 쌍 */
export interface PairRow {
  analyteId: string;
  from: string;
  to: string;
  conv: [number, number];
  si: [number, number];
  /** NBME 표 반올림을 감안한 절대 허용오차 (SI 단위) */
  tol: number;
}

export const NBME_PAIRS: PairRow[] = [
  { analyteId: 'creatinine', from: 'mg/dL', to: 'umol/L', conv: [0.6, 1.2], si: [53, 106], tol: 1 },
  { analyteId: 'glucose', from: 'mg/dL', to: 'mmol/L', conv: [70, 100], si: [3.8, 5.6], tol: 0.1 },
];
