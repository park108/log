import { rest } from 'msw'
import { setupServer } from 'msw/node'

const API_URL = "https://kw7u2k9pv4.execute-api.ap-northeast-2.amazonaws.com";

export const prodServerGetList = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		console.log("[MOCK API][PROD] GET SEARCH RESULTS");

		return res(
			ctx.json({
				body:{
					QueryString:"테스트",
					TotalCount:6,
					ProcessingTime:1472,
					Items:[
						{"timestamp":1657811580864,"contents":"검색을 위해 추가 테스트를 해봅니다...과일 사과 복숭아 배","author":"park108@gmail.com"},
						{"timestamp":1657805978568,"contents":"테스트 다시!!!!!!!!!v9","author":"park108@gmail.com"},
						{"timestamp":1655302060414,"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의 붕괴, 엉망진창인 회사 일, 연봉 1억을 넘겼지만 so what?, 한번의 당근마켓 면접, 두번의 지마켓 글로벌 면접, 부끄러웠던 몇 개의 대답, 대답할 수 없었던 질문들, 실망스런 나의 전문성, 당혹스러웠던 시간들을 경험이라 자위하고, AWS Solutions Architect Professional 시험 합격, 떨어지는 자존감, 계속되는 회사에서의 거짓말, insecure working at KT&G, 한달째 왕복 세 시간의 출퇴근, 학여울역 열차 고장으로 귀가시간이 2시간 20분, 무거운 가방과 근육통에 시달리는 양 어깨, SKBM에서의 계약서 전달, 지겨운 페이퍼 워크의 시작, 회사 노트북 비밀번호 까먹어서 못하고, 짜증, 분노, 나는 왜 이러고 있나, 엉망이 되어 버린 나의 13년 6개월의 커리어, SAP, AWS, Salesforce, 어느것 하나 전문가라 할 수 없고, 돈버는 기계가 되어버린 나, 너무나 많은 일들, 제대로 마무리되지 못한 채로 널부러져 있는 일들, 스트레스, 매일같은 지각, 헛발질의 연속, 섀도우 복싱도 적당히 좀, 관리자가 되고싶지 않았지만 어쩔수 없이 되어버린 상황, 서비스를 만들줄 모르는 개발자, Java Spring 만 살아남은 작금의 현실, 나의 대무자는 정해지지도 않았고, 기약없는 일을 꾸역꾸역 하고 있는 하루하루, 그럼에도 월급은 꼬박꼬박, 일당은 대충 30만원, 버는 돈이 많아질 수록 가슴의 통증 주기는 빨라지고, 새벽에 잠에서 깰 때면 눈앞에 펼쳐진 만화경 같던 환시 hallucination, 이직을 할 수 없을 것 같은 불안감, 갑작스레 이직을 해버릴 것 같은 불안감, 지겨운 안정과 두려운 변화, 나이 40, 아직도 모르는 것이 너무 많고, 이렇게 세월이 가고 인생이 꺾이고 돌아보면 노인이 되는가 싶다.열한시가 넘었다. 잠이나 자자.오늘은 7/14... 테스트를 해본다.","author":"park108@gmail.com"},
						{"timestamp":1645427917531,"contents":"Test ChangeGithub Actions를 통해 AWS ECR에 도커 이미지 푸시하기 Step 1.Kotlin으로 개발한 백엔드 서비스의 도커 이미지 로컬 테스트를 마치고,  ...","author":"park108@gmail.com"},
						{"timestamp":1621831334975,"contents":"마크다운 작동 테스트 케이스입니다.예를들어 마크다운 문법을 사용하면 이렇습니다.헤더를 작성할 수 있고요.언오더 리스트1언오더 리스트 2 오더 리스트 작성 가능하며, 여기서 강조 같 ...","author":"park108@gmail.com"},
						{"timestamp":1621414715601,"contents":"이미지 삽입 테스트","author":"park108@gmail.com"}
					]
				}
			})
		);
	}),
);

export const prodServerGetSingle = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		console.log("[MOCK API][PROD] GET A SINGLE SEARCH RESULT");

		return res(
			ctx.json({
				body:{
					QueryString:"테스트",
					TotalCount:1,
					ProcessingTime:1472,
					Items:[
						{"timestamp":1657811580864,"contents":"검색을 위해 추가 테스트를 해봅니다...과일 사과 복숭아 배","author":"park108@gmail.com"},
					]
				}
			})
		);
	}),
);

export const prodServerNoData = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		console.log("[MOCK API][PROD] GET SEARCH RESULT - No Data");

		return res(
			ctx.json({
				body:{
					QueryString:"테스트",
					TotalCount:0,
					ProcessingTime:1472,
					Items:[]
				}
			})
		);
	}),
);

export const prodServerFailed = setupServer(
	rest.get(API_URL + "/prod", (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET SEARCH RESULTS - FAILED");
		return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
	}),
);

export const prodServerNetworkError = setupServer(
	rest.get(API_URL + "/prod", (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET SEARCH RESULTS - NETWORK ERROR");
		return res.networkError('Failed to connect');
	}),
);