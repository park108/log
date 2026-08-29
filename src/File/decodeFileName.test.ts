import { describe, it, expect } from 'vitest';
import { decodeFileName } from './decodeFileName';

// 한글 이름으로 올린 파일이 목록에 이렇게 나왔다 (2026-08-30 실측):
//   230608_AA%25E1%2584%2580%25E1%2585%25A2...pdf
// `%25` 는 `%` 가 다시 인코딩된 것 — 이중 인코딩이다.
describe('decodeFileName', () => {

	it('이중 인코딩된 한글 이름을 되돌린다', () => {
		const raw = '230608_AA%25E1%2584%2580%25E1%2585%25A2%25E1%2584%2587%25E1%2585%25A1%25E1%2586%25AF.pdf';
		expect(decodeFileName(raw)).toBe('230608_AA개발.pdf');
	});

	it('한 번만 인코딩된 이름도 되돌린다', () => {
		expect(decodeFileName('%E1%84%80%E1%85%A2.pdf'.normalize())).toBe('개.pdf');
	});

	it('평범한 이름은 그대로 둔다', () => {
		// 대조 — 무엇이든 디코드하려 들면 멀쩡한 이름이 바뀐다.
		expect(decodeFileName('20220606_log_CQRS.png')).toBe('20220606_log_CQRS.png');
		expect(decodeFileName('ansi-html-community-0.0.8.tgz')).toBe('ansi-html-community-0.0.8.tgz');
	});

	it('퍼센트가 이름의 일부면 이름을 잃지 않는다', () => {
		// `%` 뒤가 16진수가 아니면 decodeURIComponent 가 던진다. 원문을 지킨다.
		expect(decodeFileName('50%_할인.png')).toBe('50%_할인.png');
		expect(decodeFileName('a%zz.txt')).toBe('a%zz.txt');
	});

	it('자모 분리(NFD)를 합쳐 준다', () => {
		// macOS 는 파일명을 분리형으로 준다 — 합쳐야 다른 곳과 같은 글자로 보인다.
		const nfd = '개발.pdf'.normalize('NFD');
		expect(nfd).not.toBe('개발.pdf');
		expect(decodeFileName(nfd)).toBe('개발.pdf');
	});

	it('빈 이름은 그대로다', () => {
		expect(decodeFileName('')).toBe('');
	});
});
