import { render, screen, fireEvent } from '@testing-library/react';
import ImageItem from './ImageItem';

it('render image item and test click events', async () => {

	const copyMarkdownString = vi.fn();

	render(
		<ImageItem
			fileName="fileName"
			url="https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png"
			copyMarkdownString={copyMarkdownString}
		/>
	);

	const image = await screen.findByTestId("imageItem");
	expect(image).toBeDefined();

	fireEvent.click(image);
	expect(image.getAttribute("data-enlarged")).toBe("Y");

	fireEvent.click(image);
	expect(image.getAttribute("data-enlarged")).toBe("N");
	expect(copyMarkdownString).toHaveBeenCalledTimes(1);
});

it('preserves enlarged state across parent rerender', async () => {

	const copyMarkdownString = vi.fn();
	const url = "https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png";

	const { rerender } = render(
		<ImageItem fileName="fileName" url={url} copyMarkdownString={copyMarkdownString} />
	);

	const image = await screen.findByTestId("imageItem");
	fireEvent.click(image);
	expect(image.getAttribute("data-enlarged")).toBe("Y");

	// 부모 props 변화 없이 rerender — 선언적 전환 전에는 className 이 재적용돼 시각 회귀.
	rerender(
		<ImageItem fileName="fileName" url={url} copyMarkdownString={copyMarkdownString} />
	);

	// 상태가 React 소유라면 rerender 후에도 "Y" 지속.
	const imageAfter = await screen.findByTestId("imageItem");
	expect(imageAfter.getAttribute("data-enlarged")).toBe("Y");
});

describe('ImageItem a11y 패턴 B — M10', () => {
	// spec/30.spec/green/common/a11y.md §예외 §M10 옵션 A — TSK-20260421-78.
	// img 에 role="button" + tabIndex=0 + onClick/onKeyDown 단일 참조 부여.
	const url = "https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png";

	it('ImageItem 요소에 role="button" 과 tabIndex={0} 이 부여된다', async () => {
		render(<ImageItem fileName="fileName" url={url} copyMarkdownString={vi.fn()} />);
		const image = await screen.findByTestId("imageItem");
		expect(image.getAttribute("role")).toBe("button");
		expect(image.getAttribute("tabindex")).toBe("0");
	});

	it('Enter 키로 확대 토글이 활성된다', async () => {
		render(<ImageItem fileName="fileName" url={url} copyMarkdownString={vi.fn()} />);
		const image = await screen.findByTestId("imageItem");
		expect(image.getAttribute("data-enlarged")).toBe("N");
		fireEvent.keyDown(image, { key: 'Enter' });
		expect(image.getAttribute("data-enlarged")).toBe("Y");
	});

	it('Space 키로 확대 토글이 활성된다', async () => {
		render(<ImageItem fileName="fileName" url={url} copyMarkdownString={vi.fn()} />);
		const image = await screen.findByTestId("imageItem");
		expect(image.getAttribute("data-enlarged")).toBe("N");
		fireEvent.keyDown(image, { key: ' ' });
		expect(image.getAttribute("data-enlarged")).toBe("Y");
	});

	it('클릭 보존: mouse click 도 기존대로 토글된다', async () => {
		render(<ImageItem fileName="fileName" url={url} copyMarkdownString={vi.fn()} />);
		const image = await screen.findByTestId("imageItem");
		fireEvent.click(image);
		expect(image.getAttribute("data-enlarged")).toBe("Y");
		fireEvent.click(image);
		expect(image.getAttribute("data-enlarged")).toBe("N");
	});

	it('확대 상태에서 Enter 가 copyMarkdownString 콜백을 호출한다', async () => {
		const copyMarkdownString = vi.fn();
		render(<ImageItem fileName="fileName" url={url} copyMarkdownString={copyMarkdownString} />);
		const image = await screen.findByTestId("imageItem");

		// 1st key: N -> Y (확대), copy 는 호출되지 않음 (기존 계약: 축소 시에만 copy).
		fireEvent.keyDown(image, { key: 'Enter' });
		expect(image.getAttribute("data-enlarged")).toBe("Y");
		expect(copyMarkdownString).not.toHaveBeenCalled();

		// 2nd key: Y -> N (축소), 이때 copy 콜백 호출.
		fireEvent.keyDown(image, { key: 'Enter' });
		expect(image.getAttribute("data-enlarged")).toBe("N");
		expect(copyMarkdownString).toHaveBeenCalledTimes(1);
	});
});
