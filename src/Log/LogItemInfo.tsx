import React, { useState, Suspense, lazy } from "react";
import { Link } from 'react-router-dom';
import { log, confirm, getUrl, getFormattedDate, getFormattedTime, isAdmin, copyToClipboard } from '../common/common';
import { useHoverPopup } from '../common/useHoverPopup';
import { activateOnKey } from '../common/a11y';
import LinkButton from '../static/link.svg?react';
import type { LogItemPayload } from './api';
import type { ToasterShow } from '../Toaster/Toaster';

const Toaster = lazy(() => import('../Toaster/Toaster'));

interface LogItemInfoProps {
	item?: LogItemPayload;
	timestamp: number;
	temporary?: boolean;
	showLink?: boolean;
	/** 편집·삭제 조작부를 그릴지. 변경 이력처럼 **지난 판본**을 보여줄 때는 끈다 —
	 *  이미 지나간 판본을 편집·삭제한다는 것이 성립하지 않는다. 기본은 켬. */
	showActions?: boolean;
	delete?: () => void;
	/**
	 * 삭제 요청이 진행 중인가. 진행 중에는 삭제 조작부를 잠근다.
	 *
	 * 잠그지 않던 동안에는 같은 글에 DELETE 가 여러 번 나갔다 (실측: 세 번 누르면
	 * 요청 3건, 인자 전부 동일). 첫 요청이 성사된 뒤 도착한 두 번째 응답은 실패로
	 * 오므로, **글은 지워졌는데 화면에는 "Deleting log failed." 가 떴다.**
	 */
	isDeleting?: boolean;
}

const LogItemInfo = (props: LogItemInfoProps) => {

	const [isShowToaster, setIsShowToaster] = useState<ToasterShow>(0);

	const item = props.item;
	const timestamp = props.timestamp;
	// 기본은 켬 — 본문 화면은 지금까지대로 동작한다.
	const showActions = props.showActions ?? true;

	// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
	// 기존 hoverPopup(event, 'click-to-clipboard-box') / 'version-history' 명령형 호출 대체.
	// isId() 로 각 훅 인스턴스에 고유 id 자동 부여 → LogList 내 row 중복 ID 충돌 회피.
	const linkPopup = useHoverPopup();
	const versionPopup = useHoverPopup();

	// a11y-spec §패턴 B (REQ-20260421-033 FR-02/03) — M3 link-copy
	// arrow 추출: onClick/onKeyDown 이 동일 핸들러 단일 참조를 공유하도록.
	const copyLogLink = (e: { preventDefault: () => void }) => {
		e.preventDefault();
		copyToClipboard(getUrl() + "log/" + timestamp);
		setIsShowToaster(1);
	};

	// a11y-spec §패턴 B — M6 delete
	// confirm(...) 팩토리 반환값 (confirmAction) 을 로컬 const 로 추출해
	// onClick/onKeyDown 이 동일 참조를 공유하도록.
	// `confirm` 은 onConfirm 이 함수가 아니면 undefined 를 낸다. 여기서는 항상
	// 함수를 넘기므로 도달하지 않지만, 폴백을 두어 핸들러가 반드시 존재하게 한다 —
	// 포커스는 받는데 키 활성화만 빠지면 키보드 사용자에게만 동작하지 않는
	// 버튼이 된다 (a11y 패턴 B 위반).
	const handleDelete = confirm(
		"Are you sure delete the log?",
		props.delete ?? (() => {}),
		() => log("Deleting aborted")
	) ?? (() => {});

	return (
		<section className="section section--logitem-info">
			<h1 className="h1 h1--logitem-title">
				{ !props.temporary ? "" : "✍️"  } {getFormattedDate(timestamp)}
			</h1>
			<span className="span span--logitem-toolbarblank"></span>
			{/* 네이티브 button 으로 전환하지 않는다 (2026-08-29 판단). 이 트리거는 안에
			    팝업 div 를 품는데 button 의 콘텐츠 모델은 phrasing content 라 어긋난다.
			    팝업을 형제로 빼면 해결되지만, 팝업이 `position: fixed` 이면서 좌표를
			    갖지 않아 **정적 위치**를 기준으로 배치된다 — 형제로 옮기는 순간 위치가
			    밀린다. 얻는 것(네이티브 의미론)보다 잃을 위험(툴팁 오배치)이 크다.
			    현 상태는 role + tabIndex + onClick + onKeyDown + 이름을 모두 갖춘
			    온전한 손조립이며 a11y 감사 패턴 B 를 충족한다. */}
			{ !props.showLink ? "" : (
				<span
					role="button"
					tabIndex={0}
					data-testid="link-copy-button"
					aria-label="Copy the log link"
					onClick={copyLogLink}
					onKeyDown={activateOnKey<React.KeyboardEvent<HTMLSpanElement>>(copyLogLink)}
					className="span span--logitem-toolbaricon"
					{...linkPopup.triggerProps}
				>
					<LinkButton />
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
						{/* 뒤따르는 조작부가 없으면 구분선도 그리지 않는다 — 남기면
						    "12:37:38 |" 처럼 아무것도 가르지 않는 선이 남는다. */}
						{ showActions && <span className="span span--logitem-separator">|</span> }
					</span>
					{ showActions && (<>
					<span className="hidden--width-400px">
						{/* 아래 versions 트리거에는 onClick 이 없다 — hover/focus 로 버전 팝업을
						    여는 트리거일 뿐이다. role="button" 은 활성을 약속하므로, 스크린리더가
						    "버튼" 이라 읽고 Enter 를 눌러도 아무 일이 없는 상태를 만든다. role 을
						    걷되 tabIndex 는 남긴다 — 포커스로도 팝업이 떠야 한다 (WCAG 1.4.13). */}
						{ item ?
							<span
								tabIndex={0}
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
						{/* 이 구분선은 versions 트리거의 것이다 — 트리거가 없으면 함께
						    감춘다. 남기면 아무것도 가르지 않는 선이 남는다 (실측:
						    `item` 없을 때 "10:36:56||Delete"). */}
						{ item && <span className="span span--logitem-separator">|</span> }
					</span>
					{/* 조작부는 anchor(Link) 자신이다. 자식 span 이 role="button" 을 달면
					    anchor 의 link role 과 충돌해 보조기술에 두 겹으로 읽힌다 — span 은
					    표기 래퍼로 둔다. */}
					{/* `item` 이 없으면 수정할 대상이 없다.
					    이 링크는 `state.from` 으로 글 전체를 넘기고, Writer 는 그 형상으로
					    수정/새 글을 가른다. `item` 이 undefined 면 `from` 도 undefined 라
					    Writer 가 **새 글 모드**로 열리고, 그대로 저장하면 수정이 아니라
					    중복 글이 된다 (실측: from=undefined logs=없음).
					    바로 위 versions 트리거가 이미 같은 가드를 쓴다 — 맞춘다.
					    뒤따르는 구분선도 함께 감춘다. 남기면 아무것도 가르지 않는
					    선이 Delete 앞에 남는다. */}
					{ item && (<>
						<Link to="/log/write" state={{from: item}}>
							<span
								data-testid="edit-button"
								className="span span--logitem-toolbarmenu"
							>
								Edit
							</span>
						</Link>
						<span className="span span--logitem-separator">|</span>
					</>) }
					<button
						type="button"
						data-testid="delete-button"
						className="span span--logitem-toolbarmenu"
						disabled={Boolean(props.isDeleting)}
						onClick={handleDelete}
					>
						Delete
					</button>
					</>) }
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

export default LogItemInfo;
