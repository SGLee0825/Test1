import { useMemo, useState } from 'react';
import { type Analyte, getAnalyte } from '../data/analytes';
import {
  CALIPER,
  classify,
  intervalsFor,
  lookupInterval,
  REFERENCE_INTERVALS,
  type Sex,
  type Specimen,
  SPECIMEN_LABEL,
} from '../data/referenceIntervals';
import { convert, fmt } from '../lib/convert';
import AnalytePicker from './AnalytePicker';

const HAS_RI = new Set(REFERENCE_INTERVALS.map((r) => r.analyteId));
const hasRI = (a: Analyte) => HAS_RI.has(a.id);

const FLAG_LABEL = { low: 'LOW (낮음)', normal: 'NORMAL (참고구간 내)', high: 'HIGH (높음)' } as const;

const ageText = (min: number, max: number) => `${min}세 이상 ${max}세 미만`;
const sexText = (s: Sex | 'all') => (s === 'all' ? '남녀 공통' : s === 'M' ? '남' : '여');

export default function ReferenceTab() {
  const [analyte, setAnalyte] = useState<Analyte>(getAnalyte('creatinine'));
  const [ageRaw, setAgeRaw] = useState('45');
  const [sex, setSex] = useState<Sex>('M');
  const [specimen, setSpecimen] = useState<Specimen>('serum');
  const [valRaw, setValRaw] = useState('');
  const [unitId, setUnitId] = useState<string>('');

  const age = ageRaw.trim() === '' ? NaN : Number(ageRaw);
  const interval = Number.isFinite(age)
    ? lookupInterval({ analyteId: analyte.id, age, sex, specimen })
    : undefined;
  const published = intervalsFor(analyte.id);

  const inputUnit = unitId || interval?.unitId || analyte.units[0].id;
  const value = valRaw.trim() === '' ? NaN : Number(valRaw.replace(',', '.'));

  const evaluation = useMemo(() => {
    if (!interval || !Number.isFinite(value)) return null;
    const c = convert(analyte, value, inputUnit, interval.unitId);
    if (!c.ok) return { error: c.reason };
    return { converted: c.value, flag: classify(c.value, interval), conv: c };
  }, [analyte, value, inputUnit, interval]);

  const pick = (a: Analyte) => {
    setAnalyte(a);
    setUnitId('');
  };

  return (
    <section className="grid">
      <AnalytePicker value={analyte} onChange={pick} filter={hasRI} />
      <div className="panel">
        <h2>
          {analyte.ko} <span className="muted">{analyte.en}</span>
        </h2>
        <div className="form-row">
          <label>
            나이 (세)
            <input inputMode="decimal" value={ageRaw} onChange={(e) => setAgeRaw(e.target.value)} />
          </label>
          <label>
            성별
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="M">남</option>
              <option value="F">여</option>
            </select>
          </label>
          <label>
            검체
            <select value={specimen} onChange={(e) => setSpecimen(e.target.value as Specimen)}>
              {(Object.keys(SPECIMEN_LABEL) as Specimen[]).map((s) => (
                <option key={s} value={s}>
                  {SPECIMEN_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {interval ? (
          <div className="interval">
            <div className="big-result">
              <span className="num">
                {interval.low} – {interval.high}
              </span>{' '}
              <span className="unit">{interval.unitLabel}</span>
            </div>
            <dl>
              <dt>나이 구간</dt>
              <dd>{ageText(interval.ageMin, interval.ageMax)}</dd>
              <dt>성별</dt>
              <dd>{sexText(interval.sex)}</dd>
              <dt>검체</dt>
              <dd>{interval.specimens.map((s) => SPECIMEN_LABEL[s]).join(', ')}</dd>
              {interval.loinc && (
                <>
                  <dt>LOINC (LN-RCPA)</dt>
                  <dd>{interval.loinc}</dd>
                </>
              )}
              {interval.note && (
                <>
                  <dt>주석</dt>
                  <dd>{interval.note}</dd>
                </>
              )}
              <dt>출처</dt>
              <dd>
                <a href={interval.source.url} target="_blank" rel="noreferrer">
                  {interval.source.label}
                </a>
                <div className="warn small">
                  TODO(verify): 원문 페이지에 직접 접속하지 못해 검색 발췌로 옮긴 값입니다. 사용 전 원문과
                  대조하세요.
                </div>
              </dd>
            </dl>

            <h3>결과 판정</h3>
            <div className="form-row">
              <label>
                결과 값
                <input inputMode="decimal" value={valRaw} onChange={(e) => setValRaw(e.target.value)} />
              </label>
              <label>
                단위
                <select value={inputUnit} onChange={(e) => setUnitId(e.target.value)}>
                  {analyte.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {evaluation && 'error' in evaluation && (
              <div className="rejected">{evaluation.error}</div>
            )}
            {evaluation && 'flag' in evaluation && evaluation.flag && (
              <div className={`flag flag-${evaluation.flag}`} aria-live="polite">
                <strong>{FLAG_LABEL[evaluation.flag]}</strong>
                {inputUnit !== interval.unitId && (
                  <span className="small">
                    {' '}
                    (환산값 {fmt(evaluation.converted, 4)} {interval.unitLabel} — {evaluation.conv.formula})
                  </span>
                )}
                <div className="small">
                  기준: {interval.low}–{interval.high} {interval.unitLabel} · {ageText(interval.ageMin, interval.ageMax)} ·{' '}
                  {sexText(interval.sex)} · {SPECIMEN_LABEL[specimen]} · {interval.source.label}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rejected" role="status">
            <strong>공표된 참고구간 없음</strong>
            <p>
              입력한 조건(나이 {Number.isFinite(age) ? `${age}세` : '미입력'}, {sexText(sex)}, {SPECIMEN_LABEL[specimen]})에
              해당하는 공표 구간이 이 앱의 데이터에 없습니다. 인접 나이 구간으로 외삽하지 않습니다.
            </p>
            {Number.isFinite(age) && age < 18 && (
              <p>
                소아·청소년은{' '}
                <a href={CALIPER.url} target="_blank" rel="noreferrer">
                  {CALIPER.label}
                </a>{' '}
                데이터베이스에서 나이·성별별 구간을 확인하세요. (CALIPER 구간은 이 앱에 포함하지 않았습니다.)
              </p>
            )}
            {published.length > 0 && (
              <>
                <p className="small">이 분석물에 대해 수록된 구간:</p>
                <ul className="small">
                  {published.map((r, i) => (
                    <li key={i}>
                      {ageText(r.ageMin, r.ageMax)} · {sexText(r.sex)} · {r.low}–{r.high} {r.unitLabel}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
