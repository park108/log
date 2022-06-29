import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import ImageItem from '../Image/ImageItem';

it('render image item and test click events', async () => {

	const copyMarkdownString = jest.fn();

	render(
		<ImageItem
			src="thumbnail"
			alt="fileName"
			url="https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png"
			enlarged="N"
			copyMarkdownString={copyMarkdownString}
		/>
	);

	const image = await screen.findByTestId("imageItem");
	expect(image).toBeDefined();

	userEvent.click(image);
	expect(image.getAttribute("enlarged")).toBe("Y");

	userEvent.click(image);
	expect(image.getAttribute("enlarged")).toBe("N");
	expect(copyMarkdownString).toHaveBeenCalledTimes(1);
});