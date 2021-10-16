import React from "react";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import * as common from './common';
import Navigation from "./Navigation";
import Footer from "./Footer";
import Log from "./Log/Log";
import File from "./File/File";
import Monitor from "./Monitor/Monitor";
import './App.css';
  
const App = () => {

	common.auth();

	if("/" === window.location.pathname) {
		window.location.href = "/log";
	}

	return (
		<Router>
			<Navigation />
			<Switch>
				<Route path="/log" component={Log} />
				<Route path="/file" component={File} />
				<Route path="/monitor" component={Monitor} />
			</Switch>
			<Footer />
		</Router>
	)
}

export default App;
