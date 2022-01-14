import React, { Suspense, lazy } from "react";

const ContentItem = lazy(() => import('./ContentItem'));

const ContentMon = (props) => {

	const stackPallet = props.stackPallet;

	// Return 3 charts
	return (
		<article className="article article--main-item article--monitor-item">
			<h1>Contents in the last 6 months</h1>
			<Suspense fallback={<div></div>}>
				<ContentItem
					title="Logs"
					path="content/log"
					stackPallet={stackPallet}
				/>
				<ContentItem
					title="Comments"
					path="content/comment"
					stackPallet={stackPallet}
				/>
				<ContentItem
					title="Files"
					path="file"
					stackPallet={stackPallet}
				/>
			</Suspense>
		</article>
	);
}

export default ContentMon;