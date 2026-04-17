import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
	plugins: [
		react({
			include: /\.(js|jsx|ts|tsx)$/,
		}),
		svgr(),
	],
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
			include: ['src/**/*.{js,jsx}'],
			exclude: [
				'src/index.jsx',
				'src/reportWebVitals.js',
				'src/**/*mock.{js,jsx}',
				'src/**/*.test.{js,jsx}',
			],
		},
	},
})
