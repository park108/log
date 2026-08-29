import React, { useState, useEffect, useMemo, useRef, CSSProperties } from "react";
import { useNavigate } from 'react-router-dom';
import { getFiles, getNextFiles	 } from './api';
import { log, hasValue, isAdmin, isMobile, setHtmlTitle } from '../common/common';
import { reportError } from '../common/errorReporter';
import Toaster from "../Toaster/Toaster";
import FileItem from './FileItem';
import FileDrop from './FileDrop';
import FileUpload from "./FileUpload";

import './File.css';

interface FileProps {
	contentHeight?: CSSProperties;
}

interface S3FileItemData {
	key: string;
	url?: string;
	size?: number;
	bucket?: string;
	timestamp?: number;
}

interface LastEvaluatedKeyData {
	timestamp?: number;
	[k: string]: unknown;
}

interface FilesResponseBody {
	Items?: S3FileItemData[];
	LastEvaluatedKey?: LastEvaluatedKeyData;
}

interface FilesResponse {
	errorType?: string;
	body?: FilesResponseBody;
}

type ToasterShowState = 0 | 1 | 2;

const File = (props: FileProps): React.ReactElement => {

	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isGetData, setIsGetData] = useState<boolean>(false);
	const [isGetNextData, setIsGetNextData] = useState<boolean>(false);

	const [files, setFiles] = useState<S3FileItemData[]>([]);
	const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(undefined);

	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(1);
	const [isShowToasterBottom, setIsShowToasterBottom] = useState<ToasterShowState>(0);
	const [toasterMessage, setToasterMessage] = useState<string>("");

	const navigate = useNavigate();

	// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-b — unmount 후 발화 차단 가드.
	// pending `getFiles` / `getNextFiles` 응답이 unmount 이후 도착해도 state setter 뿐 아니라
	// `log()` · `reportError()` 까지 0 hit 로 유지한다 (React 19 의 unmounted setState
	// silent-ignore 는 log/reportError 를 막지 못하므로 setter 한정 가드는 불충분).
	// 수단 = `cancelled` ref — 같은 도메인 선례 `FileUpload.tsx` 와 동일 이디엄.
	// 두 async effect 는 재실행 조건(deps)이 서로 달라 ref 를 공유하지 않는다.
	const cancelledFirstFetchRef = useRef<boolean>(false);
	const cancelledNextFetchRef = useRef<boolean>(false);

	useEffect(() => {

		if(!isAdmin()) {
			const redirectPage = "/log";
			log("Redirect to " + redirectPage);
			navigate(redirectPage);
			return;
		}

		setIsGetData(true);
		setHtmlTitle("file");
		// 마운트 1회 admin 게이트. `navigate` 는 BrowserRouter(비 data-router) 에서
		// 경로 변경마다 identity 가 바뀌므로 deps 에 넣으면 라우트 이동마다 재실행된다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {

		const cancelled = cancelledFirstFetchRef;
		cancelled.current = false;

		const fetchFirst = async (): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getFiles();
				const newData = await res.json() as FilesResponse;

				if(cancelled.current) return;

				if(!hasValue(newData.errorType)) {
					log("[API GET] OK - Files", "SUCCESS");

					const newFiles = newData.body?.Items;
					const lastEvaluatedKey = newData.body?.LastEvaluatedKey;

					setFiles(hasValue(newFiles) ? (newFiles as S3FileItemData[]) : []);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Files", "ERROR");
					setToasterMessage("Get files failed.");
					setIsShowToasterBottom(1);
					reportError(newData);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Files", "ERROR");
				setToasterMessage("Get files failed.");
				setIsShowToasterBottom(1);
				reportError(err);
			}
	
			setIsLoading(false);
		}

		if(isGetData) {
			fetchFirst();
			setIsGetData(false);
		}

		return (): void => {
			cancelled.current = true;
		};

	}, [isGetData]);

	useEffect(() => {

		const cancelled = cancelledNextFetchRef;
		cancelled.current = false;

		const fetchMore = async (timestamp: number | undefined): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getNextFiles(timestamp as number);
				const nextData = await res.json() as FilesResponse;

				if(cancelled.current) return;

				if(!hasValue(nextData.errorType)) {
					log("[API GET] OK - Next Files", "SUCCESS");

					const lastEvaluatedKey = nextData.body?.LastEvaluatedKey;

					// functional update — 클로저가 캡처한 stale `files` 대신 직전 상태를 받는다.
					setFiles(prev => hasValue(nextData.body?.Items) ? prev.concat(nextData.body?.Items ?? []) : []);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Next Files", "ERROR");
					setToasterMessage("Get more files failed.");
					setIsShowToasterBottom(1);
					reportError(nextData);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Next Files", "ERROR");
				setToasterMessage("Get more files failed for network issue.");
				setIsShowToasterBottom(1);
				reportError(err);
			}
	
			setIsLoading(false);
		}

		if(isGetNextData) {
			fetchMore(lastTimestamp);
			setIsGetNextData(false);
		}

		return (): void => {
			cancelled.current = true;
		};

	}, [isGetNextData, lastTimestamp]);

	useEffect(() => {
		if(isLoading) {
			setIsShowToaster(1);
		}
		else {
			setIsShowToaster(2);
		}
	}, [isLoading]);

	const isMobileEnv = useMemo(() => isMobile(), []);
	const fileUploadUI = isMobileEnv
		? <FileUpload callbackAfterUpload={() => setIsGetData(true)} />
		: <FileDrop callbackAfterUpload={() => setIsGetData(true)} />;

	// button--file-seemoreloading 은 CSS 정의가 없는 죽은 클래스였다.
	const seeMoreButtonClass = "button btn btn--secondary btn--block";
	const seeMoreButtonText = isLoading ? "Loading..." : "See more";
	const seeMoreButton = hasValue(lastTimestamp)
		? (
			<button
				data-testid="seeMoreButton"
				className={seeMoreButtonClass}
				onClick={() => setIsGetNextData(true)}
			>
				{seeMoreButtonText}
			</button>
		)
		: null;

	return (
		<main className="main main--main-contents" style={props.contentHeight} role="application">
			<article className="article article--main-item">

				{ fileUploadUI }

				<div className="div div--files-list" role="list">
					{ files.map( data => (				
						<FileItem
							key={data.key}
							fileName={data.key}
							lastModified={data.timestamp}
							size={data.size}
							url={data.url}
							deleted={() => setIsGetData(true)}
						/>
					)) }
				</div>

				{ seeMoreButton }
			</article>
				
			<Toaster 
				show={ isShowToaster }
				message={ "Loading files..." }
			/>

			<Toaster 
				show={ isShowToasterBottom }
				message={ toasterMessage }
				position={ "bottom" }
				type={ "error" }
				duration={ 2000 }
				
				completed={ () => setIsShowToasterBottom(2) }
			/>
		</main>
	);
}

export default File;