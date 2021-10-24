import React, { useState, useEffect, Suspense, lazy } from "react";
import { Redirect } from "react-router";
import * as common from '../common';
import * as parser from '../markdownParser';

const LogDetail = lazy(() => import('./LogDetail'));
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

	const [isShowImageSelector, setIsShowImageSelector] = useState(0);

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
	
	// Change width
	useEffect(() => {

		// Change width
		const div = document.getElementsByTagName("div");

		for(let node of div) {
			node.style.maxWidth = "100%";
		}

	}, []);

	useEffect(() => {
		if(undefined !== data && undefined !== data.item) {
			setContents(data.item.logs[0].contents);
		}
	}, [data]);

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
			if(common.isAdmin()) setTextAreaRows(e);
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

	useEffect(() => {
		setConvertedArticleStatus("HTML length = " + convertedArticle.length);
	}, [convertedArticle]);

	useEffect(() => {
		setDisabled(!props.isPostSuccess);
	}, [props.isPostSuccess]);

	const Converted = () => {

		if(!isConvertedHTML) {
			return <div
				id="div--writer-converted"
				className="div div--writer-converted"
				dangerouslySetInnerHTML={{__html: convertedArticle}}
			></div>;
		}
		else {
			return <div
				id="div--writer-converted"
				className="div div--writer-converted"
			>{convertedArticle}</div>;
		}
	}

	const ImageSelectorButton = () => {

		const changeMode = () => {
			if(0 === isShowImageSelector) {
				setIsShowImageSelector(1);
			}
			if(1 === isShowImageSelector) {
				setIsShowImageSelector(2);
			}
			if(2 === isShowImageSelector) {
				setIsShowImageSelector(1);
			}
		}

		return <span
			className="span span--writer-statusbarbutton"
			onClick={changeMode}
			>
			[IMG]
		</span>;
	}

	const ConvertModeButton = () => {

		const changeMode = () => {
			setIsConvertedHTML(!isConvertedHTML);
		}

		const buttonTitle = isConvertedHTML ? "[HTML]" : "[WEB]";
		return <span
			onClick={changeMode}
			className="span span--writer-statusbarbutton"
			>
				{buttonTitle}
			</span>;
	}

	const ChangeHistory = () => {
		if("EDIT" === mode) {
			return <div className="div div--writer-archive" >
					<div className="div div--writer-archivetitle">Change History</div>
					{data.item.logs.map(log => (
						<Suspense fallback={<div></div>}>
							<LogDetail	
								key={log.timestamp}
								author={data.item.author}
								timestamp={log.timestamp}
								contents={log.contents}
							/>
						</Suspense>
					))}
				</div>;
		}
		else return "";
	}
	
	if(common.isAdmin()) {
		return (
			<form onSubmit={handleSubmit}>
				<div className="div div--writer-statusbar">
					<span className="span span--writer-statusbaritem">{articleStatus}</span>					
					<span className="span span--writer-statusbaritem span--writer-statusbaritemright">{convertedArticleStatus}</span>
					<ConvertModeButton />
					<ImageSelectorButton />
				</div>
				<Suspense fallback={<div></div>}>
					<ImageSelector
						show={isShowImageSelector}
					/>
				</Suspense>
				<div style={{overflow: "auto"}}>
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
				<button
					className="button button--writer-submit"
					type="submit"
					disabled={disabled}
				>{buttonText}</button>
				<ChangeHistory />
			</form>
		);
	}
	else {
		return <Redirect to="/log" />;
	}
}

export default Writer;