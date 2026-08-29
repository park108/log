import { render, screen } from '@testing-library/react';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import Footer from './Footer';

// spec: specs/30.spec/blue/common/footer-brand-icon-asset-availability.md §동작 G-A~G-F
//
// 배경: `brand.linkedin.com/content/dam/**` hotlink 가 HTTP 404 로 죽으면서 푸터 아이콘이
// 깨졌다 (LinkedIn 브랜드 자산의 Adobe AEM 이관). 본 fixture 는 "외부 URL 안정성에
// 의존하지 않는다" 는 구조를 강제한다 — 외부 HTTP probe 는 의도적으로 하지 않는다 (NFR-01).

// LinkedIn 공식 배포 패키지 in-logo.zip 의 `in-logo/LI-In-Bug.png` (2026-08-24 취득).
// 출처: https://brand.linkedin.com/downloads
const OFFICIAL_SHA256 = '3c0149f26168b5fe0f43e68664abe40341a6443b3cd435d18a73e12f64f8b600';
const RATIO_TOLERANCE = 0.02;

// 게이트 scope 는 런타임 소스 한정 — 본 fixture 자신의 문자열 occurrence 를 위반으로
// 계수하면 게이트가 스스로를 영구 FAIL 시킨다 (spec §동작 10 자체 진단 제외).
const RUNTIME_ONLY = ['--exclude=*.test.*', '--exclude-dir=__fixtures__'];

const grepCount = (pattern: string, ...paths: string[]): number => {
	try {
		const out = execFileSync('grep', ['-rnE', ...RUNTIME_ONLY, pattern, ...paths], { encoding: 'utf8' });
		return out.split('\n').filter(Boolean).length;
	}
	catch (e) {
		// grep 은 0 hit 일 때 rc=1 로 종료한다 — 예외가 아니라 정상 결과.
		if ((e as { status?: number }).status === 1) return 0;
		throw e;
	}
};

const pngIntrinsicSize = (path: string): { width: number, height: number } => {
	// PNG IHDR — signature 8 byte + length/type 8 byte 다음 width/height 각 4 byte BE.
	const head = readFileSync(path).subarray(16, 24);
	return { width: head.readUInt32BE(0), height: head.readUInt32BE(4) };
};

beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('Footer 브랜드 아이콘 자산 가용성', () => {

	describe('(G-A) 브랜드 마케팅 호스트 hotlink 0', () => {

		it('src/** 런타임 소스에 brand/content.linkedin.com 을 향한 img src 가 없다', () => {
			// 마케팅 문서 사이트의 /content/dam/** 경로는 URL 안정성 계약이 없다 (404 실증).
			const hits = grepCount('src="https?://(brand|content)\\.linkedin\\.com', 'src');
			expect(hits).toBe(0);
		});
	});

	describe('(G-B) LinkedIn 아이콘 self-origin 발화', () => {

		it('아이콘 src 가 self-origin 절대 경로이고 public/ 에 실재한다', () => {
			render(<Footer />);

			const icon = screen.getByAltText('LinkedIn Profile') as HTMLImageElement;
			const src = icon.getAttribute('src') ?? '';

			expect(src.startsWith('/')).toBe(true);
			expect(src.startsWith('//')).toBe(false);   // protocol-relative 는 외부 origin
			expect(existsSync(`public${src}`)).toBe(true);
		});
	});

	describe('(G-C) 공식 패키지 출처 바이트 동일', () => {

		it('vendored 자산이 LinkedIn 공식 배포 패키지 산출물과 sha256 동일하다', () => {
			// 형상·색상 무변형 (Brand Guidelines "Do not modify the color or the shape") 의
			// 기계 검증 대리 지표. 임의 편집 (크롭 / 색상 필터) 은 여기서 잡힌다.
			const digest = createHash('sha256').update(readFileSync('public/LI-In-Bug.png')).digest('hex');
			expect(digest).toBe(OFFICIAL_SHA256);
		});
	});

	describe('(G-D) 종횡비 보존', () => {

		it('선언 width/height 비율이 자산 intrinsic 종횡비와 일치한다', () => {
			render(<Footer />);

			const icon = screen.getByAltText('LinkedIn Profile') as HTMLImageElement;
			const declaredW = Number(icon.getAttribute('width'));
			const declaredH = Number(icon.getAttribute('height'));

			// 명시 선언 부재는 미판정이 아니라 위반 — CLS 방지 목적의 intrinsic size 선언 유지.
			expect(Number.isFinite(declaredW) && declaredW > 0).toBe(true);
			expect(Number.isFinite(declaredH) && declaredH > 0).toBe(true);

			// [in] bug 는 정사각형이 아니다 (635x540). 27x27 승계 시 여기서 잡힌다.
			const { width, height } = pngIntrinsicSize('public/LI-In-Bug.png');
			expect(Math.abs(declaredW / declaredH - width / height)).toBeLessThanOrEqual(RATIO_TOLERANCE);
		});
	});

	describe('(G-E) CSP img-src allowlist 동시 축소', () => {

		it('brand.linkedin.com 이 CSP 박제 표면 전수에서 제거되었다', () => {
			// 자산 이관과 권한 축소는 원자적이다 — 한쪽만 바뀌면 vacuous 권한 또는 런타임 차단.
			const hits = grepCount('brand\\.linkedin\\.com', 'index.html', 'src');
			expect(hits).toBe(0);
		});

		// 이 판정의 목적은 **푸터 브랜드 자산 축의 권한 동기화**다 — 자산을
		// 자체 호스팅으로 옮겼으면 그 출처 권한도 함께 걷어야 한다. 목록 전체가
		// 영구 불변이라는 뜻이 아니다. 실제로 본문 이미지(S3)를 허용하면서
		// 이 단언이 붉어졌는데, 그것은 다른 축이며 정당한 추가다.
		//
		// 그래서 "집합 동일" 이 아니라 **브랜드 축에 속한 출처만** 검사한다:
		// d0.awsstatic.com 은 남아 있고, 이관된 brand.linkedin.com 은 없다.
		it('브랜드 자산 축의 CSP 권한이 실제 발화와 일치한다', () => {
			const html = readFileSync('index.html', 'utf8');
			const directive = /img-src([^;]*);/.exec(html)?.[1] ?? '';
			const allowed = directive.trim().split(/\s+/).filter(t => t.startsWith('http'));

			// 공허 통과 차단 — 추출이 비면 아래 단언이 무조건 참이 된다.
			expect(allowed.length, 'img-src 에서 외부 출처를 뽑지 못했다').toBeGreaterThanOrEqual(1);

			expect(allowed, 'AWS 배지 출처가 사라졌다 — 자산은 여전히 외부에 있다')
				.toContain('https://d0.awsstatic.com');
			expect(allowed, '이관 완료된 brand.linkedin.com 권한이 남아 있다 — vacuous 권한')
				.not.toContain('https://brand.linkedin.com');
		});
	});

	describe('(G-F) 접근성 · 링크 계약 보존', () => {

		it('LinkedIn 앵커의 링크 대상과 보안 속성이 보존된다', () => {
			render(<Footer />);

			const anchor = screen.getByTitle('LinkedIn Profile');

			expect(anchor).toHaveAttribute('href', 'https://www.linkedin.com/in/jongkil-park-48019576/');
			expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
			expect(anchor).toHaveAttribute('target', '_blank');
		});

		it('아이콘이 비어있지 않은 접근 가능 이름을 제공한다', () => {
			render(<Footer />);

			const icon = screen.getByAltText('LinkedIn Profile');
			expect(icon.getAttribute('alt')?.trim()).toBeTruthy();
		});
	});
});
