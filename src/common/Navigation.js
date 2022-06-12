import React from "react";
import { Link, useLocation } from 'react-router-dom';
import { getUrl, isAdmin } from './common';
import Search from '../common/Search';
  
const Navigation = () => {

	const location = useLocation();

	let logMenu = undefined;
	let fileMenu = undefined;
	let monitorMenu = undefined;
	
	if(isAdmin()) {

		logMenu = (
			<li className={"/log" === location.pathname ? "li li--nav-active" : "li li--nav-inactive"}>
				<Link to="/log">log</Link>
			</li>
		);

		fileMenu = (
			<li className={"/file" === location.pathname ? "li li--nav-active" : "li li--nav-inactive"}>
				<Link to="/file">file</Link>
			</li>
		);

		monitorMenu = (
			<li className={"/monitor" === location.pathname ? "li li--nav-active" : "li li--nav-inactive"}>
				<Link to="/monitor">mon</Link>
			</li>
		);
	}

	return (
		<nav className="nav nav--nav-bar">
			<ul className="ul ul--nav-tabs">
				<li className="li li--nav-title">
					<a href={getUrl()}>park108.net</a>
				</li>
				{logMenu}
				{fileMenu}
				{monitorMenu}
				<Search />
			</ul>
		</nav>
	);
}

export default Navigation;