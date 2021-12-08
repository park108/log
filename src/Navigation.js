import React from "react";
import { Link, useLocation } from 'react-router-dom';
import { getUrl, isAdmin } from './common';
  
const Navigation = () => {

	const location = useLocation();
	
	if(!isAdmin()) {

		return (
			<nav className="nav nav--nav-bar">
				<ul className="ul ul--nav-tabs">
					<li className="li li--nav-title">
						<a href={getUrl()}>park108.net</a>
					</li>
				</ul>
			</nav>
		);
	}

	return (
		<nav className="nav nav--nav-bar">
			<ul className="ul ul--nav-tabs">
				<li className="li li--nav-title">
					<a href={getUrl()}>park108.net</a>
				</li>
				<li className={"/log" === location.pathname ? "li li--nav-active" : "li li--nav-inactive"}>
					<Link to="/log">log</Link>
				</li>
				<li className={"/file" === location.pathname ? "li li--nav-active" : "li li--nav-inactive"}>
					<Link to="/file">file</Link>
				</li>
				<li className={"/monitor" === location.pathname ? "li li--nav-active" : "li li--nav-inactive"}>
					<Link to="/monitor">mon</Link>
				</li>
			</ul>
		</nav>
	);
}

export default Navigation;