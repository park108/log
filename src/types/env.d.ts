/// <reference types="vite/client" />
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- declaration merge with vite/client
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
export {};
