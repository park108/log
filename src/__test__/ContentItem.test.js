import { render, screen } from '@testing-library/react';
import ContentItem from '../Monitor/ContentItem';
import { getContentItemCount } from '../Monitor/api';

const unmockedFetch = global.fetch;

beforeAll(() => {
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			Count: 5,
			body: {
				Items: [
					{timestamp: 1655389504138},
					{timestamp: 1655389797918},
					{timestamp: 1655389832698},
					{timestamp: 1655392096432},
					{timestamp: 1655392348834},
				]
			}
		}),
	})
});

afterAll(() => {
	global.fetch = unmockedFetch;
});

it('render content item monitor', async () => {

	const stackPallet = {
		pallet: "Red to Green",
		colors: [
			{color: "black", backgroundColor: "rgb(243, 129, 129)"},
			{color: "black", backgroundColor: "rgb(248, 178, 134)"},
			{color: "black", backgroundColor: "rgb(252, 227, 138)"},
			{color: "black", backgroundColor: "rgb(243, 241, 173)"},
			{color: "black", backgroundColor: "rgb(234, 255, 208)"},
			{color: "black", backgroundColor: "rgb(190, 240, 210)"},
			{color: "black", backgroundColor: "rgb(149, 225, 211)"},
		]
	};

	const now = new Date(1656036194000);
	const to = (new Date(now.getFullYear(), now.getMonth() + 1, 1)).getTime();
	const from = (new Date(now.getFullYear(), now.getMonth() - 5, 1)).getTime();

	const res = await getContentItemCount("content/log", from, to);
	const data = await res.json();
	expect(data.body.Items.length).toBe(5);

	render(
		<ContentItem 
			title="Logs"
			path="content/log"
			unit="count"
			stackPallet={stackPallet.colors}
		/>
	);

	expect(await screen.findByText("5", {}, { timeout: 0 })).toBeInTheDocument();
});