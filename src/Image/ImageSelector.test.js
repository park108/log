import { render, screen, fireEvent } from '@testing-library/react';
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import ImageSelector from '../Image/ImageSelector';

// console.error = jest.fn();
// console.log = jest.fn();

const server = setupServer(
	rest.get('https://jjm9z7h606.execute-api.ap-northeast-2.amazonaws.com/prod', async (req, res, ctx) => {

		console.log("[MOCK API][PROD] GET IMAGES");

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let lastTimestamp = "";

		if(url.length > 1) {
			queryString = url[1];
			queryString = queryString.replaceAll("\"", "");
			lastTimestamp = queryString.split("=")[1];
		}

		if("" === queryString) {
			return res(
				ctx.json({
					body:{
						Items:[
							{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
							,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
							,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
							,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
						],
						"Count":4,
						"ScannedCount":4,
						"LastEvaluatedKey":{"key":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","bucket":"park108-image-dev","timestamp":1645425943454}
					}
				})
			);
		}
		else if("1645425943454" === lastTimestamp) {
			return res(
				ctx.json({
					body:{
						Items:[
							{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
							,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
						],
						"Count":2,
						"ScannedCount":2,
					}
				})
			);
		}
	}),
	rest.get('https://jjm9z7h606.execute-api.ap-northeast-2.amazonaws.com/test', async (req, res, ctx) => {

		console.log("[MOCK API][DEV] GET IMAGES");

		return res(
			ctx.json({
				body:{
					Items:[
						{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
						,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
						,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
						,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
						,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
						,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
					],
					"Count":6,
					"ScannedCount":10,
					"LastEvaluatedKey":{"key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","bucket":"park108-image-dev","timestamp":1639269525326}
				}
			})
		);
	}),
);

const serverGetFailed = setupServer(
	rest.get('https://jjm9z7h606.execute-api.ap-northeast-2.amazonaws.com/test', (req, res, ctx) => {

		console.log("[MOCK API][DEV] GET IMAGES - FAILED");

		return res(
			ctx.json({
				errorType: "500",
				errorMessage: "Test Error Message!"
			})
		);
	})
);

const serverError = setupServer(
	rest.get('https://jjm9z7h606.execute-api.ap-northeast-2.amazonaws.com/test', (req, res, ctx) => {
		return res.networkError('Failed to connect')
	})
);


it('render image selector loading images correctly', async () => {

	server.listen();

	process.env.NODE_ENV = 'production';

	render(<ImageSelector show={true} />);

	// Get 4 images
	const imageItems = await screen.findAllByRole("listitem");
	expect(imageItems.length).toBe(4);
	
	// After click see more button, added 2 more images
	const seeMoreButton = screen.getByRole("button");
	expect(seeMoreButton).toBeDefined();

	fireEvent.click(seeMoreButton);
	const imageItems2 = await screen.findAllByRole("listitem");
	expect(imageItems2.length).toBe(6);

	server.resetHandlers();
	server.close();
});

it('render image selector loading images failed', async () => {

	serverGetFailed.listen();

	process.env.NODE_ENV = 'development';

	render(<ImageSelector show={true} />);

	const list = await screen.findByRole("list");
	expect(list).toBeDefined();
	screen.debug();

	serverGetFailed.resetHandlers();
	serverGetFailed.close();
});

it('render if API is down', async () => {

	serverError.listen();

	process.env.NODE_ENV = 'development';
	
	render(<ImageSelector show={true} />);

	serverError.resetHandlers();
	serverError.close();
});






// it('render image selector if fetched no result', async () => {

// 	process.env.NODE_ENV = 'development';

// 	render(<ImageSelector show={"SHOW"} />);
// 	const list = await screen.findByRole("list");
// 	expect(list).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render image selector loading images and fetchMore result is null', async () => {

// 	// fetchFirst -> ok
// 	// global.fetch = () =>
// 	// 	Promise.resolve({
// 	// 	json: () => Promise.resolve({
// 	// 		body:{
// 	// 			Items:[
// 	// 				{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
// 	// 				,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
// 	// 				,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
// 	// 				,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
// 	// 				,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
// 	// 				,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
// 	// 			],
// 	// 			"Count":6,
// 	// 			"ScannedCount":10,
// 	// 			"LastEvaluatedKey":{"key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","bucket":"park108-image-dev","timestamp":1639269525326}
// 	// 		}
// 	// 	}),
// 	// });

// 	// getImages();

// 	process.env.NODE_ENV = 'development';

// 	render(<ImageSelector show={"SHOW"} />);
// 	expect(await screen.findByRole("alert")).toBeInTheDocument();
	
// 	// fetchMore -> return null
// 	// global.fetch = () => Promise.resolve({
// 	// 	json: () => Promise.resolve({
// 	// 		body:{
// 	// 			"Count":0,
// 	// 			"ScannedCount":0,
// 	// 		}
// 	// 	}),
// 	// });

// 	const seeMoreButton = screen.getByRole("button");
// 	expect(seeMoreButton).toBeDefined();

// 	fireEvent.click(seeMoreButton);

// 	global.fetch = unmockedFetch;
// });

// // it('render image selector loading images, click and fetchMore error', async () => {

// // 	// fetchFirst -> ok
// // 	// global.fetch = () =>
// // 	// 	Promise.resolve({
// // 	// 	json: () => Promise.resolve({
// // 	// 		body:{
// // 	// 			Items:[
// // 	// 				{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
// // 	// 				,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
// // 	// 				,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
// // 	// 				,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
// // 	// 				,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
// // 	// 				,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
// // 	// 			],
// // 	// 			"Count":6,
// // 	// 			"ScannedCount":10,
// // 	// 			"LastEvaluatedKey":{"key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","bucket":"park108-image-dev","timestamp":1639269525326}
// // 	// 		}
// // 	// 	}),
// // 	// });
// // 	// getImages();

// // 	process.env.NODE_ENV = 'development';

// // 	render(<ImageSelector show={"SHOW"} />);
// // 	const list = await screen.findByRole("list");
// // 	expect(list).toBeInTheDocument();

// // 	const seeMoreButton = screen.getByRole("button");
// // 	expect(seeMoreButton).toBeDefined();
// // 	fireEvent.click(seeMoreButton);

// // 	// Image click event
// // 	const imageItems = await screen.findAllByRole("listitem");
// // 	expect(imageItems).toBeDefined();


// // 	jest.useFakeTimers();

// // 	document.execCommand = jest.fn();
// // 	fireEvent.click(imageItems[0]); // enlarge
// // 	fireEvent.click(imageItems[0]); // shrink and copy url

// // 	jest.runOnlyPendingTimers();
// // 	jest.useRealTimers();

// // 	// fetchMore -> Server error
// // 	// const errorMessage = "API is down";
// // 	// global.fetch = () => Promise.reject(errorMessage);

// // 	const nextSeeMoreButton = screen.getByRole("button");
// // 	expect(nextSeeMoreButton).toBeDefined();
// // 	fireEvent.click(nextSeeMoreButton);

// // 	// global.fetch = unmockedFetch;
// // });

// it('render image selector loading images and hiding correctly', async () => {

// 	// fetchFirst -> ok
// 	global.fetch = () =>
// 		Promise.resolve({
// 		json: () => Promise.resolve({
// 			body:{
// 				Items:[
// 					{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
// 					,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
// 					,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
// 					,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
// 					,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
// 					,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
// 				],
// 				"Count":6,
// 				"ScannedCount":10,
// 				"LastEvaluatedKey":{"key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","bucket":"park108-image-dev","timestamp":1639269525326}
// 			}
// 		}),
// 	});

// 	getImages();

// 	render(<ImageSelector show={"HIDE"} />);
// 	expect(await screen.findByRole("alert")).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render if it fetched error', async () => {
	
// 	// fetchFirst -> return error
// 	global.fetch = () =>
// 		Promise.resolve({
// 		json: () => Promise.resolve({
// 			errorType: "404"
// 		}),
// 	});

// 	process.env.NODE_ENV = 'production';
// 	await getImages();
// 	render(<ImageSelector show={"SHOW"} />);

// 	expect(await screen.findByRole("alert")).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });