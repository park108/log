# Blocked: ci-node20-deprecation-remediation-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "`ci.yml` 3 라인 변경 (actions v4→v6 + node-version 20→24)" 1회성 remediation 서사로 **task 성격**.

## 근거
> GitHub Actions 러너에서 Node.js 20 deprecation warning ... 을 `.github/workflows/ci.yml` 3 라인 변경으로 해소한다.
> L16: `uses: actions/checkout@v4` → `uses: actions/checkout@v6`
> L19: `uses: actions/setup-node@v4` → `uses: actions/setup-node@v6`
> L21: `node-version: '20'` → `node-version: '24'`

3-line patch — 전형적 1회성 task.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 계약 조각 ("CI 는 GitHub Actions 에서 `actions/checkout`, `actions/setup-node` 를 사용하며 Node.js 버전은 LTS 최신; action 태그는 메이저 floating") 은 차후 CI/foundation spec 으로 1~2줄 흡수 필요.
