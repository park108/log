import React from "react";
  
const Footer = (props) => {

	return (
		<div className="div div--footer">
			<div className="div div--footer-contents">
				<span className="span span--footer-left">
					© 2021 Jongkil Park
				</span>
				<span className="span span--footer-right">
					<a href="https://www.linkedin.com/in/jongkil-park-48019576/" rel="noreferrer" target="_blank">[in]</a>
					&nbsp;
					<a href="https://github.com/park108" rel="noreferrer" target="_blank">[git]</a>
				</span>
			</div>
		</div>
	)
}

export default Footer;
