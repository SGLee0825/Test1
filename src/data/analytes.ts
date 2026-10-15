// 분석물 정의
// - 변환 계수는 여기에 적지 않는다. 분자식(→ IUPAC 원자량으로 분자량 계산), 이온 전하,
//   UCUM 단위 코드만 정의하고 계수는 src/lib/convert.ts 에서 UCUM으로 계산한다.

export interface Source {
  label: string;
  url: string;
}

export interface UnitOption {
  /** 분석물 내 고유 id */
  id: string;
  /** UCUM 코드 (ucum-lhc가 해석) */
  code: string;
  /** 화면 표시용 */
  label: string;
  /** 질량 단위의 기준 물질이 분석물 자체와 다를 때 (예: BUN은 질소 N2 기준) */
  basisFormula?: string;
  basisNote?: string;
}

export interface Analyte {
  id: string;
  en: string;
  ko: string;
  synonyms: string[];
  /** 분자량 계산용 분자식 (없으면 질량↔몰 변환을 거부) */
  formula?: string;
  formulaLabel?: string;
  /** 이온 전하의 절댓값 (mEq 변환용) */
  charge?: number;
  units: UnitOption[];
  defaultFrom: string;
  defaultTo: string;
  /** 특수 변환 공식만 허용 (UCUM 차원 변환 금지) */
  specialOnly?: boolean;
  assumptions?: string[];
  sources?: Source[];
  /** 질량↔몰 변환이 불가능한 이유 (formula 가 없을 때) */
  noMolarReason?: string;
}

export const UCUM_SOURCE: Source = {
  label: 'UCUM (ucum-lhc, NLM LHNCBC)',
  url: 'https://lhncbc.github.io/ucum-lhc/',
};
export const NGSP_SOURCE: Source = {
  // TODO(verify): ngsp.org 접속이 차단되어 원문 미확인 (웹 검색 발췌로 공식 확인)
  label: 'NGSP – IFCC Standardization of HbA1c (master equation)',
  url: 'https://ngsp.org/ifccngsp.asp',
};
export const KDIGO_SOURCE: Source = {
  // TODO(verify): kdigo.org 접속이 차단되어 2024 가이드라인 원문 미확인
  label: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD',
  url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
};

const MASS_MOLAR = (micro = false): UnitOption[] => [
  { id: 'mg/dL', code: 'mg/dL', label: 'mg/dL' },
  micro
    ? { id: 'umol/L', code: 'umol/L', label: 'µmol/L' }
    : { id: 'mmol/L', code: 'mmol/L', label: 'mmol/L' },
];

const ENZYME = (id: string, en: string, ko: string, synonyms: string[]): Analyte => ({
  id,
  en,
  ko,
  synonyms,
  units: [
    { id: 'U/L', code: 'U/L', label: 'U/L' },
    { id: 'ukat/L', code: 'ukat/L', label: 'µkat/L' },
  ],
  defaultFrom: 'U/L',
  defaultTo: 'ukat/L',
  noMolarReason: '효소는 촉매활성(U = µmol/min)으로 측정하며 질량·몰농도와 차원이 다르다.',
});

const ELECTROLYTE = (
  id: string,
  en: string,
  ko: string,
  synonyms: string[],
  formula: string,
  charge: number,
  extra: UnitOption[] = [],
): Analyte => ({
  id,
  en,
  ko,
  synonyms,
  formula,
  charge,
  units: [
    { id: 'mmol/L', code: 'mmol/L', label: 'mmol/L' },
    { id: 'meq/L', code: 'meq/L', label: 'mEq/L' },
    ...extra,
  ],
  defaultFrom: 'meq/L',
  defaultTo: 'mmol/L',
});

export const ANALYTES: Analyte[] = [
  {
    id: 'glucose',
    en: 'Glucose',
    ko: '포도당',
    synonyms: ['혈당', 'blood sugar', 'GLU', 'FBS'],
    formula: 'C6H12O6',
    units: [...MASS_MOLAR(), { id: 'g/L', code: 'g/L', label: 'g/L' }],
    defaultFrom: 'mg/dL',
    defaultTo: 'mmol/L',
  },
  {
    id: 'creatinine',
    en: 'Creatinine',
    ko: '크레아티닌',
    synonyms: ['Cr', 'Creat', 'SCr'],
    formula: 'C4H7N3O',
    units: [...MASS_MOLAR(true), { id: 'mmol/L', code: 'mmol/L', label: 'mmol/L' }],
    defaultFrom: 'mg/dL',
    defaultTo: 'umol/L',
  },
  {
    id: 'urea',
    en: 'Urea / BUN',
    ko: '요소 / 혈중요소질소',
    synonyms: ['BUN', 'blood urea nitrogen', 'urea nitrogen', '요소질소', 'UN'],
    formula: 'CH4N2O',
    units: [
      {
        id: 'bun-mg/dL',
        code: 'mg/dL',
        label: 'mg/dL (BUN, 요소질소)',
        basisFormula: 'N2',
        basisNote: '요소 1분자에 질소 원자 2개 → BUN 질량은 N₂(2×N) 기준',
      },
      { id: 'urea-mg/dL', code: 'mg/dL', label: 'mg/dL (요소)' },
      { id: 'mmol/L', code: 'mmol/L', label: 'mmol/L (요소)' },
    ],
    defaultFrom: 'bun-mg/dL',
    defaultTo: 'mmol/L',
    assumptions: ['요소(CH₄N₂O) 1 mol = 질소 2 mol 이므로 BUN의 몰농도 = 요소의 몰농도'],
  },
  {
    id: 'uric-acid',
    en: 'Uric acid',
    ko: '요산',
    synonyms: ['Urate', 'UA'],
    formula: 'C5H4N4O3',
    units: [...MASS_MOLAR(true), { id: 'mmol/L', code: 'mmol/L', label: 'mmol/L' }],
    defaultFrom: 'mg/dL',
    defaultTo: 'umol/L',
  },
  {
    id: 'cholesterol',
    en: 'Cholesterol (total, HDL-C, LDL-C)',
    ko: '콜레스테롤 (총, HDL, LDL)',
    synonyms: ['TC', 'total cholesterol', 'HDL', 'LDL', 'HDL-C', 'LDL-C', '총콜레스테롤'],
    formula: 'C27H46O',
    units: MASS_MOLAR(),
    defaultFrom: 'mg/dL',
    defaultTo: 'mmol/L',
    assumptions: ['HDL-C·LDL-C도 콜레스테롤 분자(C₂₇H₄₆O) 질량으로 보고되므로 같은 분자량을 사용'],
  },
  {
    id: 'triglycerides',
    en: 'Triglycerides',
    ko: '중성지방',
    synonyms: ['TG', 'triglyceride', 'triacylglycerol', '트리글리세리드'],
    formula: 'C57H104O6',
    formulaLabel: '트리올레인 C₅₇H₁₀₄O₆',
    units: MASS_MOLAR(),
    defaultFrom: 'mg/dL',
    defaultTo: 'mmol/L',
    assumptions: [
      '중성지방은 지방산 조성이 다른 분자의 혼합물이다. 대표 분자로 트리올레인(C₅₇H₁₀₄O₆)을 가정해 분자량을 계산한다.',
      // TODO(verify): 트리올레인 가정이 각 기관 표의 관례인지 원문(Labcorp/CMEinfo) 대조 필요
    ],
  },
  {
    id: 'bilirubin',
    en: 'Bilirubin (total)',
    ko: '빌리루빈 (총)',
    synonyms: ['T-bil', 'TBIL', 'total bilirubin', '총빌리루빈'],
    formula: 'C33H36N4O6',
    units: MASS_MOLAR(true),
    defaultFrom: 'mg/dL',
    defaultTo: 'umol/L',
  },
  {
    ...ELECTROLYTE('calcium', 'Calcium (total)', '칼슘', ['Ca', 'Ca2+', '총칼슘'], 'Ca', 2, [
      { id: 'mg/dL', code: 'mg/dL', label: 'mg/dL' },
    ]),
    defaultFrom: 'mg/dL',
  },
  {
    ...ELECTROLYTE('magnesium', 'Magnesium', '마그네슘', ['Mg', 'Mg2+'], 'Mg', 2, [
      { id: 'mg/dL', code: 'mg/dL', label: 'mg/dL' },
    ]),
    defaultFrom: 'mg/dL',
  },
  {
    id: 'phosphate',
    en: 'Phosphate (inorganic, as P)',
    ko: '인 (무기인)',
    synonyms: ['phosphorus', 'Pi', 'PO4', 'phosphate', '인산'],
    formula: 'P',
    units: MASS_MOLAR(),
    defaultFrom: 'mg/dL',
    defaultTo: 'mmol/L',
    assumptions: ['mg/dL 값은 인(P) 원소 질량으로 보고된 것으로 가정 (인산염 PO₄ 질량 아님)'],
  },
  ELECTROLYTE('sodium', 'Sodium', '나트륨', ['Na', 'Na+', '소디움'], 'Na', 1),
  ELECTROLYTE('potassium', 'Potassium', '칼륨', ['K', 'K+', '포타슘'], 'K', 1),
  ELECTROLYTE('chloride', 'Chloride', '염소', ['Cl', 'Cl-', '클로라이드'], 'Cl', 1),
  ELECTROLYTE(
    'bicarbonate',
    'Bicarbonate (total CO₂)',
    '중탄산염',
    ['HCO3', 'HCO3-', 'tCO2', 'total CO2', '총이산화탄소'],
    'CHO3',
    1,
  ),
  {
    id: 'iron',
    en: 'Iron',
    ko: '철',
    synonyms: ['Fe', 'serum iron', '혈청철'],
    formula: 'Fe',
    units: [
      { id: 'ug/dL', code: 'ug/dL', label: 'µg/dL' },
      { id: 'umol/L', code: 'umol/L', label: 'µmol/L' },
    ],
    defaultFrom: 'ug/dL',
    defaultTo: 'umol/L',
  },
  {
    id: 'albumin',
    en: 'Albumin',
    ko: '알부민',
    synonyms: ['ALB', 'Alb'],
    units: [
      { id: 'g/dL', code: 'g/dL', label: 'g/dL' },
      { id: 'g/L', code: 'g/L', label: 'g/L' },
    ],
    defaultFrom: 'g/dL',
    defaultTo: 'g/L',
    noMolarReason:
      '임상 보고는 질량농도(g/L)로 하며, 이 앱은 단백질 분자량 근거를 채택하지 않아 몰농도 변환을 제공하지 않는다.',
  },
  {
    id: 'total-protein',
    en: 'Total protein',
    ko: '총단백',
    synonyms: ['TP', 'protein, total', '총단백질'],
    units: [
      { id: 'g/dL', code: 'g/dL', label: 'g/dL' },
      { id: 'g/L', code: 'g/L', label: 'g/L' },
    ],
    defaultFrom: 'g/dL',
    defaultTo: 'g/L',
    noMolarReason: '총단백은 분자량이 서로 다른 단백질의 혼합물이라 단일 분자량이 없다.',
  },
  ENZYME('alt', 'ALT (alanine aminotransferase)', '알라닌아미노전이효소', ['ALT', 'GPT', 'SGPT']),
  ENZYME('ast', 'AST (aspartate aminotransferase)', '아스파르테이트아미노전이효소', ['AST', 'GOT', 'SGOT']),
  ENZYME('alp', 'ALP (alkaline phosphatase)', '알칼리인산분해효소', ['ALP', 'alk phos']),
  ENZYME('ggt', 'GGT (γ-glutamyltransferase)', '감마글루타밀전이효소', ['GGT', 'γ-GT', 'gamma GT', 'GGTP']),
  ENZYME('ld', 'LD (lactate dehydrogenase)', '젖산탈수소효소', ['LD', 'LDH']),
  {
    id: 'hba1c',
    en: 'Hemoglobin A1c',
    ko: '당화혈색소',
    synonyms: ['HbA1c', 'A1c', 'glycated hemoglobin', 'glycohemoglobin', '헤모글로빈A1c'],
    units: [
      { id: 'ngsp', code: '%', label: '% (NGSP/DCCT)' },
      { id: 'ifcc', code: 'mmol/mol', label: 'mmol/mol (IFCC)' },
    ],
    defaultFrom: 'ngsp',
    defaultTo: 'ifcc',
    specialOnly: true,
    noMolarReason:
      'HbA1c 단위 간 관계는 단순 배수가 아니라 NGSP–IFCC master equation(1차식)으로만 정의된다.',
  },
  {
    id: 'uacr',
    en: 'Urine albumin/creatinine ratio (uACR)',
    ko: '소변 알부민/크레아티닌 비 (uACR)',
    synonyms: ['ACR', 'UACR', 'albumin creatinine ratio', '알부민크레아티닌비', '미세알부민뇨'],
    formula: 'C4H7N3O',
    formulaLabel: '분모: 크레아티닌 C₄H₇N₃O',
    units: [
      { id: 'mg/g', code: 'mg/g', label: 'mg/g (creatinine)' },
      { id: 'mg/mmol', code: 'mg/mmol', label: 'mg/mmol (creatinine)' },
    ],
    defaultFrom: 'mg/g',
    defaultTo: 'mg/mmol',
    assumptions: ['분자(알부민) 질량은 그대로 두고 분모 크레아티닌만 질량↔몰 변환'],
    sources: [KDIGO_SOURCE],
  },
  {
    id: 'upcr',
    en: 'Urine protein/creatinine ratio (uPCR)',
    ko: '소변 단백/크레아티닌 비 (uPCR)',
    synonyms: ['PCR', 'UPCR', 'protein creatinine ratio', '단백크레아티닌비'],
    formula: 'C4H7N3O',
    formulaLabel: '분모: 크레아티닌 C₄H₇N₃O',
    units: [
      { id: 'mg/g', code: 'mg/g', label: 'mg/g (creatinine)' },
      { id: 'mg/mmol', code: 'mg/mmol', label: 'mg/mmol (creatinine)' },
    ],
    defaultFrom: 'mg/g',
    defaultTo: 'mg/mmol',
    assumptions: ['분자(단백) 질량은 그대로 두고 분모 크레아티닌만 질량↔몰 변환'],
    sources: [KDIGO_SOURCE],
  },
];

export function getAnalyte(id: string): Analyte {
  const a = ANALYTES.find((x) => x.id === id);
  if (!a) throw new Error(`unknown analyte ${id}`);
  return a;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_/()·,]/g, '');

/** 영문·한글·동의어 검색 */
export function searchAnalytes(query: string): Analyte[] {
  const q = norm(query);
  if (!q) return ANALYTES;
  return ANALYTES.filter((a) =>
    [a.en, a.ko, a.id, ...a.synonyms].some((s) => norm(s).includes(q)),
  );
}
