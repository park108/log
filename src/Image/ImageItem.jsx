import React, { useState } from "react";
import PropTypes from 'prop-types';
import styles from './ImageSelector.module.css';
import { activateOnKey } from "../common/a11y";

const ImageItem = (props) => {

	const thumbnailImageUrl = props.url;
	const fullsizeImageUrl = thumbnailImageUrl.replace("thumbnail/", "");

	const baseClass = `img ${styles.imgImageImageitem}`;
	const selectedClass = `img ${styles.imgImageImageitem} ${styles.imgImageSelected}`;

	const [isEnlarged, setIsEnlarged] = useState(false);

	const className = isEnlarged ? selectedClass : baseClass;
	const src = isEnlarged ? fullsizeImageUrl : thumbnailImageUrl;

	const handleToggle = (e) => {
		if (isEnlarged) {
			props.copyMarkdownString(e);
		}
		setIsEnlarged((prev) => !prev);
	};

	return (
		<img className={className}
			data-testid="imageItem"
			role="button"
			tabIndex={0}
			src={src}
			alt={props.fileName}
			title={props.fileName}
			imageurl={fullsizeImageUrl}
			thumbnailurl={thumbnailImageUrl}
			data-enlarged={isEnlarged ? "Y" : "N"}
			onClick={handleToggle}
			onKeyDown={activateOnKey(handleToggle)}
		/>
	);
}

ImageItem.propTypes = {
	fileName: PropTypes.string,
	url: PropTypes.string,
	copyMarkdownString: PropTypes.func,
};

export default ImageItem;
