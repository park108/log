import React, { useState, useEffect } from "react";
import * as common from '../common';
import LogItem from './LogItem';

const Writer = (props) => {

	const [article, setArticle] = useState("");
	const [disabled, setDisabled] = useState(false);
	const [mode, setMode] = useState("POST");
	const [buttonText, setButtonText] = useState("Post");

	const handleChange = ({ target: { value } }) => setArticle(value);
	
	const data = props.location.state;

	let contents = "";
	if(undefined !== data) {
		contents = data.item.logs[0].contents;
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

	useEffect(() => {
		setDisabled(!props.isPostSuccess);
	}, [props.isPostSuccess]);

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
	
	if(common.isAdmin()) {
		return (
			<form onSubmit={handleSubmit}>
				<textarea
					className="textarea textarea--writer-article"
					type="text"
					name="article"
					value={article}
					onChange={handleChange}
					placeholder="Take your note"
					disabled={disabled}
				/>
				<button
					className="button button--writer-submit"
					type="submit"
					disabled={disabled}
				>{buttonText}</button>
				{"EDIT" === mode &&
					<div className="div div--writer-archive" >
						{data.item.logs.map(log => (
							<LogItem
								key={log.timestamp}
								author={data.item.author}
								timestamp={log.timestamp}
								contents={log.contents}
							/>
						))}
					</div>
				}
			</form>
		);
	}
	else {
		return ("");
	}
}

export default Writer;