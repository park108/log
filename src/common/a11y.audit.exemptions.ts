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

export interface PatternBExemption {
	file: string;
	testId?: string;
	lineHint?: number;
	rationale: string;
}

export const PATTERN_B_EXEMPTIONS: readonly PatternBExemption[] = [
	// edit-button 면제는 해소됐다 (2026-08-29). 면제 사유는 "부모 anchor 가 활성을
	// 제공하므로 자식에 tabIndex/onKeyDown 을 넣지 말라" 였고 그 판단은 옳았다.
	// 그런데 role="button" 은 남아 있었다 — anchor 의 link role 과 충돌해 보조기술에
	// 두 겹으로 읽힌다. role 을 걷어 span 을 표기 래퍼로 되돌리자 위반 자체가 사라져
	// 면제가 필요 없어졌다.
];

export default PATTERN_B_EXEMPTIONS;
