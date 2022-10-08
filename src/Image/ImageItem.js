import React from "react";
import PropTypes from 'prop-types';
import './ImageSelector.css';

const ImageItem = (props) => {

	// Event handlers for image
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
			src={props.url}
			alt={props.fileName}
			imageurl={props.url.replace("thumbnail/", "")}
			thumbnailurl={props.url}
			enlarged={"N"}
			onMouseOut={shrinkImage}
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