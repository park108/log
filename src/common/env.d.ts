// Companion .d.ts for src/common/env.js. Keeps the runtime .js body unchanged
// (per foundation spec NFR) while surfacing typed signatures for TS consumers.
// `import type` from `@/types/env` also keeps the project-wide ambient env
// augmentation in the type-resolution graph (alias live-use).
import type {} from '@/types/env';

export declare const isDev: () => boolean;
export declare const isProd: () => boolean;
export declare const mode: () => string;
