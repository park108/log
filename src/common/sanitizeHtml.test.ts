import sanitizeHtml from './sanitizeHtml';

// OWASP XSS Filter Evasion 10 대표 벡터 + 엣지.
// 관련: REQ-20260418-001 NFR-01.

describe('sanitizeHtml: OWASP XSS vectors', () => {

	it("strips <script> tag", () => {
		const input = '<script>alert(1)</script>';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('<script');
	});

	it("strips onerror on <img>", () => {
		const input = '<img src=x onerror="alert(1)">';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('onerror');
	});

	it("strips javascript: href on <a>", () => {
		const input = '<a href="javascript:alert(1)">x</a>';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('javascript:');
	});

	it("strips <iframe> tag", () => {
		const input = '<iframe src="/x"></iframe>';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('<iframe');
	});

	it("strips <svg onload=...>", () => {
		const input = '<svg onload="alert(1)"></svg>';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('onload');
		expect(out.toLowerCase()).not.toContain('<svg');
	});

	it("preserves HTML entities (script as text is inert)", () => {
		const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
		const out = sanitizeHtml(input);
		// 실행 가능한 <script> 태그로 되돌리지 않아야 한다.
		expect(out.toLowerCase()).not.toContain('<script');
		// 엔티티 원본(또는 브라우저 디코딩된 리터럴)은 텍스트로 보존.
		expect(out.length).toBeGreaterThan(0);
	});

	it("strips mixed-case <ScRiPt>", () => {
		const input = '<ScRiPt>alert(1)</ScRiPt>';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('<script');
	});

	it("strips onerror with whitespace obfuscation", () => {
		const input = '<img src = "x" onerror = "alert(1)">';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('onerror');
	});

	it("strips <style> tag", () => {
		const input = '<style>body{background:url("javascript:alert(1)")}</style>';
		const out = sanitizeHtml(input);
		expect(out.toLowerCase()).not.toContain('<style');
	});

	it("adds rel=noopener noreferrer to target=_blank anchor", () => {
		const input = '<a href="/ok" target="_blank">x</a>';
		const out = sanitizeHtml(input);
		expect(out).toContain('target="_blank"');
		expect(out).toContain('rel="noopener noreferrer"');
	});
});

describe('sanitizeHtml: edge cases', () => {

	it("returns empty string for empty input", () => {
		expect(sanitizeHtml('')).toBe('');
	});

	it("returns empty string for null", () => {
		expect(sanitizeHtml(null)).toBe('');
	});

	it("returns empty string for undefined", () => {
		expect(sanitizeHtml(undefined)).toBe('');
	});

	it("is idempotent (double sanitize equals single)", () => {
		const input = '<p>safe <strong>text</strong> <a href="/x" target="_blank">link</a></p>';
		const once = sanitizeHtml(input);
		const twice = sanitizeHtml(once);
		expect(twice).toBe(once);
	});
});

describe('sanitizeHtml: allowed content passes through', () => {

	it("keeps allowed tags (p, strong, em, code)", () => {
		const input = '<p>a <strong>b</strong> <em>c</em> <code>d</code></p>';
		const out = sanitizeHtml(input);
		expect(out).toContain('<p>');
		expect(out).toContain('<strong>');
		expect(out).toContain('<em>');
		expect(out).toContain('<code>');
	});

	it("keeps span class (for code highlighter)", () => {
		const input = '<span class="span--kotlin-keyword">fun</span>';
		const out = sanitizeHtml(input);
		expect(out).toContain('class="span--kotlin-keyword"');
	});

	it("keeps https:, mailto:, relative, and fragment URLs", () => {
		expect(sanitizeHtml('<a href="https://example.com">x</a>')).toContain('href="https://example.com"');
		expect(sanitizeHtml('<a href="http://example.com">x</a>')).toContain('href="http://example.com"');
		expect(sanitizeHtml('<a href="mailto:a@b.c">x</a>')).toContain('href="mailto:a@b.c"');
		expect(sanitizeHtml('<a href="/path">x</a>')).toContain('href="/path"');
		expect(sanitizeHtml('<a href="#anchor">x</a>')).toContain('href="#anchor"');
	});
});
