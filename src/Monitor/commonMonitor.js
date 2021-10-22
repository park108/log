export const getAPI = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}