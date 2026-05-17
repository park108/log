---
source_task: TSK-20260517-25
category: tooling
severity: low
observed_at: 2026-05-17T11:41:10Z
---

# lint-staged hook 가 developer 영역 밖 marker 파일을 강제 staging — RULE-02 cross-writer 침범 surface

## 관찰

TSK-20260517-25 (FileUpload setTimeout cleanup) 커밋 직전, developer 가 자기 영역 외 staged 파일 (`specs/30.spec/green/.inspector-seen`, `specs/30.spec/green/.planner-seen`) 을 `git reset HEAD --` 로 unstage 했음에도, `git commit` 실행 시점에 lint-staged hook chain 이 동작하면서 working tree 변경 상태였던 `.planner-seen` 가 결과 commit (`7b15126`) 에 포함됨.

- 자기 영역 staged 파일 (`src/File/FileUpload.tsx`, `src/File/FileUpload.test.tsx`, `specs/60.done/.../result.md`, `specs/60.done/.../TSK-25.md`): 4건.
- 의도 unstage 했으나 commit 에 포함된 cross-writer 파일: 1건 (`specs/30.spec/green/.planner-seen` — planner writer 영역).
- 의도 unstage 가 유지된 cross-writer 파일: 1건 (`specs/30.spec/green/.inspector-seen` — inspector writer 영역).

`git log -1 --stat HEAD` 출력:
```
specs/30.spec/green/.planner-seen                  | 73 +++++++++++++++++
...SK-20260517-25-fileupload-settimeout-cleanup.md | 68 ++++++++++++++++
.../task/fileupload-settimeout-cleanup/result.md   | 72 +++++++++++++++++
src/File/FileUpload.test.tsx                       | 93 ++++++++++++++++++++++
src/File/FileUpload.tsx                            | 14 +++-
5 files changed, 317 insertions(+), 3 deletions(-)
```

## 가설 (1회성 진단, spec 부적합)

- 추정: lint-staged 설정 또는 husky pre-commit 가 `package.json` glob 매칭 시 marker 파일을 자동으로 stage-back. 또는 git stash + restore chain 에서 unstaged 변경을 staged 로 승격하는 흐름.
- 직전 커밋 `2293592` ("planner 58차 tick promote 1 보완 — lint-staged hook chain 영향으로 add side + .planner-seen 누락") 도 동일 hook chain 영향을 명시 — 재현 가능 surface 가능성.

## 영향 / 심각도

- low: marker 파일 변경 자체는 데이터 손실 없음 (planner 가 다음 tick 에 재기록 가능). 다만 RULE-02 writer 영역 매트릭스 위반이 hook 우회 경로로 발생 — 운영 일관성 침해.
- 잠재: developer 가 cross-writer marker 변경을 자기 commit 에 흡수하면 planner / inspector 의 tick 멱등성에 간섭 가능.

## 후속 후보

- 재현 fixture: `git reset HEAD -- <cross-writer-path>` 후 `git commit` 시 lint-staged hook 가 어떤 경로로 stage-back 하는지 trace.
- 설정 점검: `package.json` lint-staged blocks + `.husky/pre-commit` 의 staging 동작 검토.
- 가드: pre-commit 시점에 cross-writer 영역 변경 차단 (예: `git diff --cached --name-only` 가 자기 영역만 포함하는지 verify).

## 본 task 영향

본 task (TSK-25) 본체 작업 (`FileUpload.tsx` + `FileUpload.test.tsx` + `result.md` + 원본 task md mv) 은 정상 박제. DoD 게이트 (G2 clearTimeout 1+ / G3 unmount() 1+) 전수 회복. 442/442 PASS. coverage 97.75/94.48/94.31/98.28 threshold 전수 통과. 본 surface 는 본 task 본체와 독립.
