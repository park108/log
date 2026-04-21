import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// csp-policy-spec §3.2 / §5.1 FR-14 — dev 세션에서만 CSP meta 태그 제거.
// 근거: Vite HMR 런타임이 `eval` 등을 사용해 prod 용 엄격 CSP 와 충돌.
// prod build 는 `index.html` 원본을 그대로 산출하므로 meta 태그가 보존된다.
// 관련 태스크: TSK-20260420-13 / REQ-20260419-040 FR-14.
export function stripCspMetaInDev() {
	return {
		name: 'strip-csp-meta-in-dev',
		apply: 'serve',
		transformIndexHtml: {
			order: 'post',
			handler(html) {
				return html.replace(
					/^\s*<meta\s+http-equiv="Content-Security-Policy"[^>]*>\s*\n?/m,
					'',
				)
			},
		},
	}
}

export default defineConfig({
	plugins: [
		react({
			include: /\.(js|jsx|ts|tsx)$/,
		}),
		svgr(),
		stripCspMetaInDev(),
	],
	resolve: {
		alias: {
			'@/common': path.resolve(__dirname, 'src/common'),
			'@/types': path.resolve(__dirname, 'src/types'),
			'@/log': path.resolve(__dirname, 'src/Log'),
		},
	},
	server: {
		port: 3000,
		open: true,
	},
	build: {
		outDir: 'build',
		sourcemap: false,
	},
	css: {
		modules: {
			localsConvention: 'camelCaseOnly',
		},
	},
	optimizeDeps: {
		esbuildOptions: {
			loader: { '.js': 'jsx' },
		},
	},
	oxc: {
		include: /\.([mc]?[jt]sx?)$/,
		jsx: { runtime: 'automatic' },
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: './src/setupTests.js',
		css: true,
		// REQ-20260421-042 FR-01 / TSK-20260421-88 — render-budget 상수 (it 3rd arg 로 전달되는
		// ASYNC_ASSERTION_TIMEOUT_MS = 5000) 와 vitest 기본 testTimeout (5000) 간 양의 margin 확보.
		// 기본값과 동일하면 "render budget 초과 실패" vs "기본 testTimeout 도달 실패" 의 판정 구분이
		// 불가하므로, 여기서 상위 cap 을 10000 ms 로 명시해 margin = 10000 − 5000 = 5000 ms > 0 을 보장.
		testTimeout: 10000,
		// REQ-20260421-041 / REQ-20260421-043 FR-02 (g) — coverage 측정 결정론 수단.
		// TSK-20260421-87 baseline 감사 픽스처: `--no-file-parallelism` 경로 N=7/7 range 0.00 exit 0 수렴 박제.
		// 본 구성은 (g-2) 수단 택일 적용 — 수단 중립성 FR-05 준수 (단정 표현 배제).
		fileParallelism: false,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			include: ['src/**/*.{js,jsx,ts,tsx}'],
			exclude: [
				'src/index.jsx',
				'src/reportWebVitals.js',
				'src/**/*mock.{js,jsx,ts,tsx}',
				'src/**/*.test.{js,jsx,ts,tsx}',
				'src/**/*.d.ts',
			],
			thresholds: {
				lines: 98,
				statements: 97,
				functions: 94,
				branches: 94,
			},
		},
	},
})
