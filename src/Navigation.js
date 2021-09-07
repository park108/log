import React, { useState } from "react";
import { Link } from 'react-router-dom';
import * as common from './common';
import UserLogin from './UserLogin'
  
const Navigation = (props) => {

	const [logClass, setLogClass] = useState("li li--nav-active");
	const [fileClass, setFileClass] = useState("li li--nav-inactive");

	const setApp = (app) => {

		switch(app) {

			case "log":
				setLogClass("li li--nav-active");
				setFileClass("li li--nav-inactive");
				break;

			case "file":
				setLogClass("li li--nav-inactive");
				setFileClass("li li--nav-active");
				break;

			default:
				setLogClass("li li--nav-active");
				setFileClass("li li--nav-inactive");
				break;
		}
	}

	const file = common.isAdmin() ?
		<li className={fileClass}>
			<Link to="/file" onClick={() => setApp("file")} >file</Link>
		</li> : "";

	return (
		<div className="div div--nav-bar">
			<ul className="ul ul--nav-tabs">
				<li className="li li--nav-title">
					<a href={common.getUrl()} >park108.net</a>
				</li>
				<li className={logClass}>
					<Link to="/log" onClick={() => setApp("log")} >log</Link>
				</li>
				{file}
				<UserLogin />
			</ul>
		</div>
	)
}

export default Navigation;