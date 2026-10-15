# 임상검사 단위 변환 · 참고구간

React + TypeScript + Vite 정적 웹앱 (GitHub Pages 배포).

**Pages URL:** https://sglee0825.github.io/Test1/
TODO(verify): 아직 배포 확인 전 (아래 "배포" 참고)

## 기능

| 탭 | 내용 |
|---|---|
| 변환 | 분석물 검색(영문·한글·동의어) → 값/원본 단위/대상 단위 → 결과 + **계산 근거**(방법·계수·수식·가정·출처). 스왑·복사 버튼. 근거 없는 변환(예: 포도당 mg/dL→U/L)은 이유와 함께 거부 |
| 참고구간 | 분석물·나이·성별·검체 → 공표 구간만 그대로 표시(외삽 없음). 결과 값 입력 시 LOW/NORMAL/HIGH 판정, 출처·검체·나이 구간 표시. 18세 미만은 CALIPER 안내 |

## 데이터 출처와 역할

1. **단위 변환 엔진**: [UCUM / ucum-lhc](https://lhncbc.github.io/ucum-lhc/)로 차원 검사와 스케일 변환을 한다.
   질량↔몰은 분자식에서 [IUPAC 원자량](https://www.ciaaw.org/atomic-weights.htm)으로 계산한 분자량을, mEq는 이온 전하를 ucum-lhc에 넘겨 계산한다.
   변환 계수를 표에서 복사하지 않는다 (`src/lib/chem.ts`, `src/lib/convert.ts`).
2. **특수 변환**
   - HbA1c: NGSP(%) = 0.09148 × IFCC(mmol/mol) + 2.152 ([NGSP](https://ngsp.org/ifccngsp.asp)). 역방향은 정확한 역함수를 쓴다.
   - uACR·uPCR: mg/g ↔ mg/mmol. 분모 크레아티닌의 분자량으로 계산한다 ([KDIGO 2024](https://kdigo.org/guidelines/ckd-evaluation-and-management/)).
   - BUN ↔ 요소: BUN 질량은 N₂ 기준, 요소는 CH₄N₂O 기준으로 보고 몰을 거쳐 2단계로 변환한다.
   - 중성지방: 트리올레인(C₅₇H₁₀₄O₆) 분자량을 가정한다.
3. **참고구간**: [RCPA Table 6](https://www.rcpa.edu.au/Manuals/RCPA-Manual/General-Information/IG/Table-6-Harmonised-reference-intervals-for-chem) (성인). 소아는 [CALIPER](https://caliperproject.ca) 안내만 한다.
4. **교차 검증 전용** (`tests/crossValidation.ts`, 앱에서 import 하지 않음): Labcorp SI Unit Conversion Table, CMEinfo 변환표, NBME Laboratory Reference Values.

## 데이터 공백 (구하지 못한 자료와 이유)

이 코드를 작성한 클라우드 환경은 네트워크 정책상 GitHub·npm 외의 외부 사이트(rcpa.edu.au, ngsp.org, kdigo.org,
caliperproject.ca, labcorp.com, nbme.org, ciaaw.org, aacb.asn.au, PMC)에 직접 접속할 수 없었다. 그래서 웹 검색 결과 발췌로만 확인했다.

| 항목 | 상태 | 이유 |
|---|---|---|
| RCPA Table 6: Na, K, Cl, Ca, PO₄, Mg, 크레아티닌, ALP, 총단백 | 수록, **TODO(verify)** | 원문 대신 검색 발췌(LN-RCPA 코드·나이 구간 포함)로 옮김 |
| RCPA Table 6: ALT, AST, GGT, LD, 빌리루빈, 알부민, 요소, 중탄산염, 포도당, 지질, 요산 등 | **미수록** | 검색 발췌에서 Table 6 값과 나이 구간을 확인하지 못함. 2차 자료(ABS, AACB 2017 보고서)의 값은 나이 구간이 불명확해 넣지 않음 |
| RCPA Table 6 소아(18세 미만) 구간 (크레아티닌 15–<19세 제외) | **미수록** | 원문 미확인 |
| 60세 이상 크레아티닌 | 미수록 (원래 공표 없음) | Table 6이 60세 미만까지만 공표 |
| CALIPER 구간 값 | **미수록** (링크 안내만) | 사이트 접속 불가, 요구사항상 안내만 |
| HbA1c·uACR 출처 원문 | 공식 사용, **TODO(verify)** | ngsp.org·kdigo.org를 직접 확인하지 못함 (검색 발췌로 식·범주 확인) |
| 교차 검증 표 (Labcorp, CMEinfo, NBME) | 테스트에 사용, **TODO(verify)** | PDF·페이지 원문 미확인. Labcorp/CMEinfo는 널리 쓰이는 관례 계수, NBME는 검색 발췌 |
| IUPAC 원자량 개정 연도 | **TODO(verify)** | ciaaw.org 원문 미확인 (abridged 값 사용) |

## 개발

```bash
npm ci
npm test        # Vitest (변환 로직·참고구간)
npm run dev
npm run build   # dist/
```

## 배포

`main`에 push하면 `.github/workflows/deploy.yml`이 테스트 → 빌드 → GitHub Pages 배포를 수행한다.
저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정해야 한다.

> 의료 판단용이 아닌 교육·참고용 도구다. 참고구간은 검사 방법과 검사실마다 다르다.
