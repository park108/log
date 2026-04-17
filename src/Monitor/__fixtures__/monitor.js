import * as common from '../../common/common';

export const webVitalsProd = {
	Count: 3,
	Items: [
		{ evaluation: "GOOD", id: "v2-1656034616036-7298271418539", name: "CLS", timestamp: 1656034616036, value: 0.009544711182232976 },
		{ evaluation: "POOR", id: "v2-1656034635378-2481399101706", name: "CLS", timestamp: 16560346353781, value: 0.340741517698529 },
		{ evaluation: "NEEDS IMPROVEMENT", id: "v2-1656035041776-4470523187290", name: "CLS", timestamp: 1656035041776, value: 0.126102708124442 },
		{ evaluation: "BAD DATA", id: "v2-1656035041776-4470523187290", name: "CLS", timestamp: 1656035041776, value: 0.126102708124442 },
	],
	ScannedCount: 12725,
};

const FROM = 1643375805000; // 2022.01.28
const DAY_MS = 1000 * 60 * 60 * 24;

const buildApiCallItems = (succeed, failed, total) =>
	Array.from({ length: 7 }, (_, i) => ({ timestamp: FROM + DAY_MS * i, succeed, failed, total }));

export const apiCallStats700 = {
	totalCount: 700,
	ProcessingTime: 1000,
	Items: [
		{ timestamp: FROM, succeed: 50, failed: 50, total: 100 },
		{ timestamp: FROM + DAY_MS, succeed: 61, failed: 39, total: 100 },
		{ timestamp: FROM + DAY_MS * 2, succeed: 71, failed: 29, total: 100 },
		{ timestamp: FROM + DAY_MS * 3, succeed: 81, failed: 19, total: 100 },
		{ timestamp: FROM + DAY_MS * 4, succeed: 91, failed: 9, total: 100 },
		{ timestamp: FROM + DAY_MS * 5, succeed: 96, failed: 4, total: 100 },
		{ timestamp: FROM + DAY_MS * 6, succeed: 100, failed: 200, total: 100 },
	],
};

export const apiCallStatsNoTotalCount = {
	ProcessingTime: 1000,
	Items: buildApiCallItems(0, 0, 0),
};

export const apiCallStatsNoCount = {
	totalCount: 0,
	ProcessingTime: 1000,
	Items: buildApiCallItems(0, 0, 0),
};

const FEB_1_2022 = 1643673600000;
const PREV_DAY = 144000000;
const CHROME_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36";

const visitor = (browser, os, engine, originalText, offset) => ({
	browser,
	date: common.getFormattedDate(FEB_1_2022 - offset),
	operatingSystem: os,
	originalText,
	renderingEngine: engine,
	time: common.getFormattedTime(FEB_1_2022 - offset),
	timestamp: FEB_1_2022 - offset,
	url: "http://localhost:3000/",
});

export const visitorsProd = () => ({
	totalCount: 2533,
	periodData: {
		Count: 7,
		Items: [
			visitor("Firefox", "Windows", "Gecko", "Test Text", PREV_DAY),
			visitor("Chrome", "Mac OS X", "Webkit", CHROME_UA, 0),
			visitor("Chrome", "Mac OS X", "Webkit", CHROME_UA, PREV_DAY * 2),
			visitor("Chrome", "Mac OS X", "Webkit", CHROME_UA, PREV_DAY * 3),
			visitor("Chrome", "Mac OS X", "Webkit", CHROME_UA, PREV_DAY * 4),
			visitor("Chrome", "Mac OS X", "Webkit", CHROME_UA, PREV_DAY * 5),
			visitor("Chrome", "Mac OS X", "Webkit", CHROME_UA, PREV_DAY * 6),
		],
	},
});

const CONTENT_FROM = 1643375805000;
const MONTH_MS = 144000000 * 30;

export const contentLogStats = {
	Count: 6,
	ProcessingTime: 1000,
	Items: [
		{ timestamp: CONTENT_FROM, size: 3, sortKey: CONTENT_FROM },
		{ timestamp: CONTENT_FROM - MONTH_MS, size: 5, sortKey: -CONTENT_FROM },
		{ timestamp: CONTENT_FROM - MONTH_MS * 2 },
		{ timestamp: CONTENT_FROM - MONTH_MS * 3 },
		{ timestamp: CONTENT_FROM - MONTH_MS * 4 },
		{ timestamp: CONTENT_FROM - MONTH_MS * 5 },
	],
};

export const contentFileStats = {
	Count: 6,
	ProcessingTime: 1000,
	Items: [
		{ timestamp: CONTENT_FROM, size: 3, sortKey: CONTENT_FROM },
		{ timestamp: CONTENT_FROM - MONTH_MS, size: 5, sortKey: -CONTENT_FROM },
		{ timestamp: CONTENT_FROM - MONTH_MS * 2, size: 20 },
		{ timestamp: CONTENT_FROM - MONTH_MS * 3, size: 3100 },
		{ timestamp: CONTENT_FROM - MONTH_MS * 4, size: 5550 },
		{ timestamp: CONTENT_FROM - MONTH_MS * 5, size: 1927590 },
	],
};
