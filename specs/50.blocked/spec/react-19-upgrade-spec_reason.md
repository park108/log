# Blocked: react-19-upgrade-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "`react`/`react-dom` 18→19 bump + testing-library v13→v16 + types v19 정렬" 서사로 **task 성격**.

## 근거
> 런타임 `react` / `react-dom` 을 `^18.2.0` → `^19.2.x` 로, 동반 devDep `@testing-library/react` 를 v13 → v16 으로, 타입 정의 `@types/react` / `@types/react-dom` 을 v19 라인으로 정렬한다.
> `package.json` 필드 업데이트 후 `npm install` → `package-lock.json` 의 `react` 해소 버전이 `19.x` 로 갱신.

package.json bump 1회성 — 전형적 task.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 계약 조각 부재 (bump 자체는 버전 전이 사실). 회귀 중점 (`useEffect` online/offline · `reportWebVitals` sendBeacon 경로) 은 이미 `components/app-spec.md` 에 있는지 확인 후 부족하면 1~2줄 흡수 필요.
