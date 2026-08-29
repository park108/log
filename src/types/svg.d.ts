// `?react` 쿼리는 vite-plugin-svgr 이 SVG 를 React 컴포넌트로 변환하는 표기다
// (`vite.config.js` plugins). 번들러만 아는 가상 모듈이라 tsc 에는 선언이 필요하다.
declare module '*.svg?react' {
	import type { FunctionComponent, SVGProps } from 'react';
	const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
	export default ReactComponent;
}
