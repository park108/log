import React, { useState } from "react";
import Log from "./Log/Log";
import './App.css';

const menuList = {
	0: <Log />,
};


const getUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://park108.net/";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "http://localhost:3000/";
	}
}

// TODO: Change url after make Cognito User Pool for production
const getLoginUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://log.auth.ap-northeast-2.amazoncognito.com/login?client_id=5obtheulb7olv5uhnkubuldgqj&response_type=code&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=http://localhost:3000";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://log.auth.ap-northeast-2.amazoncognito.com/login?client_id=5obtheulb7olv5uhnkubuldgqj&response_type=code&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=http://localhost:3000";
	}
}
  
const App = () => {
	
	const [menu, setMenu] = useState(0);
	
	const openMenu = (e) => {
		console.log(e.target.getAttribute("index"));
		setMenu(e.target.getAttribute("index") * 1);
	}

	return (
		<div>
			<div className="div--nav-bar">
				<ul className="div--nav-tabs">
					<li className="div--nav-title"><a href={getUrl()}>park108.net</a></li>
					<li index="0" className={`${menu === 0? 'active': ''}`} onClick={openMenu}>log</li>
					<li><a href={getLoginUrl() }>login</a></li>
				</ul>
			</div>
			<div className="div--main-contents">
				{menuList[menu]}
			</div>
		</div>
	)
}

export default App;
