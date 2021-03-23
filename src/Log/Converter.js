function Converter (input) {

	let output = input.replace(/(\n|\r\n)/g, "<br />");
	
	console.log("Converted contents: " + output);

	return output;
}

export default Converter;