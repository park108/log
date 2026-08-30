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

	// 첫 조회가 실패했다는 사실은 토스터보다 오래 살아야 한다.
	//
	// 하단 토스터는 `duration=2000` 뒤 물러나고, 그 뒤 화면에는 목록도 안내도 없는
	// 빈 영역만 남는다 — 관리자는 왜 비었는지도, 어떻게 다시 시도하는지도 알 수 없다.
	// 다른 목록 화면 둘은 같은 상황에서 지속 표면 + Retry 를 낸다 (`LogList` ·
	// `ImageSelector`). `File` 만 이 축에서 빠져 있었다.
	const [isError, setIsError] = useState<boolean>(false);

	// **"비어 있다" 는 목록을 실제로 받아 본 뒤에만 말할 수 있다.**
	//
	// 예전 조건은 `!isLoading && 0 === files.length` 였고 두 방향으로 틀렸다 (실측):
	//
	//   조회 착수 전   커밋별 안내 [true, true, false, false]
	//                 `isLoading` 은 두 번째 passive-effect flush 에서야 올라간다
	//   조회 실패 후   "No files yet." + 재시도 버튼 없음
	//                 이 화면에는 `isError` 상태가 **아예 없어** `files` 가 [] 인 채
	//                 조건이 참이 된다. 토스터가 2초 뒤 사라지면 화면에 남는 유일한
	//                 문장이 "No files yet." 이고, 관리자는 파일이 지워졌다고 읽는다.
	//
	// 목록을 성공적으로 받은 시점에만 세운다 — 실패는 "없음" 의 근거가 아니다.
	const [hasListArrived, setHasListArrived] = useState<boolean>(false);
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
					setHasListArrived(true);
					setIsError(false);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Files", "ERROR");
					setToasterMessage("Get files failed.");
					setIsShowToasterBottom(1);
					setIsError(true);
					reportError(newData);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Files", "ERROR");
				setToasterMessage("Get files failed.");
				setIsShowToasterBottom(1);
				setIsError(true);
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
					//
					// 항목이 없으면 **그대로 둔다.** 예전에는 빈 배열로 갈아치웠는데,
					// 그러면 다음 페이지에 항목이 없다는 이유로 이미 받아 둔 목록이
					// 통째로 사라진다 (실측: 2 → 0). 새로 알게 된 것이 없을 때의
					// 답은 "그대로" 이지 "비움" 이 아니다.
					setFiles(prev => prev.concat(nextData.body?.Items ?? []));
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
	const seeMoreButtonClass = "btn btn--secondary btn--block";
	const seeMoreButtonText = isLoading ? "Loading..." : "See more";
	const seeMoreButton = hasValue(lastTimestamp)
		? (
			<button
				data-testid="seeMoreButton"
				className={seeMoreButtonClass}
				// 로딩 중에는 누를 수 없다. `isGetNextData` 플래그는 요청을 띄운
				// **직후** 내려가므로(완료를 기다리지 않는다), 응답 전에 다시 누르면
				// 같은 커서로 요청이 또 나갔다 — 실측: 세 번 누르면 호출 3회(인자
				// 전부 같은 커서), 같은 페이지가 겹쳐 항목이 3개여야 할 자리에 5개가
				// 됐고 React key 도 중복됐다. 목록 화면(`LogList`)과 같은 결함이다.
				disabled={isLoading}
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

				{/* 전면 오류는 **보여줄 것이 없을 때만** 맞다 — 이미 받은 목록이 있으면
				    그 목록을 오류 화면으로 덮지 않는다 (`LogList` 가 같은 이유로
				    `0 === logs.length` 를 함께 본다). 이 표면은 토스터의 `duration` 과
				    무관하게 남는다. */}
				{ (isError && 0 === files.length) && (
					<section className="section section--message-box" data-testid="fileListError">
						<h2 className="h2 h2--message-error">
							Couldn&apos;t load your file list.
						</h2>
						<hr />
						<div className="div div--message-description">
							The list never arrived. Click Retry to ask again.
						</div>
						<button
							type="button"
							className="btn btn--ghost btn--sm"
							onClick={ (e: React.SyntheticEvent): void => {
								e.preventDefault();
								setIsError(false);
								setIsGetData(true);
							} }
						>
							Retry
						</button>
					</section>
				) }

				<div className="div div--files-list" role="list">
					{/* 목록이 비었다는 것과 무언가 잘못됐다는 것은 구별되어야 한다.
					    검색 화면이 같은 이유로 "No search results." 를 낸다. */}
					{ (hasListArrived && !isLoading && 0 === files.length) && (
						<h1 className="h1 h1--notification-result" data-testid="fileListEmpty">
							No files yet.
						</h1>
					) }
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