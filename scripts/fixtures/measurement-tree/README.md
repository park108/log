# 격리 픽스처 — 측정 트리 귀속 채널 / TSK-20260825-39

`check-measurement-tree-attribution.sh` 의 검출 방향을 실 소스·게이트를 건드리지 않고
왕복 측정하기 위한 파일들이다. **실행 대상이 아니며 어떤 런타임·빌드도 읽지 않는다.**

## 파일

- `tracked-probe.txt` — **추적 파일** 부류. (Dir-1) *이름 유지 · 내용 변경* 방향의 대상.
  주입: 측정 구간 중 이 파일에 1행 append → 지문 변화 → `rc=1`. 원복은 `cp -p` + `shasum`.

- `untracked-probe.template` — **미추적 파일** 부류의 원본. (Dir-2) *파일 소실* 방향의 대상.
  이 파일 자신은 추적된다. 주입 시 아래처럼 미추적 사본을 만들어 쓴다:

  ```sh
  cp -p scripts/fixtures/measurement-tree/untracked-probe.template \
        scripts/fixtures/measurement-tree/untracked-probe.txt      # 미추적 · 비-ignore
  # 측정 구간 중 mv 로 저장소 밖에 대피 → 지문 변화 → rc=1
  # 원복: mv 로 되돌린 뒤 shasum 대조. 측정 후 사본은 제거(mv)한다.
  ```

  **사본을 저장소에 남기지 않는다** — 미추적 파일이 상주하면 이후 모든 tick 의
  `git status` 가 더티가 되고 `RULE-03 §선결 점검 (1)` 이 전 에이전트를 no-op 시킨다.

## 왜 미추적 부류가 필요한가

관측된 사고에서 실제로 사라진 것이 **미추적 픽스처 3파일**이었다. 그래서 지문은 추적 파일뿐
아니라 미추적(비-ignore) 파일의 실재와 내용도 반영한다.

반대로 gitignore 된 산출물(`build/` · `coverage/`)은 `--exclude-standard` 로 제외한다 —
그것이 (Dir-5) 오탐 방향(측정 자신이 산출물을 만드는 정상 상황)을 구조적으로 막는 실체다.
