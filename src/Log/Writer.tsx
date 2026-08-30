import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { log, isAdmin, setFullscreen, hasValue, copyToClipboard } from '../common/common';
import { useCreateLog } from './hooks/useCreateLog';
import { useUpdateLog } from './hooks/useUpdateLog';
import * as parser from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { formatHtml } from '../common/formatHtml';
import { tokenizeHtmlSource } from '../common/tokenizeHtmlSource';
import { markChangedLines } from './diffContents';
import Toaster from "../Toaster/Toaster";
import type { ToasterShow, ToasterType } from '../Toaster/Toaster';
import type { LogItemPayload } from './api';
import './Writer.css';

const LogItem = lazy(() => import('./LogItem'));
const ImageSelector = lazy(() => import('../Image/ImageSelector'));

const MARKDOWN_STRING_TEMPLATE = {
	"img": "![ALT_TEXT](url \"OPTIONAL_TITLE\")",
	"a": "[LinkText](https://example.com/ \"TITLE\")",
};

// `auto-expand` textarea 는 최초 scrollHeight 를 엘리먼트에 캐시해 둔다 (기존 동작 유지).
interface AutoExpandTextArea extends HTMLElement {
	rows: number;
	_baseScrollHeight?: number;
}

const Writer = () => {

	const [isProcessing, setIsProcessing] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isConvertedHTML, setIsConvertedHTML] = useState(false);
	const [isNew, setIsNew] = useState(true);

	const [historyData, setHistoryData] = useState<LogItemPayload | undefined>(undefined);

	const [article, setArticle] = useState("");
	const [isTemporary, setIsTemporary] = useState(false);
	const [articleStatus, setArticleStatus] = useState("");
	const [convertedArticle, setConvertedArticle] = useState("");
	const [convertedArticleStatus, setConvertedArticleStatus] = useState("");

	const [rows, setRows] = useState<number>(1);

	const [isShowToaster, setIsShowToaster] = useState<ToasterShow>(0);
	const [toasterType, setToasterType] = useState<ToasterType>("success");
	const [toasterMessage ,setToasterMessage] = useState("");
	const [isShowImageSelector, setIsShowImageSelector] = useState(false);
	
	const location = useLocation();
	const navigate = useNavigate();

	// REQ-20260825-014 (M-1)(M-2)(M-3) — 알림 콜백은 **훅 옵션**으로 넘긴다.
	// `mutate(vars, { onSuccess })` 형태의 per-call 콜백은 MutationObserver 가 구독자를
	// 보유할 때만 발화한다 (`@tanstack/query-core` mutationObserver —
	// `if (this.#mutateOptions && this.hasListeners())`). 구독은 이 컴포넌트의 passive effect
	// 가 커밋될 때 생기므로, lazy 하위(`LogItem` / `ImageSelector`) 와 Suspense 경계 때문에
	// 커밋이 밀린 창 안에 응답이 도착하면 알림이 조용히 버려진다 — 글은 저장됐는데 폼이
	// `isProcessing` 으로 멈추고 사용자는 재시도해 **중복 글**을 만든다.
	// 콜백이 더 이상 `createLog()` / `editLog()` 지역 스코프에 없으므로 timestamp 는
	// 클로저가 아니라 `variables.timestamp` 로 받는다 (mutate 인자가 이미 싣고 있다).
	const createLogMutation = useCreateLog({
		onSuccess: (_data, variables) => {
			log("[API POST] OK - Log", "SUCCESS");

			setToasterType("success");
			setToasterMessage("The log posted.");
			setIsShowToaster(1);

			setIsProcessing(false);
			navigate("/log/" + variables.timestamp);
		},
		onError: (err) => {
			log("[API POST] FAILED - Log", "ERROR");
			log(String(err), "ERROR");

			setToasterType("error");
			setToasterMessage(
				err && err.message && err.message.startsWith("POST /log failed")
					? "Posting log failed."
					: "Posting log network error."
			);
			setIsShowToaster(1);

			setIsProcessing(false);
		},
	});
	const updateLogMutation = useUpdateLog({
		onSuccess: (_data, variables) => {
			log("[API PUT] OK - Log", "SUCCESS");

			setToasterMessage("The log changed.");
			setIsShowToaster(1);

			setIsProcessing(false);
			navigate("/log/" + variables.timestamp);
		},
		onError: (err) => {
			log("[API PUT] FAILED - Log", "ERROR");
			log(String(err), "ERROR");

			setToasterType("error");
			setToasterMessage(
				err && err.message && err.message.startsWith("PUT /log failed")
					? "Editing log failed."
					: "Editing log network error."
			);
			setIsShowToaster(1);

			setIsProcessing(false);
		},
	});

	// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-c — unmount 후 발화 차단 가드.
	// 이 파일에는 async effect 가 **0개**다. 유일한 `await` 는 `copyMarkdownString` 클릭
	// 핸들러 안에 있으므로(§구현 지시 2), effect 수명이 아니라 **마운트 수명** ref 를 쓴다
	// (`Comment.tsx` 의 `cancelledPostRef` 와 동일 이디엄). 아래 마운트 1회 effect 의
	// cleanup 이 플래그를 뒤집는다 — 인접 effect 의 cleanup 을 재사용하지 않는다.
	const cancelledCopyRef = useRef(false);

	useEffect(() => {
		const cancelled = cancelledCopyRef;
		cancelled.current = false;
		return () => {
			cancelled.current = true;
		};
	}, []);

	useEffect(() => {

		if(!isAdmin()) {
			const redirectPage = "/log";
			if (location.pathname === redirectPage) return;
			log("Redirect to " + redirectPage);
			navigate(redirectPage);
			return;
		}

		setFullscreen(true);

		// state 의 존재가 아니라 **형상**으로 판정한다. 두 진입점이 같은 `from`
		// 키에 서로 다른 것을 담아 왔다 — 수정은 로그 객체를, 새 글 버튼은
		// 경로 문자열을 넘겼다. 존재만 보면 새 글 쓰기가 수정 모드로 열리고
		// historyData 가 문자열이 되어 logs 접근에서 터진다.
		const from = (location.state as { from?: unknown } | null)?.from;
		if(from && typeof from === "object" && Array.isArray((from as LogItemPayload).logs)) {
			setIsNew(false);
			setHistoryData(from as LogItemPayload);
		}

		return () => {setFullscreen(false)}
		// `location` 변경에만 반응하는 진입 효과. `navigate` 는 여기서 호출되지 않으며
		// identity 가 라우트마다 바뀌어 deps 에 넣으면 fullscreen 이 재토글된다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location]);

	useEffect(() => {
		if(historyData) {

			// logs[0] 이 최신 리비전. 비어 있으면 복원할 본문이 없다.
			const latest = historyData.logs[0];
			if(latest) setArticle(latest.contents);

			if(hasValue(historyData.temporary)) {
				setIsTemporary(Boolean(historyData.temporary));
			}
		}
	}, [historyData]);

	useEffect(() => {

		const setTextAreaRows = (e: AutoExpandTextArea) => {
			const minRows = Number(e.getAttribute('data-min-rows')) || 1;
			let rows: number;
			if(!e._baseScrollHeight) e._baseScrollHeight = e.scrollHeight;
	
			setRows(minRows); // Restore minimum rows
			rows = Math.ceil((e.scrollHeight - e._baseScrollHeight) / 32) ; // 32 px
			setRows(minRows + rows); // Set current rows
		}

		const setTextarealHeight = (event: Event) => {
			const e = event.target as AutoExpandTextArea | null;
			if(e) setTextAreaRows(e);
		}

		let html = parser.markdownToHtml(article);

		setConvertedArticle(html);
		setArticleStatus("Markdown length = " + article.length);
		window.addEventListener('input', setTextarealHeight);

		const textArea = document.getElementById("textarea--writer-article") as AutoExpandTextArea | null;
		if(textArea && 2 > textArea.rows) {
			setTextAreaRows(textArea);
		}

		return () => {
			window.removeEventListener('input', setTextarealHeight);
		}

	}, [article]);

	useEffect(() => {

		const createLog = () => {

			const newTimestamp = Math.floor(new Date().getTime());

			setIsProcessing(true);

			createLogMutation.mutate({ timestamp: newTimestamp, article, isTemporary });
		}
	
		const editLog = () => {

			// 편집 경로는 historyData 가 확정된 상태에서만 도달한다 (isNew === false).
			// 확정을 가정만 하지 않고 실제로 검사한다.
			if(!historyData) {
				log("editLog: historyData 미확정 상태 진입", "ERROR");
				return;
			}

			setIsProcessing(true);

			const newItem: LogItemPayload = JSON.parse(JSON.stringify(historyData));

			const changedLogs = [{
				contents: article,
				timestamp: Math.floor(new Date().getTime())
			}, ...newItem.logs];

			newItem.logs = changedLogs;

			updateLogMutation.mutate({ newItem, isTemporary, timestamp: historyData.timestamp });
		}

		if(isSubmitted) {

			// 플래그를 내리고 나간다. 이것이 없으면 `isSubmitted` 가 true 로 남고,
			// 다음 제출의 `setIsSubmitted(true)` 는 같은 값이라 React 가 리렌더를
			// 건너뛴다 — deps 가 그대로라 이 효과도 다시 돌지 않는다. 한 번 짧게
			// 눌렀다는 이유로 Post 가 죽어, 글을 제대로 채워도 저장되지 않았다.
			if(article.length < 5) {
				setIsSubmitted(false);
				alert("Please note at least 5 characters.");
				document.getElementById("textarea--writer-article")?.focus();
				return;
			}

			if(isNew) {
				createLog();
			}
			else {
				editLog();
			}
			setIsSubmitted(false);
		}
		// isSubmitted 플래그 트리거 — 제출이 눌린 렌더의 값들을 그대로 쓰는 것이 의도다.
		// article 을 deps 에 넣으면 타이핑마다 효과가 재생성되고, navigate/mutation 객체는
		// identity 가 매 렌더 바뀐다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isSubmitted])

	useEffect(() => {
		setConvertedArticleStatus("HTML length = " + convertedArticle.length)
	}, [convertedArticle]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setArticle(e.target.value);

	const toggleImageSelector = () => setIsShowImageSelector(!isShowImageSelector);
	const toggleMode = () => setIsConvertedHTML(!isConvertedHTML);

	const copyMarkdownString = async (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		const tag = (e.target as HTMLButtonElement).value as keyof typeof MARKDOWN_STRING_TEMPLATE;

		const markdownString = MARKDOWN_STRING_TEMPLATE[tag];

		const ok = await copyToClipboard(markdownString);

		if(cancelledCopyRef.current) return;

		if (ok) {
			setToasterType("information");
			setToasterMessage("Markdown string copied.");
		} else {
			setToasterType("error");
			setToasterMessage("Copy failed (permission denied or unavailable).");
		}
		setIsShowToaster(1);
	}

	const Converted = () => {

		if(isConvertedHTML) {
			return (
				<div
					id="div--writer-converted"
					className="div div--writer-converted"
				>
					{/* 한 줄로 이어진 HTML 은 구조를 눈으로 좇을 수 없다. 표시용으로만
					    개행·들여쓰기한다 — 저장·게시에는 convertedArticle 원본이 쓰인다.
					    <pre> 로 감싸야 그 공백이 화면에 남는다. */}
					<pre className="pre pre--writer-htmlsource">
						{ tokenizeHtmlSource(formatHtml(convertedArticle)).map((token, index) => (
							<span key={index} className={"tok tok--" + token.kind}>{ token.value }</span>
						)) }
					</pre>
				</div>
			);
		}
		else {
			return (
				<div
					id="div--writer-converted"
					className="div div--writer-converted"
					dangerouslySetInnerHTML={{ __html: sanitizeHtml(convertedArticle) }}
				>
				</div>
			);
		}
	}

	return (
		<div className="div div--writer">

			<div className="div div--writer-statusbar">
				<span className="span span--writer-statusbaritem">
					{articleStatus}
				</span>
				<span className="span span--writer-statusbaritem span--writer-statusbaritemright">
					{convertedArticleStatus}
				</span>
				<button
					type="button"
					data-testid="img-selector-button"
					className="span span--writer-statusbarbutton"
					aria-expanded={isShowImageSelector}
					onClick={toggleImageSelector}
				>
					[IMG]
				</button>
			</div>

			<Suspense fallback={<div></div>}>
				<ImageSelector
					show={isShowImageSelector}
				/>
			</Suspense>

			<form data-testid="writer-form" onSubmit={ (e) => {
				e.preventDefault();
				setIsSubmitted(true);
			} }>
				<div className="div div--writer-editbox">
					<textarea
						id="textarea--writer-article"
						data-testid="writer-text-area"
						className="textarea textarea--writer-article auto-expand"
						name="article"
						value={article}
						onChange={handleChange}
						placeholder="Take your note in markdown"
						rows={rows}
						data-min-rows="1"
						disabled={ isProcessing }
					/>
					<div className="div div--writer-convertedbox">
						<div className="div div--writer-convertedtag">
							<button
								type="button"
								data-testid="mode-button"
								onClick={toggleMode}
								className="span span--writer-statusbarbutton"
							>
								{isConvertedHTML ? "HTML" : "Markdown Converted"}
							</button>
						</div>
						<Converted />
					</div>
				</div>
				<div className="div div--writer-toolbar">
					<input
						type="checkbox"
						id="temporary"
						onChange={() => setIsTemporary(!isTemporary)}
						checked={isTemporary}
					/>
					<label htmlFor="temporary">Temporary Save</label>

					{/* form 안의 button 은 type 이 없으면 submit 이 기본이다. 지금은 핸들러의
					    preventDefault 가 막고 있지만, 그 방어는 핸들러가 기억해야 성립한다 —
					    type 으로 구조적으로 못 박는다. */}
					<button
						type="button"
						data-testid="img-button"
						className="btn btn--secondary btn--sm"
						value="img"
						onClick={copyMarkdownString}
					>
						Markdown: image
					</button>

					<button
						type="button"
						data-testid="a-button"
						className="btn btn--secondary btn--sm"
						value="a"
						onClick={copyMarkdownString}
					>
						Markdown: anchor
					</button>
				</div>
					
				<button
					data-testid="submit-button"
					className="btn btn--primary"
					type="submit"
					disabled={ isProcessing }
				>
					{ isNew ? "Post" : "Edit" }
				</button>
			</form>

			{historyData && (
				<div className="div div--writer-history" >
					<h1 className="h1 h1--writer-historytitle">Change History</h1>
					<Suspense fallback={<div></div>}>
						{/* 이력은 각 판본을 그대로 그릴 뿐이라 무엇이 달라졌는지 눈으로 찾아야
					    했다. 바로 아래(= 한 판본 이전)와 줄 단위로 비교해 바뀐 줄에 표식을
					    넣는다. 표식은 contents 문자열에만 들어가므로 LogItem 은 그대로다.

					    logs 는 최신이 앞이다 — index+1 이 이전 판본이고, 마지막 항목은
					    비교 대상이 없어 원문 그대로 그린다. */}
					{ historyData.logs.map((log, index) => (
							<LogItem
								key={log.timestamp}
								author={historyData.author ?? ""}
								timestamp={log.timestamp}
								contents={markChangedLines(
									log.contents,
									historyData.logs[index + 1]?.contents,
								)}
								showComments={false}
								showLink={false}
								showActions={false}
							/>
						)) }
					</Suspense>
				</div>
			)}

			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={toasterType}
				duration={2000}
				completed={() => setIsShowToaster(2)}
			/>
		</div>
	);
}

export default Writer;