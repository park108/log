import React, { useState, useEffect } from "react";
import { Redirect } from "react-router";
import * as common from '../common';
import * as parser from '../markdownParser';
import LogItem from './LogItem';

const Writer = (props) => {

	const [data] = useState(props.location.state);
	const [contents, setContents] = useState("");

	const [article, setArticle] = useState("");
	const [articleStatus, setArticleStatus] = useState("");

	const [convertedArticle, setConvertedArticle] = useState("");
	const [convertedArticleStatus, setConvertedArticleStatus] = useState("");

	const [disabled, setDisabled] = useState(false);
	const [isConvertedHTML, setIsConvertedHTML] = useState(false);
	const [mode, setMode] = useState("POST");
	const [buttonText, setButtonText] = useState("Post");

	const handleChange = ({ target: { value } }) => setArticle(value);

	const handlePanelWidth = () => {

		// Correct textarea size to converted div panel
		if(common.isAdmin()) {

			const textArea = document.getElementById("textarea--writer-article");
			const htmlDiv = document.getElementById("div--writer-converted");
			textArea.style.width = htmlDiv.offsetWidth + 'px';
		}
	}

	const handlePanelHeight = () => {

		// Correct textarea size to converted div panel
		if(common.isAdmin()) {

			const textArea = document.getElementById("textarea--writer-article");
			const htmlDiv = document.getElementById("div--writer-converted");

			// textArea.style.height = htmlDiv.offsetHeight + 'px';
			textArea.style.width = htmlDiv.offsetWidth + 'px';

			var taLineHeight = 32; // This should match the line-height in the CSS
			var taHeight = textArea.scrollHeight; // Get the scroll height of the textarea
			var numberOfLines = Math.floor(taHeight/taLineHeight);
			console.log( "there are " + numberOfLines + " lines in the text area");
			textArea.style.height = (numberOfLines * taLineHeight) + "px";
		}
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
	
	// Initialize
	useEffect(() => {

		// Change fullscreen mode
		const div = document.getElementsByTagName("div");

		for(let node of div) {
			node.style.maxWidth = "100%";
		}

		// Resize panels
		handlePanelWidth();

		// Add window resize listener
		const handleResize = () => handlePanelWidth();
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		}
	}, []);

	useEffect(() => {
		if(undefined !== data) {
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
		let html = parser.markdownToHtml(article);
		setConvertedArticle(html);
		setArticleStatus("Markdown length = " + article.length);
	}, [article]);

	useEffect(() => {
		setConvertedArticleStatus("HTML length = " + convertedArticle.length);
	}, [convertedArticle]);

	useEffect(() => {
		setDisabled(!props.isPostSuccess);
	}, [props.isPostSuccess]);

	const Converted = () => {

		useEffect(() => {
			handlePanelHeight();
		}, []);

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

	const changeMode = () => {
		setIsConvertedHTML(!isConvertedHTML);
	}

	const ConvertModeButton = () => {

		const buttonTitle = isConvertedHTML ? "Show Web" : "Show HTML";
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
						<LogItem
							key={log.timestamp}
							author={data.item.author}
							timestamp={log.timestamp}
							contents={log.contents}
						/>
					))}
				</div>;
		}
		else return "";
	}
	
	if(common.isAdmin()) {
		return (
			<form onSubmit={handleSubmit}>
				<div style={{overflow: "auto"}}>
					<textarea
						id="textarea--writer-article"
						className="textarea textarea--writer-article"
						type="text"
						name="article"
						value={article}
						onChange={handleChange}
						placeholder="Take your note in markdown"
						disabled={disabled}
					/>
					<Converted />
				</div>
				<div className="div div--writer-statusbar">
					<span>{articleStatus}</span>
					<span style={{float: "right"}}>{convertedArticleStatus}</span>
					<ConvertModeButton />
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