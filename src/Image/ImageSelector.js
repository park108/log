import React, { useState, useEffect } from "react";
import * as commonImage from './commonImage';
import Toaster from "../Toaster/Toaster";

const ImageSelector = (props) => {

	const [images, setImages] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loading, setLoading] = useState(null);
	const [imageSelectorClass, setImageSelectorClass] = useState("div div--image-selector");

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterMessage ,setToasterMessage] = useState("");

	async function fetchData() {

		setIsLoading(true);

		// Call GET API
		const res = await fetch(commonImage.getAPI());

		res.json().then(res => {
			console.log("Images are FETCHED from AWS successfully.");
			setIsLoading(false);
			setImages(res.body);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		if(isLoading) {
			setLoading(<div>Loading...</div>);
		}
		else {
			setLoading(null);
		}
	}, [isLoading]);

	useEffect(() => {
		if(1 === props.show) {
			setImageSelectorClass("div div--image-selector");
		}
		else if(2 === props.show) {
			setImageSelectorClass("div div--image-selectorhide");
		}
	}, [props.show]);

	const enlargeImage = (e) => {
		e.target.src = e.target.getAttribute("imageurl");
		e.target.setAttribute("enlarged", "Y");
	}

	const shrinkImage = (e) => {
		e.target.src = e.target.getAttribute("thumbnailurl");
		e.target.setAttribute("enlarged", "N");
	}

	const imgMarkdownCopyToClipboard = (e) => {

		let url = e.target.getAttribute("imageurl");

		let imageForMarkdown = "![ALT_TEXT](" + url + " \"OPTIONAL_TITLE\")";

		let tempElem = document.createElement('textarea');
		tempElem.value = imageForMarkdown;  
		document.body.appendChild(tempElem);
	  
		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		console.log("MarkDown Img " + imageForMarkdown + " copied.");
		
		setToasterMessage("A markdown string has been copied to clipboard. Paste it!");
		setIsShowToaster(1);
	}

	const clickImage = (e) => {

		let isEnlarged = e.target.getAttribute("enlarged");

		if("Y" === isEnlarged) {
			imgMarkdownCopyToClipboard(e);
			shrinkImage(e);
		}
		else {
			enlargeImage(e);
		}
	}

	const initToaster = () => {
		setIsShowToaster(0);
	}

	const ImageItem = (item) => {

		return <img className="img img--image-imageitem"
			src={item.thumbnailUrl}
			alt={item.fileName}
			imageurl={item.imageUrl}
			thumbnailurl={item.thumbnailUrl}
			enlarged={"N"}
			onMouseOut={shrinkImage}
			onClick={clickImage}
		/>;
	}

	if(0 === props.show) {
		return "";
	}
	else {
		return <div className={imageSelectorClass} >
			{images.map(data => (
				<ImageItem
					key={data.key}
					fileName={data.key}
					imageUrl={data.imageUrl}
					thumbnailUrl={data.thumbnailUrl}
				/>
			))}
			{loading}
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"warning"}
				duration={2000}
				
				completed={initToaster}
			/>
		</div>
	}
}

export default ImageSelector;