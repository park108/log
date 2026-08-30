// 쓰다 만 새 글의 안전망.
//
// 글쓰기 칸의 본문은 컴포넌트 state 에만 있었다. 상단 내비게이션을 한 번 누르면
// (같은 탭 안의 이동이라 경고도 없이) 컴포넌트가 언마운트되고 쓰던 글이 사라진다.
// 새로고침·탭 닫기도 마찬가지다. 복구 수단은 "Temporary Save" 를 미리 눌러 두는
// 것뿐인데, 그것은 사고가 나기 **전에** 해야 하는 일이다.
//
// **새 글에만 적용한다.** 기존 글을 고치는 경로는 건드리지 않는다 — 거기서
// 초안을 잘못 되살리면 남의 글을 덮어쓰는 사고가 되고, 그것은 지금 막으려는
// 사고보다 나쁘다.
//
// 저장소는 `localStorage` 다. `sessionStorage` 는 탭과 함께 사라져서 "실수로 탭을
// 닫았다" 를 구하지 못한다.

import { readLocal, writeLocal, removeLocal } from '../common/safeStorage';

export const DRAFT_KEY = 'writer-draft-new';

export const readDraft = (): string => readLocal(DRAFT_KEY) ?? "";

/** 빈 초안은 저장하지 않고 지운다 — 지운 글이 되살아나면 안 된다. */
export const saveDraft = (article: string): void => {
	if("" === article) {
		removeLocal(DRAFT_KEY);
		return;
	}
	writeLocal(DRAFT_KEY, article);
};

export const clearDraft = (): void => removeLocal(DRAFT_KEY);
