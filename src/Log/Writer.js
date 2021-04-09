import React, { useState, useEffect } from "react";
import * as common from '../common';

const Writer = (props) => {

	const [article, setArticle] = useState("");
	const [disabled, setDisabled] = useState(false);

	const handleChange = ({ target: { value } }) => setArticle(value);

	const handleSubmit = (event) => {

		if(article.length < 5) {

			alert("Please note at least 5 characters.");
		}
		else {

			event.preventDefault();
			props.submit(article);
		}
	}

	useEffect(() => {

		// Button disable by POST result
		setDisabled(!props.isPostSuccess);
		setArticle("");
	}, [props.isPostSuccess]);

	if(common.isLoggedIn()) {
		return (
			<form onSubmit={handleSubmit}>
				<textarea
					className="textarea--article-normal"
					type="text"
					name="article"
					value={article}
					onChange={handleChange}
					placeholder="Take your note"
				/>
				<button
					className="button--submit-normal"
					type="submit"
					disabled={disabled}
				>Post</button>
			</form>
		);
	}
	else {
		return ("");
	}
}

export default Writer;