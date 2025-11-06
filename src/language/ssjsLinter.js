const Linter = require("./lint");
const ssjs = require("./ssjsPlugin");
const { template } = require("../template");
const logger = require("../auxi/logger");

const JS_LANGUAGE_NAME = "javascript";

const ssjsConfig = {
	plugins: {
		ssjs
	},
	languageOptions: {
		ecmaVersion: 3,
		sourceType: "script",
		parserOptions: {
			"ecmaFeatures": {
				"globalReturn": true
			}
		},
		globals: {
			"Account": "readonly",
			"AccountUser": "readonly",
			"Attribute": "readonly",
			"Base64Decode": "readonly",
			"Base64Encode": "readonly",
			"BeginImpressionRegion": "readonly",
			"BounceEvent": "readonly",
			"ContentArea": "readonly",
			"ContentAreaByName": "readonly",
			"ContentAreaObj": "readonly",
			"DataExtension": "readonly",
			"DateTime": "readonly",
			"DeliveryProfile": "readonly",
			"Email": "readonly",
			"EndImpressionRegion": "readonly",
			"FilterDefinition": "readonly",
			"Folder": "readonly",
			"Format": "readonly",
			"HTTP": "readonly",
			"HTTPHeader": "readonly",
			"List": "readonly",
			"Logout": "readonly",
			"Now": "readonly",
			"Platform": "readonly",
			"Portfolio": "readonly",
			"QueryDefinition": "readonly",
			"Redirect": "readonly",
			"Request": "readonly",
			"Script": "readonly",
			"Send": "readonly",
			"SendClassification": "readonly",
			"SenderProfile": "readonly",
			"Stringify": "readonly",
			"Subscriber": "readonly",
			"Substring": "readonly",
			"Template": "readonly",
			"TriggeredSend": "readonly",
			"Variable": "readonly",
			"Write": "readonly"
		}
	},
	rules: {
		"semi": "warn",
		"no-useless-assignment": "warn",
		"no-unused-vars": "warn",
		"no-undef": "warn",
		"no-use-before-define": [
			"warn",
			{
				"variables": true,
				"functions": false,
				"classes": false
			}
		],
		"no-duplicate-case": "warn",

		// rules to disable:
		"new-cap": "off",
		"no-console": "off",
		"no-extend-native": "off",
		"no-new": "off",
		"no-throw-literal": "off",
		"no-param-reassign": "warn",
		// custom rules:
		"ssjs/no-trailing-commas": "error"
	}
};

/**
 * Remove the script tags from the script text, unless it's a JS file.
 * Return the pure SSJS code.
 * Used as a pre-flight function for the linter.
 */
function removeScriptTags(scriptText, languageName) {
	if (languageName === JS_LANGUAGE_NAME) {
		return scriptText;
	}

	function replaceWithSpace(str, from, to) {
		let output = str.split('');

		for (let i = from; i < to; i++) {
			output[i] = output[i] === '\n' ? '\n' : ' ';
		}

		return output.join('');
	}

	function findMatchingClosingTag(scriptText, startIndex = 0) {
		const length = scriptText.length;
		let inQuote = null; // ' or " or `
		let escaped = false;
		let inLineComment = false;
		let inBlockComment = false;
	
		for (let i = startIndex; i < length - 8; i++) {
			const char = scriptText[i];
			const next2 = scriptText.slice(i, i + 2);
			const next9 = scriptText.slice(i, i + 9).toLowerCase();
	
			if (inQuote) {
				if (escaped) {
					escaped = false;
					continue;
				}
				if (char === '\\') {
					escaped = true;
				} else if (char === inQuote) {
					inQuote = null;
				}
				continue;
			}
	
			if (inLineComment) {
				if (char === '\n') {
					inLineComment = false;
				}
				continue;
			}
	
			if (inBlockComment) {
				if (next2 === '*/') {
					inBlockComment = false;
					i++; // skip over */
				}
				continue;
			}
	
			// Detect start of comment
			if (next2 === '//') {
				inLineComment = true;
				i++; // skip over //
				continue;
			}
			if (next2 === '/*') {
				inBlockComment = true;
				i++; // skip over /*
				continue;
			}
	
			// Detect start of string
			if (char === '"' || char === "'" || char === '`') {
				inQuote = char;
				continue;
			}
	
			// Check for </script> only if not in comment or quote
			if (next9 === '</script>') {
				return i;
			}
		}
	
		return -1; // Not found
	}

	logger.info('REMOVING SCRIPT TAGS');

	let openingTagRegex = /<script[^>]*?runat=["']*server["']*[^>]*?>/gi;
	let closingTagRegex = /<\/script>/gi;

	let inSsjs = false;
	let output = scriptText;
	let startReplaceIndex = 0;
	let endReplaceIndex = output.search(openingTagRegex);

	while (startReplaceIndex > -1 && endReplaceIndex > -1) {
		// replace opening SSJS tag:
		endReplaceIndex = output.indexOf('>', endReplaceIndex) + 1;
		output = replaceWithSpace(output, startReplaceIndex, endReplaceIndex);

		
		// replace closing SSJS tag:
		startReplaceIndex = findMatchingClosingTag(output, 0);
		// startReplaceIndex = output.search(closingTagRegex, startReplaceIndex);
		endReplaceIndex = output.indexOf('>', startReplaceIndex) + 1;
		output = replaceWithSpace(output, startReplaceIndex, endReplaceIndex);

		// find next opening SSJS tag:
		startReplaceIndex = endReplaceIndex;
		endReplaceIndex = output.search(openingTagRegex);
	}

	// clear the rest of the file:
	if (startReplaceIndex > -1) {
		endReplaceIndex = output.length;
		output = replaceWithSpace(output, startReplaceIndex, endReplaceIndex);
	}

	return output;
}

/**
 * Validate the script tags:
 * rules:
 * - double quotes are optional, but must be present in pairs
 * - runat="server" is required
 * - case insensitive
 * attributes:
 * - runat="server" - required
 * - language="JavaScript" - optional
 * - executioncontexttype="POST|GET" - optional
 * - executioncontextname - optional
 * return in the Array, that can be processed by the linter
 * 
 * Not used for JS files.
 * @param {string} scriptText - The script text to validate
 * @param {string} languageName - The language name of the file
 * @returns {Array} - The array of errors
 */
const scriptTagValidator = (scriptText, languageName) => {
	function pushError(message, severity = 2) {
		errors.push({
			messages: [{
				message: message,
				line: lineNumber,
				column: 0,
				severity: severity
			}],
			errorCount: severity == 2 ? 1 : 0,
			warningCount: severity < 2 ? 1 : 0
		});
	}

	if (languageName === JS_LANGUAGE_NAME) {
		return [];
	}

	const regex = /<script([^>]*)>/gi;

	let errors = [];
	let lines = scriptText.split("\n");
	let lineNumber = 1;
	for (let line of lines) {
		const matches = regex.exec(line) || [];
		
		if (matches.length > 1) {
			const attributes = matches[1];
			// warn, if this seems to be frontend javascript - no runat="server"
			if (!(attributes.match(/runat=["']*server["']*/) || attributes.match(/runat=["']*client["']*/))) {
				pushError("Use 'runat=server' for SSJS code, or our 'runat=client' for frontend javascript (uses AMPscript's 'concat' hack).", 1);
			} else {
				// for SSJS code, check the attributes:
				let languageMatches = /language=["']*(\w+)["']*/gi.exec(attributes);
				if (languageMatches && languageMatches.length > 1) {
					let language = languageMatches[1];
					language = language.toLowerCase();
					if (language == "ampscript") {
						pushError("'language=AMPscript' is not supported by this linter. Use 'language=JavaScript' instead.", 1);
					} else if (language !== "javascript") {
						pushError("Use 'JavaScript' for 'language' attribute (SSJS).", 2);
					}
				}

				let executionContextTypeMatches = /executioncontexttype=["']*(\w+)["']*/gi.exec(attributes);
				if (executionContextTypeMatches && executionContextTypeMatches.length > 1) {
					let executionContextType = executionContextTypeMatches[1];
					executionContextType = executionContextType.toLowerCase();
					if (executionContextType !== "post" && executionContextType !== "get") {
						pushError("Use 'POST' or 'GET' for 'executionContextType' attribute (SSJS) or omit it.", 2);
					}
				}
				// TODO: check the executionContextName (if exists, must have a value)
				// TODO: shouldn't have other attributes
			}
		}
		lineNumber++;
	}

	return errors;
};

const parsingErrorRules = [
	// const and let are not allowed in SSJS
	(message, line) => {
		const regex = /(const|let)\s+(\w+)(\s*=|\s*;)/;
		if (line.match(regex)) {
			return {
				message: "Parsing error: 'const' and 'let' are not allowed in SSJS. Use 'var' instead.",
				severity: 2
			}
		}
		return false;
	},
	// arrow functions are not allowed in SSJS
	(message, line) => {
		const regex = /=>/;
		if (line.match(regex)) {
			return {
				message: "Parsing error: Arrow functions are not allowed in SSJS.",
				severity: 2
			}
		}
		return false;
	},
	// await is not allowed in SSJS
	(message, line) => {
		const regex = /\W+(await|async)\s/;
		if (line.match(regex)) {
			return {
				message: "Parsing error: 'await' and 'async' are not allowed in SSJS.",
				severity: 2
			}
		}
		return false;
	},
	// no trailing object commas:
	(message, line) => {
		const regex = /,\s*\}/;
		if (line.match(regex)) {
			return {
				message: "Parsing error: No trailing object commas are allowed in SSJS.",
				severity: 2
			}
		}

		const regexEndOnly = /^\s*\}/;
		if (line.match(regexEndOnly)) {
			return {
				message: message + " - maybe there is a trailing comma?",
				severity: 2
			}
		}

		return false;
	},
	// no trailing function commas:
	(message, line) => {
		const regex = /,\s*\)/;
		if (line.match(regex)) {
			return {
				message: "Parsing error: No trailing function commas are allowed in SSJS.",
				severity: 2
			}
		}

		const regexEndOnly = /^\s*\)/;
		if (line.match(regexEndOnly)) {
			return {
				message: message + " - maybe there is a trailing comma?",
				severity: 2
			}
		}

		return false;
	},
	// import is not allowed in SSJS
	(message, line) => {
		const regex = /\W*import\s+/;
		if (line.match(regex)) {
			return {
				message: "Parsing error: 'import' is not allowed in SSJS.",
				severity: 2
			}
		}
		return false;
	}
];

module.exports = new Linter({
	languageName: "ssjs",
	fileExtensions: [".ssjs"],
	overrideConfig: ssjsConfig,
	preFlight: removeScriptTags,
	customValidator: scriptTagValidator,
	parsingErrorRules: parsingErrorRules
});