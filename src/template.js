const Mustache = require('mustache');
const moment = require('moment');

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

		const tokens = config.getTokens(isDev);

		const view = {
			...tokens
			// , VERSION: this.getSsjsVersion(config.devTokens.VERSION)
		};
			
		var html = Mustache.render(htmlTemplate, view, {}, customTags);
		return html;
	},

	getSsjsVersion: function() {
		// TODO: needs to be improved
		// when deploying - set date, when previewing set timestamp??
		return config.automateVersion
				? 'V.' + moment().format('DD:MM:YYYY-HH:m:s')
				: '';
	}
}