import { DRAFT_KEY, readDraft, saveDraft, clearDraft } from './draft';

describe('draft', () => {

	beforeEach(() => { localStorage.clear(); });
	afterEach(() => { localStorage.clear(); });

	it('쓴 것을 그대로 돌려준다', () => {

		saveDraft('쓰다 만 글\n둘째 줄  ');

		expect(readDraft()).toBe('쓰다 만 글\n둘째 줄  ');
	});

	it('없으면 빈 문자열이다 — null 이 아니다', () => {

		expect(readDraft()).toBe('');
	});

	it('빈 본문은 저장하지 않고 지운다', () => {

		saveDraft('무언가');
		saveDraft('');

		// 지운 글이 되살아나면 안 된다.
		expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
	});

	it('저장이 끝나면 걷는다', () => {

		saveDraft('무언가');
		clearDraft();

		expect(readDraft()).toBe('');
	});

	// 저장소는 없을 수 있다 — 사이트 데이터를 차단한 설정에서는 접근 자체가 던진다.
	// 안전망이 없는 것은 괜찮지만 글쓰기가 막히면 안 된다.
	describe('저장소가 막혀 있을 때', () => {

		const blocked = {
			getItem: () => { throw new Error('SecurityError'); },
			setItem: () => { throw new Error('QuotaExceededError'); },
			removeItem: () => { throw new Error('SecurityError'); },
		};

		let original: PropertyDescriptor | undefined;

		beforeEach(() => {
			original = Object.getOwnPropertyDescriptor(window, 'localStorage');
			Object.defineProperty(window, 'localStorage', { value: blocked, configurable: true });
		});

		afterEach(() => {
			if(original) Object.defineProperty(window, 'localStorage', original);
		});

		it('읽기·쓰기·지우기 어느 것도 던지지 않는다', () => {

			expect(() => saveDraft('무언가')).not.toThrow();
			expect(() => readDraft()).not.toThrow();
			expect(() => clearDraft()).not.toThrow();
			expect(readDraft()).toBe('');
		});
	});
});
