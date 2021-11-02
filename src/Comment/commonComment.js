export const getAPI = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://k7aiaqwk1e.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://k7aiaqwk1e.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}