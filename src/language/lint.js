const { ESLint } = require("eslint");
const ssjs = require("eslint-config-ssjs");

const logger = require("../auxi/logger");

/**
 * Lint a single file and return the results as a formatted string.
 * @param {string} filePath
 * @returns {Promise<string>} Lint results formatted as a string.
 */
async function lintFile(filePath) {
	const eslint = createESLintInstance();

	const results = await eslint.lintFiles([filePath]);
	// const formatter = await eslint.loadFormatter("stylish");
	// return formatter.format(results);
	return outputLintingResults(results);
}

/**
 * Output linting results to ...
 * @param {*} results 
 * @returns {boolean} true if there are problems, false otherwise
 */
function outputLintingResults(results) {
  // Identify the number of problems found
  const problems = results.reduce((acc, result) => acc + result.errorCount + result.warningCount, 0);

  if (problems > 0) {
    console.log("Linting errors found!");
    console.log(results);
  } else {
    console.log("No linting errors found.");
  }
  return problems > 0;
}

function createESLintInstance(overrideConfig) {
	const override = {
		// ...ssjs.configs.recommended,
		// ...overrideConfig,
		// files: ['**/*.ssjs']
		env: {
			es6: false,
			node: false
		},
		parserOptions: {
			ecmaVersion: 3,
			sourceType: "script",
			globals: {
				
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
	}

	console.log(override);

	return new ESLint({
		useEslintrc: false,
		overrideConfig: override,
		fix: true,
	});
}

module.exports = { lintFile };
