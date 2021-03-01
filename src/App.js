import React, { Component } from "react";
import './App.css';
import Log from "./Log/Log";

const menuList = {
	0: <Log />,
};
  
class App extends React.Component {

	constructor(props) {

		super();
	
		this.state = {
			menu: 0,
		};
	}
	
	changeMenu = (menuIndex) =>{
		this.setState({menu : menuIndex});
	}

	render() {
		return (
			<div>
				<div className="nav-bar">
					<ul className="tabs">
						<li className="nav-bar-title"><a href="/">park108.net</a></li>
						<li className={`${this.state.menu === 0? 'active': ''}`} onClick={() => this.changeMenu(0)}>log</li>
						<li><a href="https://log.auth.ap-northeast-2.amazoncognito.com/login?client_id=5obtheulb7olv5uhnkubuldgqj&response_type=code&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=http://localhost:3000/">login</a></li>
					</ul>
				</div>
				<div className="contents">
					{menuList[this.state.menu]}
				</div>
			</div>
		)
	}
}

export default App;
