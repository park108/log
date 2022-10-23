import React, { Suspense, lazy } from "react";
import PropTypes from 'prop-types';

const ContentItem = lazy(() => import('./ContentItem'));

const ContentMon = (props) => {

	const contentList = [
		{title: "Logs", path: "content/log", unit: "count"},
		{title: "Comments", path: "content/comment", unit: "count"},
		{title: "Files", path: "file", unit: "capacity"},
	]

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>Contents in the last 6 months</h1>
			{contentList.map(item => (
				<Suspense key={item.title} fallback={<div></div>}>
					<ContentItem
						title={item.title}
						path={item.path}
						unit={item.unit}
						stackPallet={props.stackPallet}
					/>
				</Suspense>
			))}
		</article>
	);
}

ContentMon.propTypes = {
	stackPallet: PropTypes.array,
};

export default ContentMon;