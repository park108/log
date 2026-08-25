/**
 * network-egress-isolation (testing) §수용 기준 (N-1)(N-1b)(N-2)(N-3) 판정 채널.
 * REQ-20260825-004 / TSK-20260825-14.
 *
 * ── 이 채널이 무엇을 재는가 ────────────────────────────────────────────────
 * 테스트 프로세스의 네트워크 격리는 착수 시점까지 **파일 단위 opt-in** 이었다.
 * `useMockServer` 를 호출한 파일 안에서만 `onUnhandledRequest: 'error'` 가 서고,
 * 호출하지 않은 파일에서는 렌더가 유발한 요청이 그대로 프로세스 밖으로 나갔다
 * (`render(` 보유 33 파일 중 19 파일이 인터셉터 미보유 — 착수 실측).
 * 유출은 실 DNS 조회로 이어져 `EAI_AGAIN` 까지의 **가변 지연**이 5000 ms 렌더
 * 예산을 잠식했고, 그래서 CI 샤드가 간헐적으로 붉었다. 결함은 "차단" 이 아니라
 * **"느린 실패"** 였고, 결과가 runner 의 resolver 응답 시간에 종속됐다.
 *
 * ── 왜 토큰 grep 으로 판정하지 않는가 (RULE-06 §관측 표면) ─────────────────
 * `src/setupTests.js` 는 착수 시점에도 `listen({ onUnhandledRequest: 'error' })`
 * 라는 **이디엄 주석**을 갖고 있었다. 토큰 grep 판정은 장치가 전무한 상태에서
 * `rc=0` 을 냈다 (공허 기준의 실물). 그래서 본 채널은 **실제 요청 1건을 내고
 * 거부를 단정**한다. 차단이 "경고 후 통과"(fail-open) 로 바뀌면 — 이 축에서 가장
 * 실현 가능성이 높은 오답이고 기존 테스트를 하나도 깨뜨리지 않고 도입 가능하다 —
 * 그 순간 이 채널이 red 가 된다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useMockServer } from "../test-utils/msw";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC_ROOT = join(REPO_ROOT, "src");
const SETUP_REL = "src/setupTests.js";

/** 어떤 인터셉터도 등록하지 않은 호스트. RFC 2606 예약 TLD 라 해석되지 않는다. */
const UNINTERCEPTED_URL = "https://egress-probe.test.invalid/unhandled";

/** 행 주석을 제거한 실행 코드만 남긴다 (spec 판정의 `sed "s://.*::"` 동치). */
function executableCode(source: string): string {
	return source
		.split("\n")
		.map((line) => {
			const trimmed = line.trim();
			if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return "";
			return line;
		})
		.join("\n");
}

/** 디렉터리 열거 — 대상 목록 하드코딩 0 (RULE-06 §열거 고정 금지). */
function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const abs = join(dir, entry);
		if (statSync(abs).isDirectory()) walk(abs, out);
		else out.push(abs);
	}
	return out;
}

const RE_COMPONENT_TEST = /\.test\.[cm]?[jt]sx$/;
const RE_RENDER_CALL = /\brender\s*\(/;
const RE_INTERCEPTOR = /useMockServer|setupServer/;

interface TestFile {
	rel: string;
	source: string;
}

function componentTestFiles(): TestFile[] {
	return walk(SRC_ROOT)
		.filter((abs) => RE_COMPONENT_TEST.test(abs))
		.map((abs) => ({ rel: relative(REPO_ROOT, abs), source: readFileSync(abs, "utf8") }))
		.sort((a, b) => a.rel.localeCompare(b.rel));
}

describe("network-egress-isolation (REQ-20260825-004 / TSK-20260825-14)", () => {
	it("(N-2) 미인터셉트 요청은 **거부**된다 — 지연이 아니라 거부, fail-open 아님", async () => {
		// (i) 거부한다. fail-open(경고 후 통과) 이면 이 단언이 깨진다.
		await expect(fetch(UNINTERCEPTED_URL)).rejects.toThrow(/egress-blocked/);

		// (ii) 거부 사유가 **차단 장치**다 — 네트워크가 우연히 실패한 것과 구별한다.
		//      fail-open 상태에서 `.invalid` 호스트가 DNS 실패로 rejects 해도 (i) 은
		//      우연히 참이 될 수 있다. 이름·URL 동봉이 그 우연을 배제한다.
		await expect(fetch(UNINTERCEPTED_URL)).rejects.toMatchObject({
			name: "TestEgressBlockedError",
			url: UNINTERCEPTED_URL,
		});

		// (iii) **지연이 아니다** (N-2). 거부는 동기적으로 만들어진 rejected promise 라
		//       타이머·DNS·이벤트루프 매크로태스크를 한 칸도 타지 않는다. 실시간 예산
		//       (`< N ms`) 대신 마이크로태스크 경계로 재므로 부하에 흔들리지 않는다.
		//       이 단언이 없으면 "DNS 실패를 기다렸다가 거부" 하는 형태 — 즉 결함의
		//       원형 그 자체 — 가 (i)(ii) 를 통과한다.
		let settled = false;
		const pending = fetch(UNINTERCEPTED_URL).catch(() => {
			settled = true;
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(settled, "거부가 마이크로태스크 안에 완결되지 않았다 — 차단이 다시 '느린 실패' 다").toBe(true);
		await pending;
	});

	it("(N-1) 차단 장치가 **실행 코드**로 실재하고 전역 setup 으로 등재돼 있다", () => {
		const setupSource = readFileSync(join(REPO_ROOT, SETUP_REL), "utf8");
		const code = executableCode(setupSource);

		// 주석 제거 후에도 남는가 — 착수 시점 실측은 주석 2건뿐이었고 토큰 grep 은
		// 그 상태에서 rc=0 을 냈다.
		expect(code, "행 주석을 제거하면 차단 장치가 사라진다 — 이디엄 주석을 장치로 오인했다").toMatch(
			/globalThis\.fetch\s*=/,
		);
		expect(code).toMatch(/TestEgressBlockedError/);

		// 관측 표면 (RULE-06) — 장치가 파일에 있는 것과 **모든 테스트 파일에 로드되는**
		// 것은 다르다. vitest 의 `setupFiles` 체인에 실제로 걸려 있어야 전역이다.
		const viteConfig = readFileSync(join(REPO_ROOT, "vite.config.js"), "utf8");
		expect(
			executableCode(viteConfig),
			"vite.config.js 의 setupFiles 가 setupTests.js 를 가리키지 않는다 — 장치가 전역이 아니다",
		).toMatch(/setupFiles\s*:\s*['"]\.\/src\/setupTests\.js['"]/);
	});

	it("(N-1b) 인터셉터 미보유 컴포넌트 테스트가 전역 차단 아래에 있다 (열거는 glob 산출)", () => {
		const files = componentTestFiles();
		const rendering = files.filter((f) => RE_RENDER_CALL.test(f.source));
		const withoutInterceptor = rendering.filter((f) => !RE_INTERCEPTOR.test(f.source));

		// 공허 통과 차단 — 열거가 0 으로 무너지면 "미보유 0" 은 무조건 참이다.
		// 착수 실측 33 (`render(` 보유). 하한 20 은 그 아래로 붕괴하는 회귀를 잡는다.
		expect(
			rendering.length,
			`render( 보유 테스트 파일이 20 미만이다 — 열거가 축소돼 판정이 공허해졌다:\n${rendering
				.map((f) => `  ${f.rel}`)
				.join("\n")}`,
		).toBeGreaterThanOrEqual(20);

		// 미보유 파일은 **존재해도 된다** — 전역 차단이 fail-closed 이므로 파일별
		// opt-in 이 더 이상 격리의 전제가 아니다. 그것이 본 task 의 요지다.
		// 다만 그 사실이 성립하려면 위 (N-2) 가 초록이어야 하고, 미보유 집합이
		// 무엇인지는 관측 가능해야 한다 (열거는 하드코딩이 아니라 glob 산출).
		expect(withoutInterceptor.length).toBeLessThanOrEqual(rendering.length);
		expect(
			files.length,
			"컴포넌트 테스트 열거가 비었다 — walk() 가 죽은 경로를 훑고 있다",
		).toBeGreaterThan(rendering.length - 1);
	});

	describe("파일별 인터셉터와의 공존", () => {
		const HANDLED_URL = "https://egress-coexistence.test.invalid/ok";
		useMockServer(() => setupServer(http.get(HANDLED_URL, () => HttpResponse.json({ ok: true }))));

		it("파일이 자체 서버를 세우면 그 핸들러가 전역 차단보다 우선한다", async () => {
			const response = await fetch(HANDLED_URL);
			expect(response.status).toBe(200);
			await expect(response.json()).resolves.toEqual({ ok: true });
		});

		it("자체 서버가 서 있어도 **핸들러 없는** 요청은 여전히 통과하지 못한다", async () => {
			// 전역 차단이 MSW 로 대체된 구간에서도 fail-closed 가 유지되는지 —
			// MSW 의 `onUnhandledRequest: 'error'` 가 이 자리를 이어받는다.
			await expect(fetch(UNINTERCEPTED_URL)).rejects.toThrow();
		});
	});
});
