import React from "react";
import PropTypes from 'prop-types';
import './ImageSelector.css';

const enlargeImage = (fullsizeImageUrl, e) => {
	e.target.setAttribute("enlarged", "Y");
	e.target.setAttribute("src", fullsizeImageUrl);
	e.target.setAttribute("class", "img img--image-imageitem img--image-selected");
}

const shrinkImage = (thumbnailImageUrl, e) => {
	e.target.setAttribute("enlarged", "N");
	e.target.setAttribute("src", thumbnailImageUrl);
	e.target.setAttribute("class", "img img--image-imageitem");
}

const ImageItem = (props) => {

	const thumbnailImageUrl = props.url;
	const fullsizeImageUrl = thumbnailImageUrl.replace("thumbnail/", "");

	// Event handlers for image
	const clickImage = (e) => {
	
		const isEnlarged = ("Y" === e.target.getAttribute("enlarged"));
	
		if(isEnlarged) {
			props.copyMarkdownString(e);
			shrinkImage(thumbnailImageUrl, e);
		}
		else {
			enlargeImage(fullsizeImageUrl, e);
		}
	}

	// Draw image item
	return (
		<img className="img img--image-imageitem"
			data-testid="imageItem"
			role="listitem"
			src={thumbnailImageUrl}
			alt={props.fileName}
			title={props.fileName}
			imageurl={fullsizeImageUrl}
			thumbnailurl={thumbnailImageUrl}
			enlarged={"N"}
			onClick={clickImage}
		/>
	);
}

ImageItem.propTypes = {
	fileName: PropTypes.string,
	url: PropTypes.string,
	copyMarkdownString: PropTypes.func,
};

export default ImageItem;