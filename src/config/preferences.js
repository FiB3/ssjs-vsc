const vscode = require('vscode');
const path = require('path');

const logger = require('../auxi/logger');
const BaseConfig = require('./baseConfig');
const ContextHolder = require('./contextHolder');

const USABLE_LANG_IDS = ['ssjs', 'html', 'ampscript'];
const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

/**
 * To work with VSCode Preferences.
 * Extends BaseConfig and to be extended by Config.
 */
module.exports = class Preferences extends BaseConfig {

	isProduction() {
		return ContextHolder.isProduction();
	}

	/**
	 * Is passed language ID allowed?
	 */
	static isLanguageAllowed(langId) {
		logger.log(`LanguageID: "${langId}".`);
		return USABLE_LANG_IDS.includes(langId);
	}

	/**
	 * Check if the file is supported for deployment.
	 * @param {string} filePath
	 * @param {boolean} showWarning shows warning message if file is not supported
	 * @returns {boolean} true if file is supported, false otherwise.
	 */
	static isFileTypeAllowed(filePath, showWarning = true) {
		let extName = path.extname(filePath);
		let additionalFileTypes = Preferences.getAdditionalFileTypes();
		logger.log(`File extension: "${additionalFileTypes}".`);
		if (USABLE_EXT.includes(extName) || additionalFileTypes.includes(extName)) {
			return true;
		}
		if (showWarning) {
			vscode.window.showWarningMessage(`File *${extName} is not allowed!`);
		}
		return false;
	}

	/**
	 * Check if the file is one of the default file types allowed for deployment.
	 * @param {string} filePath
	 * @returns {boolean} true if file is supported, false otherwise.
	 */
	static isDefaultFileTypeAllowed(filePath) {
		return USABLE_EXT.includes(path.extname(filePath));
	}

	static updateAllowedFileTypesInVsCodeContext() {
		let allowedFileTypes = USABLE_EXT.concat(Preferences.getAdditionalFileTypes());
		logger.log(`Allowed file types: "${allowedFileTypes}".`);
		vscode.commands.executeCommand('setContext', 'ssjs-vsc.allowedFileTypes', allowedFileTypes);
	}

	/**
	 * Get additional supported file types from the Preferences.
	 * @returns {array} array of additional file types.
	 */
	static getAdditionalFileTypes() {
		let extensions = vscode.workspace.getConfiguration('ssjs-vsc.editor').get('additionalFileTypes') ?? [];
		let validExtensions = [];
		extensions.forEach((ext) => {
			if (/^\.[a-zA-Z0-9]{1,5}$/.test(ext)) validExtensions.push(ext);
		});
		return validExtensions;
	}

	static isAssetProvider() {
		return Preferences.getCodeProvider() === 'Asset';
	}

	static isNoneProvider() {
		return Preferences.getCodeProvider() === 'None';
	}

	static getCodeProvider() {
		return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('codeProvider');
	}

	static isPreviewUrl(devContext = 'page') {
		return Preferences.getGetUrlOption(devContext) === 'Preview';
	}

	static isCopyingUrl(devContext = 'page') {
		return Preferences.getGetUrlOption(devContext) === 'Copy';
	}

	static isOpeningUrl(devContext = 'page') {
		return Preferences.getGetUrlOption(devContext) === 'Open';
	}

	static getGetUrlOption(devContext = 'page') {
		// TODO: finish
		if (devContext === 'text') {
			return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('runHandlingInTextResources');
		} else {
			return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('runHandlingInCloudPages');
		}
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

	static reloadLivePreviewOnSave() {
		return vscode.workspace.getConfiguration('ssjs-vsc.livePreview').get('reloadOnSave') ?? true;
	}

	static getTemplatingTags() {
		let stp = vscode.workspace.getConfiguration('ssjs-vsc.editor').get('templatingTags') ?? '{{,}}';
		return stp.split(',');
	}

	static getBeautyfierSetup() {
		const settings = vscode.workspace.getConfiguration('ssjs-vsc.language.ampscript');
		logger.log(`Settings`, settings);
		const s = {
			capitalizeSet: settings.get('capitalizeKeywords'),
			capitalizeVar: settings.get('capitalizeKeywords'),
			capitalizeIfFor: settings.get('capitalizeKeywords'),
			capitalizeAndOrNot: settings.get('capitalizeAndOrNot'),
			maxParametersPerLine: settings.get('maxParametersPerLine')
		};
		return s;
	}

	static isLintOnSaveEnabled() {
		return Preferences.getLintMode() !== 'off';
	}

	static isLintOnSaveStrict() {
		return Preferences.getLintMode() === 'on-strict';
	}

	static getLintMode() {
		let lintMode = vscode.workspace.getConfiguration('ssjs-vsc.language.ssjs').get('lintOnSave') ?? 'on-strict';
		return lintMode;
	}

	static getPreviewPanelTimeout() {
		let timeout = vscode.workspace.getConfiguration('ssjs-vsc.editor').get('previewPanelTimeout') ?? 60;
		if (timeout < 0 || timeout > 120) {
			timeout = 60;
		}
		return timeout * 1000;
	}

	static getTextPreviewTimeout() {
		let timeout = vscode.workspace.getConfiguration('ssjs-vsc.editor').get('textResourceTimeout') ?? 30;
		if (timeout < 0 || timeout > 60) {
			timeout = 30;
		}
		return timeout * 1000;
	}
}