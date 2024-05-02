const vscode = require('vscode');
const path = require('path');

const BaseConfig = require('./baseConfig');
const { error } = require('console');

const USABLE_LANG_IDS = ['ssjs', 'html', 'ampscript'];
const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

/**
 * To work with VSCode Preferences.
 * Extends BaseConfig and to be extended by Config.
 */
module.exports = class Preferences extends BaseConfig {

	/**
	 * Is passed language ID allowed?
	 */
	static isLanguageAllowed(langId) {
		console.log(`LanguageID: "${langId}".`);
		return USABLE_LANG_IDS.includes(langId);
	}

	static isFileTypeAllowed(filePath) {
		console.log(`File extname: "${path.extname(filePath)}".`);
		return USABLE_EXT.includes(path.extname(filePath));
	}

	static isAssetProvider() {
		return Preferences.getCodeProvider() === 'Asset';
	}

	static isServerProvider() {
		return Preferences.getCodeProvider() === 'Server';
	}

	static isNoneProvider() {
		return Preferences.getCodeProvider() === 'None';
	}

	static getCodeProvider() {
		return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('codeProvider');
	}

	static isPreviewUrl() {
		return Preferences.getGetUrlOption() === 'Preview';
	}

	static isCopyingUrl() {
		return Preferences.getGetUrlOption() === 'Copy';
	}

	static isOpeningUrl() {
		return Preferences.getGetUrlOption() === 'Open';
	}

	static getGetUrlOption() {
		return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('getUrlHandling');
	}

	static isAutoSaveEnabled() {
		return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('autoSave') ?? false;
	}

	static showPanelAutomatically() {
		return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('showConfigPanelAutomatically') ?? false;
	}

	static async changeShowPanelAutomatically(newValue) {
		await vscode.workspace.getConfiguration('ssjs-vsc.editor').update('showConfigPanelAutomatically', newValue, true)
	}

	static getTemplatingTags() {
		let stp = vscode.workspace.getConfiguration('ssjs-vsc.editor').get('templatingTags') ?? '{{,}}';
		return stp.split(',');
	}

	static getBeautyfierSetup() {
		const settings = vscode.workspace.getConfiguration("ssjs-vsc.language.ampscript");
		console.log(`Settings`, settings);
		const s = {
			capitalizeSet: settings.get('capitalizeKeywords'),
			capitalizeVar: settings.get('capitalizeKeywords'),
			capitalizeIfFor: settings.get('capitalizeKeywords'),
			capitalizeAndOrNot: settings.get('capitalizeAndOrNot'),
			maxParametersPerLine: settings.get('maxParametersPerLine')
		};
		return s;
	}
}