// 격리 픽스처 — check-env-api-base-presence.sh 의 판정 모집단 주입 seam
// (ENV_PRESENCE_SCAN_ROOT) 전용 대상이다. 실 런타임·빌드가 이 선언을 소비하지
// 않는다 (tsconfig include 는 "src" 한정). 실 .env* 를 건드리지 않고 게이트
// 민감도를 왕복 측정하기 위해 존재한다.
// Spec: foundation/gate-judgement-population-injectable-seam · Task: TSK-20260825-31
//
// 실 선언(src/types/env.d.ts)의 **형상** 을 모사한다 — 키 개수·접미사 분포가
// 어긋나면 게이트의 공허 가드 하한이 픽스처 실행에서만 걸려 seam 이 무력해진다.
// VITE_COGNITO_* 4 선언은 TSK-20260825-37 에서 실 선언과 맞추며 추가됐다.

interface ImportMetaEnv {
  readonly VITE_LOG_API_BASE: string;
  readonly VITE_MONITOR_API_BASE: string;
  readonly VITE_FILE_API_BASE: string;
  readonly VITE_IMAGE_API_BASE: string;
  readonly VITE_COMMENT_API_BASE: string;
  readonly VITE_SEARCH_API_BASE: string;
  readonly VITE_COGNITO_LOGIN_URL_PROD: string;
  readonly VITE_COGNITO_LOGIN_URL_DEV: string;
  readonly VITE_COGNITO_LOGOUT_URL_PROD: string;
  readonly VITE_COGNITO_LOGOUT_URL_DEV: string;
}
