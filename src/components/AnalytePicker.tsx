import { useMemo, useState } from 'react';
import { type Analyte, searchAnalytes } from '../data/analytes';

interface Props {
  value: Analyte;
  onChange: (a: Analyte) => void;
  filter?: (a: Analyte) => boolean;
}

export default function AnalytePicker({ value, onChange, filter }: Props) {
  const [q, setQ] = useState('');
  const results = useMemo(
    () => searchAnalytes(q).filter((a) => (filter ? filter(a) : true)),
    [q, filter],
  );
  return (
    <div className="picker">
      <label>
        분석물 검색 (영문·한글·동의어)
        <input
          type="search"
          value={q}
          placeholder="예: 크레아티닌, BUN, HbA1c, GOT"
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <ul className="results" role="listbox">
        {results.length === 0 && <li className="empty">검색 결과 없음</li>}
        {results.map((a) => (
          <li key={a.id}>
            <button
              role="option"
              aria-selected={a.id === value.id}
              className={a.id === value.id ? 'sel' : ''}
              onClick={() => onChange(a)}
            >
              <strong>{a.ko}</strong> <span className="muted">{a.en}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
