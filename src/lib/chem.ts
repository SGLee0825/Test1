// 분자식 → 분자량 계산 (IUPAC 원자량)
//
// 값은 IUPAC CIAAW "Standard atomic weights (abridged, 5 significant digits)"의
// 표준값/관례값(conventional value)이다. 구간으로 공표된 원소(H, C, N, O, Mg, Cl, S)는
// CIAAW가 제시한 관례값을 사용한다.
// TODO(verify): 컨테이너 네트워크 정책으로 ciaaw.org 원문을 열지 못해 개정 연도(2021/2023)별
// 마지막 자리 차이는 원문 대조가 필요하다.

export const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  Na: 22.99,
  Mg: 24.305,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  K: 39.098,
  Ca: 40.078,
  Fe: 55.845,
};

export const IUPAC_SOURCE = {
  label: 'IUPAC CIAAW 표준 원자량 (abridged)',
  url: 'https://www.ciaaw.org/atomic-weights.htm',
};

/** "C6H12O6" 같은 단순 분자식(괄호 미지원)을 원소별 개수로 분해한다. */
export function parseFormula(formula: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const re = /([A-Z][a-z]?)(\d*)/g;
  let consumed = 0;
  for (const m of formula.matchAll(re)) {
    if (m.index !== consumed) break;
    const [whole, el, n] = m;
    if (!(el in ATOMIC_WEIGHTS)) throw new Error(`원자량 표에 없는 원소: ${el}`);
    counts[el] = (counts[el] ?? 0) + (n ? Number(n) : 1);
    consumed += whole.length;
  }
  if (consumed !== formula.length || consumed === 0) {
    throw new Error(`해석할 수 없는 분자식: ${formula}`);
  }
  return counts;
}

/** 분자량 (g/mol) */
export function molarMass(formula: string): number {
  const counts = parseFormula(formula);
  let sum = 0;
  for (const [el, n] of Object.entries(counts)) sum += ATOMIC_WEIGHTS[el] * n;
  return sum;
}
