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

// 확대 상태에서 빠져나오는 길이 "이미지 재클릭" 뿐이면 닫기가 항상 복사를
// 동반한다. 복사 없이 닫는 두 경로를 못 박는다 — 복사 호출 0건까지 함께
// 단언해야 "닫히기만 하면 통과" 가 되지 않는다.
describe('ImageItem 확대 해제 경로', () => {

	const url = "https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/x.png";

	it('Escape 로 닫으면 마크다운을 복사하지 않는다', async () => {

		const copyMarkdownString = vi.fn();
		render(<ImageItem fileName="f" url={url} copyMarkdownString={copyMarkdownString} />);

		const image = await screen.findByTestId("imageItem");
		fireEvent.click(image);
		expect(image.getAttribute("data-enlarged")).toBe("Y");

		fireEvent.keyDown(document, { key: 'Escape' });

		expect(image.getAttribute("data-enlarged")).toBe("N");
		expect(copyMarkdownString).not.toHaveBeenCalled();
	});

	it('백드롭 클릭으로 닫으면 마크다운을 복사하지 않는다', async () => {

		const copyMarkdownString = vi.fn();
		render(<ImageItem fileName="f" url={url} copyMarkdownString={copyMarkdownString} />);

		const image = await screen.findByTestId("imageItem");
		expect(screen.queryByTestId("imageBackdrop")).toBeNull();

		fireEvent.click(image);
		const backdrop = screen.getByTestId("imageBackdrop");

		fireEvent.click(backdrop);

		expect(image.getAttribute("data-enlarged")).toBe("N");
		expect(screen.queryByTestId("imageBackdrop")).toBeNull();
		expect(copyMarkdownString).not.toHaveBeenCalled();
	});

	// 확대가 아닐 때 document 리스너가 남아 있으면 다른 화면의 Escape 를
	// 가로챈다. 언마운트 후 Escape 가 아무 상태도 건드리지 않음을 본다.
	it('언마운트 후 Escape 가 발화하지 않는다', async () => {

		const copyMarkdownString = vi.fn();
		const { unmount } = render(
			<ImageItem fileName="f" url={url} copyMarkdownString={copyMarkdownString} />
		);

		const image = await screen.findByTestId("imageItem");
		fireEvent.click(image);
		expect(image.getAttribute("data-enlarged")).toBe("Y");

		unmount();

		expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
		expect(copyMarkdownString).not.toHaveBeenCalled();
	});
});
