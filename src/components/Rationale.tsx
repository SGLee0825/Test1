import type { ConversionOk } from '../lib/convert';
import { fmt } from '../lib/convert';

export default function Rationale({ result }: { result: ConversionOk }) {
  return (
    <div className="rationale">
      <h3>계산 근거</h3>
      <dl>
        <dt>방법</dt>
        <dd>{result.methodLabel}</dd>
        <dt>계수</dt>
        <dd>
          {fmt(result.factor)}
          {result.offset !== 0 && <> (절편 {fmt(result.offset)})</>}
        </dd>
        <dt>수식</dt>
        <dd>
          <code>{result.formula}</code>
        </dd>
        {result.steps.length > 0 && (
          <>
            <dt>단계</dt>
            <dd>
              <ol>
                {result.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </dd>
          </>
        )}
        {result.assumptions.length > 0 && (
          <>
            <dt>가정</dt>
            <dd>
              <ul>
                {result.assumptions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {result.sources.length > 0 && (
          <>
            <dt>출처</dt>
            <dd>
              <ul>
                {result.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
