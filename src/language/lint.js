const vscode = require("vscode");
const { ESLint } = require("eslint");

const SourceCode = require("../code/sourceCode");
const ContextHolder = require("../config/contextHolder");
const logger = require("../auxi/logger");
const vsc = require("../vsc");
const file = require("../auxi/file");
const telemetry = require("../telemetry");

class Linter {
	/**
	 * Initialize a new linter for a specific language.
	 * @param {string} languageName Name of the language (e.g. "ssjs")
	 * @param {Array} fileExtensions Array of file extensions (e.g. [".ssjs"])
	 * @param {Object} overrideConfig Override configuration for the linter
	 * @param {Function} preFlight(scriptText, languageName) pre-linter function to modify the file content if needed
	 * @param {Function} customValidator(scriptText, languageName) Custom validator function - works on entire file
	 * @param {Array<Function>} parsingErrorRules Additional rules to apply to parsing errors:
	 * 		function(message, line) => { return { message: string, severity: number }; } / false
	 */
	constructor( {
		languageName,
		fileExtensions,
		overrideConfig,
		preFlight = (scriptText, languageName) => { return scriptText; },
		customValidator = (scriptText, languageName) => { return []; },
		parsingErrorRules = []
	}) {
		this.languageName = languageName;
		this.fileExtensions = fileExtensions;
		this.eslint = this.createESLintInstance(overrideConfig);
		this.preFlight = preFlight;
		this.customValidator = customValidator;
		this.parsingErrorRules = parsingErrorRules;

		this.diagnostics;
		this.activeDiagnostics = [];

		// register closing files:
		vscode.workspace.onDidCloseTextDocument((document) => {
			this.clearFileDiagnostics(document.uri.fsPath);
		});
	}

	/**
	 * Check if currently active file is lintable by this linter.
	 * @returns {boolean} true if the file is lintable, false otherwise
	 */
	isLintable() {
		const filePath = vsc.getActiveEditor();
		if (!filePath) {
			logger.error(`isLintable() - no file path provided:`, filePath);
			return false;
		}
		return this.fileExtensions.some(ext => filePath.endsWith(ext));
	}

	/**
	 * Lint the currently active file & output the results to the editor - 'Problems' view.
	 * @param {boolean} silent - Whether to suppress messages.
	 * @returns {boolean} true if there are problems, false otherwise
	 */
	async lintCurrentFile(silent = false) {
		const filePath = vsc.getActiveEditor();
		if (!filePath) {
			return -1;
		}

		return this.lintFile(filePath, silent);
	}

	/**
	 * Lint the currently active file & output the results to the editor - 'Problems' view.
	 * @param {string} filePath - The file path to lint.
	 * @param {boolean} silent - Whether to suppress messages.
	 * @returns {boolean} true if there are problems, false otherwise
	 */
	async lintFile(filePath, silent = false) {
		try {
			if (!filePath) {
				logger.error(`lintFile() - no file path provided:`, filePath);
				vscode.window.showErrorMessage("No file path provided, can't lint.");
				return -1;
			}

			if (!file.exists(filePath)) {
				logger.error(`lintFile() - file does not exist:`, filePath);
				vscode.window.showErrorMessage("File does not exist, can't lint.");
				return -1;
			}

			if (!this.activeDiagnostics.includes(filePath)) {
				this.activeDiagnostics.push(filePath);
			}

			let lintableText = SourceCode.load(filePath);
			let fileLanguage = vsc.getFileLanguage();

			const customValidationResults = this.customValidator(lintableText, fileLanguage);

			lintableText = this.preFlight(lintableText, fileLanguage);

			let results = await this.eslint.lintText(lintableText);
			results = this.applyParsingErrorRules(results, lintableText);
			results = this.validateErrorMessages(results);
			results = [...customValidationResults, ...results];

			return this.outputLintingResults(filePath, results, silent);
		} catch (e) {
			logger.error(`lintFile() - error:`, e);
			vscode.window.showErrorMessage("Error linting file, please try again. If the problem persists, please contact via GitHub.");
			telemetry.error("lint-error", { error: e.message, language: this.languageName });
			return -1;
		}
	}

	/**
	 * Count the number of errors in the results.
	 * @private
	 * @param {Array} results - The results to count the errors in.
	 * @returns {number} The number of errors.
	 */
	countErrors(results) {
		const errorCount = results.reduce((acc, result) => {
			return acc + result.errorCount || 0;
		}, 0);
		return errorCount;
	}

	/**
	 * Output the linting results to the editor - 'Problems' view (wrapper).
	 * @private
	 * @param {string} filePath - The file path to output the results to.
	 * @param {Array} results - The results to output.
	 * @param {boolean} silent - Whether to suppress messages.
	 * @returns {number} The number of errors.
	 */
	outputLintingResults(filePath, results, silent = false) {
		if (!this.diagnostics) {
			this.initDiagnostics();
			logger.info(`Initialized diagnostics for ${this.languageName}.`);
		}

		if (results.length === 0) {
			this.diagnostics.clear();
			if (!silent) {
				vscode.window.showInformationMessage(`No problems found in ${filePath}.`);
			}
			return 0;
		}

		const errorCount = this.countErrors(results);
		if (!silent) {
			if (errorCount > 0) {
				vscode.window.showWarningMessage(`Found ${errorCount} fatal problems in ${filePath}.`);
				// open the "Problems" view
				try {
					vscode.commands.executeCommand('workbench.actions.view.problems');
				} catch (e) {
					logger.error(`outputLintingResults() - error opening problems view:`, e);
				}
			} else {
				vscode.window.showInformationMessage(`No fatal problems found in ${filePath}.`);
			}
		}
		this.outputResults(filePath, results);
		return errorCount;
	}

	/**
	 * Output the linting results to the editor - 'Problems' view.
	 * @private
	 * @param {string} filePath - The file path to output the results to.
	 * @param {Array} results - The results to output.
	 */
	outputResults(filePath, results) {
		logger.debug(`outputResults() ${filePath} ${results.length}:`, results);
		let diagnosticResults = [];

		for (const result of results) {
			for (const msg of result.messages) {
				const range = new vscode.Range(
					Math.max(0, msg.line - 1),
					Math.max(0, (msg.column || 1) - 1),
					Math.max(0, (msg.endLine ? msg.endLine - 1 : msg.line - 1)),
					Math.max(0, (msg.endColumn ? msg.endColumn - 1 : (msg.column || 1)))
				);
				diagnosticResults.push(
					new vscode.Diagnostic(
						range,
						msg.message,
						msg.severity === 2
						? vscode.DiagnosticSeverity.Error
						: vscode.DiagnosticSeverity.Warning
					)
				);
			}
		}
		this.diagnostics.set(vscode.Uri.file(filePath), diagnosticResults);
	}

	/**
	 * Apply parsing error rules to the results.
	 * These rules are applied on Parsing Errors to improve the error messages.
	 * @private
	 * @param {Array} results - The results to apply the rules to.
	 * @param {string} scriptText - The script text to apply the rules to.
	 * @returns {Array} The results array with the rules applied.
	 */
	applyParsingErrorRules(results, scriptText) {
		if (this.parsingErrorRules.length === 0) {
			return results;
		}

		const lines = scriptText.split("\n");
		for (const result of results) {
			for (const msg of result.messages) {
				if (!msg.message.startsWith("Parsing error:")) {
					logger.debug(`applyParsingErrorRules() - skipping:`, msg);
					continue;
				}

				let ruleResult = false;
				for (let rule of this.parsingErrorRules) {
					const rr = rule(msg.message, lines[msg.line - 1]);
					if (rr?.message) {
						ruleResult = rr;
						break;
					}
				}
				logger.debug(`applyParsingErrorRules() - ruleResult:`, ruleResult);
				if (ruleResult) {
					msg.message = ruleResult.message;
					msg.severity = ruleResult.severity;
				}
			}
		}
		return results;
	}

	/**
	 * Validate the error messages so that we don't output empty results.
	 * @private
	 * @param {Array} results - The results to validate.
	 * @returns {Array} The results array with the error messages validated.
	 */
	validateErrorMessages(results) {
		var errorResults = [];
		for (const result of results) {
			logger.debug(`validateErrorMessages() - result:`, result);
			if (result.messages.length > 0) {
				errorResults.push(result);
			}
		}
		return errorResults;
	}

	createESLintInstance(overrideConfig) {
		return new ESLint({
			overrideConfigFile: true,
			overrideConfig: overrideConfig,
			fix: false
		});
	}

	initDiagnostics() {
		this.diagnostics = vscode.languages.createDiagnosticCollection(this.languageName);
		ContextHolder.context.subscriptions.push(this.diagnostics);
	}

	clearFileDiagnostics(filePath) {
		if (this.activeDiagnostics.includes(filePath)) {
			this.diagnostics.delete(vscode.Uri.file(filePath));
			this.activeDiagnostics.splice(this.activeDiagnostics.indexOf(filePath), 1);
		}
	}
}

module.exports = Linter;