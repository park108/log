/**
 * 패턴 B (spec `30.spec/green/common/a11y.md` §예외) 면제 enumeration.
 *
 * 본 모듈은 `a11y.audit.test.js` 가 참조하는 단일 진실원(single source of truth).
 * spec §예외 절의 "확정 면제" 지점을 **테스트 시점에 런타임 enumeration** 으로 박제해
 * audit fail 시 직관적 대조를 제공한다.
 *
 * 매칭 규칙 (audit 측):
 *   - `file` 은 repo 상대경로 (POSIX 구분자).
 *   - `testId` 가 주어지면 audit 대상 요소에서 `data-testid="<id>"` 문자열 일치로 면제 판정.
 *   - `lineHint` 가 주어지면 위반 라인 ± 3 라인 내 일치로 면제 판정 (파일 편집 시 완충).
 *   - `testId` 와 `lineHint` 가 모두 부재하면 `file` 내 모든 위반이 면제 (파일 전체 면제).
 *
 * 면제 추가 시 반드시 `rationale` 한줄 근거를 동반하고, 변경 사유를 spec §예외 절 또는
 * 관련 task result.md 에 박제한다.
 */

export const PATTERN_B_EXEMPTIONS = [
	{
		file: 'src/Log/LogItemInfo.jsx',
		testId: 'edit-button',
		rationale:
			'M5 (REQ-033 FR-05): react-router <Link> 의 자식 <span>. 부모 anchor 가 Enter 활성 기본 제공 — 자식 tabIndex/onKeyDown 추가 시 포커스 중복/이중 활성 위험 (TSK-20260421-77 @3971a46 확정 면제).',
	},
];

export default PATTERN_B_EXEMPTIONS;
