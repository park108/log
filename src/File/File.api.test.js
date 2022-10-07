import * as api from './api';

const unmockedFetch = global.fetch;

test('test get files', async () => {
	
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

	// Calling in production
	process.env.NODE_ENV = "production";
	let res = await api.getFiles();
	let data = await res.json();
	expect(data.body.Count).toBe(10);

	// Calling in development with no limit value
	process.env.NODE_ENV = "development";
	res = await api.getFiles();
	data = await res.json();
	expect(data.body.Count).toBe(10);

	global.fetch = unmockedFetch;
});

test('test get next files', async () => {
	
	global.fetch = () => Promise.resolve({
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

	// Calling in production
	process.env.NODE_ENV = "production";
	let res = await api.getNextFiles(1638746700070);
	let data = await res.json();
	expect(data.body.Count).toBe(10);

	// Calling in development
	process.env.NODE_ENV = "development";
	res = await api.getNextFiles(1638746700070);
	data = await res.json();
	expect(data.body.Count).toBe(10);

	global.fetch = unmockedFetch;
});

test('test put file', async () => {
	
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({statusCode: 200}),
	});

	// Calling in production
	process.env.NODE_ENV = "production";
	let res = await api.putFile(
		"https://test.url.com"
		, "text/plain"
		, {
			name: "testfile1.txt",
			type: "text/plain"
		}
	);
	let data = await res.json();
	expect(data.statusCode).toBe(200);

	// Calling in development
	process.env.NODE_ENV = "development";
	res = await api.putFile(
		"https://test.url.com"
		, "text/plain"
		, {
			name: "testfile1.txt",
			type: "text/plain"
		}
	);
	data = await res.json();
	expect(data.statusCode).toBe(200);

	global.fetch = unmockedFetch;
});