import React, { useState, useEffect, Suspense, lazy } from "react";
import { Navigate } from "react-router";
import { useLocation } from "react-router-dom";
import PropTypes from 'prop-types';
import { isAdmin, log, setFullscreen, hasValue } from '../common/common';
import * as parser from '../common/markdownParser';
import Toaster from "../Toaster/Toaster";
import './Writer.css';

const LogItem = lazy(() => import('./LogItem'));
const ImageSelector = lazy(() => import('../Image/ImageSelector'));

const Writer = (props) => {

	const [data, setData] = useState(undefined);
	const [contents, setContents] = useState("");
	const [isTemporary, setIsTemporary] = useState(false);
	const [article, setArticle] = useState("");
	const [articleStatus, setArticleStatus] = useState("");
	const [rows, setRows] = useState("1");
	const [convertedArticle, setConvertedArticle] = useState("");
	const [convertedArticleStatus, setConvertedArticleStatus] = useState("");
	const [disabled, setDisabled] = useState(false);
	const [isConvertedHTML, setIsConvertedHTML] = useState(false);
	const [mode, setMode] = useState("POST");
	const [buttonText, setButtonText] = useState("Post");	
	const [changeHistory, setChangeHistory] = useState(undefined);
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");
	const [isShowImageSelector, setIsShowImageSelector] = useState(false);
	
	const location = useLocation();
	
	// Change width
	useEffect(() => {
		setFullscreen(true); // Enable fullscreen mode at mounted
		if(null !== location.state) {
			setData(location.state.from); // Set data from location state
		}
		return () => {setFullscreen(false)} // Disable fullscreen mode at unmounted
	}, [location]);

	// Set contents data
	useEffect(() => {
		if(hasValue(data)) {
			setContents(data.logs[0].contents);
			if(hasValue(data.temporary)) {
				setIsTemporary(data.temporary);
			}
		}
	}, [data]);

	// Set change history in useEffect for prevent flickering.
	useEffect(() => {
		if("EDIT" === mode) {
			setChangeHistory(
				<div className="div div--writer-history" >
					<h1 className="h1 h1--writer-historytitle">Change History</h1>
					<Suspense fallback={<div></div>}>
						{
							data.logs.map(
								(log) => (
									<LogItem
										key={log.timestamp}
										author={data.author}
										timestamp={log.timestamp}
										contents={log.contents}
										showComments={false}
										showLink={false}
									/>
								)
							)
						}
					</Suspense>
				</div>
			);
		}
	}, [mode, data]);

	// Set writer mode POST or EDIT
	useEffect(() => {
		
		setArticle(contents);

		if("" === contents) {
			setMode("POST");
			setButtonText("Post");
		}
		else {
			setMode("EDIT");
			setButtonText("Edit");
		}
	}, [contents]);

	useEffect(() => {

		if(isAdmin()) {
			const setTextarealHeight = ({target: e}) => {
				setTextAreaRows(e);
			}

			let html = parser.markdownToHtml(article);

			setConvertedArticle(html);
			setArticleStatus("Markdown length = " + article.length);
			window.addEventListener('input', setTextarealHeight);

			// Initialize editor rows
			let textArea = document.getElementById("textarea--writer-article");
			if(2 > textArea.rows) {
				setTextAreaRows(textArea);
			}

			return () => {
				window.removeEventListener('input', setTextarealHeight);
			}
		}

	}, [article]);

	useEffect(() => {
	}, [isTemporary]);

	useEffect(() => setConvertedArticleStatus("HTML length = " + convertedArticle.length), [convertedArticle]);

	useEffect(() => setDisabled(!props.isPostSuccess), [props.isPostSuccess]);

	const handleChange = ({ target: { value } }) => setArticle(value);

	const setTextAreaRows = (e) => {

		let minRows = e.getAttribute('data-min-rows') | 1, rows;
		if(!e._baseScrollHeight) e._baseScrollHeight = e.scrollHeight;

		setRows(minRows); // Restore minimum rows
		rows = Math.ceil((e.scrollHeight - e._baseScrollHeight) / 32) ; // 32 px
		setRows(minRows + rows); // Set current rows
	}

	const postLog = (event) => {

		if(article.length < 5) {
			event.preventDefault();
			alert("Please note at least 5 characters.");
			document.getElementById("textarea--writer-article").focus();
			return;
		}

		if("POST" === mode) {
			event.preventDefault();
			props.post(article, document.getElementById("temporary").checked);
		}
		else { // "EDIT" === mode
			event.preventDefault();
			props.edit(data, article, document.getElementById("temporary").checked);
		}
	}

	const copyToMDString = (e) => {

		e.preventDefault();

		const tag = e.target.value;

		const markdownString = ("img" === tag) ? "![ALT_TEXT](url \"OPTIONAL_TITLE\")"
			: ("a" === tag) ? "[LinkText](https://example.com/ \"TITLE\")"
			: "";

		let tempElem = document.createElement('textarea');
		tempElem.value = markdownString;  
		document.body.appendChild(tempElem);

		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		log("MarkDown Img " + markdownString + " copied.");
		
		setToasterMessage("MD string copied.");
		setIsShowToaster(1);
	}

	const Converted = () => {

		if(!isConvertedHTML) {
			return (
				<div
					id="div--writer-converted"
					className="div div--writer-converted"
					dangerouslySetInnerHTML={{__html: convertedArticle}}
				>
				</div>
			);
		}

		return (
			<div
				id="div--writer-converted"
				className="div div--writer-converted"
			>
				{convertedArticle}
			</div>
		);
	}

	const ImageSelectorButton = () => {

		return (
			<span
				role="button"
				data-testid="img-selector-button"
				className="span span--writer-statusbarbutton"
				onClick={() => setIsShowImageSelector(!isShowImageSelector)}
			>
				[IMG]
			</span>
		);
	}

	const ConvertModeButton = () => {

		return (
			<span
				role="button"
				data-testid="mode-button"
				onClick={() => setIsConvertedHTML(!isConvertedHTML)}
				className="span span--writer-statusbarbutton"
			>
				{isConvertedHTML ? "HTML" : "Markdown Converted"}
			</span>
		);
	}

	const checkTemporary = () => {
		setIsTemporary(!isTemporary);
	}
	
	if(!isAdmin()) {
		return <Navigate to="/log" />;
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
				<ImageSelectorButton />
			</div>

			<Suspense fallback={<div></div>}>
				<ImageSelector
					show={isShowImageSelector}
				/>
			</Suspense>

			<form data-testid="writer-form" onSubmit={postLog}>
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
						disabled={disabled}
					/>
					<div className="div div--writer-convertedbox">
						<div className="div div--writer-convertedtag">
							<ConvertModeButton />
						</div>
						<Converted />
					</div>
				</div>
				<div className="div div--writer-toolbar">
					<input
						type="checkbox"
						id="temporary"
						onChange={checkTemporary}
						checked={isTemporary}
					/>
					<label
						htmlFor="temporary"
					>
						Temporary Save
					</label>

					<button
						role="button"
						data-testid="img-button"
						className="button button--writer-mdcopy"
						value="img"
						onClick={copyToMDString}
					>
						Markdown: image
					</button>

					<button
						role="button"
						data-testid="a-button"
						className="button button--writer-mdcopy"
						value="a"
						onClick={copyToMDString}
					>
						Markdown: anchor
					</button>
				</div>
					
				<button
					role="button"
					data-testid="submit-button"
					className="button button--writer-submit"
					type="submit"
					disabled={disabled}
				>{buttonText}</button>
			</form>

			{changeHistory}
			
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"warning"}
				duration={2000}
				completed={() => setIsShowToaster(2)}
			/>
		</div>
	);
}

Writer.propTypes = {
	isPostSuccess: PropTypes.bool,
	post: PropTypes.func,
	edit: PropTypes.func,
};

export default Writer;