import React, { useState, useEffect } from "react";
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

	// `fileName` 은 선택적이라 없으면 `alt` 속성 자체가 사라진다 — 이 요소는
	// role="button" 을 갖고도 이름 없는 상태가 되므로 폴백을 둔다.
	const handleToggle = (e: React.SyntheticEvent<HTMLImageElement>): void => {
		if (isEnlarged) {
			props.copyMarkdownString(e);
		}
		setIsEnlarged((prev) => !prev);
	};

	// 확대는 뷰포트를 덮는 상태인데 빠져나오는 길이 "이미지를 다시 누른다" 뿐이었고,
	// 그 경로는 마크다운 복사까지 함께 일으킨다. 복사 없이 닫는 길을 둘 만든다 —
	// Escape 와 백드롭 클릭. 확대 중일 때만 리스너를 걸고 해제한다.
	useEffect(() => {

		if(!isEnlarged) return;

		const onKeyDown = (e: KeyboardEvent): void => {
			if("Escape" === e.key) setIsEnlarged(false);
		};

		document.addEventListener("keydown", onKeyDown);
		return (): void => document.removeEventListener("keydown", onKeyDown);

	}, [isEnlarged]);

	// 커스텀 lowercase 속성 (`imageurl` / `thumbnailurl`) 은 `ImgHTMLAttributes` 에 정의되지 않아
	// spread 로 우회 전달한다. 테스트에서 `getAttribute("imageurl")` 로 읽는 런타임 계약 유지.
	const customAttrs = {
		imageurl: fullsizeImageUrl,
		thumbnailurl: thumbnailImageUrl,
	} as Record<string, string>;

	return (
		<>
		{ isEnlarged && (
			<div
				className={styles.divImageBackdrop}
				data-testid="imageBackdrop"
				onClick={() => setIsEnlarged(false)}
			/>
		) }
		<img className={className}
			data-testid="imageItem"
			role="button"
			tabIndex={0}
			src={src}
			alt={props.fileName ?? "Untitled image"}
			title={props.fileName}
			{...customAttrs}
			data-enlarged={isEnlarged ? "Y" : "N"}
			onClick={handleToggle}
			onKeyDown={activateOnKey(handleToggle as () => void)}
		/>
		</>
	);
}

export default ImageItem;
