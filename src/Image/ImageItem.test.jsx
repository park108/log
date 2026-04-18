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
