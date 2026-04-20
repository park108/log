// csp-policy-spec §5.1 FR-14 / TSK-20260420-13
// Vite `transformIndexHtml` plugin — dev 전용 CSP meta 제거 단위 테스트.
// 실제 브라우저 CSP enforce 는 jsdom 미지원이므로 plugin handler 의 문자열 치환만 검증한다.
import { describe, it, expect } from 'vitest'
import { stripCspMetaInDev } from './vite.config.js'

describe('stripCspMetaInDev (vite plugin)', () => {
	it('has name "strip-csp-meta-in-dev"', () => {
		const plugin = stripCspMetaInDev()
		expect(plugin.name).toBe('strip-csp-meta-in-dev')
	})

	it('applies only to serve (dev) mode', () => {
		const plugin = stripCspMetaInDev()
		expect(plugin.apply).toBe('serve')
	})

	it('transformIndexHtml.order is "post" (runs after other plugins)', () => {
		const plugin = stripCspMetaInDev()
		expect(plugin.transformIndexHtml.order).toBe('post')
	})

	it('removes the CSP meta tag line from HTML that contains it', () => {
		const plugin = stripCspMetaInDev()
		const html = [
			'<!DOCTYPE html>',
			'<html>',
			'  <head>',
			'    <meta charset="utf-8" />',
			'    <meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\';">',
			'    <title>x</title>',
			'  </head>',
			'  <body></body>',
			'</html>',
		].join('\n')

		const result = plugin.transformIndexHtml.handler(html)

		expect(result).not.toContain('Content-Security-Policy')
		// 다른 meta 태그는 보존.
		expect(result).toContain('<meta charset="utf-8" />')
		expect(result).toContain('<title>x</title>')
	})

	it('is a no-op when HTML has no CSP meta tag (idempotent)', () => {
		const plugin = stripCspMetaInDev()
		const html = [
			'<!DOCTYPE html>',
			'<html>',
			'  <head><title>x</title></head>',
			'  <body></body>',
			'</html>',
		].join('\n')

		const result = plugin.transformIndexHtml.handler(html)

		expect(result).toBe(html)
	})

	it('removes only the first match when multiple CSP meta tags are present (single regex match)', () => {
		const plugin = stripCspMetaInDev()
		const html = [
			'<head>',
			'  <meta http-equiv="Content-Security-Policy" content="default-src \'self\';">',
			'  <meta http-equiv="Content-Security-Policy" content="default-src \'none\';">',
			'</head>',
		].join('\n')

		const result = plugin.transformIndexHtml.handler(html)

		// 첫 번째만 제거되고 두 번째는 남는다 (현재 정책은 meta 1개만 허용).
		const matches = result.match(/Content-Security-Policy/g) || []
		expect(matches).toHaveLength(1)
	})
})
