import React, { useState } from "react";
import PropTypes from 'prop-types';
import styles from './ImageSelector.module.css';
import { activateOnKey } from "../common/a11y";

type ImageCopyHandler = (e: React.SyntheticEvent<HTMLImageElement>) => void | Promise<void>;

interface ImageItemProps {
	fileName?: string;
	url: string;
	copyMarkdownString: ImageCopyHandler;
}

const ImageItem = (props: ImageItemProps): React.ReactElement => {

	const thumbnailImageUrl = props.url;
	const fullsizeImageUrl = thumbnailImageUrl.replace("thumbnail/", "");

	const baseClass = `img ${styles.imgImageImageitem}`;
	const selectedClass = `img ${styles.imgImageImageitem} ${styles.imgImageSelected}`;

	const [isEnlarged, setIsEnlarged] = useState<boolean>(false);

	const className = isEnlarged ? selectedClass : baseClass;
	const src = isEnlarged ? fullsizeImageUrl : thumbnailImageUrl;

	const handleToggle = (e: React.SyntheticEvent<HTMLImageElement>): void => {
		if (isEnlarged) {
			props.copyMarkdownString(e);
		}
		setIsEnlarged((prev) => !prev);
	};

	// 커스텀 lowercase 속성 (`imageurl` / `thumbnailurl`) 은 `ImgHTMLAttributes` 에 정의되지 않아
	// spread 로 우회 전달한다. 테스트에서 `getAttribute("imageurl")` 로 읽는 런타임 계약 유지.
	const customAttrs = {
		imageurl: fullsizeImageUrl,
		thumbnailurl: thumbnailImageUrl,
	} as Record<string, string>;

	return (
		<img className={className}
			data-testid="imageItem"
			role="button"
			tabIndex={0}
			src={src}
			alt={props.fileName}
			title={props.fileName}
			{...customAttrs}
			data-enlarged={isEnlarged ? "Y" : "N"}
			onClick={handleToggle}
			onKeyDown={activateOnKey(handleToggle as () => void)}
		/>
	);
}

ImageItem.propTypes = {
	fileName: PropTypes.string,
	url: PropTypes.string,
	copyMarkdownString: PropTypes.func,
};

export default ImageItem;
