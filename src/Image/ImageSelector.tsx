import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { log, hasValue, copyToClipboard } from '../common/common';
import { activateOnKey } from '../common/a11y';
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
	const [seeMoreButton, setSeeMoreButton] = useState<React.ReactElement | undefined>(undefined);

	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(0);
	const [toasterMessage, setToasterMessage] = useState<string>("");
	const [toasterType, setToasterType] = useState<ToasterKind>("warning");

	useEffect(() => {

		const fetchFirst = async (): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getImages();
				const retrieved = await res.json() as ImagesResponse;

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
				log("[API GET] FAILED - Images", "ERROR");
				reportError(err);
				setIsError(true);
			}

			setIsLoading(false);
		}

		if(props.show) {
			fetchFirst();
			setImageSelectorClass(`div ${styles.divImageSelector}`);
		}
		else {
			setImageSelectorClass(`div ${styles.divImageSelectorhide}`);
		}
	}, [props.show]);

	useEffect(() => {

		const fetchMore = async (timestamp: number | undefined): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getNextImages(timestamp as number);
				const nextData = await res.json() as ImagesResponse;

				if(!hasValue(nextData.errorType)) {
					log("[API GET] OK - Next Images", "SUCCESS");

					const newImages = images.concat(nextData.body?.Items ?? []);
					const lastEvaluatedKey = nextData.body?.LastEvaluatedKey;

					setImages(hasValue(nextData.body?.Items) ? newImages : []);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Next Images", "ERROR");
					reportError(nextData);
					setIsError(true);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Next Images", "ERROR");
				reportError(err);
				setIsError(true);
			}

			setIsLoading(false);
		}

		if(isGetNextData) {
			fetchMore(lastTimestamp);
			setIsGetNextData(false);
		}

	}, [isGetNextData]);

	useEffect(() => {
		if(hasValue(lastTimestamp)) {
			setSeeMoreButton(
				<button
					role="button"
					className={`button ${styles.buttonImageSeemorebutton}`}
					onClick={() => setIsGetNextData(true)}
				>
					See<br/>More
				</button>
			)
		}
		else {
			setSeeMoreButton(undefined);
		}
	}, [lastTimestamp]);

	if(isLoading) {
		return (
			<div className={imageSelectorClass}>
				<div className={`div ${styles.divImageLoading}`}>Loading...</div>
			</div>
		);
	}
	else {
		if(isError) {
			const handleRetry = (e: React.SyntheticEvent): void => {
				e.preventDefault();
				setIsError(false);
			};
			return (
				<div className={imageSelectorClass}>
					<div className={`div ${styles.divImageLoading}`}>Failed getting images</div>
					<span
						tabIndex={0}
						role="button"
						onClick={handleRetry}
						onKeyDown={activateOnKey(handleRetry)}
					>Retry</span>
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

					{ seeMoreButton }

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

ImageSelector.propTypes = {
	show: PropTypes.bool,
};

export default ImageSelector;
