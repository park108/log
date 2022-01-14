import React, { Suspense, lazy } from "react";

const ContentItem = lazy(() => import('./ContentItem'));

const ContentMon = (props) => {

	const stackPallet = props.stackPallet;

	// Make timestamp for 6 months
	const now = new Date();
	const to = (new Date(now.getFullYear(), now.getMonth() + 1, 1)).getTime();
	const from = (new Date(now.getFullYear(), now.getMonth() - 5, 1)).getTime();

	const timeline = [
		from,
		(new Date(now.getFullYear(), now.getMonth() -4, 1)).getTime(),
		(new Date(now.getFullYear(), now.getMonth() -3, 1)).getTime(),
		(new Date(now.getFullYear(), now.getMonth() -2, 1)).getTime(),
		(new Date(now.getFullYear(), now.getMonth() -1, 1)).getTime(),
		(new Date(now.getFullYear(), now.getMonth(), 1)).getTime(),
		to
	];

	// Return 3 charts
	return (
		<article className="article article--main-item article--monitor-item">
			<h1>Contents in the last 6 months</h1>
			<Suspense fallback={<div></div>}>
				<ContentItem
					title="Logs"
					path="content/log"
					timeline={timeline}
					stackPallet={stackPallet}
				/>
				<ContentItem
					title="Comments"
					path="content/comment"
					timeline={timeline}
					stackPallet={stackPallet}
				/>
				<ContentItem
					title="Files"
					path="file"
					timeline={timeline}
					stackPallet={stackPallet}
				/>
			</Suspense>
		</article>
	);
}

export default ContentMon;