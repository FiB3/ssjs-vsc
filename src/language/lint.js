const vscode = require("vscode");
const { ESLint } = require("eslint");
const ssjs = require("eslint-config-ssjs");

const ContextHolder = require("../config/contextHolder");
const logger = require("../auxi/logger");
const vsc = require("../vsc");

class Linter {
	/**
	 * Initialize a new linter for a specific language.
	 * @param {string} languageName Name of the language (e.g. "ssjs")
	 * @param {Array} fileExtensions Array of file extensions (e.g. [".ssjs"])
	 * @param {Object} overrideConfig Override configuration for the linter
	 */
	constructor(languageName, fileExtensions, overrideConfig) {
		this.languageName = languageName;
		this.fileExtensions = fileExtensions;
		this.eslint = this.createESLintInstance(overrideConfig);

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
	async lintFile() {
		const filePath = vsc.getActiveEditor();
		if (!filePath) {
			return false;
		}
		if (!this.activeDiagnostics.includes(filePath)) {
			this.activeDiagnostics.push(filePath);
		}

		const results = await this.eslint.lintFiles([filePath]);
		return this.outputLintingResults(filePath, results);
	}

	outputLintingResults(filePath, results) {
		if (!this.diagnostics) {
			this.initDiagnostics();
			logger.info(`Initialized diagnostics for ${this.languageName}.`, this.diagnostics);
		}

		if (results.length === 0) {
			this.diagnostics.clear();
			return false;
		}

		this.outputResults(filePath, results);
		return true;
	}

	outputResults(filePath, results) {
		let diagnosticResults = [];

		for (const result of results) {
			for (const msg of result.messages) {
				const range = new vscode.Range(
					Math.max(0, msg.line - 1),
					Math.max(0, (msg.column || 1) - 1),
					Math.max(0, (msg.endLine ? msg.endLine - 1 : msg.line - 1)),
					Math.max(0, (msg.endColumn ? msg.endColumn - 1 : (msg.column || 1)))
				);
				logger.info(`Creating diagnostic for ${filePath}: ${msg.message}`, this.diagnostics);
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
			useEslintrc: false,
			overrideConfig: overrideConfig,
			fix: true,
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