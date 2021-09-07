import React from "react";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import * as common from './common';
import Navigation from "./Navigation";
import Footer from "./Footer";
import Log from "./Log/Log";
import File from "./File/File";
import './App.css';
  
const App = () => {

	common.auth();

	// Temp for get S3 object list
	if("/" === window.location.pathname) {
		window.location.href = "/log";
	}

	return (
		<Router>
			<Navigation />
			<Switch>
				<Route path="/log" component={Log} />
				<Route path="/file" component={File} />
			</Switch>
			<Footer />
		</Router>
	)
}

export default App;
