import { useMemo, useState } from 'react';
import { ANALYTES, type Analyte } from '../data/analytes';
import { convert, findUnit, fmt } from '../lib/convert';
import AnalytePicker from './AnalytePicker';
import Rationale from './Rationale';

const CUSTOM = '__custom__';

function UnitSelect({
  analyte,
  value,
  custom,
  onChange,
  onCustom,
  label,
}: {
  analyte: Analyte;
  value: string;
  custom: string;
  onChange: (v: string) => void;
  onCustom: (v: string) => void;
  label: string;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {analyte.units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
          </option>
        ))}
        <option value={CUSTOM}>직접 입력 (UCUM 코드)…</option>
      </select>
      {value === CUSTOM && (
        <input
          className="custom"
          value={custom}
          placeholder="예: U/L, mg/dL, mmol/L"
          onChange={(e) => onCustom(e.target.value)}
        />
      )}
    </label>
  );
}

export default function ConvertTab() {
  const [analyte, setAnalyte] = useState<Analyte>(ANALYTES[0]);
  const [raw, setRaw] = useState('100');
  const [from, setFrom] = useState(analyte.defaultFrom);
  const [to, setTo] = useState(analyte.defaultTo);
  const [fromCustom, setFromCustom] = useState('');
  const [toCustom, setToCustom] = useState('U/L');
  const [copied, setCopied] = useState(false);

  const pick = (a: Analyte) => {
    setAnalyte(a);
    setFrom(a.defaultFrom);
    setTo(a.defaultTo);
  };

  const fromKey = from === CUSTOM ? fromCustom : from;
  const toKey = to === CUSTOM ? toCustom : to;
  const value = raw.trim() === '' ? NaN : Number(raw.replace(',', '.'));

  const result = useMemo(
    () => convert(analyte, value, fromKey, toKey),
    [analyte, value, fromKey, toKey],
  );

  const swap = () => {
    setFrom(to);
    setTo(from);
    setFromCustom(toCustom);
    setToCustom(fromCustom);
    if (result.ok) setRaw(String(Number(result.value.toPrecision(6))));
  };

  const toLabel = findUnit(analyte, toKey).label;
  const fromLabel = findUnit(analyte, fromKey).label;
  const resultText = result.ok ? `${fmt(result.value, 4)} ${toLabel}` : '';

  const copy = async () => {
    if (!result.ok) return;
    const text = `${analyte.en}: ${raw} ${fromLabel} = ${resultText} (${result.formula})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="grid">
      <AnalytePicker value={analyte} onChange={pick} />
      <div className="panel">
        <h2>
          {analyte.ko} <span className="muted">{analyte.en}</span>
        </h2>
        <div className="form-row">
          <label>
            값
            <input inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} />
          </label>
          <UnitSelect
            label="원본 단위"
            analyte={analyte}
            value={from}
            custom={fromCustom}
            onChange={setFrom}
            onCustom={setFromCustom}
          />
          <button className="swap" onClick={swap} title="원본/대상 단위 바꾸기" aria-label="단위 바꾸기">
            ⇄
          </button>
          <UnitSelect
            label="대상 단위"
            analyte={analyte}
            value={to}
            custom={toCustom}
            onChange={setTo}
            onCustom={setToCustom}
          />
        </div>

        {result.ok ? (
          <>
            <div className="big-result" aria-live="polite">
              <span className="num">{fmt(result.value, 4)}</span> <span className="unit">{toLabel}</span>
              <button className="copy" onClick={copy}>
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <Rationale result={result} />
          </>
        ) : (
          <div className="rejected" role="alert">
            <strong>변환 거부</strong>
            <p>{result.reason}</p>
            {result.detail && <p className="muted small">{result.detail}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
