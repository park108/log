import React from "react";
import PropTypes from 'prop-types';
import './ImageSelector.css';

const ImageItem = (props) => {

	const thumbnailImageUrl = props.url;
	const fullsizeImageUrl = thumbnailImageUrl.replace("thumbnail/", "");

	// Event handlers for image
	const enlargeImage = (e) => {
		e.target.setAttribute("enlarged", "Y");
		e.target.setAttribute("src", fullsizeImageUrl);
		e.target.setAttribute("class", "img img--image-imageitem img--image-selected");
	}

	const shrinkImage = (e) => {
		e.target.setAttribute("enlarged", "N");
		e.target.setAttribute("src", thumbnailImageUrl);
		e.target.setAttribute("class", "img img--image-imageitem");
	}

	const clickImage = (e) => {

		const isEnlarged = "Y" === e.target.getAttribute("enlarged");

		if(isEnlarged) {
			props.copyMarkdownString(e);
			shrinkImage(e);
		}
		else {
			enlargeImage(e);
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
			// onMouseOut={shrinkImage}
		/>
	);
}

ImageItem.propTypes = {
	fileName: PropTypes.string,
	url: PropTypes.string,
	copyMarkdownString: PropTypes.func,
};

export default ImageItem;