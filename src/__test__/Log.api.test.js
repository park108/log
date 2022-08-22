import * as api from '../Log/api';

const unmockedFetch = global.fetch;

test('test get logs', async () => {
	
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
					{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
					,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
					,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
					,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
					,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
					,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
					,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200}
					,{"contents":"New!!!!!!","author":"park108@gmail.com","timestamp":1654520368510}
					,{"contents":"New test ","author":"park108@gmail.com","timestamp":1654520347146}
					,{"contents":"Noew Version 10! Can i success? Change once again! ...","author":"park108@gmail.com","timestamp":1654501373940}
				],
				"Count":10,
				"ScannedCount":10,
				"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654501373940}
			}
		}),
	});

	// Calling in production
	process.env.NODE_ENV = "production";
	let res = await api.getLogs(10);
	let data = await res.json();
	expect(data.body.Count).toBe(10);

	// Calling in development with no limit value
	process.env.NODE_ENV = "development";
	res = await api.getLogs();
	data = await res.json();
	expect(data.body.Count).toBe(10);

	global.fetch = unmockedFetch;
});

test('test get next logs', async () => {
	
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
					{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
					,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
					,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
					,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
					,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
					,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
					,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200}
					,{"contents":"New!!!!!!","author":"park108@gmail.com","timestamp":1654520368510}
					,{"contents":"New test ","author":"park108@gmail.com","timestamp":1654520347146}
					,{"contents":"Noew Version 10! Can i success? Change once again! ...","author":"park108@gmail.com","timestamp":1654501373940}
				],
				"Count":10,
				"ScannedCount":10,
				"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654501373940}
			}
		}),
	});

	// Calling in production
	process.env.NODE_ENV = "production";
	let res = await api.getNextLogs(1655736946977, 10);
	let data = await res.json();
	expect(data.body.Count).toBe(10);

	// Calling in development with no limit value
	process.env.NODE_ENV = "development";
	res = await api.getNextLogs(1655736946977);
	data = await res.json();
	expect(data.body.Count).toBe(10);

	global.fetch = unmockedFetch;
});

test('test post log', async () => {
	
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({statusCode: 200}),
	});

	// Calling in production
	process.env.NODE_ENV = "production";
	let res = await api.postLog(
		Math.floor(new Date().getTime())
		, {
			logs: [
				{"contents":"Current contents","timestamp":1655737033793}
				,{"contents":"Previous contents","timestamp":1655736946977}
			],
			temporary: true
		}
		, false
	);
	let data = await res.json();
	expect(data.statusCode).toBe(200);

	// Calling in development
	process.env.NODE_ENV = "development";
	res = await api.postLog(
		Math.floor(new Date().getTime())
		, {
			logs: [
				{"contents":"Current contents","timestamp":1655737033793}
				,{"contents":"Previous contents","timestamp":1655736946977}
			],
			temporary: true
		}
		, false
	);
	data = await res.json();
	expect(data.statusCode).toBe(200);

	global.fetch = unmockedFetch;
});

test('test put log', async () => {
	
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({statusCode: 200}),
	});

	// Calling in production
	process.env.NODE_ENV = "production";
	let res = await api.putLog(
		{
			logs: [
				{"contents":"Current contents","timestamp":1655737033793}
				,{"contents":"Previous contents","timestamp":1655736946977}
			],
			temporary: true
		}
		, false
	);
	let data = await res.json();
	expect(data.statusCode).toBe(200);

	// Calling in development
	process.env.NODE_ENV = "development";
	res = await api.putLog(
		{
			logs: [
				{"contents":"Current contents","timestamp":1655737033793}
				,{"contents":"Previous contents","timestamp":1655736946977}
			],
			temporary: true
		}
		, false
	);
	data = await res.json();
	expect(data.statusCode).toBe(200);

	global.fetch = unmockedFetch;
});