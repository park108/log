import React, { useState } from "react";
import * as common from './common';
import UserLogin from './UserLogin'
import Log from "./Log/Log";
import './App.css';

const menuList = {
	0: <Log />,
};
  
const App = () => {

	common.auth();
	
	const [menu, setMenu] = useState(0);
	
	const openMenu = (e) => {
		console.log(e.target.getAttribute("index"));
		setMenu(e.target.getAttribute("index") * 1);
	}

	let userName = "";

	if(common.isLoggedIn()) {
		userName = common.parseJwt(common.getCookie("access_token")).username;
	}

	return (
		<div>
			<div className="div--nav-bar">
				<ul className="ul--nav-tabs">
					<li className="li--nav-title"><a href={common.getUrl()}>park108.net</a></li>
					<li index="0" className={`${menu === 0? 'active': ''}`} onClick={openMenu}>log</li>
					<UserLogin />
					<li className="li--nav-user">{userName}</li>
				</ul>
			</div>
			<div className="div--main-contents">
				{menuList[menu]}
			</div>
		</div>
	)
}

export default App;
