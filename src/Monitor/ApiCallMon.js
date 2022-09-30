import React, { Suspense, lazy } from "react";
import PropTypes from 'prop-types';

const ApiCallItem = lazy(() => import('./ApiCallItem'));

const ApiCallMon = (props) => {

	const serviceList = [
		{title: "log", service: "log"},
		{title: "file", service: "file"},
		{title: "analytics", service: "analytics"},
	]

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>API Calls in the last 7 days</h1>
			{serviceList.map(item => (
				<Suspense key={item.service} fallback={<div></div>}>
					<ApiCallItem
						title={item.title}
						service={item.service}
						stackPallet={props.stackPallet}
					/>
				</Suspense>
			))}
		</article>
	);
}

ApiCallMon.propTypes = {
	stackPallet: PropTypes.array,
};

export default ApiCallMon;