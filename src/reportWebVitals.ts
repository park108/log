import type { Metric } from 'web-vitals';

type PerfEntryHandler = (metric: Metric) => void;

// **계측 실패가 제품을 막지 않는다.**
//
// `import('web-vitals')` 는 별도 청크다. 배포 직후 CDN 이 옛 `index.html` 을 주는
// 동안 그 청크 주소가 이미 사라져 있을 수 있고, 오프라인이면 아예 오지 않는다 —
// 이 저장소는 그 실패가 실재한다는 것을 알고 있다 (`common/ErrorFallback` 이
// 브라우저 3종의 청크 로드 실패 문면을 구분해 다룬다).
//
// `.catch` 가 없으면 그 실패가 **처리되지 않은 거부**가 된다. 성능 수치를 못 재는
// 것과 앱이 오류를 뿜는 것은 비교할 일이 아니다 — `index.tsx` 의 비콘, `safeStorage`
// 의 저장소 실패와 같은 원칙이다.
const reportWebVitals = (onPerfEntry?: PerfEntryHandler): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    }).catch(() => {
      // 계측은 없어도 되는 것이다. 던지면 그때부터 없어도 되는 것이 아니게 된다.
    });
  }
};

export default reportWebVitals;
