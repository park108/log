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

	// **메뉴를 상태에 담아 두지 않는다.**
	//
	// 예전에는 `isAdmin()` 이 참일 때만 상태를 세웠고 **되돌리는 갈래가 없었다.**
	// 토큰 쿠키의 수명은 한 시간이므로(`common.setCookie` — `max-age: 3600`),
	// 그 시간을 넘기면 `isAdmin()` 은 거짓이 되는데 메뉴는 그대로 남는다
	// (실측: 만료 전후 모두 `park108.net,log,file,mon`). 남은 메뉴를 누르면
	// `File`·`Monitor` 가 마운트 즉시 `/log` 로 되돌린다 — 메뉴가 없는 문을
	// 가리키고 있었던 것이다.
	//
	// 렌더할 때마다 판정하면 되돌리는 갈래를 따로 둘 필요가 없다. 이 컴포넌트는
	// 경로가 바뀔 때 어차피 다시 그려진다.
	const path = location.pathname;
	const adminMenu = !isAdmin() ? null : ADMIN_MENU.map((item) => (
		<li
			key={ item.name }
			className={ path.startsWith(item.path) ? "li li--nav-active" : "li li--nav-inactive" }
		>
			<Link to={ item.path }>{ item.name }</Link>
		</li>
	));

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