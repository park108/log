import React from "react";
import './ImageSelector.css';

const ImageItem = (props) => {

	const fileName = props.fileName;
	const imageUrl = props.url.replace("thumbnail/", "");
	const thumbnailUrl = props.url;

	const enlargeImage = (e) => {
		e.target.src = e.target.getAttribute("imageurl");
		e.target.setAttribute("enlarged", "Y");
	}

	const shrinkImage = (e) => {
		e.target.src = e.target.getAttribute("thumbnailurl");
		e.target.setAttribute("enlarged", "N");
	}

	const clickImage = (e) => {

		let isEnlarged = e.target.getAttribute("enlarged");

		if("Y" === isEnlarged) {
			props.mdStringCopy(e);
			shrinkImage(e);
		}
		else {
			enlargeImage(e);
		}
	}

	return (
		<img className="img img--image-imageitem"
			src={thumbnailUrl}
			alt={fileName}
			imageurl={imageUrl}
			thumbnailurl={thumbnailUrl}
			enlarged={"N"}
			onMouseOut={shrinkImage}
			onClick={clickImage}
		/>
	);
}

export default ImageItem;