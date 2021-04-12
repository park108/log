import React from "react";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import * as common from './common';
import Navigation from "./Navigation";
import Log from "./Log/Log";
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
			</Switch>
		</Router>
	)
}

export default App;
