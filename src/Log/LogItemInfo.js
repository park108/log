import React, { useState, Suspense, lazy } from "react";
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, confirm, getUrl, getFormattedDate, getFormattedTime, isAdmin, hoverPopup, copyToClipboard, hasValue } from '../common/common';
import { ReactComponent as LinkButton } from '../static/link.svg';

const Toaster = lazy(() => import('../Toaster/Toaster'));

const LogItemInfo = (props) => {

	const [isShowToaster, setIsShowToaster] = useState(0);

	const item = props.item;
	const timestamp = props.timestamp;
	const temporary = props.temporary;

	const linkIcon = props.showLink
		? (
			<span
				data-testid="link-copy-button"
				onClick={(e) => {
					e.preventDefault();
					copyToClipboard(getUrl() + "log/" + timestamp);
					setIsShowToaster(1);
				} }
				className="span span--logitem-toolbaricon"
			>
				<LinkButton />
				<span className="hidden--width-640px">
					<a
						role="button"
						href={ getUrl() + "log/" + timestamp }
						className="a a--logitem-loglink"
						onMouseOver={(event) => hoverPopup(event, "click-to-clipboard-box")}
						onMouseMove={(event) => hoverPopup(event, "click-to-clipboard-box")}
						onMouseOut={(event) => hoverPopup(event, "click-to-clipboard-box")}
					>
						{ getUrl() + "log/" + timestamp }
					</a>
				</span>
				<div id="click-to-clipboard-box" className="div div--logitem-linkmessage" style={{display: "none"}}>
					Click to Clipboard
				</div>
			</span>
		)
		: undefined;

	if(!isAdmin()) {

		return (
			<section className="section section--logitem-info">
				<h1 className="h1 h1--logitem-title">
					{temporary ? "✍️" : ""} {getFormattedDate(timestamp)}
				</h1>
				<span className="span span--logitem-toolbarblank"></span>
				{linkIcon}
				<Suspense fallback={<div></div>}>
					<Toaster 
						show={isShowToaster}
						message={"The link URL copied."}
						position={"bottom"}
						type={"success"}
						duration={2000}
						completed={() => setIsShowToaster(2)}
					/>
				</Suspense>
			</section>
		);
	}
	else {
		return (
			<section className="section section--logitem-info">
	
				<h1 className="h1 h1--logitem-title">
					{temporary ? "✍️" : ""} {getFormattedDate(timestamp)}
				</h1>
				
				<span className="span span--logitem-toolbarblank"></span>
				
				{linkIcon}
				
				<div className="div div--logitem-toolbar">
					<span className="hidden--width-350px">
						{ getFormattedTime(timestamp) }
						<span className="span span--logitem-separator">|</span>
					</span>
					<span className="hidden--width-400px">
						{ hasValue(item) ?
							<span
								role="button"
								data-testid="versions-button"
								className="span span--logitem-version"
								onMouseOver={(event) => hoverPopup(event, "version-history")}
								onMouseMove={(event) => hoverPopup(event, "version-history")}
								onMouseOut={(event) => hoverPopup(event, "version-history")}
							>
								{"v." + item.logs.length}
								<div id="version-history" className="div div--logitem-versionhistory" style={{display: "none"}}>
									{ item.logs.map((data, index) => (
										<div key={index}>
											<span className="span span--logitem-historyverision">
												{"v." + (item.logs.length - index)}
											</span>
											{
												" " + getFormattedDate(data.timestamp)
												+ " " + getFormattedTime(data.timestamp)
											}
										</div>
									)) }
								</div>
							</span> : ""
						}
						<span className="span span--logitem-separator">|</span>
					</span>
					<Link to="/log/write" state={{from: item}}>
						<span
							role="button"
							data-testid="edit-button"
							className="span span--logitem-toolbarmenu"
						>
							Edit
						</span>
					</Link>
					<span className="span span--logitem-separator">|</span>
					<span
						role="button"
						data-testid="delete-button"
						className="span span--logitem-toolbarmenu"
						onClick={
							confirm("Are you sure delete the log?", props.delete, () => log("Deleting aborted"))
						}
					>
						Delete
					</span>
				</div>
				<Suspense fallback={<div></div>}>
					<Toaster 
						show={isShowToaster}
						message={"The link URL copied."}
						position={"bottom"}
						type={"success"}
						duration={2000}
						completed={() => setIsShowToaster(2)}
					/>
				</Suspense>
			</section>
		);
	}
}

LogItemInfo.propTypes = {
	item: PropTypes.object,
	timestamp: PropTypes.number,
	temporary: PropTypes.bool,
	showLink: PropTypes.bool,
	delete: PropTypes.func,
};

export default LogItemInfo;