import './Skeleton.css';

/*
 * Skeleton — lazy-loading placeholder UI.
 *
 * Props (prop-types intentionally omitted, TS migration pending):
 *   - variant?: 'page' | 'list' | 'detail'  (default: 'page'; invalid values fall back to 'page')
 *
 * Spec: `specs/30.spec/green/common/error-boundary-spec.md` §3.2
 */

const VALID_VARIANTS = ['page', 'list', 'detail'];

const VARIANT_BLOCK_COUNT = {
	page: 4,
	list: 5,
	detail: 5,
};

export default function Skeleton({ variant = 'page' }) {
	const safeVariant = VALID_VARIANTS.includes(variant) ? variant : 'page';
	const blockCount = VARIANT_BLOCK_COUNT[safeVariant];

	const blocks = [];
	for (let i = 0; i < blockCount; i += 1) {
		blocks.push(<div key={i} className="skeleton__block" />);
	}

	return (
		<div
			className={`skeleton skeleton--${safeVariant}`}
			data-testid={`skeleton-${safeVariant}`}
			role="status"
			aria-label="로딩 중"
		>
			{blocks}
		</div>
	);
}
