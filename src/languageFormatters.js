const vscode = require('vscode');
const beautifier = require("beauty-amp-core2");
const Config = require('./config');
const checks = require ('./checks');
const telemetry = require('./telemetry');

const TELEMETRY_EVENT = 'formatting';

class LanguageFormatter {
    constructor() {
        // Map to store language-specific formatters
        this.formatters = new Map();
        this.selectors = this.initializeFormatters();
    }

    initializeFormatters() {
			let selectors = [{ language: 'ssjs'}];
			// Initialize and register your formatters
			this.registerFormatter('ssjs', {
					provideDocumentFormattingEdits: this.formatSsjsAndAmpscript,
			});

			if (!checks.beautyAmpEnabled()) {
				console.log('Registering AMPscript beautifiers.');
				this.registerFormatter('AMPscript', {
					provideDocumentFormattingEdits: this.formatSsjsAndAmpscript,
				});
				this.registerFormatter('ampscript', {
					provideDocumentFormattingEdits: this.formatSsjsAndAmpscript,
				});
				selectors.push({language: 'ampscript'});
				selectors.push({language: 'AMPscript'});
			} else {
				vscode.window.showWarningMessage(`SSJS Manager can now format AMPscript code! We recommend you to disable the AMPscript Beautifier extension.`);
			}
			return selectors;
    }

		getSelectors() {
			return this.selectors;
		}

    registerFormatter(language, formatter) {
        this.formatters.set(language, formatter);
    }

    async formatSsjsAndAmpscript(document, formattingOptions, token) {
			console.log(`SFMC Beautifier running for ${document.languageId}.`);
			telemetry.log(TELEMETRY_EVENT, { language: document.languageId });

			try {
				const editor = vscode.window.activeTextEditor;
				const code = editor.document.getText();
				const setup = Config.getBeautyfierSetup();
				
				let formattedCode;
				beautifier.setup(setup, formattingOptions, { loggerOn: false });

				try {
					try {
						formattedCode = await beautifier.beautify(code);
					} catch (htmlError) {
						if (htmlError.name == 'SyntaxError' && typeof(htmlError.message) == 'string') {
							let errLine = htmlError.message.split('\n')?.[0] ? htmlError.message.split('\n')?.[0] : htmlError.message;
							vscode.window.showErrorMessage(`Error on HTML formatting, Probably malformed HTML:\n\t` + errLine);
							telemetry.error(TELEMETRY_EVENT, { error: htmlError.message, language: 'HTML'});
							formattedCode = await beautifier.beautify(code, false);
							vscode.window.showInformationMessage(`Formatting without HTML finished.`);
						}
					}
				} catch(err) {
					console.log(`Error on Beautify:`, err);
					vscode.window.showErrorMessage(`Error on formatting. Please, let us know in our GitHub issues.`);
					telemetry.error(TELEMETRY_EVENT, { error: err.message, language: document.languageId});
				}

				editor.edit((editBuilder) => {
					const documentStart = new vscode.Position(0, 0);
					const documentEnd = editor.document.lineAt(editor.document.lineCount - 1).range.end;
					const documentRange = new vscode.Range(documentStart, documentEnd);
	
					editBuilder.replace(documentRange, formattedCode);
				});
				console.log('DONE FORMAT');
			} catch(e) {
				console.log(`ERR:`, e);
			}
    }

    provideDocumentFormattingEdits(document, options, token) {
        const language = document.languageId;
        const formatter = this.formatters.get(language);

        if (formatter) {
            return formatter.provideDocumentFormattingEdits(document, options, token);
        } else {
            console.warn(`No formatter registered for language: ${language}`);
            return [];
        }
    }
}

module.exports = LanguageFormatter;
