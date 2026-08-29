# CDN 응답 헤더 · 배포 스큐

> 실측: 2026-08-29 · 대상: `https://www.park108.net/` (AWS Amplify Hosting)

## 정정 (2026-08-29 재실측)

이 문서의 이전 판은 댓글 청크 404 의 원인을 **`index.html` 의 1년 CDN 캐시**로
지목하고 "근본 원인이 남아 있으므로 다음 배포에서 재발한다" 고 적었다.
**그 진단은 틀렸다.** 재실측 결과는 아래와 같다.

| 관측 | 결과 |
|---|---|
| 라이브 `index.html` 이 참조하는 자산 3건 | 전부 **200** |
| 사용자가 겪은 구 청크 `CommentItem-gvYxF0vE.js` | **404** |
| `index.html` CDN 캐시 | `Hit from cloudfront`, `age` 증가 — 캐시는 된다 |
| 배포 후 `index.html` | 새 자산 해시를 가리킴 — 무효화가 작동한다 |

즉 **새로 접속하는 사용자에게는 문제가 없다.** Amplify 는 배포마다 무효화하므로
`s-maxage=31536000` 이 붙어 있어도 stale index 가 나가지 않는다.

깨진 것은 **이미 열려 있던 탭**이다. 배포가 구 청크를 지우는 동안 그 탭에서는
여전히 구 JS 가 돌고 있고, 사용자가 lazy 경로(`2 comments`)를 누르는 순간
사라진 청크를 요청한다. 이것은 캐시 문제가 아니라 **SPA 배포 스큐**다.

**따라서 캐시 정책을 바꿔도 이 증상은 낫지 않는다.** 열린 탭의 구 JS 는 이미
브라우저 안에 있고, CDN TTL 은 그 사실을 바꾸지 못한다.

### 실제 방어 (이미 적용됨)

`src/common/ErrorFallback.tsx` 가 청크 로드 실패를 식별해 "새 버전이
배포되었습니다" 안내와 새로고침 버튼을 낸다. 배포 스큐에 대한 올바른 대응은
정확히 이것이다 — 사용자를 새 index.html 로 보내는 것.

```
/dynamically imported module|importing a module script failed|failed to fetch dynamically/i
```

### 캐시 정책을 건드리지 않는 이유

바꿀 근거가 없다. Amplify 기본값(`public, max-age=0, s-maxage=31536000`)은
브라우저에는 매번 재검증을, CDN 에는 장기 보관을 지시하고, 배포 무효화가
장기 보관의 위험을 제거한다. `s-maxage` 를 낮추면 CDN 적중률만 떨어지고
열린 탭 문제는 그대로다.

---

## 보안 응답 헤더 (저장소에서 조치함)

### 실측 (조치 전)

```
$ curl -sI https://www.park108.net/ | grep -iE 'content-security|x-frame|strict-transport|x-content-type|referrer-policy'
(출력 없음)
```

CSP 는 `index.html` 의 `<meta>` 로만 전달됐다.

### 왜 헤더가 필요한가

`frame-ancestors` 는 **meta 로 전달되면 명세상 무시된다**. 브라우저가 콘솔에
그대로 경고한다:

```
The Content Security Policy directive 'frame-ancestors' is ignored
when delivered via a <meta> element.
```

클릭재킹 방어가 **선언은 있으나 작동하지 않는** 상태였다. 오해를 없애려고
meta 에서 제거하고 사유를 `index.html` 주석에 남겼다 (`f4fe3f6`). 실제 방어는
헤더 계층에서만 가능하다.

### 조치 — `customHttp.yml` (저장소 루트)

Amplify Hosting 은 저장소 루트의 `customHttp.yml` 을 읽어 응답 헤더를 붙인다.
콘솔 작업이 아니라 **코드로 관리된다**.

| 헤더 | 값 | 목적 |
|---|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'` | 클릭재킹 차단 (meta 로는 불가) |
| `X-Frame-Options` | `DENY` | 위의 구형 대체재 |
| `X-Content-Type-Options` | `nosniff` | MIME 스니핑 차단 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 외부 링크로 경로 유출 방지 |
| `Strict-Transport-Security` | `max-age=31536000` | HTTPS 강제 (1년) |

meta CSP 의 나머지 지시어(`default-src` · `script-src` · `connect-src` ·
`img-src` · `style-src` · `font-src` · `object-src` · `base-uri` ·
`form-action`)는 meta 에서도 유효하므로 `index.html` 이 계속 소유한다.
두 정책은 **교집합**으로 적용되므로 나눠 두어도 서로를 약하게 만들지 않는다.

### HSTS 에서 의도적으로 뺀 것

`includeSubDomains` 와 `preload` 를 **넣지 않았다.** 둘 다 되돌리기가 훨씬
어렵다 — `preload` 는 목록 등재 후 제거에 수개월이 걸리고,
`includeSubDomains` 는 HTTP 로만 뜨는 서브도메인이 생기는 순간 접근 불가가
된다. 필요해지면 그때 별도 판단으로 올린다.

`max-age=31536000` 자체도 1년 약정이다. 되돌리려면 값을 낮춰 재배포해야 하고,
이미 방문한 브라우저는 자기 캐시가 만료될 때까지 구 값을 쓴다.

---

## 검증 — 완료 (2026-08-29)

배포 후 실측했다. **5종 전부 적용됐다.** `customHttp.yml` 이 읽힌다는 것은
이 사이트가 **Amplify Hosting** 임을 확정한다 (추론이 아니라 관측).

```
$ curl -sI https://www.park108.net/ | grep -iE '...'
strict-transport-security: max-age=31536000
content-security-policy: frame-ancestors 'none'
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
```

아래는 회귀 확인용으로 남긴다. `customHttp.yml` 변경은 **다음 배포부터**
적용된다.

```bash
# 보안 헤더 5종이 실재한다
curl -sI https://www.park108.net/ \
  | grep -iE 'content-security-policy|x-frame-options|strict-transport-security|x-content-type-options|referrer-policy'

# 기대 출력 (순서 무관)
#   content-security-policy: frame-ancestors 'none'
#   x-frame-options: DENY
#   x-content-type-options: nosniff
#   referrer-policy: strict-origin-when-cross-origin
#   strict-transport-security: max-age=31536000
```

**출력이 비면 회귀다.** 2026-08-29 시점에 5종 전부 적용됨을 확인했으므로,
이후 빈 출력은 `customHttp.yml` 이 지워졌거나 호스팅 형태가 바뀐 것이다.

```bash
# 배포 스큐 회귀 확인 — 라이브 index.html 이 가리키는 자산이 전부 살아 있는가
for a in $(curl -s https://www.park108.net/ | grep -oE '/assets/[A-Za-z0-9_.-]+\.(js|css)' | sort -u); do
  printf '%-46s %s\n' "$a" "$(curl -s -o /dev/null -w '%{http_code}' "https://www.park108.net$a")"
done
# 전부 200 이어야 한다. 404 가 있으면 배포가 중간 상태다.
```
