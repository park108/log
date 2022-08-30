import React, { Suspense, lazy } from "react";
import PropTypes from 'prop-types';

const ApiCallItem = lazy(() => import('./ApiCallItem'));

const ApiCallMon = (props) => {

	const stackPallet = props.stackPallet;

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>API Calls in the last 7 days</h1>
			<Suspense fallback={<div></div>}>
				<ApiCallItem
					title="log"
					service="log"
					stackPallet={stackPallet}
				/>
			</Suspense>
			<Suspense fallback={<div></div>}>
				<ApiCallItem
					title="file"
					service="file"
					stackPallet={stackPallet}
				/>
			</Suspense>
			<Suspense fallback={<div></div>}>
				<ApiCallItem
					title="analytics"
					service="analytics"
					stackPallet={stackPallet}
				/>
			</Suspense>
		</article>
	);
}

ApiCallMon.propTypes = {
	stackPallet: PropTypes.array,
};

export default ApiCallMon;