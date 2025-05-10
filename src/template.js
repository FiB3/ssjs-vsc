const Mustache = require('mustache');
const Pathy = require('./auxi/pathy');
const textFile = require('./auxi/file');
const Config = require('./config');

const { format } = require('date-fns');

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
	 * @param {object} config - config object
	 * @param {string} env - `dev`, `prod` or `live-preview` (dev is default)
	 * @returns {string} - the templated code
	 */
	runScriptFile: function(pth, config, env = 'dev') {
		const htmlTemplate = textFile.load(pth);
		const customTags = Config.getTemplatingTags();

		let tokens = config.getTemplatingView(env);

		// loop through tokens, for each that starts with: `file://` replace value with loaded file's value
		for (let [token, value] of Object.entries(tokens)) {
			if (value.startsWith('file://')) {
				let libPath = Pathy.joinToRoot(value.substring(7));
				let fileContent = textFile.load(libPath);
				tokens[token] = fileContent;
			}
		}

		const view = {
			VERSION: this.getScriptVersion(),
			...tokens
		};
			
		var html = Mustache.render(htmlTemplate, view, {}, customTags);
		return html;
	},

	/**
	 * Templates the code for linting (dev environment).
	 * @param {string} codeTemplate - the code template to be templated
	 * @returns {string} - the de-templated code
	 */
	runScriptForLinting: function(codeTemplate) {
		const customTags = Config.getTemplatingTags();

		var removalRegEx = new RegExp(
			`${customTags[0]}[^{}]*${customTags[1]}`,
			'gmi'
		);

		var deTemplated = codeTemplate.replace(removalRegEx, `'<de-templated>';`);

		return deTemplated;
	},

	getScriptVersion: function() {
		return 'V.' + format(new Date(), 'yyyy-MM-dd.HH:mm:ss');
	}
}