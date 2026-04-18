// 단일 env 헬퍼. 모든 런타임 환경 분기는 이 모듈을 경유한다.
// Vite 가 빌드 타임에 boolean / 문자열 리터럴로 치환 → tree-shake 가능.
//
// 관련 명세: specs/spec/green/common/env-spec.md §2.3, §5.1
// 관련 요구사항: REQ-20260418-002 FR-01
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
export const mode = import.meta.env.MODE;
