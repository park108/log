import React, { useState, useEffect } from "react";
import { log } from '../common';
import * as commonImage from './commonImage';
import ImageItem from "./ImageItem";
import Toaster from "../Toaster/Toaster";

import './ImageSelector.css';

const ImageSelector = (props) => {

	const [images, setImages] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loading, setLoading] = useState(null);
	const [imageSelectorClass, setImageSelectorClass] = useState("div div--image-selectorhide");

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterMessage ,setToasterMessage] = useState("");

	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	const fetchFirst = async () => {

		setIsLoading(true);

		// Call GET API
		try {
			const res = await fetch(commonImage.getAPI());
			const retrieved = await res.json();

			if(undefined !== retrieved.errorType) {
				console.error(res);
			}
			else {

				log("Images are FETCHED successfully.");
				const newImages = retrieved.body.Items;
				const lastEvaluatedKey = retrieved.body.LastEvaluatedKey;

				// Set file array
				setImages(undefined === newImages ? [] : newImages);

				// Set last item
				setLastTimestamp(undefined === lastEvaluatedKey ? undefined : lastEvaluatedKey.timestamp);
			}

			setIsLoading(false);
		}
		catch(err) {
			console.error(err);
		}
	}

	const fetchMore = async (timestamp) => {
		
		setIsLoading(true);

		const apiUrl = commonImage.getAPI() + "?lastTimestamp=" + timestamp;

		// Call GET API
		try {
			const res = await fetch(apiUrl);
			const nextData = await res.json();

			if(undefined !== res.errorType) {
				console.error(res);
			}
			else {
				log("Next images are FETCHED successfully.");
				const newImages = images.concat(nextData.body.Items);
				const lastEvaluatedKey = nextData.body.LastEvaluatedKey;
	
				// Set log array
				setImages(undefined === nextData.body.Items ? [] : newImages);
	
				// Last item
				setLastTimestamp(undefined === lastEvaluatedKey ? undefined : lastEvaluatedKey.timestamp);
			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	useEffect(() => {
		if("SHOW" === props.show) {
			fetchFirst();
			setImageSelectorClass("div div--image-selector");
		}
		else {
			setImages([]);

			if("HIDE" === props.show) {
				setImageSelectorClass("div div--image-selectorhide");
			}
		}
	}, [props.show]);

	useEffect(() => {
		(isLoading)
			? setLoading(<div className="div div--image-loading">Loading...</div>)
			: setLoading(null);
	}, [isLoading]);

	const copyMarkdownString = (e) => {

		const url = e.target.getAttribute("imageurl");
		const imageForMarkdown = "![ALT_TEXT](" + url + " \"OPTIONAL_TITLE\")";

		let tempElem = document.createElement('textarea');
		tempElem.value = imageForMarkdown;  
		document.body.appendChild(tempElem);
	  
		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		log("MarkDown Img " + imageForMarkdown + " copied.");
		
		setToasterMessage("MD string copied.");
		setIsShowToaster(1);
	}

	return (
		<div className={imageSelectorClass} >
			
			{loading}

			{
				isLoading
					? undefined
					: images.map(
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
				isLoading ? undefined
					: undefined === lastTimestamp ? undefined
					: <div
						className="div div--image-seemorebutton"
						onClick={(e) => fetchMore(lastTimestamp)}
						>
							See<br/>More
						</div>
			}
			
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"warning"}
				duration={2000}
				
				completed={() => setIsShowToaster(0)}
			/>
		</div>
	);
}

export default ImageSelector;