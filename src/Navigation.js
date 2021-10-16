import React, { useState, useEffect } from "react";
import { Link, useLocation } from 'react-router-dom';
import * as common from './common';
import UserLogin from './UserLogin'
  
const Navigation = () => {

	const [logClass, setLogClass] = useState("li li--nav-active");
	const [fileClass, setFileClass] = useState("li li--nav-inactive");
	const [monitorClass, setMonitorClass] = useState("li li--nav-inactive");

	const location = useLocation();

	useEffect(() => {

		switch(location.pathname) {

			case "/log":
				setLogClass("li li--nav-active");
				setFileClass("li li--nav-inactive");
				setMonitorClass("li li--nav-inactive");
				break;

			case "/file":
				setLogClass("li li--nav-inactive");
				setFileClass("li li--nav-active");
				setMonitorClass("li li--nav-inactive");
				break;

			case "/monitor":
				setLogClass("li li--nav-inactive");
				setFileClass("li li--nav-inactive");
				setMonitorClass("li li--nav-active");
				break;

			default:
				setLogClass("li li--nav-active");
				setFileClass("li li--nav-inactive");
				setMonitorClass("li li--nav-inactive");
				break;
		}

	}, [location.pathname]);

	const title = <li className="li li--nav-title">
			<a href={common.getUrl()} >park108.net</a>
		</li>;

	const log = <li className={logClass}>
			<Link to="/log" >log</Link>
		</li>;

	const file = common.isAdmin() ?
		<li className={fileClass}>
			<Link to="/file" >file</Link>
		</li> : "";

	const monitor = common.isAdmin() ?
		<li className={monitorClass}>
			<Link to="/monitor" >mon</Link>
		</li> : "";

	return (
		<div className="div div--nav-bar">
			<ul className="ul ul--nav-tabs">
				{title}
				{log}
				{file}
				{monitor}
				<UserLogin />
			</ul>
		</div>
	)
}

export default Navigation;