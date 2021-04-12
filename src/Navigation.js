import React from "react";
import { Link } from 'react-router-dom';
import * as common from './common';
import UserLogin from './UserLogin'
  
const Navigation = (props) => {

	return (
		<div>
			<div className="div--nav-bar">
				<ul className="ul--nav-tabs">
					<li className="li--nav-title">
						<a href={common.getUrl()}>park108.net</a>
					</li>
					<li className="active">
						<Link to="/log">log</Link>
					</li>
					<UserLogin />
				</ul>
			</div>
		</div>
	)
}

export default Navigation;
