import { render, screen, fireEvent } from '@testing-library/react';
import ImageItem from './ImageItem';

it('render image item and test click events', async () => {

	const copyMarkdownString = jest.fn();

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
	expect(image.getAttribute("enlarged")).toBe("Y");

	fireEvent.click(image);
	expect(image.getAttribute("enlarged")).toBe("N");
	expect(copyMarkdownString).toHaveBeenCalledTimes(1);
});