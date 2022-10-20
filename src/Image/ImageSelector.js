import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { log, hasValue, copyToClipboard } from '../common/common';
import { getImages, getNextImages } from './api';
import ImageItem from "./ImageItem";
import Toaster from "../Toaster/Toaster";

import './ImageSelector.css';

const ImageSelector = (props) => {

	const [images, setImages] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [imageSelectorClass, setImageSelectorClass] = useState("div div--image-selectorhide");
	const [lastTimestamp, setLastTimestamp] = useState(undefined);
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");

	// Get image list from API Gateway
	const fetchFirst = async () => {

		setIsLoading(true);

		try {
			const res = await getImages();
			const retrieved = await res.json();

			if(!hasValue(retrieved.errorType)) {
				log("[API GET] OK - Images", "SUCCESS");
				
				const newImages = retrieved.body.Items;
				const lastEvaluatedKey = retrieved.body.LastEvaluatedKey;

				setImages(hasValue(newImages) ? newImages : []);
				setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
			}
			else {
				log("[API GET] FAILED - Images", "ERROR");
				console.error(retrieved);
			}
		}
		catch(err) {
			log("[API GET] FAILED - Images", "ERROR");
			console.error(err);
		}

		setIsLoading(false);
	}

	// Get next image list from API Gateway
	const fetchMore = async (timestamp) => {
		
		setIsLoading(true);

		try {
			const res = await getNextImages(timestamp);
			const nextData = await res.json();

			if(!hasValue(nextData.errorType)) {
				log("[API GET] OK - Next Images", "SUCCESS");

				const newImages = images.concat(nextData.body.Items);
				const lastEvaluatedKey = nextData.body.LastEvaluatedKey;
	
				setImages(hasValue(nextData.body.Items) ? newImages : []);
				setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
			}
			else {
				log("[API GET] FAILED - Next Images", "ERROR");
				console.error(nextData);
			}
		}
		catch(err) {
			log("[API GET] FAILED - Next Images", "ERROR");
			console.error(err);
		}

		setIsLoading(false);
	}

	// Fetch data by event
	useEffect(() => {
		if(props.show) {
			fetchFirst();
			setImageSelectorClass("div div--image-selector");
		}
		else {
			setImageSelectorClass("div div--image-selectorhide");
		}
	}, [props.show]);

	// Copy markdown string into clipboard
	const copyMarkdownString = (e) => {
		const url = e.target.getAttribute("imageurl");
		const imageForMarkdown = "![ALT_TEXT](" + url + " \"OPTIONAL_TITLE\")";

		copyToClipboard(imageForMarkdown);
		setToasterMessage("Markdown string copied.");
		setIsShowToaster(1);
	}

	// Draw Image Selector
	if(isLoading) {
		return (
			<div className={imageSelectorClass} role="list">
				<div className="div div--image-loading">Loading...</div>
			</div>
		);
	}
	else {
		return (
			<div className={imageSelectorClass} role="list">

				{
					// Image list
					images.map(
						(data) => 
							<ImageItem
								key={data.key}
								fileName={data.key}
								url={data.url}
								copyMarkdownString={copyMarkdownString}
							/>
					)
				}

				{
					// See More button
					hasValue(lastTimestamp) ? (
							<button
								role="button"
								className="button button--image-seemorebutton"
								onClick={() => fetchMore(lastTimestamp)}
							>
								See<br/>More
							</button>
						) : undefined
				}
				
				<Toaster 
					show={isShowToaster}
					message={toasterMessage}
					position={"bottom"}
					type={"warning"}
					duration={2000}				
					completed={() => setIsShowToaster(2)}
				/>
			</div>
		);
	}
}

ImageSelector.propTypes = {
	show: PropTypes.bool,
};

export default ImageSelector;