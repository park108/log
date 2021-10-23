import React from "react";

const ApiMon = (props) => {
	return <div className="div div--article-logitem">
		<h4>APIs</h4>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Invocations</span>
			</div>
		</div>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Duration</span>
			</div>
		</div>
	</div>
}

export default ApiMon;