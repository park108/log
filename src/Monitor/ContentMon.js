import React, { Suspense, lazy } from "react";
import PropTypes from 'prop-types';

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
					unit="count"
					stackPallet={stackPallet}
				/>
				<ContentItem
					title="Comments"
					path="content/comment"
					unit="count"
					stackPallet={stackPallet}
				/>
				<ContentItem
					title="Files"
					path="file"
					unit="capacity"
					stackPallet={stackPallet}
				/>
			</Suspense>
		</article>
	);
}

ContentMon.propTypes = {
	stackPallet: PropTypes.array,
};

export default ContentMon;