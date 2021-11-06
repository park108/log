import React from "react";

const LogMon = (props) => {
	return <div className="div div--article-logitem">
		<h4>Logs</h4>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Logs</span>
			</div>
		</div>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Comments</span>
			</div>
		</div>
	</div>
}

export default LogMon;