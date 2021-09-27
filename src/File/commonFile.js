export const getAPI = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://urruauaj81.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://urruauaj81.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

export const getFileUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://park108-log-dev.s3.ap-northeast-2.amazonaws.com";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://park108-log-dev.s3.ap-northeast-2.amazonaws.com";
	}
}