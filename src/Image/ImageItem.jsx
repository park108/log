import React from "react";
import PropTypes from 'prop-types';
import styles from './ImageSelector.module.css';

const ImageItem = (props) => {

	const thumbnailImageUrl = props.url;
	const fullsizeImageUrl = thumbnailImageUrl.replace("thumbnail/", "");

	const baseClass = `img ${styles.imgImageImageitem}`;
	const selectedClass = `img ${styles.imgImageImageitem} ${styles.imgImageSelected}`;

	return (
		<img className={baseClass}
			data-testid="imageItem"
			role="listitem"
			src={thumbnailImageUrl}
			alt={props.fileName}
			title={props.fileName}
			imageurl={fullsizeImageUrl}
			thumbnailurl={thumbnailImageUrl}
			enlarged={"N"}
			onClick={(e) => {

				const isEnlarged = ("Y" === e.target.getAttribute("enlarged"));

				if(isEnlarged) {
					props.copyMarkdownString(e);
					e.target.setAttribute("enlarged", "N");
					e.target.setAttribute("src", thumbnailImageUrl);
					e.target.setAttribute("class", baseClass);
				}
				else {
					e.target.setAttribute("enlarged", "Y");
					e.target.setAttribute("src", fullsizeImageUrl);
					e.target.setAttribute("class", selectedClass);
				}
			}}
		/>
	);
}

ImageItem.propTypes = {
	fileName: PropTypes.string,
	url: PropTypes.string,
	copyMarkdownString: PropTypes.func,
};

export default ImageItem;