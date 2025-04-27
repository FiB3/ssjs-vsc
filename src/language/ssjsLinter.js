const Linter = require("./lint");

// TODO: make it work in `<script>` tags
const ssjsConfig = {
	// ...ssjs.configs.recommended,
	// ...overrideConfig,
	// files: ['**/*.ssjs']
	env: {
		es6: false,
		node: false,
		browser: true
	},
	parserOptions: {
		ecmaVersion: 3,
		sourceType: "script",
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
		},
	},
	rules: {
		"comma-dangle": [
			"error",
			"never"
		],
		"new-cap": "off",
		"no-console": "off",
		"no-extend-native": "off",
		"no-new": "error",
		"no-prototype-builtins": "off",
		"no-throw-literal": "off",
		"no-use-before-define": [
			"error",
			{
				"variables": true,
				"functions": false,
				"classes": false
			}
		],
		"no-var": "off"
	}
};

const removeScriptTags = (scriptText) => {
	// keep only the script content - remove everything outside of `<script runat="server">` tags
	// keep the lines, but remove anything else
	let openingTagRegex = /<script[^>]*?runat=["']*server["']*[^>]*?>/gi;
	let closingTagRegex = /<\/script>/gi;

	let lines = scriptText.split("\n");
	let scriptLines = [];
	let inScript = false;
	for (let line of lines) {
		if (line.match(closingTagRegex)) {
			inScript = false;
		}
		scriptLines.push(inScript ? line : '');

		if (line.match(openingTagRegex)) {
			inScript = true;
		}
	}

	return scriptLines.join("\n");
};

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
 * @param {string} scriptText - The script text to validate
 * @returns {Array} - The array of errors
 */
const scriptTagValidator = (scriptText) => {
	function pushError(message, severity = 2) {
		errors.push({
			messages: [{
				message: message,
				line: lineNumber,
				column: 0,
				severity: severity
			}]
		});
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
			if (!attributes.match(/runat=["']*server["']*/)) {
				pushError("Attribute `runat=server` is required for SSJS code. Use AMPscript's `concat` hack for frontend javascript.", 1);
			} else {
				// for SSJS code, check the attributes:
				let languageMatches = /language=["']*(\w+)["']*/gi.exec(attributes);
				if (languageMatches && languageMatches.length > 1) {
					let language = languageMatches[1];
					language = language.toLowerCase();
					if (language == "ampscript") {
						pushError("`language=AMPscript` is not supported by this linter. Use `language=JavaScript` instead.", 1);
					} else if (language !== "javascript") {
						pushError("Use `JavaScript` for `language` attribute (SSJS).", 2);
					}
				}

				let executionContextTypeMatches = /executioncontexttype=["']*(\w+)["']*/gi.exec(attributes);
				if (executionContextTypeMatches && executionContextTypeMatches.length > 1) {
					let executionContextType = executionContextTypeMatches[1];
					executionContextType = executionContextType.toLowerCase();
					if (executionContextType !== "post" && executionContextType !== "get") {
						pushError("Use `POST` or `GET` for `executioncontexttype` attribute (SSJS) or omit it.", 2);
					}
				}
			}
		}

		lineNumber++;
	}

	return errors;
};

module.exports = new Linter({
	languageName: "ssjs",
	fileExtensions: [".ssjs"],
	overrideConfig: ssjsConfig,
	preFlight: removeScriptTags,
	customValidator: scriptTagValidator
});