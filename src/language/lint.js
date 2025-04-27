const vscode = require("vscode");
const { ESLint } = require("eslint");
const ssjs = require("eslint-config-ssjs");

const SourceCode = require("../code/sourceCode");
const ContextHolder = require("../config/contextHolder");
const logger = require("../auxi/logger");
const vsc = require("../vsc");

class Linter {
	/**
	 * Initialize a new linter for a specific language.
	 * @param {string} languageName Name of the language (e.g. "ssjs")
	 * @param {Array} fileExtensions Array of file extensions (e.g. [".ssjs"])
	 * @param {Object} overrideConfig Override configuration for the linter
	 * @param {Function} preFlight(scriptText) pre-linter function to modify the file content if needed
	 * @param {Function} customValidator(scriptText) Custom validator function - works on entire file
	 */
	constructor( {
		languageName,
		fileExtensions,
		overrideConfig,
		preFlight = (scriptText) => { return scriptText; },
		customValidator = (scriptText) => { return []; }
	}) {
		this.languageName = languageName;
		this.fileExtensions = fileExtensions;
		this.eslint = this.createESLintInstance(overrideConfig);
		this.preFlight = preFlight;
		this.customValidator = customValidator;

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
		return this.fileExtensions.some(ext => filePath.endsWith(ext));
	}

	/**
	 * Lint the currently active file.
	 * @returns {boolean} true if there are problems, false otherwise
	 */
	async lintFile(silent = false) {
		const filePath = vsc.getActiveEditor();
		if (!filePath) {
			return false;
		}
		if (!this.activeDiagnostics.includes(filePath)) {
			this.activeDiagnostics.push(filePath);
		}

		let lintableText = SourceCode.load(filePath);

		const customValidationResults = this.customValidator(lintableText);

		lintableText = this.preFlight(lintableText);

		let results = await this.eslint.lintText(lintableText);
		results = [...customValidationResults, ...results];
		return this.outputLintingResults(filePath, results, silent);
	}

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
			return false;
		}

		if (!silent) {
			vscode.window.showWarningMessage(`Found ${results.length} problems in ${filePath}.`);
		}
		this.outputResults(filePath, results);
		return true;
	}

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