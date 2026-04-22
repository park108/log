import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from 'react-router-dom';
import { getUrl, isAdmin } from './common';
import SearchInput from '../Search/SearchInput';

interface AdminMenuEntry {
	path: string;
	name: string;
}

const ADMIN_MENU: readonly AdminMenuEntry[] = [
	{ path: "/log", name: "log" },
	{ path: "/file", name: "file" },
	{ path: "/monitor", name: "mon" },
];

const Navigation = () => {

	const location = useLocation();
	const [adminMenu, setAdminMenu] = useState<ReactNode>();

	useEffect(() => {
		if(isAdmin()) {
			
			const path = location.pathname;

			setAdminMenu(
				ADMIN_MENU.map((item) => (
					<li
						key={ item.name }
						className={ path.startsWith(item.path) ? "li li--nav-active" : "li li--nav-inactive" }
					>
						<Link to={ item.path }>{ item.name }</Link>
					</li>
				))
			);
		}
	}, [location.pathname]);

	return (
		<nav className="nav nav--nav-bar">
			<ul className="ul ul--nav-tabs">
				<li className="li li--nav-title">
					<a href={getUrl()}>park108.net</a>
				</li>
				{ adminMenu }
				<SearchInput />
			</ul>
		</nav>
	);
}

export default Navigation;