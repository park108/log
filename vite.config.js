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
		},
	},
})
