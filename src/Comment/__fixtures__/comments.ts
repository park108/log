interface CommentFixtureItem {
	sortKey: string;
	logTimestamp: number;
	timestamp: number;
	message: string;
	isHidden: boolean;
	isAdminComment: boolean;
	name: string;
	commentTimestamp?: number;
}

interface CommentsListPage {
	Items: CommentFixtureItem[];
	Count: number;
	ScannedCount: number;
}

export const commentsProdOne: CommentsListPage = {
	Items: [
		{ sortKey: "1655392348834-0000000000000", logTimestamp: 1655302060414, timestamp: 1655392348834, message: "Posting Test", isHidden: false, isAdminComment: false, name: "Posting Test" },
	],
	Count: 1,
	ScannedCount: 1,
};

export const commentsDevTen: CommentsListPage = {
	Items: [
		{ sortKey: "1655389504138-0000000000000", logTimestamp: 1655302060414, timestamp: 1655389504138, message: "나는 엉망으로 살고 있구나!", isHidden: false, isAdminComment: true, name: "Jongkil Park" },
		{ sortKey: "1655389797918-0000000000000", logTimestamp: 1655302060414, timestamp: 1655389797918, message: "내가 썼지만 숨겨져서 못보지롱?", isHidden: true, isAdminComment: false, name: "숨겨져있는 나" },
		{ commentTimestamp: 1655389797918, sortKey: "1655389797918-1655389832698", logTimestamp: 1655302060414, timestamp: 1655389832698, message: "비밀 댓글이 아니지만, 비밀 댓글에 대댓글을 달았다.", isHidden: false, isAdminComment: true, name: "Jongkil Park" },
		{ sortKey: "1655392096432-0000000000000", logTimestamp: 1655302060414, timestamp: 1655392096432, message: "Posting Lock Test", isHidden: false, isAdminComment: false, name: "Posting!" },
		{ sortKey: "1655392348834-0000000000000", logTimestamp: 1655302060414, timestamp: 1655392348834, message: "Posting Test", isHidden: false, isAdminComment: false, name: "Posting Test" },
		{ sortKey: "1655392394275-0000000000000", logTimestamp: 1655302060414, timestamp: 1655392394275, message: "Posting Test 2", isHidden: false, isAdminComment: false, name: "Posting Test" },
		{ sortKey: "1655392503660-0000000000000", logTimestamp: 1655302060414, timestamp: 1655392503660, message: "Posting Test4", isHidden: false, isAdminComment: false, name: "Posting Test" },
		{ sortKey: "1655392407974-0000000000000", logTimestamp: 1655302060414, timestamp: 1655392407974, message: "Posting Test3", isHidden: false, isAdminComment: false, name: "Posting Test" },
		{ sortKey: "1655589447546-0000000000000", logTimestamp: 1655302060414, timestamp: 1655589447546, message: "Admin comment", isHidden: false, isAdminComment: true, name: "Jongkil Park" },
		{ sortKey: "1655589469726-0000000000000", logTimestamp: 1655302060414, timestamp: 1655589469726, message: "Admin Hidden", isHidden: true, isAdminComment: true, name: "Jongkil Park" },
	],
	Count: 10,
	ScannedCount: 10,
};
