import React, { useState } from "react";

function sleep(ms) {
	console.log("Processing...");
	return new Promise((r) => setTimeout(r, ms));
}

const Writer = (props) => {

	const [article, setArticle] = useState("");
	const [disabled, setDisabled] = useState(false);

	const handleChange = ({ target: { value } }) => setArticle(value);

	const handleSubmit = (event) => {
		
		setDisabled(true);

		if(article.length < 5) {

			alert("Please note at least 5 characters.");
		}
		else {

			event.preventDefault();
			props.writerSubmit(article);

			sleep(1000).then(() => {
				console.log("done");
				setDisabled(false);
			});
		}
	}

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

export default Writer;