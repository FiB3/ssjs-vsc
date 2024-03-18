const path = require('path');
const Mustache = require('mustache');

const textFile = require('./auxi/file');
const Config = require('./config');

// no HTML escaping:
Mustache.escape = function(text) {return text;};

exports.template = {
	
	/**
	 * Get Templated file.
	 * @param {string} pth path to the file
	 * @param {boolean} isDev true: for testing / false: for deployment
	 * @returns 
	 */
	runFile: function(pth, tokens) {
		const templateFile = textFile.load(pth);

		const view = {
			...tokens
		};
			
		var resulting = Mustache.render(templateFile, view);
		return resulting;
	},

	/**
	 * Get Templated Script file.
	 * @param {string} pth path to the file
	 * @param {boolean} isDev true: for testing / false: for deployment
	 * @returns 
	 */
	runScriptFile: function(pth, config, isDev = true) {
		const htmlTemplate = textFile.load(pth);
		const customTags = Config.getTemplatingTags();

		let tokens = config.getTemplatingView(isDev);

		// loop through tokens, for each that starts with: `file://` replace value with loaded file's value
		for (let [token, value] of Object.entries(tokens)) {
			if (value.startsWith('file://')) {
				let libPath = path.join(Config.getUserWorkspacePath(), value.substring(7));
				let fileContent = textFile.load(libPath);
				tokens[token] = fileContent;
				// console.log(`TOKEN: ${token}: ${libPath}; ${fileContent.substring(0, 100)}...`);
			}
		}

		const view = {
			...tokens
			// , VERSION: this.getSsjsVersion(config.devTokens.VERSION)
		};
			
		var html = Mustache.render(htmlTemplate, view, {}, customTags);
		return html;
	},

	// getSsjsVersion: function() {
	// 	// TODO: needs to be improved
	// 	// when deploying - set date, when previewing set timestamp??
	// 	return config.automateVersion
	// 			? 'V.' + moment().format('DD:MM:YYYY-HH:m:s')
	// 			: '';
	// }
}