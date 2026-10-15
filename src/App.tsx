import { useState } from 'react';
import ConvertTab from './components/ConvertTab';
import ReferenceTab from './components/ReferenceTab';

type Tab = 'convert' | 'reference';

export default function App() {
  const [tab, setTab] = useState<Tab>('convert');
  return (
    <div className="app">
      <header>
        <h1>임상검사 단위 변환 · 참고구간</h1>
        <p className="sub">
          계수는 표에서 복사하지 않고 UCUM + IUPAC 원자량으로 계산합니다. 임상 판단 전 소속 검사실 기준을
          확인하세요.
        </p>
        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'convert'} onClick={() => setTab('convert')}>
            변환
          </button>
          <button role="tab" aria-selected={tab === 'reference'} onClick={() => setTab('reference')}>
            참고구간
          </button>
        </nav>
      </header>
      <main>{tab === 'convert' ? <ConvertTab /> : <ReferenceTab />}</main>
      <footer>
        데이터 출처: UCUM(ucum-lhc), IUPAC CIAAW, NGSP, KDIGO 2024, RCPA Table 6, CALIPER. 교육·참고용이며 진단 목적이
        아닙니다.
      </footer>
    </div>
  );
}
