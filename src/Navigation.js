import React from "react";
import { Link } from 'react-router-dom';
import * as common from './common';
import UserLogin from './UserLogin'
  
const Navigation = (props) => {

	return (
		<div className="div div--nav-bar">
			<ul className="ul ul--nav-tabs">
				<li className="li li--nav-title">
					<a href={common.getUrl()}>park108.net</a>
				</li>
				<li className="li li--nav-active">
					<Link to="/log">log</Link>
				</li>
				<UserLogin />
			</ul>
		</div>
	)
}

export default Navigation;