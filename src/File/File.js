import React, { useState, useEffect } from "react";
import AWS from 'aws-sdk';
import * as common from '../common';
import FileItem from './FileItem';

const File = (props) => {

	const bucketName = "park108-log-dev";

	const [idToken, setIdToken] = useState("");
	const [s3Api, setS3Api] = useState(null);
	const [fileList, setFileList] = useState([]);

	useEffect(() => {
		getS3(idToken);
	}, [idToken]);

	useEffect(() => {
		getFileList(s3Api);
	}, [s3Api]);

	const getS3 = (token) => {

		// Amazon Cognito 인증 공급자(Dev)
		AWS.config.region = 'ap-northeast-2'; // Region
		AWS.config.credentials = new AWS.CognitoIdentityCredentials({
			IdentityPoolId: 'ap-northeast-2:76ac2e9d-a72c-4640-8bc7-2551651f4b1c',
			Logins: {
				'cognito-idp.ap-northeast-2.amazonaws.com/ap-northeast-2_wK4wt7ZaR': token
			}
		});

		AWS.config.credentials.get();

		// TODO: Set bucket dev/prod
		setS3Api(new AWS.S3({
			apiVersion: '2006-03-01',
			params: {
				Bucket: bucketName
			}
		}));
	}

	const getFileList = (s3) => {

		if(s3 !== null) {
		
			s3.listObjects({ Delimiter: '/' }, function (err, data) {

				if (err) {
					console.error(err);
				}
				else {
					console.log("DATA FETCHED from AWS S3!!");
					setFileList(data.Contents);
				}
			});	
		}
	}
	
	if(idToken === "" && common.isAdmin()) {
		setIdToken(common.getCookie("id_token"));
	}

	if(fileList.length > 0) {
		return (
			<div className="div div--main-contents">
				{fileList.map(data => (				
					<FileItem
						key={data.Key}
						fileName={data.Key}
						lastModified={data.LastModified}
					/>
				))}
			</div>
		);
	}
	else {
		return ("No files");
	}
}

export default File;