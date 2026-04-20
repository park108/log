// β 이디엄 전용 타임아웃 상수 (REQ-20260421-005 / TSK-20260421-47)
// waitFor polling 과 함께 사용한다. findByText options.timeout 으로 단독 사용 금지
// (옵션 α 는 TSK-20260421-43 에서 구조적 실패 확정 — 노드 detach / 상태 미전이 대응 불가).
// polling 조건 충족 즉시 반환이므로 wall-clock 영향 미미.
export const ASYNC_ASSERTION_TIMEOUT_MS = 5000;
