import React, { useState, Suspense, lazy } from "react";
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, confirm, getUrl, getFormattedDate, getFormattedTime, isAdmin, copyToClipboard, hasValue } from '../common/common';
import { useHoverPopup } from '../common/useHoverPopup';
import LinkButton from '../static/link.svg?react';

const Toaster = lazy(() => import('../Toaster/Toaster'));

const LogItemInfo = (props) => {

	const [isShowToaster, setIsShowToaster] = useState(0);

	const item = props.item;
	const timestamp = props.timestamp;

	// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
	// 기존 hoverPopup(event, 'click-to-clipboard-box') / 'version-history' 명령형 호출 대체.
	// isId() 로 각 훅 인스턴스에 고유 id 자동 부여 → LogList 내 row 중복 ID 충돌 회피.
	const linkPopup = useHoverPopup();
	const versionPopup = useHoverPopup();

	return (
		<section className="section section--logitem-info">
			<h1 className="h1 h1--logitem-title">
				{ !props.temporary ? "" : "✍️"  } {getFormattedDate(timestamp)}
			</h1>
			<span className="span span--logitem-toolbarblank"></span>
			{ !props.showLink ? "" : (
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
							{...linkPopup.triggerProps}
						>
							{ getUrl() + "log/" + timestamp }
						</a>
					</span>
					{ linkPopup.isVisible && (
						<div
							className="div div--logitem-linkmessage"
							{...linkPopup.contentProps}
						>
							Click to Clipboard
						</div>
					) }
				</span>
			)}

			{ !isAdmin() ? "" : (
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
								{...versionPopup.triggerProps}
							>
								{"v." + item.logs.length}
								{ versionPopup.isVisible && (
									<div
										className="div div--logitem-versionhistory"
										{...versionPopup.contentProps}
									>
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
								) }
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
			)}
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

LogItemInfo.propTypes = {
	item: PropTypes.object,
	timestamp: PropTypes.number,
	temporary: PropTypes.bool,
	showLink: PropTypes.bool,
	delete: PropTypes.func,
};

export default LogItemInfo;
