import React, { useState, useEffect, useRef } from "react";
import { log, hasValue, copyToClipboard } from '../common/common';
import { reportError } from '../common/errorReporter';
import { getImages, getNextImages } from './api';
import ImageItem from "./ImageItem";
import Toaster from "../Toaster/Toaster";

import styles from './ImageSelector.module.css';

interface ImageSelectorProps {
	show?: boolean;
}

interface S3ImageItemData {
	key: string;
	url: string;
	size?: number;
	bucket?: string;
	timestamp?: number;
}

interface LastEvaluatedKeyData {
	timestamp?: number;
	[k: string]: unknown;
}

interface ImagesResponseBody {
	Items?: S3ImageItemData[];
	LastEvaluatedKey?: LastEvaluatedKeyData;
}

interface ImagesResponse {
	errorType?: string;
	body?: ImagesResponseBody;
}

type ToasterShowState = 0 | 1 | 2;
type ToasterKind = "information" | "success" | "warning" | "error";

const ImageSelector = (props: ImageSelectorProps): React.ReactElement => {

	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isError, setIsError] = useState<boolean>(false);
	const [isGetNextData, setIsGetNextData] = useState<boolean>(false);

	const [images, setImages] = useState<S3ImageItemData[]>([]);
	const [imageSelectorClass, setImageSelectorClass] = useState<string>(`div ${styles.divImageSelectorhide}`);
	const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(undefined);

	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(0);
	const [toasterMessage, setToasterMessage] = useState<string>("");
	const [toasterType, setToasterType] = useState<ToasterKind>("warning");

	// REQ-093 (I1)(FR-01) — unmount-safety 채널 박제 (TSK-26).
	// React 19 의 unmounted setState silent-ignore 와 REQ-091 console.error fail-fast 정합 위해
	// pending fetch 가 unmount 후 응답을 받더라도 4 setter (`setImages` · `setLastTimestamp` ·
	// `setIsLoading` · `setIsError`) 발화를 0 hit 로 박제한다. 수단 = `cancelled` ref (수단 중립 (b) 채택).
	const cancelledFirstRef = useRef<boolean>(false);
	const cancelledMoreRef = useRef<boolean>(false);

	useEffect(() => {

		const cancelled = cancelledFirstRef;
		cancelled.current = false;

		const fetchFirst = async (): Promise<void> => {

			if(cancelled.current) return;
			setIsLoading(true);

			try {
				const res = await getImages();
				const retrieved = await res.json() as ImagesResponse;

				if(cancelled.current) return;

				if(!hasValue(retrieved.errorType)) {
					log("[API GET] OK - Images", "SUCCESS");

					const newImages = retrieved.body?.Items;
					const lastEvaluatedKey = retrieved.body?.LastEvaluatedKey;

					setImages(hasValue(newImages) ? (newImages as S3ImageItemData[]) : []);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Images", "ERROR");
					reportError(retrieved);
					setIsError(true);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Images", "ERROR");
				reportError(err);
				setIsError(true);
			}

			if(cancelled.current) return;
			setIsLoading(false);
		}

		if(props.show) {
			fetchFirst();
			setImageSelectorClass(`div ${styles.divImageSelector}`);
		}
		else {
			setImageSelectorClass(`div ${styles.divImageSelectorhide}`);
		}

		return (): void => {
			cancelled.current = true;
		};
	}, [props.show]);

	useEffect(() => {

		const cancelled = cancelledMoreRef;
		cancelled.current = false;

		const fetchMore = async (timestamp: number | undefined): Promise<void> => {

			if(cancelled.current) return;
			setIsLoading(true);

			try {
				const res = await getNextImages(timestamp as number);
				const nextData = await res.json() as ImagesResponse;

				if(cancelled.current) return;

				if(!hasValue(nextData.errorType)) {
					log("[API GET] OK - Next Images", "SUCCESS");

					const lastEvaluatedKey = nextData.body?.LastEvaluatedKey;

					// functional update — 클로저가 캡처한 stale `images` 대신 직전 상태를 받는다.
					setImages(prev => hasValue(nextData.body?.Items) ? prev.concat(nextData.body?.Items ?? []) : []);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Next Images", "ERROR");
					reportError(nextData);
					setIsError(true);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Next Images", "ERROR");
				reportError(err);
				setIsError(true);
			}

			if(cancelled.current) return;
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

	// 버튼은 `lastTimestamp` 에서 곧바로 나오는 값이다 — state 에 담아 두면 한
	// 렌더 늦고, 로딩 여부 같은 다른 상태를 반영하지 못한다.
	const seeMoreButton = hasValue(lastTimestamp)
		? (
			<button
				type="button"
				data-testid="imageSeeMoreButton"
				className={`btn btn--secondary ${styles.buttonImageSeemorebutton}`}
				// 로딩 중에는 누를 수 없다 — 같은 커서로 요청이 겹치는 것을 막는다.
				disabled={isLoading}
				onClick={() => setIsGetNextData(true)}
			>
				{ isLoading ? "..." : <>See<br/>More</> }
			</button>
		)
		: undefined;

	// 전면 로딩·오류 화면은 **보여줄 것이 없을 때만** 맞다. 예전에는 상태만 보고
	// 갈라서, "See More" 를 누르는 순간 이미 보고 있던 썸네일이 전부 사라지고
	// "Loading..." 이 그 자리를 차지했다 (실측: 2 → 0 → 3). 실패하면 아예
	// "Failed getting images" 만 남았다 (2 → 0). 글을 쓰며 고르는 화면이라
	// 보던 자리를 잃는 것이 그대로 손해다.
	if(isLoading && 0 === images.length) {
		return (
			<div className={imageSelectorClass}>
				<div className={`div ${styles.divImageLoading}`}>Loading...</div>
			</div>
		);
	}
	else {
		if(isError && 0 === images.length) {
			const handleRetry = (e: React.SyntheticEvent): void => {
				e.preventDefault();
				setIsError(false);
			};
			return (
				<div className={imageSelectorClass}>
					<div className={`div ${styles.divImageLoading}`}>Failed getting images</div>
					<button
						type="button"
						className="btn btn--secondary btn--sm"
						onClick={handleRetry}
					>Retry</button>
				</div>
			);
		}
		else {
			return (
				<div className={imageSelectorClass} role="list">
					{ images.map( data =>
						<ImageItem
							key={data.key}
							fileName={data.key}
							url={data.url}
							copyMarkdownString={async (e: React.SyntheticEvent<HTMLImageElement>) => {
								const url = (e.target as HTMLImageElement).getAttribute("imageurl");
								const imageForMarkdown = "![ALT_TEXT](" + url + " \"OPTIONAL_TITLE\")";

								const ok = await copyToClipboard(imageForMarkdown);
								if (ok) {
									setToasterType("success");
									setToasterMessage("Markdown string copied.");
								} else {
									setToasterType("error");
									setToasterMessage("Copy failed (permission denied or unavailable).");
								}
								setIsShowToaster(1);
							}}
						/>
					) }

					{/* 다음 페이지가 실패했으면 그 자리에서 알리고 그 자리에서 다시
					    시도한다 — 보고 있던 썸네일은 그대로 둔다. */}
					{ isError
						? (
							<button
								type="button"
								data-testid="imageSeeMoreRetryButton"
								className={`btn btn--secondary ${styles.buttonImageSeemorebutton}`}
								onClick={() => {
									setIsError(false);
									setIsGetNextData(true);
								}}
							>
								Retry
							</button>
						)
						: seeMoreButton }

					<Toaster
						show={isShowToaster}
						message={toasterMessage}
						position={"bottom"}
						type={toasterType}
						duration={2000}
						completed={() => setIsShowToaster(2)}
					/>
				</div>
			);
		}
	}
}

export default ImageSelector;
