# 컴포넌트 명세: {{컴포넌트 이름}}

> **위치**: `src/.../{{Component}}.jsx`
> **유형**: UI Component / Container / Hook / Util / Page / Route / Module
> **최종 업데이트**: YYYY-MM-DD (by TSK-YYYYMMDD-NN)
> **상태**: Active / Deprecated / Experimental
> **관련 요구사항**: REQ-... (복수 가능)

> 본 문서는 컴포넌트의 **현재 구현 상태**를 기술하는 SSoT(Single Source of Truth).
> 변경 계획은 `specs/task/` 에 작성하고, 작업 완료 시 이 문서를 갱신한다.

> **참조 코드 표기 컨벤션 (REQ-20260418-039)**: "위치" / "참조 코드" / §본문의 코드 pointer 는 **식별자 우선, 라인 번호 보조**.
> - 권장 형식: `src/App.jsx` 의 `QueryClientProvider` (보조: `:128-131`).
> - 이유: 식별자(export/컴포넌트/변수/함수 이름) 는 JSX 섹션 이동 / import 추가 등에 강건. 라인 번호만 박제하면 cascade drift 가 누적.
> - 헤더 주석 1줄: "라인 번호는 작성 시점 스냅샷(참고용). 최종 근거는 식별자." 를 필요 시 spec 상단에 추가.
> - 단일 파일에서 같은 식별자가 여러 위치에 존재하면 `파일 경로 + 식별자 + (§섹션 힌트)` 로 구분.

---

## 1. 역할 (Role & Responsibility)
이 컴포넌트가 **무엇을 담당하는가**를 한 문장으로. 책임 경계를 명확히 하여 인접 컴포넌트와의 구분을 분명하게 한다.

- 주 책임:
- 의도적으로 하지 않는 것:

## 2. 공개 인터페이스 (Public Interface)
외부에서 관찰 가능한 API. 이 섹션이 바뀌면 상위 의존 모두 영향을 받는다.

### 2.1 Props / Arguments
| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| - | - | Y/N | - | - |

### 2.2 이벤트 / 콜백
| 이름 | 시그니처 | 발화 조건 |
|------|----------|-----------|
| - | `(arg) => void` | - |

### 2.3 Exports
- default: `{{ComponentName}}`
- named:

### 2.4 라우트 (해당 시)
- path: `/...`
- params:
- query:

## 3. 내부 상태 (Internal State)
| 상태 | 타입 | 초기값 | 변경 트리거 |
|------|------|--------|-------------|
| - | - | - | - |

## 4. 의존성 (Dependencies)

### 4.1 내부 의존
- `src/.../Foo.jsx` — 용도
- `src/.../useBar.js` — 용도

### 4.2 외부 의존
- 패키지: react, react-router-dom, ...
- API 엔드포인트: `GET /...`, `POST /...`
- 저장소: sessionStorage / localStorage / cookie
- 브라우저 API: `navigator.sendBeacon`, `crypto.randomUUID`, ...

### 4.3 역의존 (사용처)
이 컴포넌트를 참조하는 상위. 공개 인터페이스 변경 시 영향 범위 확인용.
- `src/.../Parent.jsx`

## 5. 동작 (Current Behavior)
현재 구현이 어떻게 움직이는지. 의사 코드 또는 단계별.

### 5.1 초기 렌더 / 마운트
1.
2.

### 5.2 주요 상호작용 (Interaction)
- 사용자 동작 A → 내부 반응:
- 사용자 동작 B → 내부 반응:

### 5.3 비동기 흐름 (있으면)
- 요청 → 로딩 → 성공 / 실패 / 네트워크 에러
- 중단/취소 처리:

### 5.4 에러 / 엣지 케이스
- 입력이 비었을 때:
- 네트워크 실패:
- 권한 없음:

## 6. 데이터 스키마 (Data Shape)
입출력 또는 상태에 사용되는 주요 객체 구조.
```
{{schema}}
```

## 7. 테스트 현황 (Current Coverage)
- 테스트 파일: `src/.../X.test.jsx`
- 커버된 시나리오:
  - [x] 초기 렌더
  - [x] ...
- 미커버 / 취약:
  - [ ] ...
- 커버리지 (최근 측정):

## 8. 비기능 특성 (NFR Status)
현재 달성 수준을 기록. 목표값은 requirements 의 NFR 참조.

| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 성능 | - | - | - |
| 접근성 | - | - | - |
| 번들 사이즈 | - | - | lazy / eager |
| 보안 | - | - | - |

## 9. 알려진 제약 / 이슈
현재 구현이 가진 한계. 후속 task 의 씨앗.
- -

## 10. 변경 이력 (Changelog — via Task)
작업 완료 시 이 표를 append-only 로 갱신.

| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| YYYY-MM-DD | TSK-YYYYMMDD-NN | 최초 등록 | all |

## 11. 관련 문서
- 기원 요구사항: `specs/requirements/...`
- 관련 컴포넌트 명세: `specs/spec/{{other}}-component-spec.md`
- 진행 중/예정 task: `specs/task/...`
- 외부 참고:
