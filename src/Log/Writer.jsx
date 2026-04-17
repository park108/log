import React, { useState, useEffect, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { log, isAdmin, setFullscreen, hasValue, copyToClipboard } from '../common/common';
import { postLog, putLog } from './api';
import * as parser from '../common/markdownParser';
import Toaster from "../Toaster/Toaster";
import './Writer.css';

const LogItem = lazy(() => import('./LogItem'));
const ImageSelector = lazy(() => import('../Image/ImageSelector'));

const MARKDOWN_STRING_TEMPLATE = {
	"img": "![ALT_TEXT](url \"OPTIONAL_TITLE\")",
	"a": "[LinkText](https://example.com/ \"TITLE\")",
};

const Writer = () => {

	const [isProcessing, setIsProcessing] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isConvertedHTML, setIsConvertedHTML] = useState(false);
	const [isNew, setIsNew] = useState(true);

	const [historyData, setHistoryData] = useState(undefined);
	const [changeHistory, setChangeHistory] = useState(undefined);

	const [article, setArticle] = useState("");
	const [isTemporary, setIsTemporary] = useState(false);
	const [articleStatus, setArticleStatus] = useState("");
	const [convertedArticle, setConvertedArticle] = useState("");
	const [convertedArticleStatus, setConvertedArticleStatus] = useState("");

	const [rows, setRows] = useState("1");

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterType, setToasterType] = useState("success");
	const [toasterMessage ,setToasterMessage] = useState("");
	const [isShowImageSelector, setIsShowImageSelector] = useState(false);
	
	const location = useLocation();
	const navigate = useNavigate();
	
	useEffect(() => {

		if(!isAdmin()) {
			const redirectPage = "/log";
			log("Redirect to " + redirectPage);
			navigate(redirectPage);
			return;
		}

		setFullscreen(true);

		if(hasValue(location.state)) {
			setIsNew(false);
			setHistoryData(location.state.from);
		}

		return () => {setFullscreen(false)}
	}, [location]);

	useEffect(() => {
		if(hasValue(historyData)) {

			setArticle(historyData.logs[0].contents);

			setChangeHistory(
				<div className="div div--writer-history" >
					<h1 className="h1 h1--writer-historytitle">Change History</h1>
					<Suspense fallback={<div></div>}>
						{ historyData.logs.map((log) => (
							<LogItem
								key={log.timestamp}
								author={historyData.author}
								timestamp={log.timestamp}
								contents={log.contents}
								showComments={false}
								showLink={false}
							/>
						)) }
					</Suspense>
				</div>
			);

			if(hasValue(historyData.temporary)) {
				setIsTemporary(historyData.temporary);
			}
		}
	}, [historyData]);

	useEffect(() => {

		const setTextAreaRows = (e) => {
			let minRows = e.getAttribute('data-min-rows') | 1, rows;
			if(!e._baseScrollHeight) e._baseScrollHeight = e.scrollHeight;
	
			setRows(minRows); // Restore minimum rows
			rows = Math.ceil((e.scrollHeight - e._baseScrollHeight) / 32) ; // 32 px
			setRows(minRows + rows); // Set current rows
		}

		const setTextarealHeight = ({target: e}) => {
			setTextAreaRows(e);
		}

		let html = parser.markdownToHtml(article);

		setConvertedArticle(html);
		setArticleStatus("Markdown length = " + article.length);
		window.addEventListener('input', setTextarealHeight);

		let textArea = document.getElementById("textarea--writer-article");
		if(2 > textArea.rows) {
			setTextAreaRows(textArea);
		}

		return () => {
			window.removeEventListener('input', setTextarealHeight);
		}

	}, [article]);

	useEffect(() => {

		const createLog = async () => {
	
			const newTimestamp = Math.floor(new Date().getTime());
	
			setIsProcessing(true);
	
			try {
				const res = await postLog(newTimestamp, article, isTemporary);
				const status = await res.json();
	
				if(200 === status.statusCode) {
					log("[API POST] OK - Log", "SUCCESS");
					
					setToasterType("success");
					setToasterMessage("The log posted.");
					setIsShowToaster(1);
	
					sessionStorage.removeItem("logList");
					sessionStorage.removeItem("logListLastTimestamp");
	
					navigate("/log/" + newTimestamp);
				}
				else {
					log("[API POST] FAILED - Log", "ERROR");
					log(res, "ERROR");
					
					setToasterType("error");
					setToasterMessage("Posting log failed.");
					setIsShowToaster(1);
				}
			}
			catch(err) {
				log("[API POST] FAILED - Log", "ERROR");
				log(err, "ERROR");
					
				setToasterType("error");
				setToasterMessage("Posting log network error.");
				setIsShowToaster(1);
			}

			setIsProcessing(false);
		}
	
		const editLog = async () => {
	
			setIsProcessing(true);
	
			try {
				let newItem = JSON.parse(JSON.stringify(historyData));
		
				const changedLogs = [{
					contents: article,
					timestamp: Math.floor(new Date().getTime())
				}, ...newItem.logs];
		
				newItem.logs = changedLogs;
	
				const res = await putLog(newItem, isTemporary);
				const status = await res.json();
	
				if(200 === status.statusCode) {
					log("[API PUT] OK - Log", "SUCCESS");
			
					setToasterMessage("The log changed.");
					setIsShowToaster(1);
	
					sessionStorage.removeItem("logList");
					sessionStorage.removeItem("logListLastTimestamp");
					
					navigate("/log/" + historyData.timestamp);
				}
				else {
					log("[API PUT] FAILED - Log", "ERROR");
					log(res, "ERROR");
					
					setToasterType("error");
					setToasterMessage("Editing log failed.");
					setIsShowToaster(1);
				}
			}
			catch(err) {
				log("[API PUT] FAILED - Log", "ERROR");
				log(err, "ERROR");
					
				setToasterType("error");
				setToasterMessage("Editing log network error.");
				setIsShowToaster(1);
			}

			setIsProcessing(false);
		}

		if(isSubmitted) {

			if(article.length < 5) {
				alert("Please note at least 5 characters.");
				document.getElementById("textarea--writer-article").focus();
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
	}, [isSubmitted])

	useEffect(() => {
		setConvertedArticleStatus("HTML length = " + convertedArticle.length)
	}, [convertedArticle]);

	const handleChange = ({ target: { value } }) => setArticle(value);

	const copyMarkdownString = (e) => {
		e.preventDefault();
		const tag = e.target.value;

		let markdownString = MARKDOWN_STRING_TEMPLATE[tag];

		copyToClipboard(markdownString);

		setToasterType("information");
		setToasterMessage("Markdown string copied.");
		setIsShowToaster(1);
	}

	const Converted = () => {

		if(isConvertedHTML) {
			return (
				<div
					id="div--writer-converted"
					className="div div--writer-converted"
				>
					{ convertedArticle }
				</div>
			);
		}
		else {
			return (
				<div
					id="div--writer-converted"
					className="div div--writer-converted"
					dangerouslySetInnerHTML={{__html: convertedArticle}}
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
				<span
					role="button"
					data-testid="img-selector-button"
					className="span span--writer-statusbarbutton"
					onClick={() => setIsShowImageSelector(!isShowImageSelector)}
				>
					[IMG]
				</span>
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
						type="text"
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
							<span
								role="button"
								data-testid="mode-button"
								onClick={() => setIsConvertedHTML(!isConvertedHTML)}
								className="span span--writer-statusbarbutton"
							>
								{isConvertedHTML ? "HTML" : "Markdown Converted"}
							</span>
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

					<button
						role="button"
						data-testid="img-button"
						className="button button--writer-mdcopy"
						value="img"
						onClick={copyMarkdownString}
					>
						Markdown: image
					</button>

					<button
						role="button"
						data-testid="a-button"
						className="button button--writer-mdcopy"
						value="a"
						onClick={copyMarkdownString}
					>
						Markdown: anchor
					</button>
				</div>
					
				<button
					role="button"
					data-testid="submit-button"
					className="button button--writer-submit"
					type="submit"
					disabled={ isProcessing }
				>
					{ isNew ? "Post" : "Edit" }
				</button>
			</form>

			{changeHistory}
			
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