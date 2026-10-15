import ucum from '@lhncbc/ucum-lhc';
import {
  type Analyte,
  type Source,
  type UnitOption,
  NGSP_SOURCE,
  UCUM_SOURCE,
} from '../data/analytes';
import { IUPAC_SOURCE, molarMass } from './chem';

const utils = ucum.UcumLhcUtils.getInstance();

export type Method =
  | 'identity'
  | 'ucum-scale'
  | 'ucum-molar'
  | 'ucum-equivalent'
  | 'ucum-two-step'
  | 'special';

export interface ConversionOk {
  ok: true;
  value: number;
  /** y = factor·x + offset */
  factor: number;
  offset: number;
  method: Method;
  methodLabel: string;
  formula: string;
  steps: string[];
  assumptions: string[];
  sources: Source[];
}

export interface ConversionError {
  ok: false;
  reason: string;
  detail?: string;
}

export type ConversionResult = ConversionOk | ConversionError;

/** 분석물 목록에 없는 단위를 UCUM 코드로 직접 입력할 때 */
export function customUnit(code: string): UnitOption {
  const c = code.trim();
  return { id: `custom:${c}`, code: c, label: c };
}

export function findUnit(analyte: Analyte, idOrCode: string): UnitOption {
  return (
    analyte.units.find((u) => u.id === idOrCode) ??
    analyte.units.find((u) => u.code === idOrCode) ??
    customUnit(idOrCode)
  );
}

export function validateUnit(code: string): { valid: boolean; msg: string } {
  if (!code.trim()) return { valid: false, msg: '단위가 비어 있음' };
  const r = utils.validateUnitString(code.trim());
  return { valid: r.status === 'valid', msg: r.msg.join(' ') };
}

function ucumConvert(
  from: string,
  value: number,
  to: string,
  opts: { molecularWeight?: number; charge?: number } = {},
): number | null {
  const r = utils.convertUnitTo(from, value, to, {
    molecularWeight: opts.molecularWeight ?? null,
    charge: opts.charge ?? null,
  });
  return r.status === 'succeeded' && r.toVal !== null ? r.toVal : null;
}

function ucumMessage(from: string, to: string, opts: { molecularWeight?: number; charge?: number } = {}) {
  return utils
    .convertUnitTo(from, 1, to, {
      molecularWeight: opts.molecularWeight ?? null,
      charge: opts.charge ?? null,
    })
    .msg.join(' ');
}

export const fmt = (n: number, sig = 6) => {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return '0';
  const s = Number(n.toPrecision(sig));
  return Math.abs(s) >= 1e6 || Math.abs(s) < 1e-4 ? s.toExponential(sig - 1) : String(s);
};

const mwOf = (analyte: Analyte, unit: UnitOption): number | undefined =>
  unit.basisFormula
    ? molarMass(unit.basisFormula)
    : analyte.formula
      ? molarMass(analyte.formula)
      : undefined;

// ───────── 특수 변환 ─────────

interface Special {
  analyteId: string;
  from: string;
  to: string;
  apply: (x: number) => number;
  factor: number;
  offset: number;
  formula: string;
  steps: string[];
  sources: Source[];
  assumptions: string[];
}

// NGSP master equation: NGSP(%) = 0.09148 × IFCC(mmol/mol) + 2.152
// 역방향은 같은 식을 대수적으로 푼 것 (반올림된 10.93·x − 23.5 대신 정확한 역함수 사용)
const NGSP_SLOPE = 0.09148;
const NGSP_INTERCEPT = 2.152;

const SPECIALS: Special[] = [
  {
    analyteId: 'hba1c',
    from: 'ngsp',
    to: 'ifcc',
    apply: (x) => (x - NGSP_INTERCEPT) / NGSP_SLOPE,
    factor: 1 / NGSP_SLOPE,
    offset: -NGSP_INTERCEPT / NGSP_SLOPE,
    formula: `IFCC (mmol/mol) = (NGSP % − ${NGSP_INTERCEPT}) ÷ ${NGSP_SLOPE}`,
    steps: [
      `NGSP–IFCC master equation: NGSP(%) = ${NGSP_SLOPE} × IFCC(mmol/mol) + ${NGSP_INTERCEPT}`,
      '이를 IFCC에 대해 풀어 사용 (역함수)',
    ],
    sources: [NGSP_SOURCE],
    assumptions: [
      '% 와 mmol/mol 은 UCUM 상 둘 다 무차원이지만 HbA1c 에서는 단순 배수(×10) 관계가 아니므로 UCUM 스케일 변환을 쓰지 않는다.',
    ],
  },
  {
    analyteId: 'hba1c',
    from: 'ifcc',
    to: 'ngsp',
    apply: (x) => NGSP_SLOPE * x + NGSP_INTERCEPT,
    factor: NGSP_SLOPE,
    offset: NGSP_INTERCEPT,
    formula: `NGSP (%) = ${NGSP_SLOPE} × IFCC (mmol/mol) + ${NGSP_INTERCEPT}`,
    steps: [`NGSP–IFCC master equation 그대로 적용`],
    sources: [NGSP_SOURCE],
    assumptions: [],
  },
];

// ───────── 메인 변환 ─────────

export function convert(
  analyte: Analyte,
  value: number,
  fromIdOrCode: string,
  toIdOrCode: string,
): ConversionResult {
  if (!Number.isFinite(value)) return { ok: false, reason: '값이 숫자가 아닙니다.' };
  const from = findUnit(analyte, fromIdOrCode);
  const to = findUnit(analyte, toIdOrCode);

  for (const u of [from, to]) {
    const v = validateUnit(u.code);
    if (!v.valid) {
      return { ok: false, reason: `UCUM 으로 해석할 수 없는 단위: "${u.code}"`, detail: v.msg };
    }
  }

  const baseSources = [...(analyte.sources ?? [])];
  const baseAssumptions = [...(analyte.assumptions ?? [])];

  if (from.id === to.id) {
    return {
      ok: true,
      value,
      factor: 1,
      offset: 0,
      method: 'identity',
      methodLabel: '동일 단위',
      formula: 'y = x',
      steps: [],
      assumptions: [],
      sources: [],
    };
  }

  const special = SPECIALS.find(
    (s) => s.analyteId === analyte.id && s.from === from.id && s.to === to.id,
  );
  if (special) {
    return {
      ok: true,
      value: special.apply(value),
      factor: special.factor,
      offset: special.offset,
      method: 'special',
      methodLabel: '특수 변환 (공표 공식)',
      formula: special.formula,
      steps: special.steps,
      assumptions: [...special.assumptions, ...baseAssumptions],
      sources: [...special.sources, ...baseSources],
    };
  }

  const fromKnown = analyte.units.some((u) => u.id === from.id);
  const toKnown = analyte.units.some((u) => u.id === to.id);
  const mwFrom = mwOf(analyte, from);
  const mwTo = mwOf(analyte, to);
  const charge = analyte.charge;

  if (!fromKnown || !toKnown) {
    const bad = !fromKnown ? from : to;
    const dimOk =
      ucumConvert(from.code, 1, to.code, { molecularWeight: mwFrom ?? mwTo, charge }) !== null;
    if (!dimOk) {
      return {
        ok: false,
        reason: `${from.code} → ${to.code} 변환 근거 없음: UCUM 차원 검사에서 두 단위의 물리량(차원)이 다릅니다.`,
        detail: ucumMessage(from.code, to.code, { molecularWeight: mwFrom ?? mwTo, charge }),
      };
    }
    return {
      ok: false,
      reason: `"${bad.code}" 는 ${analyte.en} 에 대해 정의된 보고 단위가 아니어서 변환 근거를 제시할 수 없습니다.`,
      detail: analyte.specialOnly ? analyte.noMolarReason : undefined,
    };
  }

  if (analyte.specialOnly) {
    return { ok: false, reason: '이 분석물에는 해당 방향의 공표 공식이 없습니다.', detail: analyte.noMolarReason };
  }

  // 1) 순수 UCUM 스케일 변환 (같은 차원)
  const plain = ucumConvert(from.code, 1, to.code);
  if (plain !== null && mwFrom === mwTo) {
    return {
      ok: true,
      value: ucumConvert(from.code, value, to.code)!,
      factor: plain,
      offset: 0,
      method: 'ucum-scale',
      methodLabel: 'UCUM 스케일 변환 (같은 차원)',
      formula: `y = x × ${fmt(plain)}`,
      steps: [`UCUM: 1 ${from.label} = ${fmt(plain)} ${to.label}`],
      assumptions: baseAssumptions,
      sources: [UCUM_SOURCE, ...baseSources],
    };
  }

  // 2) 서로 다른 기준 물질 (예: BUN 질소 질량 ↔ 요소 질량): 몰농도를 거쳐 두 단계 변환
  if (mwFrom !== undefined && mwTo !== undefined && mwFrom !== mwTo) {
    const pivot = 'mmol/L';
    const k1 = ucumConvert(from.code, 1, pivot, { molecularWeight: mwFrom });
    const k2 = ucumConvert(pivot, 1, to.code, { molecularWeight: mwTo });
    if (k1 === null || k2 === null) {
      return { ok: false, reason: '두 단계 변환 실패', detail: ucumMessage(from.code, pivot) };
    }
    const factor = k1 * k2;
    return {
      ok: true,
      value: value * factor,
      factor,
      offset: 0,
      method: 'ucum-two-step',
      methodLabel: 'UCUM + 분자량 (기준 물질이 다른 두 단계 변환)',
      formula: `y = x × ${fmt(k1)} × ${fmt(k2)} = x × ${fmt(factor)}`,
      steps: [
        `${from.label}: 기준 분자량 ${fmt(mwFrom, 7)} g/mol${from.basisFormula ? ` (${from.basisFormula})` : ''} → 1 ${from.label} = ${fmt(k1)} mmol/L`,
        `${to.label}: 기준 분자량 ${fmt(mwTo, 7)} g/mol${to.basisFormula ? ` (${to.basisFormula})` : ''} → 1 mmol/L = ${fmt(k2)} ${to.label}`,
        ...[from.basisNote, to.basisNote].filter((s): s is string => !!s),
      ],
      assumptions: baseAssumptions,
      sources: [UCUM_SOURCE, IUPAC_SOURCE, ...baseSources],
    };
  }

  // 3) 분자량 / 전하가 필요한 변환
  const mw = mwFrom ?? mwTo;
  const full = ucumConvert(from.code, 1, to.code, { molecularWeight: mw, charge });
  if (full === null) {
    const msg = ucumMessage(from.code, to.code, { molecularWeight: mw, charge });
    if (/molecular weight/i.test(msg) && mw === undefined) {
      return {
        ok: false,
        reason: `${from.label} ↔ ${to.label}: 질량↔몰 변환에 필요한 분자량 근거가 없습니다.`,
        detail: analyte.noMolarReason ?? msg,
      };
    }
    if (/charge/i.test(msg) && charge === undefined) {
      return {
        ok: false,
        reason: `${from.label} ↔ ${to.label}: 당량(Eq) 변환에 필요한 이온 전하 근거가 없습니다.`,
        detail: msg,
      };
    }
    return {
      ok: false,
      reason: `${from.code} → ${to.code} 변환 근거 없음: UCUM 차원 검사에서 두 단위의 물리량(차원)이 다릅니다.`,
      detail: analyte.noMolarReason ? `${analyte.noMolarReason} (UCUM: ${msg})` : msg,
    };
  }

  // 분자량·전하 사용 여부와 지수를 수치적으로 판별 (y ∝ MW^a · z^b)
  const usedMW =
    mw !== undefined && ucumConvert(from.code, 1, to.code, { charge }) === null;
  const usedCharge =
    charge !== undefined && ucumConvert(from.code, 1, to.code, { molecularWeight: mw }) === null;
  const expMW = usedMW
    ? Math.round(Math.log2(ucumConvert(from.code, 1, to.code, { molecularWeight: mw! * 2, charge })! / full))
    : 0;
  const expZ = usedCharge
    ? Math.round(
        Math.log2(ucumConvert(from.code, 1, to.code, { molecularWeight: mw, charge: charge! * 2 })! / full),
      )
    : 0;
  const scale = full / (mw! ** expMW * (charge ?? 1) ** expZ);

  const parts = [`x × ${fmt(scale)}`];
  if (expMW === -1) parts.push(`÷ ${fmt(mw!, 7)}`);
  if (expMW === 1) parts.push(`× ${fmt(mw!, 7)}`);
  if (expZ === 1) parts.push(`× ${charge}`);
  if (expZ === -1) parts.push(`÷ ${charge}`);

  const steps: string[] = [`UCUM 차원 검사: ${from.label} → ${to.label} 는 ${usedMW ? '분자량' : ''}${usedMW && usedCharge ? '·' : ''}${usedCharge ? '이온 전하' : ''}가 있어야 연결됨`];
  if (usedMW) {
    steps.push(
      `분자량 = ${analyte.formulaLabel ?? analyte.formula} = ${fmt(mw!, 7)} g/mol (IUPAC 원자량으로 계산)`,
    );
  }
  if (usedCharge) steps.push(`이온 전하 |z| = ${charge} → 1 mmol = ${charge} mEq`);
  steps.push(`UCUM 접두어 스케일 계수 = ${fmt(scale)}`);

  return {
    ok: true,
    value: ucumConvert(from.code, value, to.code, { molecularWeight: mw, charge })!,
    factor: full,
    offset: 0,
    method: usedMW ? 'ucum-molar' : 'ucum-equivalent',
    methodLabel: usedMW
      ? usedCharge
        ? 'UCUM + 분자량 + 이온 전하'
        : 'UCUM + 분자량 (질량 ↔ 몰)'
      : 'UCUM + 이온 전하 (몰 ↔ 당량)',
    formula: `y = ${parts.join(' ')} = x × ${fmt(full)}`,
    steps,
    assumptions: baseAssumptions,
    sources: [UCUM_SOURCE, ...(usedMW ? [IUPAC_SOURCE] : []), ...baseSources],
  };
}
