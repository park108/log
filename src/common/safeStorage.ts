// sessionStorage 접근을 감싼다.
//
// 브라우저 저장소는 **없을 수 있다**. 사이트 데이터를 차단한 설정에서는
// `sessionStorage` 접근 자체가 SecurityError 를 던지고, 용량이 차면 `setItem` 이
// QuotaExceededError 를 던진다. 목록 캐시는 원래 최적화일 뿐인데, 이 예외가
// 감싸이지 않은 채 async 함수 안에서 나면 그 함수는 중간에 끊긴다 —
// `setIsLoading(false)` 에 닿지 못해 홈 화면이 "Loading logs..." 에서 영원히
// 멈췄다 (실측: 저장소 차단 시 목록 0건, 정상일 때 7건).
//
// 캐시는 없어도 되는 것이므로 실패는 "캐시 없음" 으로 흡수한다.

export const readSession = (key: string): string | null => {
	try {
		return sessionStorage.getItem(key);
	}
	catch {
		return null;
	}
};

export const writeSession = (key: string, value: string): void => {
	try {
		sessionStorage.setItem(key, value);
	}
	catch {
		// 캐시를 못 남기는 것은 정상 동작을 막지 않는다.
	}
};

export const removeSession = (key: string): void => {
	try {
		sessionStorage.removeItem(key);
	}
	catch {
		// 지울 것이 없으면 지워진 것과 같다.
	}
};
