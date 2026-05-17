# `package.json` `name`/`version` ↔ `package-lock.json` top-level `name`/`version` ↔ `package-lock.json` `packages[""]` `name`/`version` npm lockfile 프로젝트 식별자 토큰 3극 정합 시스템 불변식

> **ID**: REQ-20260518-005
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요
npm 프로젝트 식별자 토큰 (`name` = `"log"` + `version` = `"0.1.0"`) 은 **3 곳** 에서 동시에 사용된다 — (a) `package.json:2,3` (npm CLI 의 진실 공급원 — `name`/`version` 의 manifest top-level key), (b) `package-lock.json:2,3` (lockfile v2/v3 의 top-level `name`/`version` — npm CLI 가 lockfile 갱신 시 `package.json` 의 동일 키를 mirror), (c) `package-lock.json:8,9` (lockfile v2/v3 의 `packages[""]` root workspace entry — npm CLI 가 root package metadata 를 dep tree 의 root node 에 박제). 3 곳의 토큰이 **byte-for-byte 동치 (`name`="log" + `version`="0.1.0")** 가 아니면 — (a) ↔ (b) 불일치 시 `npm install` rewrite (lockfile 자동 재생성) 또는 `npm ci` 의 `EUSAGE` (`npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. ... Invalid: lock file's name does not satisfy package.json`) fail-fast, (a) ↔ (c) 불일치 시 동일 분기 (`npm ci` root workspace name mismatch 검출), (b) ↔ (c) 불일치 시 lockfile 자체 내부 정합 위반 → npm CLI 의 lockfile parser 가 `npm install` 시 자동 보정 rewrite 또는 `npm ci` strict mode fail. 본 req 는 3 극 토큰 동치 + baseline hit 분포 (`package.json` `name`/`version` 각 1 + `package-lock.json` `name`/`version` top-level 각 1 + `package-lock.json` `packages[""].name`/`version` 각 1) + selector 형태 정합 (JSON 문자열 키 값) 의 **결과 효능 계약** 을 시스템 불변식으로 박제할 것을 요청한다. 본 req 는 결과 효능 (3 극 토큰 동치 + 자체 진단 가능) 만 박제하며, 발화 채널 (CI / pre-push / `package.json` `check:*` script / `npm ci --dry-run`) 선정 및 토큰 일관 갱신 수단 (`npm install` 자동 sync vs 수동 lockfile 편집 vs `npm version` CLI 사용) 선택은 inspector/planner 영역.

## 배경
- HEAD `c2ca64c` 실측:
  - 채널 P (`package.json:2,3`, npm manifest top-level scope):
    - `package.json:2` `"name": "log"` (1 hit) — `grep -nE '^\s{2}"name"\s*:' package.json` → 1 match.
    - `package.json:3` `"version": "0.1.0"` (1 hit) — `grep -nE '^\s{2}"version"\s*:' package.json` → 1 match.
  - 채널 LT (`package-lock.json:2,3`, lockfile top-level scope):
    - `package-lock.json:2` `"name": "log"` (1 hit) — `grep -nE '^\s{2}"name"\s*:' package-lock.json` → 1 match (single top-level occurrence).
    - `package-lock.json:3` `"version": "0.1.0"` (1 hit) — `grep -nE '^\s{2}"version"\s*:' package-lock.json` → 1 match (single top-level occurrence).
  - 채널 LR (`package-lock.json:8,9`, lockfile `packages[""]` root entry scope):
    - `package-lock.json:8` `"name": "log"` (1 hit) — `grep -nE '^\s{6}"name"\s*:' package-lock.json | head -1` → `8:      "name": "log",` (indent depth 6 = `packages[""]` 의 첫 level child key).
    - `package-lock.json:9` `"version": "0.1.0"` (1 hit) — `grep -nE '^\s{6}"version"\s*:' package-lock.json | head -1` → `9:      "version": "0.1.0",` (동일 indent).
  - 결정론 추출 (JSON parser): `node -e 'const p=require("./package.json"); const l=require("./package-lock.json"); console.log(JSON.stringify({pkg_name:p.name, pkg_version:p.version, lock_top_name:l.name, lock_top_version:l.version, lock_packages_root_name:l.packages[""].name, lock_packages_root_version:l.packages[""].version}))'` → `{"pkg_name":"log","pkg_version":"0.1.0","lock_top_name":"log","lock_top_version":"0.1.0","lock_packages_root_name":"log","lock_packages_root_version":"0.1.0"}` — **3 극 `name` 토큰 동치 PASS** (`log` ≡ `log` ≡ `log`) + **3 극 `version` 토큰 동치 PASS** (`0.1.0` ≡ `0.1.0` ≡ `0.1.0`).
- 토큰 별 의미 매핑:
  - 채널 P (`package.json:2,3`, npm manifest scope): npm CLI / `node_modules/.package-lock.json` / npm registry publish 시 진실 공급원. npm Docs — package.json `name` field (https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name) — 패키지의 unique identifier (npm registry namespace + import 토큰), 1~214 chars, URL-safe lowercase. `version` field (https://docs.npmjs.com/cli/v10/configuring-npm/package-json#version) — semver 2.0.0 호환 토큰.
  - 채널 LT (`package-lock.json:2,3`, lockfile top-level scope): npm CLI 가 lockfile 생성/갱신 시 `package.json` 의 `name`/`version` 을 lockfile root 에 mirror. npm Docs — package-lock.json `name`/`version` 필드 (https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#name) — "The name of the package this is a package-lock for. This will match what's in package.json." / `version` — "The version of the package this is a package-lock for. This will match what's in package.json."
  - 채널 LR (`package-lock.json:8,9`, lockfile `packages[""]` root entry scope): lockfile v2/v3 의 `packages` 객체 — 키 `""` (empty string) 는 root workspace package metadata. npm Docs — package-lock.json `packages` (https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#packages) — "Each key is the location of a package within the file system (or a workspace name) ... The root project is typically listed with a key of "". Most of the fields will be the same as in package.json (`name` / `version` / `dependencies` / `devDependencies` etc.)".
- 3 극 토큰 동치 baseline 상태 (HEAD `c2ca64c`):
  - 채널 P `name` 토큰 = `log` (4 byte ASCII literal, `package.json:2` JSON string value).
  - 채널 P `version` 토큰 = `0.1.0` (5 byte ASCII literal, `package.json:3` JSON string value).
  - 채널 LT `name` 토큰 = `log` (4 byte ASCII literal, `package-lock.json:2` JSON string value).
  - 채널 LT `version` 토큰 = `0.1.0` (5 byte ASCII literal, `package-lock.json:3` JSON string value).
  - 채널 LR `name` 토큰 = `log` (4 byte ASCII literal, `package-lock.json:8` JSON string value).
  - 채널 LR `version` 토큰 = `0.1.0` (5 byte ASCII literal, `package-lock.json:9` JSON string value).
  - **3 극 토큰 동치 PASS** — 의미적 분기 없음.
- 잠재 회귀 시나리오 (현재 baseline 위반 0 이나 미래 변경에서 발생 가능):
  - (R-1) `package.json:2` `"name": "log"` → `"name": "park108-log"` 변경 + lockfile 미갱신 (예: 수동 편집 후 `npm install` 미실행) → 채널 P ≠ 채널 LT = 채널 LR → `npm ci` 실행 시 `EUSAGE` fail-fast (npm CLI 의 `package.json` ↔ lockfile name 동치 검증). 정상 흐름은 `npm install` 호출 시 npm CLI 가 lockfile rewrite 로 자동 sync (LT + LR 모두 `park108-log` 갱신).
  - (R-2) `package.json:3` `"version": "0.1.0"` → `"version": "0.2.0"` 변경 + lockfile 미갱신 → 채널 P ≠ 채널 LT = 채널 LR → `npm ci` 실행 시 `EUSAGE` fail-fast (npm 의 version drift 검출). 정상 흐름은 `npm version <semver>` 또는 `npm install` 로 자동 sync.
  - (R-3) `package-lock.json:8` `"name": "log"` 만 다른 토큰으로 수동 편집 + `package-lock.json:2` 보존 → 채널 LR ≠ 채널 LT = 채널 P → lockfile 내부 정합 위반 → `npm ci` strict mode 분기 진입 (lockfile parser self-check). npm CLI 의 `package.json` 검증은 top-level lockfile name 과 비교하므로 R-3 변종은 사용자가 lockfile 만 부분 편집한 경우 발생.
  - (R-4) `package.json:2` `"name"` 키 삭제 → 채널 P hit 0 → npm CLI 가 publish/install 분기에서 패키지 이름 부재 검출 → fail-fast (npm 의 manifest 검증).
  - (R-5) `package-lock.json:2` `"name"` 키 또는 `packages[""].name` 키 삭제 → 채널 LT 또는 LR hit 0 → npm CLI 의 lockfile parser 분기 (`npm ci` 시 lockfile 무효 검출 또는 자동 rewrite).
  - (R-6) `package.json:3` `"version"` 키 값을 invalid semver (`"0.1"` / `"v0.1.0"` / `"0.1.0-dirty"` 등) 로 변경 → semver parse 분기 진입 (`semver.valid()` false) → npm CLI fail-fast.
  - (R-7) `package-lock.json` 의 JSON quote 형태 변경 (`"name"` → `'name'` single quote literal — JSON spec 위반) → JSON parse 실패 → lockfile 전체 무효 (REQ-099 G-F 와 동치 효능, lockfile 측 mirror).
- 자매 spec 격리:
  - REQ-20260517-090 `foundation/package-manager-major-coherence.md` (green) — 패키지 매니저 메이저 4축 정합 (`engines.npm` / `packageManager` / `lockfileVersion` / CI `npm-version`). **§역할 (line 10) 의 In-Scope 는 `lockfileVersion` 키 한정** — `package.json` ↔ `package-lock.json` 의 `name`/`version` 토큰 정합은 미박제 (별 axis). 본 req 가 그 별 axis (lockfile 의 dep tree 가 아닌 root metadata token 동치) 박제.
  - REQ-20260517-068 `foundation/node-modules-extraneous-coherence.md` (green) — `node_modules/` extraneous tree 정합. `package-lock.json` 의 dependency tree 영역 (REQ-068 영역) 으로 본 req (lockfile root metadata `name`/`version` 토큰) 와 직교.
  - REQ-20260517-066 `foundation/runtime-dep-version-coherence.md` (green) — runtime deps 의 `package.json` `dependencies`/`devDependencies` 의 semver range ↔ `package-lock.json` resolved 버전 정합. 본 req 와 직교 (deps 항목별 axis vs root package metadata axis).
  - REQ-20260517-079 `foundation/node-version-3axis-coherence.md` (blue) — Node 메이저 3축 정합 (`engines.node` / CI `node-version` / 로컬 pin). 본 req 와 직교 (Node runtime axis vs 프로젝트 식별자 axis).
  - REQ-099 `foundation/index-html-public-asset-reference-coherence.md` (green) — `index.html` 정적 자원 참조 4종 + manifest `theme_color` 양면 동치 axis. HTML/manifest 영역으로 본 req (npm manifest/lockfile) 와 직교.
  - REQ-20260518-002 `20.req/20260518-index-html-root-mount-id-token-coherence.md` — `<div id="root">` ↔ `getElementById("root")` 3 극 mount ID 토큰 axis. mount selector 영역으로 본 req 와 직교.
  - REQ-20260518-003 `20.req/20260518-meta-description-default-fallback-token-coherence.md` — `<meta name="description">` ↔ `DEFAULT_META_DESCRIPTION` 양면 axis. SEO description text axis 로 본 req 와 직교.
  - REQ-20260518-004 `20.req/20260518-html-title-manifest-name-token-coherence.md` — `<title>` ↔ `manifest.short_name` ↔ `manifest.name` 3 극 axis. PWA 사이트 타이틀 토큰 영역 — 흥미롭게도 manifest 의 `name` 키 토큰 (`"park108.net"`) 은 npm `package.json:name` 키 토큰 (`"log"`) 과 **별 토큰** (의도된 분리 — PWA UX 라벨 vs npm 패키지 식별자). 본 req 와 REQ-20260518-004 는 axis 직교 (lockfile metadata vs PWA manifest metadata) — 동명 키 `name` 의 의미가 다르다.
- 별 channel 박제 (본 req scope 외):
  - `package-lock.json` 의 `dependencies` / `devDependencies` 트리 (line 10~44 + nested) — REQ-068 / REQ-066 영역.
  - `package-lock.json:4` `"lockfileVersion": 2` — REQ-20260517-090 영역.
  - `package-lock.json:5` `"requires": true` — npm v6 backward compat marker, 본 req scope 외.
  - `package-lock.json:1077+` 의 다른 `"name"` 토큰 (lockfile 의 nested package entries 의 dependency package 이름들) — 본 req 의 게이트 scope 는 **lockfile root 영역만** (`package-lock.json:2,3` top-level + `package-lock.json:8,9` `packages[""]` 의 첫 entry).
  - `package.json:5~` 의 `private` / `scripts` / `dependencies` / `devDependencies` 키 — `name`/`version` 이외 manifest 키. 본 req scope 외.
- 외부 출처:
  - npm Docs — `package.json` `name` field (https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name) — "If you plan to publish your package, the most important things in your package.json are the name and version fields as they will be required."
  - npm Docs — `package.json` `version` field (https://docs.npmjs.com/cli/v10/configuring-npm/package-json#version) — "Version must be parseable by node-semver, which is bundled with npm as a dependency."
  - npm Docs — `package-lock.json` `name`/`version` (https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json) — "name — The name of the package this is a package-lock for. This will match what's in package.json." / "version — The version of the package this is a package-lock for. This will match what's in package.json."
  - npm Docs — `package-lock.json` `packages` (https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#packages) — "Each key is the location of a package within the file system (or a workspace name) ... The root project is typically listed with a key of ""."
  - npm Docs — `npm ci` (https://docs.npmjs.com/cli/v10/commands/npm-ci) — "npm ci will exit with a non-zero exit code in the following circumstances: a package.json or package-lock.json file is missing; the package-lock.json doesn't match package.json (e.g., a dependency was added or removed from package.json but the lock file wasn't regenerated)."
  - semver 2.0.0 spec (https://semver.org/spec/v2.0.0.html) — `version` 토큰 구문 정의.

## 목표
- In-Scope:
  - `package.json:2,3` `name`/`version` ↔ `package-lock.json:2,3` top-level `name`/`version` ↔ `package-lock.json:8,9` `packages[""]` `name`/`version` 3 극 npm 프로젝트 식별자 토큰 동치 (byte-for-byte) 의 결과 효능 계약 spec 박제.
  - 자체 진단 채널 (JSON parse + `name`/`version` 6 위치 토큰 추출 + 3 극 동치 비교 fixture 또는 `npm ci --dry-run` 또는 동등) 의 존재 계약 박제.
  - HEAD `c2ca64c` baseline 측정: 채널 P 2 hit (`package.json:2,3`) / 채널 LT 2 hit (`package-lock.json:2,3`) / 채널 LR 2 hit (`package-lock.json:8,9`) → 3 극 `name` 동치 (`log`) + 3 극 `version` 동치 (`0.1.0`).
  - 시점 비의존 (npm CLI minor/patch bump · `npm version` 실행 · `package.json` `name` 변경 · workspace 도입 등 이벤트 직후에도 동일 측정 결과 효능 유지).
- Out-of-Scope:
  - 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:lockfile-root-coherence` script / `npm ci --dry-run` 호출 hook) 선정 — 수단 위임 (inspector/planner 영역).
  - 토큰 일관 갱신 수단 선택 — `npm install` 자동 sync vs `npm version <semver>` CLI vs 수동 lockfile 편집 vs `git hooks/pre-commit` 자동 `npm install` 트리거 — 수단 중립, inspector/planner 영역.
  - `lockfileVersion` 키 값 정합 (현 baseline `2`) — REQ-20260517-090 (`package-manager-major-coherence`) 영역.
  - `package-lock.json` 의 dependency tree 정합 (`dependencies` / `devDependencies` / nested `packages[node_modules/...]` entries 의 `version` / `resolved` / `integrity` SRI) — REQ-068 / REQ-066 영역.
  - `package.json` 의 `private` / `scripts` / `engines` / `packageManager` 키 정합 — `name`/`version` 외 영역. `engines` / `packageManager` 는 REQ-20260517-090 영역.
  - npm workspaces 도입 시 추가 `packages[<workspace-path>]` entries — 현 baseline 부재 (`packages` 의 키 = `""` + nested deps 만, workspace 키 0). 도입 시 본 spec 갱신 신호 (3 극 → N 극 axis 로 spec 재정의 필요).
  - `package.json:name` 토큰 자체 의미 (npm registry namespace 정책 — 예: `"log"` 가 publish-friendly 인가, `@scope/log` scoped name 도입 결정) — 본 req 는 토큰 동치만 박제, 콘텐츠 결정은 외부.
  - `version` 토큰의 semver tier 정책 (예: `0.1.0` ↔ pre-release vs `1.0.0` 전환 결정) — 본 req scope 외.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `package.json` 의 top-level `"name"` 키 등록 hit 수 baseline = **1** (`grep -cE '^\s{2}"name"\s*:' package.json` → 1). top-level `"version"` 키 등록 hit 수 baseline = **1** (`grep -cE '^\s{2}"version"\s*:' package.json` → 1). npm Docs — `package.json` 의 `name`/`version` 은 단일 occurrence (root manifest scope). | Must |
| FR-02 | `package-lock.json` 의 top-level `"name"` 키 등록 hit 수 baseline = **1** (`grep -cE '^\s{2}"name"\s*:' package-lock.json` → 1). top-level `"version"` 키 등록 hit 수 baseline = **1** (`grep -cE '^\s{2}"version"\s*:' package-lock.json` → 1). npm Docs — `package-lock.json` 의 top-level `name`/`version` 은 단일 occurrence (lockfile v2/v3 spec). | Must |
| FR-03 | `package-lock.json` 의 `packages[""]` 영역 `"name"` 키 등록 hit 수 baseline = **1** (`grep -nE '^\s{6}"name"\s*:' package-lock.json \| head -1` → `8:      "name": "log",`). 동일 영역 `"version"` 키 등록 hit 수 baseline = **1** (`grep -nE '^\s{6}"version"\s*:' package-lock.json \| head -1` → `9:      "version": "0.1.0",`). 단, indent depth 6 (`packages[""]` 의 첫 level child) 한정 — nested workspace 도입 시 추가 occurrence 등록 가능 (본 spec 갱신 신호). | Must |
| FR-04 | **3 극 `name` 토큰 동치 게이트** — FR-01 의 `package.json:name` value + FR-02 의 `package-lock.json:name` (top-level) value + FR-03 의 `package-lock.json:packages[""].name` value 의 토큰이 **byte-for-byte 동치** (`log` ≡ `log` ≡ `log`). baseline HEAD `c2ca64c` 측정: 3 극 모두 `log` (4 byte ASCII literal) → **3 극 `name` 토큰 동치 PASS**. 추출 방법: JSON parse `package.json` 후 `.name` + JSON parse `package-lock.json` 후 `.name` + `.packages[""].name` → 3 토큰 byte-for-byte 비교. | Must |
| FR-05 | **3 극 `version` 토큰 동치 게이트** — FR-01 의 `package.json:version` value + FR-02 의 `package-lock.json:version` (top-level) value + FR-03 의 `package-lock.json:packages[""].version` value 의 토큰이 **byte-for-byte 동치** (`0.1.0` ≡ `0.1.0` ≡ `0.1.0`). baseline HEAD `c2ca64c` 측정: 3 극 모두 `0.1.0` (5 byte ASCII literal) → **3 극 `version` 토큰 동치 PASS**. 추출 방법: JSON parse `package.json` 후 `.version` + JSON parse `package-lock.json` 후 `.version` + `.packages[""].version` → 3 토큰 byte-for-byte 비교. | Must |
| FR-06 | `package-lock.json:4` `"lockfileVersion"` 값 (현 baseline `2`) 의 정합은 본 spec scope 외 (REQ-20260517-090 영역) 이나, lockfile 의 **JSON parse 유효성** (`node -e 'JSON.parse(require("fs").readFileSync("package-lock.json"))'` → rc=0) 은 FR-04 / FR-05 의 선행 조건이며 본 spec 의 implicit precondition. JSON parse 실패 시 본 게이트는 fail-fast (rc=1). | Must |
| FR-07 | `npm ci --dry-run` 또는 `npm ci --ignore-scripts` 실행 시 npm CLI 의 `package.json` ↔ `package-lock.json` `name`/`version` 동치 검증 channel 이 **rc=0** 산출 (현 baseline). 이 채널은 npm CLI built-in 검증 — 본 spec 의 자체 진단 1 후보이나 수단 선정은 inspector/planner 영역. | Should |
| FR-08 | FR-01·FR-02·FR-03·FR-04·FR-05 5 조건의 회귀는 자동 검출 채널 (JSON parse + 6 위치 토큰 추출 + 동치 비교 fixture 또는 `npm ci --dry-run` 또는 동등) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 선정은 수단 영역, "발화 채널이 존재해야 한다" 는 계약 자체는 박제. | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 결정론 | 동일 HEAD 상에서 FR-01·FR-02·FR-03·FR-04·FR-05 의 grep + JSON parse + 토큰 추출 + 동치 비교 결과가 N 회 반복 시 N 회 동일 rc + 동일 출력. |
| NFR-02 | 멱등성 | 본 게이트는 read-only — `package.json` / `package-lock.json` 파일을 수정하지 않는다. `npm ci --dry-run` 채널 (FR-07) 도 `--dry-run` flag 로 디스크 부수효과 0. |
| NFR-03 | 성능 | (a) FR-01 grep < 50 ms. (b) FR-02 + FR-03 grep < 100 ms (lockfile 약 50KB+ 이나 ASCII pattern grep 단순). (c) FR-04 + FR-05 토큰 추출 + 동치 비교 < 200 ms (`require()` 두 JSON 파일 + 6 키 추출). (d) FR-07 `npm ci --dry-run` 채널 사용 시 < 30 s (네트워크 차단 환경에서). |
| NFR-04 | 자체 진단 제외 | 본 req / 본 spec / 테스트 문서의 본문 내 `"name": "log"`, `"version": "0.1.0"` 등 문자열 occurrence 는 FR-01 의 `package.json` grep count + FR-02 / FR-03 의 `package-lock.json` grep count 와 독립 — 게이트 scope 는 `package.json` 단일 파일 + `package-lock.json` 단일 파일로 한정. spec 본문의 토큰은 backtick / 코드 블록 영역이며 root manifest scope 외. |
| NFR-05 | 외부 비파괴 | 본 효능 도입은 `package.json` / `package-lock.json` 의 src 외 변경 동반 없음 — 단, FR-08 의 발화 채널 부착 수단 (예: `package.json` 의 `check:*` script 추가 또는 husky hook 부착 또는 CI step 추가) 은 본 spec 의 In-Scope 가 아닌 수단 영역. |
| NFR-06 | 채널 의미 분리 | 채널 P (npm manifest 진실 공급원) ↔ 채널 LT (lockfile root mirror) ↔ 채널 LR (lockfile `packages[""]` workspace root entry) 의 의미 분리는 본 spec 의 행동 평서문에 포함되되 어느 채널의 우선순위 라벨 ("기본" / "권장" / "진실 공급원") 박제 금지 — npm CLI 가 `package.json` 을 진실 공급원으로 두는 사실은 외부 (npm Docs) 평서이며 본 spec 은 토큰 동치 axis 만 박제. 3 채널의 발화 단계 (CLI publish 시 / `npm install` 시 lockfile rewrite / `npm ci` 시 lockfile parse) 는 독립이나 본 spec 은 **프로젝트 식별자 토큰 동치** axis 만 박제. |
| NFR-07 | 시점 비의존 | FR-01·FR-02·FR-03·FR-04·FR-05 는 npm CLI minor/patch bump · `npm version` 실행 · `package.json` `name` 갱신 · workspace 도입 시점 / 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 5 조건 동시 만족 회복 또는 본 spec 갱신. |

## 수용 기준
- [ ] Given HEAD `c2ca64c` baseline, When `grep -cE '^\s{2}"name"\s*:' package.json && grep -cE '^\s{2}"version"\s*:' package.json` 실행, Then **둘 다 출력 = 1 + rc=0** (FR-01).
- [ ] Given HEAD `c2ca64c` baseline, When `grep -cE '^\s{2}"name"\s*:' package-lock.json && grep -cE '^\s{2}"version"\s*:' package-lock.json` 실행, Then **둘 다 출력 = 1 + rc=0** (FR-02).
- [ ] Given HEAD `c2ca64c` baseline, When `grep -nE '^\s{6}"name"\s*:' package-lock.json | head -1` 실행 + `grep -nE '^\s{6}"version"\s*:' package-lock.json | head -1` 실행, Then 각각 **`8:      "name": "log",` + `9:      "version": "0.1.0",`** (FR-03).
- [ ] Given `package.json:2,3` `"name": "log"` ∧ `"version": "0.1.0"` ∧ `package-lock.json:2,3` 동일 ∧ `package-lock.json:8,9` 동일, When JSON parse 후 6 키 (`.name` / `.version` / lockfile `.name` / `.version` / `.packages[""].name` / `.packages[""].version`) 추출 + 3 극 `name` byte-for-byte 비교, Then **3 토큰 모두 `log` 동치 PASS** (FR-04).
- [ ] Given 동일 baseline, When 동일 추출 후 3 극 `version` byte-for-byte 비교, Then **3 토큰 모두 `0.1.0` 동치 PASS** (FR-05).
- [ ] Given `package-lock.json` JSON 자체 유효성, When `node -e 'JSON.parse(require("fs").readFileSync("package-lock.json"))'`, Then **rc=0** (FR-06 precondition).
- [ ] Given `npm ci --dry-run` 채널 (오프라인 또는 cache 모드), When 실행, Then **rc=0** (FR-07, npm CLI built-in 검증 PASS).
- [ ] Given 회귀 가설 (R-1): `package.json:2` `"name": "log"` → `"name": "park108-log"` 변경 + lockfile 미갱신, When 본 게이트 실행, Then **채널 P `name` = `park108-log` ∧ 채널 LT/LR `name` = `log` → 3 극 동치 분기 검출 (FR-04 위반, rc=1)** + `npm ci --dry-run` → **EUSAGE fail-fast (rc=1)**.
- [ ] Given 회귀 가설 (R-2): `package.json:3` `"version": "0.1.0"` → `"version": "0.2.0"` 변경 + lockfile 미갱신, When 본 게이트 실행, Then **채널 P `version` = `0.2.0` ∧ 채널 LT/LR `version` = `0.1.0` → 3 극 동치 분기 검출 (FR-05 위반, rc=1)** + `npm ci --dry-run` → **EUSAGE fail-fast (rc=1)**.
- [ ] Given 회귀 가설 (R-3): `package-lock.json:8` `"name": "log"` → 다른 토큰 수동 편집 + `package-lock.json:2` 보존, When 본 게이트 실행, Then **채널 LR ≠ 채널 LT = 채널 P → 3 극 동치 분기 검출 (FR-04 위반, rc=1)**.
- [ ] Given 회귀 가설 (R-4): `package.json:2` `"name"` 키 삭제, When 본 게이트 실행, Then **FR-01 grep count = 0 (감소 검출, rc=1)** + `npm` CLI manifest 검증 분기 fail-fast.
- [ ] Given 회귀 가설 (R-5): `package-lock.json:2` `"name"` 키 또는 `packages[""].name` 키 삭제, When 본 게이트 실행, Then **FR-02 또는 FR-03 grep count = 0 (감소 검출, rc=1)**.
- [ ] Given 회귀 가설 (R-6): `package.json:3` `"version"` 값을 invalid semver (`"0.1"` 또는 `"v0.1.0"`) 로 변경, When 본 게이트 실행, Then **JSON parse 성공이나 `semver.valid()` 분기 false → npm CLI fail-fast (rc=1)** — FR-04/FR-05 게이트 자체는 token 동치만 다루므로 보충 채널 (npm CLI 의 semver 검증) 의 fail-fast 가 실효 회귀 검출.
- [ ] Given 회귀 가설 (R-7): `package-lock.json` 의 JSON quote 형태 변경 (`"name"` → `'name'`), When 본 게이트 실행 + JSON parse, Then **JSON parse 실패 (rc=1)** — FR-06 precondition 위반.
- [ ] Given 동일 HEAD `c2ca64c`, When 본 게이트 N 회 실행, Then **N 회 동일 rc + 동일 출력** (NFR-01 결정론).
- [ ] Given 본 게이트 실행, When `package.json` / `package-lock.json` 파일 mtime 측정, Then **mtime 변경 없음** (NFR-02 멱등성).

## 참고
- 자매 spec: `specs/30.spec/green/foundation/package-manager-major-coherence.md` (REQ-20260517-090, green) — 패키지 매니저 메이저 4축 (`engines.npm` / `packageManager` / `lockfileVersion` / CI `npm-version`). 본 req 와 직교 (lockfile root metadata `name`/`version` 토큰 axis vs `lockfileVersion` 키 + 매니저 메이저 정합 axis). 동일 `package-lock.json` 파일을 다루나 채널 분리.
- 자매 spec: `specs/30.spec/green/foundation/node-modules-extraneous-coherence.md` (REQ-20260517-068, green) — `node_modules/` extraneous tree 정합 axis. lockfile dep tree 영역으로 본 req (lockfile root metadata) 와 직교.
- 자매 spec: `specs/30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-20260517-066, green) — runtime deps `package.json:dependencies/devDependencies` ↔ `package-lock.json` resolved 버전 정합. 본 req 와 직교 (deps 항목 axis vs root metadata axis).
- 자매 spec: `specs/30.spec/blue/foundation/node-version-3axis-coherence.md` (REQ-20260517-079, blue) — Node 메이저 3축 정합. 본 req 와 직교 (Node runtime axis vs npm 식별자 axis).
- 자매 spec: `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099, green) — `index.html` 정적 자원 참조 + manifest `theme_color` 양면 axis. HTML/PWA manifest 영역으로 본 req (npm manifest/lockfile) 와 직교.
- 자매 spec: `specs/20.req/20260518-html-title-manifest-name-token-coherence.md` (REQ-20260518-004) — PWA manifest `name` 토큰 (`park108.net`) axis. **동명 키 `name` 의 의미 분리** — PWA UX 라벨 (`"park108.net"`) vs npm 패키지 식별자 (`"log"`) 는 의도된 별 토큰. 본 req 와 직교.
- 자매 spec: `specs/20.req/20260518-index-html-root-mount-id-token-coherence.md` (REQ-20260518-002) — DOM mount ID 토큰 axis. 본 req 와 직교.
- 자매 spec: `specs/20.req/20260518-meta-description-default-fallback-token-coherence.md` (REQ-20260518-003) — SEO description text axis. 본 req 와 직교.
- 별 axis 박제 (본 req scope 외):
  - `package-lock.json:4` `"lockfileVersion": 2` — REQ-20260517-090 영역.
  - `package-lock.json:5` `"requires": true` — npm v6 backward compat marker. 본 req scope 외.
  - `package-lock.json` 의 nested `packages[node_modules/...]` entries 의 `name`/`version` 토큰 — dep tree 영역 (REQ-068/REQ-066).
  - `package.json:scripts`/`engines`/`packageManager`/`dependencies`/`devDependencies` 키 — `name`/`version` 외 manifest 키. REQ-20260517-090 / REQ-068 / REQ-066 영역.
- 외부 출처:
  - npm Docs — `package.json` `name` field (https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name).
  - npm Docs — `package.json` `version` field (https://docs.npmjs.com/cli/v10/configuring-npm/package-json#version).
  - npm Docs — `package-lock.json` 의 `name`/`version`/`packages` (https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json).
  - npm Docs — `npm ci` EUSAGE 분기 (https://docs.npmjs.com/cli/v10/commands/npm-ci).
  - semver 2.0.0 spec (https://semver.org/spec/v2.0.0.html).
- 측정 출처: HEAD `c2ca64c` 실측 — `grep -cE '^\s{2}"name"\s*:' package.json` = 1 / `grep -cE '^\s{2}"version"\s*:' package.json` = 1 / `grep -cE '^\s{2}"name"\s*:' package-lock.json` = 1 / `grep -cE '^\s{2}"version"\s*:' package-lock.json` = 1 / `grep -nE '^\s{6}"name"\s*:' package-lock.json | head -1` = `8:      "name": "log",` / `grep -nE '^\s{6}"version"\s*:' package-lock.json | head -1` = `9:      "version": "0.1.0",` / `node -e` 6 키 추출 결과 = `{"pkg_name":"log","pkg_version":"0.1.0","lock_top_name":"log","lock_top_version":"0.1.0","lock_packages_root_name":"log","lock_packages_root_version":"0.1.0"}`.
- RULE-07 양성 근거: 본 req 는 incident / 일회성 진단이 아니라 npm 프로젝트의 manifest + lockfile root metadata 의 **프로젝트 식별자 토큰 3극 정합 시스템 불변식** 을 요구. JSON parser + 문자열 byte-for-byte 비교로 반복 검증 가능하며 시점·릴리스 의존 없음. baseline 측정값은 HEAD `c2ca64c` 스냅샷 박제이나 효능 평서 자체는 시점 비의존 (NFR-07).
