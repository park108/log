import React, { useState, useEffect, Suspense, lazy } from "react";
import { Redirect } from "react-router";
import { isAdmin, log, setFullscreen } from '../common';
import * as parser from '../markdownParser';
import Toaster from "../Toaster/Toaster";

const LogItem = lazy(() => import('./LogItem'));
const ImageSelector = lazy(() => import('../Image/ImageSelector'));

const Writer = (props) => {
	
	const [data] = useState(props.location.state);
	const [contents, setContents] = useState("");

	const [article, setArticle] = useState("");
	const [articleStatus, setArticleStatus] = useState("");
	const [rows, setRows] = useState("1");

	const [convertedArticle, setConvertedArticle] = useState("");
	const [convertedArticleStatus, setConvertedArticleStatus] = useState("");

	const [disabled, setDisabled] = useState(false);
	const [isConvertedHTML, setIsConvertedHTML] = useState(false);
	const [mode, setMode] = useState("POST");
	const [buttonText, setButtonText] = useState("Post");

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterMessage ,setToasterMessage] = useState("");

	const [isShowImageSelector, setIsShowImageSelector] = useState("READY");
	
	// Change width
	useEffect(() => {
		setFullscreen(true); // Enable fullscreen mode at mounted
		return () => {setFullscreen(false)} // Disable fullscreen mode at unmounted
	}, []);

	// Set contents data
	useEffect(() => {
		if(undefined !== data && undefined !== data.item) {
			setContents(data.item.logs[0].contents);
		}
	}, [data]);

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

		const setTextarealHeight = ({target: e}) => {
	
			if( !e.nodeName === 'TEXTAREA' || !e.classList.contains('auto-expand')  ) return
			if(isAdmin()) setTextAreaRows(e);
		}

		let html = parser.markdownToHtml(article);

		setConvertedArticle(html);
		setArticleStatus("Markdown length = " + article.length);

		// Initialize editor rows
		let textArea = document.getElementById("textarea--writer-article");
		if(undefined !== textArea && 1 === textArea.rows) {
			setTextAreaRows(textArea);
		}

		window.addEventListener('input', setTextarealHeight);

		return () => {
			window.removeEventListener('input', setTextarealHeight);
		}

	}, [article]);

	useEffect(() => setConvertedArticleStatus("HTML length = " + convertedArticle.length), [convertedArticle]);

	useEffect(() => setDisabled(!props.isPostSuccess), [props.isPostSuccess]);

	
	if(!isAdmin()) {
		return <Redirect to="/log" />;
	}

	const handleChange = ({ target: { value } }) => setArticle(value);

	const setTextAreaRows = (e) => {

		const getScrollHeight = (e) => {
	
			let savedValue = e.value;
			e.value = "";
			e._baseScrollHeight = e.scrollHeight;
			e.value = savedValue;
		}

		let minRows = e.getAttribute('data-min-rows') | 0, rows;
		!e._baseScrollHeight && getScrollHeight(e);

		setRows(minRows);

		rows = Math.ceil((e.scrollHeight - e._baseScrollHeight) / 32);
		setRows(minRows + rows);
	}

	const handleSubmit = (event) => {

		// TODO: Make version control
		if(article.length < 5) {

			alert("Please note at least 5 characters.");
		}
		else if("POST" === mode) {

			event.preventDefault();
			props.post(article);
		}
		else if("EDIT" === mode) {

			event.preventDefault();
			props.edit(data.item, article);
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

		const changeMode = () => {
			if("READY" === isShowImageSelector) {
				setIsShowImageSelector("SHOW");
			}
			if("SHOW" === isShowImageSelector) {
				setIsShowImageSelector("HIDE");
			}
			if("HIDE" === isShowImageSelector) {
				setIsShowImageSelector("SHOW");
			}
		}

		return (
			<span
				className="span span--writer-statusbarbutton"
				onClick={changeMode}
			>
				[IMG]
			</span>
		);
	}

	const ConvertModeButton = () => {

		return (
			<span
				onClick={() => setIsConvertedHTML(!isConvertedHTML)}
				className="span span--writer-statusbarbutton"
			>
				{isConvertedHTML ? "[HTML]" : "[WEB]"}
			</span>
		);
	}

	const ChangeHistory = () => {

		if("POST" === mode) {
			return "";
		}

		return (
			<div className="div div--writer-history" >
				<h1 className="h1 h1--writer-historytitle">Change History</h1>
				{
					data.item.logs.map(
						(log) => (
							<LogItem
								key={log.timestamp}
								author={data.item.author}
								timestamp={log.timestamp}
								contents={log.contents}
								showComments={false}
								showLink={false}
							/>
						)
					)
				}
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit}>
			<div className="div div--writer-statusbar">
				<span className="span span--writer-statusbaritem">
					{articleStatus}
				</span>
				<span className="span span--writer-statusbaritem span--writer-statusbaritemright">
					{convertedArticleStatus}
				</span>
				<ConvertModeButton />
				<ImageSelectorButton />
			</div>
			<Suspense fallback={<div></div>}>
				<ImageSelector
					show={isShowImageSelector}
				/>
			</Suspense>
			<div className="div div--writer-editbox">
				<textarea
					id="textarea--writer-article"
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
				<Converted />
			</div>
			<div className="div div--writer-toolbar">
				<input
					type="checkbox"
					id="temporary"
				/>
				<label
					htmlFor="temporary"
				>
					Temporary Save
				</label>

				<button
					className="button button--writer-mdcopy"
					value="img"
					onClick={copyToMDString}
				>
					Markdown: image
				</button>

				<button
					className="button button--writer-mdcopy"
					value="a"
					onClick={copyToMDString}
				>
					Markdown: anchor
				</button>
			</div>
				
			<button
				className="button button--writer-submit"
				type="submit"
				disabled={disabled}
			>{buttonText}</button>
			<ChangeHistory />
			
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"warning"}
				duration={2000}
				
				completed={() => setIsShowToaster(0)}
			/>
		</form>
	);
}

export default Writer;