# CDN 응답 헤더 · 캐시 정책 (저장소 밖 조치 필요)

> 실측: 2026-08-29 · 대상: `https://www.park108.net/` (S3 + CloudFront)
>
> 이 문서가 다루는 것은 **저장소에서 고칠 수 없는** 항목이다. CloudFront
> 응답 헤더 정책과 캐시 동작은 콘솔/IaC 설정이며 코드에 없다. 조치 근거를
> 남겨 두어 "고칠 수 없으니 없던 일" 이 되지 않게 한다.

---

## 1. `index.html` 이 해시 자산과 같은 캐시 정책을 쓴다 (우선순위 높음)

### 실측

```
$ curl -sI https://www.park108.net/
cache-control: public, max-age=0, s-maxage=31536000
x-cache: Hit from cloudfront
age: 28

$ curl -sI https://www.park108.net/assets/index-DfS-gGjh.js
cache-control: public, max-age=0, s-maxage=31536000
```

두 파일이 **동일한 정책**이다. 브라우저는 매번 재검증(`max-age=0`)하지만
CloudFront 는 1년(`s-maxage=31536000`) 보관한다.

### 왜 문제인가

두 파일은 성격이 반대다.

| | 이름 | 내용 | 올바른 캐시 |
|---|---|---|---|
| `assets/*-<hash>.js` | 내용이 바뀌면 **이름이 바뀐다** | 불변 | 1년 (현재 정답) |
| `index.html` | 이름이 **고정** | 매 배포마다 바뀜 | 무캐시 / 짧게 |

`index.html` 은 해시 청크를 이름으로 가리킨다. CDN 이 옛 `index.html` 을
계속 주는 동안 그것이 가리키는 청크는 S3 에서 이미 교체돼 사라진다.
결과는 다음과 같은 런타임 파열이다:

```
TypeError: Failed to fetch dynamically imported module:
  https://www.park108.net/assets/CommentItem-gvYxF0vE.js
```

2026-08-29 오전 댓글 열람이 실제로 이렇게 깨졌고, 재배포 후 해소됐다.
근본 원인이 남아 있으므로 다음 배포에서 재발한다.

### 조치

둘 중 하나.

1. **캐시 정책 분리** (권장) — CloudFront 동작(behavior)을 경로별로 나눈다.
   - `/assets/*` → `s-maxage` 장기 유지 (현행)
   - `/index.html` · `/` → `Cache-Control: no-cache` 또는 `s-maxage=0`
2. **배포 시 무효화** — 배포 파이프라인 마지막에
   `aws cloudfront create-invalidation --paths "/index.html" "/"`.
   매 배포 비용이 들고 누락 시 다시 깨지므로 1번이 낫다.

---

## 2. 보안 응답 헤더가 하나도 없다

### 실측

```
$ curl -sI https://www.park108.net/ | grep -iE 'content-security|x-frame|strict-transport|x-content-type|referrer-policy'
(출력 없음)
```

CSP 는 `index.html` 의 `<meta>` 로만 전달된다.

### 왜 문제인가

`frame-ancestors` 는 **meta 로 전달되면 명세상 무시된다**. 브라우저가
콘솔에 그대로 경고한다:

```
The Content Security Policy directive 'frame-ancestors' is ignored
when delivered via a <meta> element.
```

즉 클릭재킹 방어가 **선언은 있으나 작동하지 않는** 상태였다. 오해를
없애기 위해 meta 에서 제거하고 그 사유를 `index.html` 주석에 남겼다
(커밋 `f4fe3f6`). 실제 방어는 헤더 계층에서만 가능하다.

### 조치 — CloudFront 응답 헤더 정책에 추가

| 헤더 | 값 | 목적 |
|---|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'` | 클릭재킹 차단 (meta 로는 불가) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS 강제 |
| `X-Content-Type-Options` | `nosniff` | MIME 스니핑 차단 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 외부 링크로 경로 유출 방지 |

`X-Frame-Options: DENY` 는 CSP `frame-ancestors` 의 구형 대체재다. 둘 다
두어도 무해하다.

meta CSP 의 나머지 지시어(`default-src` / `script-src` / `connect-src` /
`img-src` / `style-src` / `font-src` / `object-src` / `base-uri` /
`form-action`)는 meta 에서도 유효하므로 현행 유지로 충분하다. 헤더로
옮기면 `index.html` 을 고치지 않고 정책을 바꿀 수 있다는 이점이 있으나
필수는 아니다.

---

## 검증 방법

조치 후 다음이 참이어야 한다.

```bash
# 1. index.html 은 CDN 에 장기 캐시되지 않는다
curl -sI https://www.park108.net/ | grep -i cache-control
#   s-maxage 가 없거나 짧을 것

# 2. 해시 자산은 여전히 장기 캐시된다
curl -sI https://www.park108.net/assets/<현재 해시>.js | grep -i cache-control
#   s-maxage=31536000 유지

# 3. 보안 헤더가 실재한다
curl -sI https://www.park108.net/ | grep -iE 'content-security|strict-transport|x-content-type|referrer-policy'
```
