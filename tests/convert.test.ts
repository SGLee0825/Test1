import { describe, expect, it } from 'vitest';
import { ANALYTES, getAnalyte, searchAnalytes } from '../src/data/analytes';
import { molarMass, parseFormula } from '../src/lib/chem';
import { convert, type ConversionOk } from '../src/lib/convert';
import { NBME_PAIRS, TABLE_FACTORS } from './crossValidation';

const ok = (r: ReturnType<typeof convert>): ConversionOk => {
  if (!r.ok) throw new Error(`expected ok, got: ${r.reason} ${r.detail ?? ''}`);
  return r;
};
const conv = (id: string, v: number, f: string, t: string) => convert(getAnalyte(id), v, f, t);

describe('분자량 (IUPAC 원자량으로 계산)', () => {
  it('분자식 파싱', () => {
    expect(parseFormula('C6H12O6')).toEqual({ C: 6, H: 12, O: 6 });
    expect(parseFormula('Ca')).toEqual({ Ca: 1 });
    expect(() => parseFormula('C6H12O6)')).toThrow();
    expect(() => parseFormula('Xx2')).toThrow();
  });
  it.each([
    ['C6H12O6', 180.156],
    ['C4H7N3O', 113.12],
    ['CH4N2O', 60.056],
    ['C5H4N4O3', 168.112],
    ['C27H46O', 386.664],
    ['C33H36N4O6', 584.673],
    ['C57H104O6', 885.449],
  ])('%s ≈ %f g/mol', (f, mw) => {
    expect(molarMass(f)).toBeCloseTo(mw, 2);
  });
});

describe('UCUM 스케일 변환', () => {
  it('g/dL → g/L = ×10', () => {
    const r = ok(conv('albumin', 4.2, 'g/dL', 'g/L'));
    expect(r.value).toBeCloseTo(42, 10);
    expect(r.method).toBe('ucum-scale');
  });
  it('U/L → µkat/L = ÷60', () => {
    expect(ok(conv('alt', 60, 'U/L', 'ukat/L')).value).toBeCloseTo(1, 10);
  });
  it('동일 단위는 그대로', () => {
    const r = ok(conv('glucose', 5, 'mmol/L', 'mmol/L'));
    expect(r.value).toBe(5);
    expect(r.method).toBe('identity');
  });
});

describe('분자량 기반 질량 ↔ 몰 변환', () => {
  it('포도당 100 mg/dL → 5.551 mmol/L', () => {
    const r = ok(conv('glucose', 100, 'mg/dL', 'mmol/L'));
    expect(r.value).toBeCloseTo(1000 / 180.156, 6);
    expect(r.method).toBe('ucum-molar');
    expect(r.formula).toContain('÷ 180.156');
  });
  it('크레아티닌 1 mg/dL → 88.40 µmol/L', () => {
    expect(ok(conv('creatinine', 1, 'mg/dL', 'umol/L')).value).toBeCloseTo(88.4017, 3);
  });
  it('왕복 변환 시 원래 값으로 돌아온다', () => {
    for (const a of ANALYTES) {
      if (a.specialOnly) continue;
      for (const f of a.units)
        for (const t of a.units) {
          const fwd = ok(convert(a, 7.3, f.id, t.id));
          const back = ok(convert(a, fwd.value, t.id, f.id));
          expect(back.value).toBeCloseTo(7.3, 9);
        }
    }
  });
});

describe('이온 전하 기반 mEq 변환', () => {
  it('칼슘 10 mg/dL → 2.495 mmol/L → 4.990 mEq/L', () => {
    expect(ok(conv('calcium', 10, 'mg/dL', 'mmol/L')).value).toBeCloseTo(2.4951, 4);
    const r = ok(conv('calcium', 10, 'mg/dL', 'meq/L'));
    expect(r.value).toBeCloseTo(4.9903, 4);
    expect(r.methodLabel).toContain('이온 전하');
  });
  it('마그네슘 2 mEq/L → 1 mmol/L', () => {
    const r = ok(conv('magnesium', 2, 'meq/L', 'mmol/L'));
    expect(r.value).toBeCloseTo(1, 10);
    expect(r.method).toBe('ucum-equivalent');
  });
  it('나트륨 1가: mEq/L = mmol/L', () => {
    expect(ok(conv('sodium', 140, 'meq/L', 'mmol/L')).value).toBeCloseTo(140, 10);
  });
});

describe('특수 변환', () => {
  it('HbA1c NGSP 6.5 % → IFCC 47.5 mmol/mol', () => {
    const r = ok(conv('hba1c', 6.5, 'ngsp', 'ifcc'));
    expect(r.value).toBeCloseTo((6.5 - 2.152) / 0.09148, 9);
    expect(Math.round(r.value)).toBe(48);
    expect(r.method).toBe('special');
    expect(r.sources[0].url).toContain('ngsp.org');
  });
  it('HbA1c IFCC 48 mmol/mol → NGSP 6.54 %', () => {
    expect(ok(conv('hba1c', 48, 'ifcc', 'ngsp')).value).toBeCloseTo(0.09148 * 48 + 2.152, 9);
  });
  it('HbA1c 는 UCUM 의 %→mmol/mol (×10) 을 쓰지 않는다', () => {
    expect(ok(conv('hba1c', 6.5, 'ngsp', 'ifcc')).value).not.toBeCloseTo(65, 0);
  });
  it('반올림된 역식(IFCC = 10.93×NGSP − 23.5)과 0.1 mmol/mol 이내로 일치', () => {
    for (const x of [5, 6.5, 8, 10]) {
      expect(Math.abs(ok(conv('hba1c', x, 'ngsp', 'ifcc')).value - (10.93 * x - 23.5))).toBeLessThan(0.1);
    }
  });
  it('uACR: KDIGO 범주 경계 30 mg/g ≈ 3 mg/mmol, 300 mg/g ≈ 30 mg/mmol (KDIGO는 반올림 표기)', () => {
    const a = ok(conv('uacr', 30, 'mg/g', 'mg/mmol')).value;
    const b = ok(conv('uacr', 300, 'mg/g', 'mg/mmol')).value;
    expect(a).toBeCloseTo(30 / (1000 / molarMass('C4H7N3O')), 9);
    expect(a).toBeGreaterThan(3);
    expect(a).toBeLessThan(3.5);
    expect(b).toBeGreaterThan(30);
    expect(b).toBeLessThan(35);
  });
  it('uPCR mg/mmol → mg/g 는 ×8.84 근처', () => {
    expect(ok(conv('upcr', 1, 'mg/mmol', 'mg/g')).value).toBeCloseTo(8.84, 2);
  });
  it('BUN 14 mg/dL → 요소 5.0 mmol/L (N₂ 기준), → 요소 30.0 mg/dL', () => {
    const m = ok(conv('urea', 14, 'bun-mg/dL', 'mmol/L'));
    expect(m.value).toBeCloseTo(140 / 28.014, 6);
    const u = ok(conv('urea', 14, 'bun-mg/dL', 'urea-mg/dL'));
    expect(u.value).toBeCloseTo((14 * 60.056) / 28.014, 4);
    expect(u.method).toBe('ucum-two-step');
  });
  it('중성지방은 트리올레인 가정을 근거에 표시', () => {
    const r = ok(conv('triglycerides', 150, 'mg/dL', 'mmol/L'));
    expect(r.assumptions.join(' ')).toContain('트리올레인');
  });
});

describe('근거 없는 변환 거부', () => {
  it('포도당 mg/dL → U/L: 차원 불일치로 거부', () => {
    const r = conv('glucose', 100, 'mg/dL', 'U/L');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('차원');
  });
  it('ALT U/L → mg/dL 거부', () => {
    expect(conv('alt', 30, 'U/L', 'mg/dL').ok).toBe(false);
  });
  it('알부민 g/dL → mmol/L: 분자량 근거 없음', () => {
    const r = conv('albumin', 4, 'g/dL', 'mmol/L');
    expect(r.ok).toBe(false);
  });
  it('HbA1c % → mg/dL 거부', () => {
    expect(conv('hba1c', 6.5, 'ngsp', 'mg/dL').ok).toBe(false);
  });
  it('HbA1c % → ‰ 처럼 UCUM 상 가능하지만 공표 공식이 없는 단위는 거부', () => {
    expect(conv('hba1c', 6.5, 'ngsp', '[ppth]').ok).toBe(false);
  });
  it('UCUM 이 해석하지 못하는 단위 거부', () => {
    const r = conv('glucose', 100, 'mg/dL', 'mgg/dLL');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('UCUM');
  });
  it('숫자가 아닌 값 거부', () => {
    expect(conv('glucose', NaN, 'mg/dL', 'mmol/L').ok).toBe(false);
  });
});

describe('검색', () => {
  it.each([
    ['크레아', 'creatinine'],
    ['BUN', 'urea'],
    ['got', 'ast'],
    ['당화', 'hba1c'],
    ['acr', 'uacr'],
    ['중성지방', 'triglycerides'],
  ])('"%s" → %s', (q, id) => {
    expect(searchAnalytes(q).map((a) => a.id)).toContain(id);
  });
});

describe('교차 검증: 외부 변환표 (앱에는 포함하지 않음)', () => {
  it.each(TABLE_FACTORS)('$analyteId $from→$to ≈ $factor ($source)', (row) => {
    const r = ok(conv(row.analyteId, 1, row.from, row.to));
    // 표 계수는 3~4 유효숫자로 반올림되어 있으므로 상대오차 0.5% 이내를 일치로 본다
    expect(Math.abs(r.factor - row.factor) / row.factor).toBeLessThan(0.005);
  });
  it.each(NBME_PAIRS)('NBME $analyteId 구간 환산', (row) => {
    row.conv.forEach((c, i) => {
      const v = ok(conv(row.analyteId, c, row.from, row.to)).value;
      expect(Math.abs(v - row.si[i])).toBeLessThanOrEqual(row.tol);
    });
  });
});
