import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import File from '../File/File';
import * as common from '../common/common';

const unmockedFetch = global.fetch;
console.error = jest.fn();
const errorMessage = "API is down";

it('redirect if not admin', async () => {
	
	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(false);
  
	const history = createMemoryHistory({ initialEntries: ["/file"]});

	render(
		<Router location={history.location} navigator={history}>
			<File />
		</Router>
	);

	const nothing = screen.queryByText("Nothing");
	expect(nothing).not.toBeInTheDocument();
});

it('render files and get next files correctly', async () => {
		
	// fetchFirst -> ok
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
					{"size":49955,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220606_log_CQRS.png","key":"20220606_log_CQRS.png","timestamp":1654522279342}
					,{"size":34022,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_ecr_repo.png","key":"20220221_ecr_repo.png","timestamp":1645425962599}
					,{"size":96824,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_actions.png","key":"20220221_actions.png","timestamp":1645425938601}
					,{"size":109294,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_IAM.png","key":"20220221_IAM.png","timestamp":1645425938587}
					,{"size":7498,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/ansi-html-community-0.0.8.tgz","key":"ansi-html-community-0.0.8.tgz","timestamp":1644038129605}
					,{"size":198298,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/2021_hometax.pdf","key":"2021_hometax.pdf","timestamp":1643637384681}
					,{"size":940719,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/house_price.pdf","key":"house_price.pdf","timestamp":1643637384614}
					,{"size":8836521,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/308142rg.jpg","key":"308142rg.jpg","timestamp":1639269515238}
					,{"size":2942795,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/501985ld.jpg","key":"501985ld.jpg","timestamp":1639268308087}
					,{"size":7682046,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/227100fg.jpg","key":"227100fg.jpg","timestamp":1638746700070}
				],
				"Count":10,
				"ScannedCount":10,
				"LastEvaluatedKey":{"key":"227100fg.jpg","bucket":"park108-log-dev","timestamp":1638746700070}
			}
		}),
	});
  
	const history = createMemoryHistory({ initialEntries: ["/file"]});

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	process.env.NODE_ENV = 'production';

	render(
		<Router location={history.location} navigator={history}>
			<File />
		</Router>
	);

	const dropZone = await screen.findByText("Drop files here!");
	expect(dropZone).toBeInTheDocument();

	const list = await screen.findByRole("list", {}, { timeout: 0});
	expect(list).toBeInTheDocument();

	// fetchMore -> ok
	const seeMoreButton = screen.getByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();

	userEvent.click(seeMoreButton);
	
	// fetchMore -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	const seeMoreButton2 = screen.getByTestId("seeMoreButton");
	userEvent.click(seeMoreButton2);

	global.fetch = unmockedFetch;
});

it('render files with no data', async () => {
		
	// fetchFirst -> ok
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body:{
			}
		}),
	});
  
	const history = createMemoryHistory({ initialEntries: ["/file"]});

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	process.env.NODE_ENV = 'production';

	render(
		<Router location={history.location} navigator={history}>
			<File />
		</Router>
	);

	const dropZone = await screen.findByText("Drop files here!");
	expect(dropZone).toBeInTheDocument();

	const list = await screen.findByRole("list", {}, { timeout: 0});
	expect(list).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render files correctly and get next failed', async () => {
		
	// fetchFirst -> ok
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
					{"size":49955,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220606_log_CQRS.png","key":"20220606_log_CQRS.png","timestamp":1654522279342}
					,{"size":34022,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_ecr_repo.png","key":"20220221_ecr_repo.png","timestamp":1645425962599}
					,{"size":96824,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_actions.png","key":"20220221_actions.png","timestamp":1645425938601}
					,{"size":109294,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_IAM.png","key":"20220221_IAM.png","timestamp":1645425938587}
					,{"size":7498,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/ansi-html-community-0.0.8.tgz","key":"ansi-html-community-0.0.8.tgz","timestamp":1644038129605}
					,{"size":198298,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/2021_hometax.pdf","key":"2021_hometax.pdf","timestamp":1643637384681}
					,{"size":940719,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/house_price.pdf","key":"house_price.pdf","timestamp":1643637384614}
					,{"size":8836521,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/308142rg.jpg","key":"308142rg.jpg","timestamp":1639269515238}
					,{"size":2942795,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/501985ld.jpg","key":"501985ld.jpg","timestamp":1639268308087}
					,{"size":7682046,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/227100fg.jpg","key":"227100fg.jpg","timestamp":1638746700070}
				],
				"Count":10,
				"ScannedCount":10,
				"LastEvaluatedKey":{"key":"227100fg.jpg","bucket":"park108-log-dev","timestamp":1638746700070}
			}
		}),
	});
  
	const history = createMemoryHistory({ initialEntries: ["/file"]});

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	process.env.NODE_ENV = 'production';

	render(
		<Router location={history.location} navigator={history}>
			<File />
		</Router>
	);

	const dropZone = await screen.findByText("Drop files here!");
	expect(dropZone).toBeInTheDocument();

	const list = await screen.findByRole("list", {}, { timeout: 0});
	expect(list).toBeInTheDocument();
	
	// fetchMore -> return error
	global.fetch = () =>
	Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	const seeMoreButton = screen.getByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();

	userEvent.click(seeMoreButton);

	global.fetch = unmockedFetch;
});

it('render files correctly and get next with no data', async () => {
		
	// fetchFirst -> ok
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
					{"size":49955,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220606_log_CQRS.png","key":"20220606_log_CQRS.png","timestamp":1654522279342}
					,{"size":34022,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_ecr_repo.png","key":"20220221_ecr_repo.png","timestamp":1645425962599}
					,{"size":96824,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_actions.png","key":"20220221_actions.png","timestamp":1645425938601}
					,{"size":109294,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_IAM.png","key":"20220221_IAM.png","timestamp":1645425938587}
					,{"size":7498,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/ansi-html-community-0.0.8.tgz","key":"ansi-html-community-0.0.8.tgz","timestamp":1644038129605}
					,{"size":198298,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/2021_hometax.pdf","key":"2021_hometax.pdf","timestamp":1643637384681}
					,{"size":940719,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/house_price.pdf","key":"house_price.pdf","timestamp":1643637384614}
					,{"size":8836521,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/308142rg.jpg","key":"308142rg.jpg","timestamp":1639269515238}
					,{"size":2942795,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/501985ld.jpg","key":"501985ld.jpg","timestamp":1639268308087}
					,{"size":7682046,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/227100fg.jpg","key":"227100fg.jpg","timestamp":1638746700070}
				],
				"Count":10,
				"ScannedCount":10,
				"LastEvaluatedKey":{"key":"227100fg.jpg","bucket":"park108-log-dev","timestamp":1638746700070}
			}
		}),
	});
  
	const history = createMemoryHistory({ initialEntries: ["/file"]});

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	process.env.NODE_ENV = 'production';

	render(
		<Router location={history.location} navigator={history}>
			<File />
		</Router>
	);

	const dropZone = await screen.findByText("Drop files here!");
	expect(dropZone).toBeInTheDocument();

	const list = await screen.findByRole("list", {}, { timeout: 0});
	expect(list).toBeInTheDocument();
	
	// fetchMore -> return error
	global.fetch = () =>
	Promise.resolve({
		json: () => Promise.resolve({
			body:{}
		}),
	});

	const seeMoreButton = screen.getByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();

	userEvent.click(seeMoreButton);

	global.fetch = unmockedFetch;
});

it('render files failed', async () => {
	
	// fetchFirst -> return error
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});
  
	const history = createMemoryHistory({ initialEntries: ["/file"]});

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);
	common.isMobile = jest.fn().mockResolvedValue(true);

	process.env.NODE_ENV = 'development';

	render(
		<Router location={history.location} navigator={history}>
			<File />
		</Router>
	);

	global.fetch = unmockedFetch;
});

it('render if API is down', async () => {

	// fetchFirst -> Server error
	global.fetch = () => Promise.reject(errorMessage);
  
	const history = createMemoryHistory({ initialEntries: ["/file"]});

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	render(
		<Router location={history.location} navigator={history}>
			<File />
		</Router>
	);

	global.fetch = unmockedFetch;
});